import type { SupabaseClient } from '@supabase/supabase-js';

// Define the structure of the output, which will be saved as JSON
export interface DbTable {
  name: string;
  columns: {
    name: string;
    type: string;
    is_nullable: boolean;
    is_primary_key: boolean;
    default_value: string | null;
  }[];
}

export interface DbRelation {
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
}

export interface DbSchema {
  tables: DbTable[];
  relations: DbRelation[];
}

// This function connects to the database using the provided Supabase client
// and inspects the schema.
export async function scanDatabaseSchema(supabase: SupabaseClient): Promise<DbSchema> {
  // Combined query for tables, columns, and primary keys for efficiency.
  const tablesQuery = `
    SELECT
        t.table_name,
        json_agg(
            json_build_object(
                'name', c.column_name,
                'type', c.data_type,
                'is_nullable', c.is_nullable = 'YES',
                'is_primary_key', pk.column_name IS NOT NULL,
                'default_value', c.column_default
            ) ORDER BY c.ordinal_position
        ) AS columns
    FROM
        information_schema.tables t
    JOIN
        information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    LEFT JOIN (
        SELECT
            tc.table_schema,
            tc.table_name,
            kcu.column_name
        FROM
            information_schema.table_constraints tc
        JOIN
            information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE
            tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name AND t.table_schema = pk.table_schema
    WHERE
        t.table_schema = 'public'
    GROUP BY
        t.table_name
    ORDER BY
        t.table_name
  `;

  // Query for all foreign key relationships in the 'public' schema.
  const relationsQuery = `
    SELECT
        kcu.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `;

  // Execute both queries using the 'exec_sql' RPC function.
  const [tablesResult, relationsResult] = await Promise.all([
    supabase.rpc('exec_sql', { sql_query: tablesQuery }),
    supabase.rpc('exec_sql', { sql_query: relationsQuery })
  ]);

  if (tablesResult.error) {
    console.error('Error fetching tables:', tablesResult.error);
    throw new Error(`Error fetching tables: ${tablesResult.error.message}`);
  }

  if (relationsResult.error) {
    console.error('Error fetching relations:', relationsResult.error);
    throw new Error(`Error fetching relations: ${relationsResult.error.message}`);
  }

  // The RPC call returns data where each row is a JSON string. We need to parse it.
  const tables: DbTable[] = (tablesResult.data || []).map((row: { table_name: string, columns: string | DbTable['columns'] }) => ({
    name: row.table_name,
    columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
  }));
  
  const relations: DbRelation[] = relationsResult.data || [];

  return {
    tables,
    relations,
  };
} 