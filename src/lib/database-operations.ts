import { supabase } from './supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Database Operations for Cursor AI
 * 
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
}

export interface ImpressionData {
  experiment_id: string; // UUID
  variant_id: string; // UUID
  user_identifier: string; // This will be the user_profiles.id
  page_url?: string;
  metadata?: Record<string, unknown>;
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
  experimentId?: string | null; // Can be null if not set on token
  variantId?: string | null;   // Can be null if not set on token
  error?: PostgrestError | string | null;
}

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

    // 2. Create new user if not found
    const newReferralCode = crypto.randomUUID();
    const { data: newUser, error: createError } = await supabase
      .from('user_profiles')
      .insert({ 
        email: email.toLowerCase().trim(), 
        is_email_verified: false,
        referral_code: newReferralCode,
        // insight_gems will use the DB default of 100
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
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
  experimentId?: string | null, // Optional experimentId
  variantId?: string | null     // Optional variantId
): Promise<GenerateTokenResult> {
  console.log(`[DB Ops] generateAndStoreVerificationToken called for userId: ${userId}, email: ${email}, experimentId: ${experimentId}, variantId: ${variantId}`);
  if (!userId || !email) {
    return { token: null, error: 'User ID and email are required to generate a token.' };
  }

  const token = globalThis.crypto.randomUUID(); // Simple UUID token
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours

  try {
    const { error: insertError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_profile_id: userId,
        token: token,
        email: email,
        expires_at: expiresAt.toISOString(),
        experiment_id: experimentId, // Store experiment_id
        variant_id: variantId,       // Store variant_id
      });

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
    // 1. Find the token
    const { data: tokenRecord, error: findError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', tokenValue)
      .single();

    if (findError || !tokenRecord) {
      console.warn(`[DB Ops] Verification token not found or error fetching: ${tokenValue}`, findError);
      return { success: false, message: 'Invalid or expired verification link. Please try again.', error: findError || 'Token not found' };
    }

    // 2. Check if already used
    if (tokenRecord.is_used) {
      console.log(`[DB Ops] Verification token ${tokenValue} has already been used for user ${tokenRecord.user_profile_id}.`);
      return { success: false, message: 'This verification link has already been used.', userProfileId: tokenRecord.user_profile_id, email: tokenRecord.email, error: 'Token already used' };
    }

    // 3. Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      console.log(`[DB Ops] Verification token ${tokenValue} has expired for user ${tokenRecord.user_profile_id}.`);
      return { success: false, message: 'This verification link has expired. Please request a new one.', error: 'Token expired' };
    }

    const now = new Date().toISOString();

    // 4. Mark token as used
    const { error: updateTokenError } = await supabase
      .from('email_verification_tokens')
      .update({ is_used: true, used_at: now })
      .eq('id', tokenRecord.id);

    if (updateTokenError) {
      console.error(`[DB Ops] Error marking token ${tokenValue} as used for user ${tokenRecord.user_profile_id}:`, updateTokenError);
      return { success: false, message: 'Error processing verification. Please try again.', error: updateTokenError };
    }

    // 5. Update user_profiles table
    const { error: updateUserError } = await supabase
      .from('user_profiles')
      .update({ is_email_verified: true, email_verified_at: now })
      .eq('id', tokenRecord.user_profile_id);

    if (updateUserError) {
      console.error(`[DB Ops] Error updating user profile ${tokenRecord.user_profile_id} to verified:`, updateUserError);
      // Potentially roll back token usage or log for manual intervention? For now, report error.
      return { success: false, message: 'Error finalizing email verification. Please contact support.', error: updateUserError };
    }
    console.log(`[DB Ops] User profile ${tokenRecord.user_profile_id} marked as verified.`);

    // 6. Log conversion (if experiment_id and variant_id are present)
    if (tokenRecord.experiment_id && tokenRecord.variant_id) {
      const conversionData = {
        experiment_id: tokenRecord.experiment_id,
        variant_id: tokenRecord.variant_id,
        user_identifier: tokenRecord.user_profile_id,
        conversion_type: 'email_verified', // Standardized conversion type
        metadata: { 
          source: 'email_verification_link',
          email: tokenRecord.email,
          token_id: tokenRecord.id
        }
      };
      const { error: conversionError } = await supabase.from('conversions').insert(conversionData);
      if (conversionError) {
        console.warn(`[DB Ops] Failed to log 'email_verified' conversion for user ${tokenRecord.user_profile_id}, experiment ${tokenRecord.experiment_id}:`, conversionError.message);
        // Non-critical for the verification itself, so just log a warning.
      } else {
        console.log(`[DB Ops] 'email_verified' conversion logged for user ${tokenRecord.user_profile_id}, experiment ${tokenRecord.experiment_id}.`);
      }
    }

    return {
      success: true,
      message: 'Email successfully verified!',
      userProfileId: tokenRecord.user_profile_id,
      email: tokenRecord.email,
      experimentId: tokenRecord.experiment_id,
      variantId: tokenRecord.variant_id
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

export async function logHeroImpression(impressionData: ImpressionData): Promise<SingleResult> {
    if (!impressionData.experiment_id || !impressionData.variant_id || !impressionData.user_identifier) {
        // Ensure the error object structure matches PostgrestError if SingleResult expects it.
        // A basic PostgrestError has message, details, hint, code. Adding name due to linter.
        return { data: null, error: { name: 'ValidationError', message: 'Experiment ID, Variant ID, and User Identifier are required for impression logging.', details: 'Missing required fields for logHeroImpression', hint: 'Provide all required IDs.', code: '400' }};
    }
    try {
        const payload: Record<string, unknown> = {
            experiment_id: impressionData.experiment_id,
            variant_id: impressionData.variant_id,
            user_identifier: impressionData.user_identifier,
            impression_at: new Date().toISOString(),
            page_url: impressionData.page_url,
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
            .single(); // Assuming you expect one impression record back

        return { data, error };
    } catch (err) {
        console.error('Error logging hero impression:', err);
        return { data: null, error: err as PostgrestError };
    }
}
// NEW FUNCTIONS END

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
  logHeroImpression
}; 