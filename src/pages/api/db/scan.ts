import type { APIRoute } from 'astro';
import { scanDatabaseSchema } from '~/lib/db-schema';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async () => {
  try {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key is not configured on the server.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const schema = await scanDatabaseSchema(supabaseAdmin);
    
    const filePath = path.join(process.cwd(), 'public', 'db-schema.json');
    await fs.writeFile(filePath, JSON.stringify(schema, null, 2));
    
    return new Response(JSON.stringify({ message: 'Database scan complete and schema saved.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('[API /db/scan] Failed to scan database or write schema file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ message: `Failed to scan database: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 