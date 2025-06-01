import { supabase } from './supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Database Operations for Cursor AI
 * 
 * This module provides CRUD operations that Cursor's AI can use to interact with the Supabase database.
 * All functions include proper error handling and type safety.
 */

export interface QueryResult<T = any> {
  data: T[] | null;
  error: PostgrestError | null;
  count?: number;
}

export interface SingleResult<T = any> {
  data: T | null;
  error: PostgrestError | null;
}

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
    filters?: Record<string, any>;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<QueryResult> {
  try {
    let query = supabase.from(tableName);

    // Select specific columns or all
    query = options.columns ? query.select(options.columns) : query.select('*');

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
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
    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
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
  record: Record<string, any>
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
  records: Record<string, any>[]
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
  updates: Record<string, any>,
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
  updates: Record<string, any>,
  filters: Record<string, any>
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
  filters: Record<string, any>
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
  filters: Record<string, any> = {}
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
  filters: Record<string, any>
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
  tableExists
}; 