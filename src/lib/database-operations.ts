import { supabase } from './supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Database Operations for Cursor AI
 * handle_quiz_submission
 * This module provides CRUD operations that Cursor's AI can use to interact with the Supabase database.
 * All functions include proper error handling and type safety.
 */

export interface QueryResult<T = unknown> {
  data: T[] | null;
  error: PostgrestError | null;
  count?: number;
}

export interface SingleResult<T = unknown> {
  data: T | null;
  error: PostgrestError | null;
}

// NEW TYPE DEFINITIONS START
export interface UserProfile {
  id: string; // uuid
  email: string;
  first_name?: string | null;
  is_email_verified: boolean;
  email_verified_at?: string | null; // timestamptz
  kit_subscriber_id?: string | null;
  last_verification_email_sent_at?: string | null; // timestamptz
  insight_gems: number; // Assuming this is NOT NULL based on schema
  referral_code?: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  action_token?: string | null; // For secure, session-less actions
}

export interface ImpressionData {
  experiment_id: string; // UUID
  variant_id: string; // UUID
  user_id: string; // This will be the user_profiles.id
  page_url?: string;
  metadata?: Record<string, unknown>;
  session_identifier?: string;
  device_type?: string;
  // Add other fields from your 'impressions' table schema if they are required
  // and not automatically handled by DB defaults or other processes.
  // e.g., session_identifier, user_agent, etc.
}

export interface ImpressionInsertData {
  experiment_id: string; // UUID
  variant_id: string; // UUID
  user_id: string; // This will be the user_profiles.id
  page_url?: string;
  metadata?: Record<string, unknown>;
  session_identifier?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
}

export interface FindOrCreateUserResult {
  user: UserProfile | null;
  isNewUser: boolean;
  isAlreadyVerified: boolean;
  error: PostgrestError | string | null;
}

export interface GenerateTokenResult {
  token: string | null;
  error: PostgrestError | string | null;
}

// NEW INTERFACE for verifyTokenAndLogConversion result
export interface VerifiedTokenData {
  success: boolean;
  message: string;
  userProfileId?: string;
  email?: string;
  firstName?: string | null;
  kitSubscriberId?: string | null;
  experimentId?: string | null;
  variantId?: string | null;
  action_token?: string | null;
  error?: PostgrestError | string | null;
}

// START LINTER FIX INTERFACES
export interface ImpressionRecord {
  id: string; // uuid
  variant_id: string; // uuid
  experiment_id: string; // uuid
  user_id: string; // uuid
  session_identifier?: string | null; // uuid
  impression_at: string; // timestamptz
  page_url?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
  is_first_exposure?: boolean | null;
  user_was_eligible?: boolean | null;
  user_eligibility_status?: Record<string, unknown> | null;
  user_context?: Record<string, unknown> | null;
  country_code?: string | null; // varchar(2)
  region?: string | null; // varchar(100)
  city?: string | null; // varchar(100)
  device_type?: string | null; // device_type_enum
  screen_resolution?: string | null; // varchar(20)
  viewport_size?: string | null; // varchar(20)
  connection_type?: string | null; // connection_type_enum
  language_code?: string | null; // varchar(10)
  time_zone?: string | null; // varchar(50)
  utm_source?: string | null; // varchar(100)
  utm_medium?: string | null; // varchar(100)
  utm_campaign?: string | null; // varchar(100)
  time_on_page?: number | null; // integer
  scroll_depth_percent?: number | null; // integer
  page_load_time?: number | null; // integer
  bounce?: boolean | null;
  // Add any other fields selected from 'impressions' table
  ip_address?: string | null; // From usage in conversionDetails
}

export interface ConversionInsertData {
  user_id: string; // This is a UUID referencing user_profiles.id
  conversion_type: string;
  experiment_id?: string | null; // uuid
  variant_id?: string | null; // uuid
  created_at: string; // timestamptz
  session_identifier?: string | null; // uuid
  details?: Record<string, unknown> | null;
  conversion_value?: number | null; // decimal(10,2)
  device_type?: string | null; // device_type_enum
  time_to_convert?: number | null; // integer
  conversion_context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  // Fields from schema not explicitly in current object:
  // is_first_conversion_for_experiment?: boolean | null;
  // conversion_attribution_source?: string | null;
  // conversion_window_days?: number | null;
  // original_exposure_date?: string | null; // timestamptz
  // conversion_eligibility_verified?: boolean | null;
  // country_code?: string | null; // varchar(2)
  // referrer_source?: string | null; // varchar(200)
  // utm_source?: string | null; // varchar(100)
  // utm_medium?: string | null; // varchar(100)
  // utm_campaign?: string | null; // varchar(100)
}
// END LINTER FIX INTERFACES

// NEW TYPE DEFINITIONS END

/**
 * Execute a raw SQL query (for complex operations)
 * For migrations, use runMigration() instead
 */
export async function executeQuery(query: string): Promise<QueryResult> {
  try {
    // For simple queries, use the query builder
    const { data, error, count } = await supabase.rpc('exec_sql', { sql: query });
    return { data, error, count: count || undefined };
  } catch (err) {
    console.error('Query execution error:', err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Execute SQL migration scripts (CREATE TABLE, ALTER TABLE, etc.)
 * This uses the SQL editor approach which works for DDL operations
 */
export async function runMigration(sql: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('🔄 Running SQL migration...');
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}:`);
      console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      try {
        // For CREATE TABLE and other DDL operations, we need to use a different approach
        if (statement.toLowerCase().includes('create table') || 
            statement.toLowerCase().includes('create index') ||
            statement.toLowerCase().includes('comment on')) {
          
          // Use the direct SQL execution approach
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.error(`❌ Statement ${i + 1} failed:`, error);
            return { success: false, error: `Statement ${i + 1} failed: ${error.message}` };
          }
          
          console.log(`✅ Statement ${i + 1} completed successfully`);
        }
      } catch (statementError) {
        console.error(`❌ Statement ${i + 1} failed:`, statementError);
        return { success: false, error: `Statement ${i + 1} failed: ${statementError}` };
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    return { success: true, error: null };
    
  } catch (err) {
    console.error('❌ Migration execution error:', err);
    return { success: false, error: `Migration failed: ${err}` };
  }
}

/**
 * Get all records from a table with optional filtering and pagination
 */
export async function getRecords(
  tableName: string,
  options: {
    columns?: string;
    filters?: Record<string, unknown>;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<QueryResult> {
  try {
    let query = supabase.from(tableName).select(options.columns || '*');

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value as string | number | boolean | null);
      });
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset && options.limit) {
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options.offset) {
      query = query.range(options.offset, options.offset + 9);
    }

    const { data, error, count } = await query;
    return { data, error, count: count || undefined };
  } catch (err) {
    console.error(`Error getting records from ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Get a single record by ID
 */
export async function getRecordById(
  tableName: string,
  id: string | number,
  idColumn: string = 'id'
): Promise<SingleResult> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq(idColumn, id)
      .single();

    return { data, error };
  } catch (err) {
    console.error(`Error getting record from ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Insert a new record
 */
export async function insertRecord(
  tableName: string,
  record: Record<string, unknown>
): Promise<SingleResult> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert(record)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error(`Error inserting record into ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Insert multiple records
 */
export async function insertRecords(
  tableName: string,
  records: Record<string, unknown>[]
): Promise<QueryResult> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert(records)
      .select();

    return { data, error };
  } catch (err) {
    console.error(`Error inserting records into ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Update a record by ID
 */
export async function updateRecord(
  tableName: string,
  id: string | number,
  updates: Record<string, unknown>,
  idColumn: string = 'id'
): Promise<SingleResult> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq(idColumn, id)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error(`Error updating record in ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Update multiple records with filters
 */
export async function updateRecords(
  tableName: string,
  updates: Record<string, unknown>,
  filters: Record<string, unknown>
): Promise<QueryResult> {
  try {
    let query = supabase.from(tableName).update(updates);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.select();
    return { data, error };
  } catch (err) {
    console.error(`Error updating records in ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Delete a record by ID
 */
export async function deleteRecord(
  tableName: string,
  id: string | number,
  idColumn: string = 'id'
): Promise<SingleResult> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq(idColumn, id)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error(`Error deleting record from ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Delete multiple records with filters
 */
export async function deleteRecords(
  tableName: string,
  filters: Record<string, unknown>
): Promise<QueryResult> {
  try {
    let query = supabase.from(tableName).delete();

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.select();
    return { data, error };
  } catch (err) {
    console.error(`Error deleting records from ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Get table schema information
 */
export async function getTableSchema(tableName: string): Promise<QueryResult> {
  try {
    const { data, error } = await supabase.rpc('get_table_schema', { table_name: tableName });
    return { data, error };
  } catch (err) {
    console.error(`Error getting schema for ${tableName}:`, err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * List all tables in the database
 */
export async function listTables(): Promise<QueryResult> {
  try {
    const { data, error } = await supabase.rpc('list_tables');
    return { data, error };
  } catch (err) {
    console.error('Error listing tables:', err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Count records in a table with optional filters
 */
export async function countRecords(
  tableName: string,
  filters: Record<string, unknown> = {}
): Promise<{ count: number; error: PostgrestError | null }> {
  try {
    let query = supabase.from(tableName).select('*', { count: 'exact', head: true });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;
    return { count: count || 0, error };
  } catch (err) {
    console.error(`Error counting records in ${tableName}:`, err);
    return { count: 0, error: err as PostgrestError };
  }
}

/**
 * Check if a record exists
 */
export async function recordExists(
  tableName: string,
  filters: Record<string, unknown>
): Promise<{ exists: boolean; error: PostgrestError | null }> {
  try {
    const { count, error } = await countRecords(tableName, filters);
    return { exists: count > 0, error };
  } catch (err) {
    console.error(`Error checking if record exists in ${tableName}:`, err);
    return { exists: false, error: err as PostgrestError };
  }
}

// Helper functions for common operations

/**
 * Get all experiments with their variants
 */
export async function getExperimentsWithVariants(): Promise<QueryResult> {
  return getRecords('ab_experiments', {
    columns: `
      *,
      ab_experiment_variants (
        id,
        name,
        weight,
        config
      )
    `
  });
}

/**
 * Get impressions with experiment data
 */
export async function getImpressionsWithExperiments(limit: number = 100): Promise<QueryResult> {
  return getRecords('ab_test_impressions', {
    columns: `
      *,
      ab_experiments (
        name,
        status
      )
    `,
    orderBy: 'created_at',
    ascending: false,
    limit
  });
}

/**
 * Get conversions with experiment data
 */
export async function getConversionsWithExperiments(limit: number = 100): Promise<QueryResult> {
  return getRecords('ab_test_conversions', {
    columns: `
      *,
      ab_experiments (
        name,
        status
      )
    `,
    orderBy: 'created_at',
    ascending: false,
    limit
  });
}

/**
 * Check if a table exists in the database
 */
export async function tableExists(tableName: string): Promise<{ exists: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      return { exists: false, error: error.message };
    }
    
    return { exists: !!data, error: null };
  } catch (err) {
    console.error('Error checking table existence:', err);
    return { exists: false, error: `Error checking table: ${err}` };
  }
}

// NEW FUNCTIONS START

/**
 * Finds a user by email. If the user doesn't exist, it creates a new one.
 * It's critical this function is called BEFORE attempting to log impressions or conversions.
 * @param email The user's email address.
 * @returns An object containing the user profile, whether they are new, and if they were already verified.
 */
export async function findOrCreateUserForVerification(email: string): Promise<FindOrCreateUserResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Step 1: Check if user exists
  const { data: existingUser, error: findError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (findError && findError.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error here.
    console.error('[DB] Error finding user:', findError);
    return { user: null, isNewUser: false, isAlreadyVerified: false, error: findError.message };
  }
  
  // If user exists, return their profile
  if (existingUser) {
    console.log(`[DB] Found existing user: ${existingUser.email}`);
    return {
      user: existingUser as UserProfile,
      isNewUser: false,
      isAlreadyVerified: existingUser.is_email_verified,
      error: null,
    };
  }

  // Step 2: User does not exist, so create them.
  console.log(`[DB] No user found for ${normalizedEmail}. Creating new user...`);
  const { data: newUser, error: createError } = await supabase
    .from('user_profiles')
    .insert({ email: normalizedEmail })
    .select()
    .single();

  if (createError) {
    console.error('[DB] Error creating user:', createError);
    return { user: null, isNewUser: false, isAlreadyVerified: false, error: createError.message };
  }

  console.log(`[DB] Successfully created new user: ${newUser.email}`);
  return {
    user: newUser as UserProfile,
    isNewUser: true,
    isAlreadyVerified: false,
    error: null,
  };
}

/**
 * Generates a secure, unique verification token and stores it in the database.
 * This should only be called for a user who has just been created.
 * It's called from the frontend immediately after a user signs up.
 * @param impressionData - The impression data to log.
 */
export async function logHeroImpression(impressionData: ImpressionInsertData): Promise<SingleResult<ImpressionRecord>> {
  try {
    console.log('[DB] Logging hero impression with data:', impressionData);

    // Ensure user_id is a valid UUID, as it's a foreign key.
    if (!impressionData.user_id) {
        throw new Error("Cannot log impression without a valid user_id.");
    }

    const { data, error } = await supabase
      .from('impressions')
      .insert(impressionData)
      .select()
      .single();

    if (error) {
      console.error('[DB] Supabase error logging impression:', error);
      throw error;
    }

    console.log(`[DB] Impression logged successfully for user ${impressionData.user_id}`);
    return { data: data as ImpressionRecord, error: null };

  } catch (err: unknown) {
    console.error('[DB] Unexpected error in logHeroImpression:', err);
    const message = err instanceof Error ? err.message : 'An unknown error occurred during impression logging.';
    // Instead of creating a custom error object, we'll just return a standard Postgrest-like error.
    // The frontend should be robust enough to handle this.
    return { 
      data: null, 
      error: { 
        message, 
        details: (err instanceof Error && err.stack) ? err.stack : '', 
        hint: 'Check database connection or server logs.', 
        code: 'LHI500' 
      } 
    };
  }
}

// NEW FUNCTION: generateAndStoreVerificationToken
export async function generateAndStoreVerificationToken(
  userId: string, 
  email: string,
  experimentId?: string | null, // Optional experimentId, directly matches column
  variantId?: string | null,    // Optional variantId, directly matches column
  impressionId?: string | null // Optional impressionId, directly matches column
): Promise<GenerateTokenResult> {
  try {
    // A secure token is now generated by the database trigger by default (uuid_generate_v4)
    // We just need to create the record.

    // The token's expiration is set to 24 hours from now.
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: tokenRecord, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_profile_id: userId,
        email,
        expires_at,
        experiment_id: experimentId,
        variant_id: variantId,
        impression_id: impressionId
      })
      .select('token')
      .single();

    if (tokenError) {
      console.error('[DB] Error generating verification token record:', tokenError);
      return { token: null, error: tokenError.message };
    }
    
    if (!tokenRecord || !tokenRecord.token) {
        // This case might happen if RLS prevents the insert or if the token column isn't returned.
        return { token: null, error: 'Failed to retrieve verification token after creation.' };
    }

    console.log(`[DB] Stored verification token for ${email}.`);
    return { token: tokenRecord.token, error: null };
  } catch (err: unknown) {
    console.error('[DB] Unexpected error in generateAndStoreVerificationToken:', err);
    const message = err instanceof Error ? err.message : 'An unknown error occurred.';
    return { token: null, error: message };
  }
}

/**
 * Verifies a token, marks the user as verified, and logs the conversion event.
 * @param tokenValue The verification token from the URL.
 * @returns An object indicating success and containing key user/token data.
 */
export async function verifyTokenAndLogConversion(tokenValue: string): Promise<VerifiedTokenData> {
  try {
    // Step 1: Find the token in the database
    const { data: tokenData, error: tokenFindError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', tokenValue)
      .single();

    if (tokenFindError || !tokenData) {
      const message = tokenFindError ? `Token find error: ${tokenFindError.message}` : 'Token not found.';
      console.warn(`[DB] Verification failed: ${message}`);
      return { success: false, message };
    }

    // Step 2: Check if token is expired or already used
    if (tokenData.is_used) {
      return { success: false, message: 'This verification link has already been used.' };
    }
    if (new Date(tokenData.expires_at) < new Date()) {
      return { success: false, message: 'This verification link has expired. Please request a new one.' };
    }

    // Step 3: Mark user as verified and token as used in a transaction
    const { data: userProfile, error: verificationError } = await supabase.rpc('verify_user_and_token', {
      p_token_id: tokenData.id,
      p_user_id: tokenData.user_profile_id,
    });
    
    if (verificationError || !userProfile) {
        throw new Error(verificationError?.message || "Failed to call user verification RPC.");
    }
    
    // Step 4: Log the conversion event
    const conversionDetails: ConversionInsertData = {
      user_id: userProfile.id,
      conversion_type: 'email_verified',
      experiment_id: tokenData.experiment_id,
      variant_id: tokenData.variant_id,
      created_at: new Date().toISOString(),
      details: { 
          source: 'email_verification_link',
          impression_id_linked: tokenData.impression_id 
      },
      metadata: { verified_email: userProfile.email },
    };

    const { error: conversionError } = await supabase.from('conversions').insert(conversionDetails);

    if (conversionError) {
      // Log the error but don't fail the entire process, as verification was successful.
      console.error('[DB] Failed to log email verification conversion:', conversionError);
    } else {
      console.log(`[DB] Email verification conversion logged for user ${userProfile.id}`);
    }

    return {
      success: true,
      message: 'Email successfully verified!',
      userProfileId: userProfile.id,
      email: userProfile.email,
      firstName: userProfile.first_name,
      kitSubscriberId: userProfile.kit_subscriber_id,
      action_token: userProfile.action_token,
    };

  } catch (err: unknown) {
    console.error('[DB] Unexpected error during token verification:', err);
    const message = err instanceof Error ? err.message : 'An unknown server error occurred.';
    return { success: false, message, error: message };
  }
}

// NEW FUNCTION: updateUserFirstName
export async function updateUserFirstName(userId: string, firstName: string): Promise<SingleResult<UserProfile>> {
  console.log(`[DB Ops] updateUserFirstName called for userId: ${userId}`);
  if (!userId || !firstName) {
    return { data: null, error: { message: 'User ID and first name are required.', details: '', hint: '', code: '400' } as PostgrestError };
  }
  if (typeof firstName !== 'string' || firstName.trim().length === 0) {
    return { data: null, error: { message: 'First name cannot be empty.', details: '', hint: '', code: '400' } as PostgrestError };
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ first_name: firstName.trim(), updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
     
    if (error) {
      console.error(`[DB Ops] Error updating first name for user ${userId}:`, error);
    } else {
      console.log(`[DB Ops] Successfully updated first name for user ${userId}.`);
    }
    return { data: data as UserProfile | null, error };
  } catch (err: unknown) {
    console.error('[DB Ops] Exception in updateUserFirstName:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { data: null, error: { message, details: '', hint: '', code: '500' } as PostgrestError };
  }
}

// Quiz-related Operations

// Interface for the parameters of callHandleQuizSubmissionRpc
export interface HandleQuizSubmissionParams {
  userId: string;
  emailAddress: string;
  userFirstName?: string | null;
  quizScore: number;
  quizResultType: string;
  quizNameTaken: string;
  experimentIdAssociated?: string | null;
  variantIdAssociated?: string | null;
  impressionIdToLink?: string | null;
  referralCodeAttempted?: string | null;
  ipAddress: string;
  browserId?: string | null;
  sessionId?: string | null;
  clientDeviceType?: string | null;
  submissionPageUrl?: string | null;
}

// Interface for the data part of the RPC result
export interface HandleQuizSubmissionResultData {
  success: boolean;
  message: string;
  referral_code: string | null;
  insight_gems: number | null;
  // Add any other fields expected from the RPC's successful response
}

/**
 * Calls the handle_quiz_submission RPC function in Supabase.
 */
export async function callHandleQuizSubmissionRpc(
  params: HandleQuizSubmissionParams
): Promise<SingleResult<HandleQuizSubmissionResultData>> {
  try {
    console.log('[DB Ops] Calling handle_quiz_submission RPC for user:', params.userId, ', email:', params.emailAddress);

    // Transform params to match expected p_snake_case from the database error log.
    // Ensure all 15 parameters are always sent, mapping undefined to null.
    const rpcPayload = {
      p_user_id: params.userId,
      p_email: params.emailAddress,
      p_first_name: params.userFirstName !== undefined ? params.userFirstName : null,
      p_score: params.quizScore,
      p_result_type: params.quizResultType,
      p_quiz_name: params.quizNameTaken,
      p_experiment_id: params.experimentIdAssociated !== undefined ? params.experimentIdAssociated : null,
      p_variant_id: params.variantIdAssociated !== undefined ? params.variantIdAssociated : null,
      p_impression_id: params.impressionIdToLink !== undefined ? params.impressionIdToLink : null,
      p_referral_code_used: params.referralCodeAttempted !== undefined ? params.referralCodeAttempted : null,
      p_client_address: params.ipAddress,
      p_browser_identifier: params.browserId !== undefined ? params.browserId : null,
      p_session_identifier: params.sessionId !== undefined ? params.sessionId : null,
      p_device_type: params.clientDeviceType !== undefined ? params.clientDeviceType : null,
      p_page_url: params.submissionPageUrl !== undefined ? params.submissionPageUrl : null,
    };
    
    console.log('[DB Ops] Payload for RPC call:', rpcPayload);

    const { data, error } = await supabase.rpc('handle_quiz_submission', rpcPayload);

    if (error) {
      console.error('[DB Ops] Error calling handle_quiz_submission RPC:', error);
      return { data: null, error };
    }

    // Assuming the RPC returns data directly in the structure of HandleQuizSubmissionResultData
    // If not, this casting and handling might need adjustment based on actual RPC output.
    console.log('[DB Ops] handle_quiz_submission RPC call successful, raw data:', data);
    // It's possible the RPC returns a single object that matches HandleQuizSubmissionResultData,
    // or it might be an array with one object, or just a status.
    // Supabase `rpc` calls often return data directly as the expected type if the pg function returns a single row / record.
    // If it returns a SETOF something, `data` would be an array.
    // If the function does not return a table/record (e.g. returns void or a scalar type), then `data` might be null or the scalar.
    // For a function designed to return {success, message, ...}, `data` should ideally be that object.
    if (typeof data === 'object' && data !== null && 'success' in data && 'message' in data) {
       return { data: data as HandleQuizSubmissionResultData, error: null };
    } else if (data === null && !error) {
      // This case might happen if the RPC is defined to return VOID but we expect structured data.
      // Or if the RPC executed but semantically didn't "succeed" in a way that returns our expected structure.
      console.warn('[DB Ops] handle_quiz_submission RPC returned null data without an error. This might indicate an issue with the RPC logic or return type.');
      return { data: null, error: { name: 'CustomError', message: 'RPC returned null data without error.', details: '', hint: '', code: '500'} };
    }
     // If data is not null and not the expected object, it's an unexpected response type.
    console.error('[DB Ops] Unexpected data structure from handle_quiz_submission RPC:', data);
    return { data: null, error: { name: 'CustomError', message: 'Unexpected data structure from RPC.', details: String(data), hint: '', code: '500'} };


  } catch (err: unknown) {
    console.error('[DB Ops] Exception in callHandleQuizSubmissionRpc:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { data: null, error: { name: 'CustomError', message, details: '', hint: '', code: '500' } };
  }
}

export default {
  executeQuery,
  getRecords,
  getRecordById,
  insertRecord,
  insertRecords,
  updateRecord,
  updateRecords,
  deleteRecord,
  deleteRecords,
  getTableSchema,
  listTables,
  countRecords,
  recordExists,
  getExperimentsWithVariants,
  getImpressionsWithExperiments,
  getConversionsWithExperiments,
  runMigration,
  tableExists,
  findOrCreateUserForVerification,
  generateAndStoreVerificationToken,
  verifyTokenAndLogConversion,
  updateUserFirstName,
  logHeroImpression,
  callHandleQuizSubmissionRpc
}; 