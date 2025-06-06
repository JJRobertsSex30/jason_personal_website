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
  user_identifier: string; // This will be the user_profiles.id
  page_url?: string;
  metadata?: Record<string, unknown>;
  session_identifier?: string;
  device_type?: string;
  // Add other fields from your 'impressions' table schema if they are required
  // and not automatically handled by DB defaults or other processes.
  // e.g., session_identifier, user_agent, etc.
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
  user_identifier: string; // uuid
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
  user_identifier: string; // text in schema, but typically uuid from user_profiles.id
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

export async function findOrCreateUserForVerification(email: string): Promise<FindOrCreateUserResult> {
  if (!email || !email.includes('@')) { // Basic email validation
    return { user: null, isNewUser: false, isAlreadyVerified: false, error: 'Invalid email format provided.' };
  }

  try {
    // 1. Check if user exists
    const { data: existingUsers, error: findError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (findError) {
      console.error('Error finding user:', findError);
      return { user: null, isNewUser: false, isAlreadyVerified: false, error: findError };
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0] as UserProfile;
      
      // Ensure insight_gems is populated
      existingUser.insight_gems = existingUser.insight_gems ?? 100; // Default if null/undefined

      // Check and generate referral_code if missing for existing user
      if (!existingUser.referral_code) {
        console.log(`[DB Ops] Existing user ${existingUser.email} missing referral_code. Generating one.`);
        const newReferralCode = crypto.randomUUID();
        const { data: updatedUser, error: updateError } = await supabase
          .from('user_profiles')
          .update({ referral_code: newReferralCode, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id)
          .select('*')
          .single();

        if (updateError) {
          console.warn(`[DB Ops] Failed to update referral_code for existing user ${existingUser.email}:`, updateError.message);
          // Proceed with the original existingUser data, referral_code will be null
        } else if (updatedUser) {
          console.log(`[DB Ops] Successfully generated and saved new referral_code for existing user ${existingUser.email}.`);
          // Update existingUser with the newly fetched data including the referral code and other potentially updated fields
          Object.assign(existingUser, updatedUser);
        }
      }

      if (existingUser.is_email_verified) {
        return { user: existingUser, isNewUser: false, isAlreadyVerified: true, error: null };
      }
      // User exists but is not verified
      return { user: existingUser, isNewUser: false, isAlreadyVerified: false, error: null };
    }

    // If user doesn't exist, create them.
    console.log(`[DB Ops] User with email ${email} does not exist. Creating new profile.`);
    const { data: newUser, error: createError } = await supabase
      .from('user_profiles')
      .insert({ email: email })
      .select('*, action_token') // Ensure we select the new action_token on creation
      .single();

    if (createError || !newUser) {
      console.error('[DB Ops] Error creating new user profile:', createError);
      return { user: null, isNewUser: false, isAlreadyVerified: false, error: createError };
    }
    
    // Ensure the newUser object has insight_gems, defaulting if somehow not returned by DB (though it should be)
    if (newUser) {
      (newUser as UserProfile).insight_gems = (newUser as UserProfile).insight_gems ?? 100;
    }

    return { user: newUser as UserProfile, isNewUser: true, isAlreadyVerified: false, error: null };

  } catch (err) {
    console.error('Error finding or creating user:', err);
    return { user: null, isNewUser: false, isAlreadyVerified: false, error: (err as Error).message || 'Unexpected error occurred' };
  }
}

export async function generateAndStoreVerificationToken(
  userId: string, 
  email: string,
  experimentId?: string | null, // Optional experimentId, directly matches column
  variantId?: string | null,    // Optional variantId, directly matches column
  impressionId?: string | null // Optional impressionId, directly matches column
): Promise<GenerateTokenResult> {
  console.log(`[DB Ops] generateAndStoreVerificationToken called for userId: ${userId}, email: ${email}, experimentId: ${experimentId}, variantId: ${variantId}, impressionId: ${impressionId}`);
  if (!userId || !email) {
    return { token: null, error: 'User ID and email are required to generate a token.' };
  }

  const token = globalThis.crypto.randomUUID(); // Simple UUID token
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours

  try {
    // Direct mapping to columns as confirmed in the schema
    const tokenDataToInsert = {
      user_profile_id: userId,
      token: token,
      email: email,
      expires_at: expiresAt.toISOString(),
      experiment_id: experimentId, // Can be null
      variant_id: variantId,     // Can be null
      impression_id: impressionId  // Can be null
    };

    const { error: insertError } = await supabase
      .from('email_verification_tokens')
      .insert(tokenDataToInsert);

    if (insertError) {
      console.error(`[DB Ops] Error inserting verification token for user ${userId}:`, insertError);
      return { token: null, error: insertError };
    }

    // Update last_verification_email_sent_at in user_profiles
    const { error: updateUserError } = await supabase
      .from('user_profiles')
      .update({ last_verification_email_sent_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateUserError) {
      console.warn(`[DB Ops] Failed to update last_verification_email_sent_at for user ${userId}:`, updateUserError.message);
      // Non-critical, so we don't return an error for the whole token generation
    }
    console.log(`[DB Ops] Successfully generated and stored verification token for user ${userId}. Token: ${token}`);
    return { token, error: null };

  } catch (err: unknown) {
    console.error('[DB Ops] Exception in generateAndStoreVerificationToken:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during token generation.';
    return { token: null, error: message };
  }
}

// NEW FUNCTION: verifyTokenAndLogConversion
export async function verifyTokenAndLogConversion(tokenValue: string): Promise<VerifiedTokenData> {
  console.log(`[DB Ops] verifyTokenAndLogConversion called for token: ${tokenValue}`);
  if (!tokenValue) {
    return { success: false, message: 'Verification token is required.', error: 'Token not provided' };
  }

  try {
    // Find the token and associated user profile in one go
    const { data: tokenRecord, error: findError } = await supabase
      .from('email_verification_tokens')
      .select('*, user_profiles(*)') // Fetch all from token, and all from user profile
      .eq('token', tokenValue)
      .single();

    if (findError || !tokenRecord || !tokenRecord.user_profiles) {
      console.warn(`[DB Ops] Verification token not found or error fetching: ${tokenValue}`, findError);
      return { success: false, message: 'Invalid or expired verification link. Please try again.', error: findError || 'Token not found' };
    }

    // 2. Check if already used (used_at is not null OR is_used is true - schema has both, used_at is preferred)
    // The live schema shows `is_used boolean not null default false` and `used_at timestamptz null`.
    // Checking `tokenRecord.used_at` is a good way to see if it has been processed.
    if (tokenRecord.used_at || tokenRecord.is_used) { 
      console.log(`[DB Ops] Verification token ${tokenValue} has already been used for user ${tokenRecord.user_profile_id}. Used_at: ${tokenRecord.used_at}, is_used: ${tokenRecord.is_used}`);
      return { 
        success: false, 
        message: 'This verification link has already been used.', 
        userProfileId: tokenRecord.user_profile_id,
        email: tokenRecord.user_profiles.email,
        firstName: tokenRecord.user_profiles.first_name,
        kitSubscriberId: tokenRecord.user_profiles.kit_subscriber_id,
        experimentId: tokenRecord.experiment_id,
        variantId: tokenRecord.variant_id,
        action_token: tokenRecord.user_profiles.action_token,
        error: 'Token already used' 
      };
    }

    // 3. Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      console.log(`[DB Ops] Verification token ${tokenValue} has expired for user ${tokenRecord.user_profile_id}.`);
      return { success: false, message: 'This verification link has expired. Please request a new one.', error: 'Token expired' };
    }

    const now = new Date();
    const nowISO = now.toISOString();

    // 4. Mark token as used (set used_at and is_used to true)
    const { error: updateTokenError } = await supabase
      .from('email_verification_tokens')
      .update({ used_at: nowISO, is_used: true }) 
      .eq('id', tokenRecord.id);

    if (updateTokenError) {
      console.error(`[DB Ops] Error marking token ${tokenValue} as used for user ${tokenRecord.user_profile_id}:`, updateTokenError);
      return { success: false, message: 'Error processing verification. Please try again.', error: updateTokenError };
    }

    // 5. Update user_profiles table
    const { data: updatedUserProfile, error: updateUserError } = await supabase
      .from('user_profiles')
      .update({ is_email_verified: true, email_verified_at: nowISO })
      .eq('id', tokenRecord.user_profile_id)
      .select('first_name, email, kit_subscriber_id')
      .single();

    if (updateUserError || !updatedUserProfile) {
      console.error(`[DB Ops] Error updating user profile ${tokenRecord.user_profile_id} to verified:`, updateUserError);
      return { success: false, message: 'Error finalizing email verification. Please try again.', error: updateUserError || 'Failed to retrieve updated user profile' };
    }
    console.log(`[DB Ops] User profile ${tokenRecord.user_profile_id} marked as verified.`);

    // 6. Log conversion
    let impressionRecord: ImpressionRecord | null = null;
    const directImpressionId = tokenRecord.impression_id as string | undefined;

    if (directImpressionId) {
      const { data: impData, error: impError } = await supabase
        .from('impressions')
        .select('*')
        .eq('id', directImpressionId)
        .single();
      if (impError || !impData) {
        console.warn(`[DB Ops] Could not fetch impression record ${directImpressionId} for token ${tokenValue}:`, impError?.message || 'Not found');
      } else {
        impressionRecord = impData;
      }
    } else {
        console.warn(`[DB Ops] No impression_id found on token record ${tokenRecord.id} for token value ${tokenValue}. Conversion will lack some details for calculation.`);
    }
    
    const conversionDetails: Record<string, unknown> = {
      verification_method: "email_link_click",
      token_id: tokenRecord.id,
      token_created_at: tokenRecord.created_at
    };

    if (impressionRecord) {
        conversionDetails.original_impression_details = {
            page_url: impressionRecord.page_url, 
            user_agent: impressionRecord.user_agent,
            ip_address: impressionRecord.ip_address, 
            geo_country: impressionRecord.country_code,
            geo_region: impressionRecord.region,
            geo_city: impressionRecord.city
        };
    }

    // Constructing the object for the 'conversions' table
    // Ensuring all keys match the snake_case column names from database-schema.md
    const conversionData: ConversionInsertData = {
      user_identifier: tokenRecord.user_profile_id,
      conversion_type: 'email_verified',
      experiment_id: tokenRecord.experiment_id,
      variant_id: tokenRecord.variant_id,
      created_at: nowISO,
      session_identifier: impressionRecord?.session_identifier || null,
      details: conversionDetails,
      conversion_value: 1, // Defaulting to 1 for 'email_verified' type
      device_type: impressionRecord?.device_type || null,
      time_to_convert: (impressionRecord && impressionRecord.impression_at)
        ? Math.round((now.getTime() - new Date(impressionRecord.impression_at).getTime()) / 1000)
        : null,
      conversion_context: {
        source: 'email_verification_link_click',
        notes: impressionRecord ? 'Linked to original impression for context.' : 'Original impression not found or not linked.',
        token_id_used: tokenRecord.id // Storing token_id in context
      },
      metadata: {
          email_used_for_verification: tokenRecord.email,
          related_impression_id: directImpressionId || null // Storing related impression_id in metadata for audit
      }
    };
    
    // Clean undefined properties before insert. Null properties are fine.
    // Object.keys(conversionData).forEach(key => {
    //   if (conversionData[key as keyof ConversionInsertData] === undefined) {
    //     delete conversionData[key as keyof ConversionInsertData];
    //   }
    // });

    const { error: conversionError } = await supabase.from('conversions').insert(conversionData);
    
    if (conversionError) {
      console.warn(`[DB Ops] Failed to log 'email_verified' conversion for user ${tokenRecord.user_profile_id}, experiment ${tokenRecord.experiment_id || 'N/A'}:`, conversionError.message);
    } else {
      console.log(`[DB Ops] 'email_verified' conversion logged for user ${tokenRecord.user_profile_id}, experiment ${tokenRecord.experiment_id || 'N/A'}.`);
    }

    return {
      success: true,
      message: 'Email successfully verified!',
      userProfileId: tokenRecord.user_profile_id,
      email: updatedUserProfile.email,
      firstName: updatedUserProfile.first_name,
      kitSubscriberId: updatedUserProfile.kit_subscriber_id,
      experimentId: tokenRecord.experiment_id,
      variantId: tokenRecord.variant_id,
      action_token: tokenRecord.user_profiles.action_token,
      error: null,
    };

  } catch (err: unknown) {
    console.error('[DB Ops] Exception in verifyTokenAndLogConversion:', err);
    const message = err instanceof Error ? err.message : 'An unexpected server error occurred during verification.';
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

export async function logHeroImpression(impressionData: ImpressionData): Promise<SingleResult<ImpressionRecord>> {
    if (!impressionData.experiment_id || !impressionData.variant_id || !impressionData.user_identifier) {
        // Ensure the error object matches PostgrestError structure if possible, or a simple error object
        return { 
            data: null, 
            error: { 
                message: 'Experiment ID, Variant ID, and User Identifier are required for impression logging.', 
                details: 'Missing required fields for logHeroImpression', 
                hint: 'Provide all required IDs.', 
                code: '400' 
            } as PostgrestError // Cast to PostgrestError; be mindful if this structure isn't exact for custom errors
        };
    }
    try {
        const payload: Record<string, unknown> = {
            experiment_id: impressionData.experiment_id,
            variant_id: impressionData.variant_id,
            user_identifier: impressionData.user_identifier,
            impression_at: new Date().toISOString(),
            page_url: impressionData.page_url,
            session_identifier: impressionData.session_identifier,
            device_type: impressionData.device_type,
            metadata: impressionData.metadata || {},
            // Ensure all other NOT NULL columns from your 'impressions' table 
            // without DB defaults are handled here or passed in impressionData.
            // Based on your schema, 'user_eligibility_status', 'is_first_exposure', 'user_was_eligible'
            // might need default values or to be passed.
            // For now, assuming they have DB defaults or are nullable.
        };
        
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        const { data, error } = await supabase
            .from('impressions')
            .insert(payload)
            .select()
            .single();

        return { data: data as ImpressionRecord | null, error }; // Cast data to ImpressionRecord
    } catch (err) {
        console.error('Error logging hero impression:', err);
        return { data: null, error: err as PostgrestError };
    }
}
// NEW FUNCTIONS END

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
      return { data: null, error: { message: 'RPC returned null data without error.', details: '', hint: '', code: '500'} as PostgrestError };
    }
     // If data is not null and not the expected object, it's an unexpected response type.
    console.error('[DB Ops] Unexpected data structure from handle_quiz_submission RPC:', data);
    return { data: null, error: { message: 'Unexpected data structure from RPC.', details: String(data), hint: '', code: '500'} as PostgrestError };


  } catch (err: unknown) {
    console.error('[DB Ops] Exception in callHandleQuizSubmissionRpc:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { data: null, error: { message, details: '', hint: '', code: '500' } as PostgrestError };
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