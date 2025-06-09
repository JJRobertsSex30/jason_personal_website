import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import pkg from 'node-sql-parser';
const { Parser } = pkg;
import type { DbSchema, DbTable } from '~/lib/db-schema';

// This is the definitive implementation using node-sql-parser.
// It correctly handles complex expressions by using the library's `sqlify` method.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSchema(ast: any[], parser: pkg.Parser): DbSchema {
    const schema: DbSchema = {
        tables: [], relations: [], views: [], functions: [], triggers: [], enums: [], indexes: []
    };

    for (const stmt of ast) {
        if (!stmt || stmt.type !== 'create') continue;

        try {
            switch (stmt.keyword) {
                case 'table': {
                    if (!stmt.table || !stmt.table[0]) continue;
                    const table: DbTable = {
                        name: stmt.table[0].table,
                        columns: [],
                    };
                    if (stmt.create_definitions) {
                        for (const def of stmt.create_definitions) {
                            if (def.resource === 'column' && def.column) {
                                let defaultValue: string | null = null;
                                if (def.default_val) {
                                    try {
                                        defaultValue = parser.sqlify(def.default_val);
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    } catch (_e) {
                                        console.warn(`Could not sqlify default value for column ${def.column.column}: `, def.default_val);
                                        defaultValue = '[unsupported]';
                                    }
                                }
                                table.columns.push({
                                    name: def.column.column,
                                    type: def.definition.dataType,
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    is_nullable: !def.constraints?.some((c: any) => c.type === 'not null' || c.constraint_type === 'not null'),
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    is_primary_key: !!def.constraints?.some((c: any) => c.constraint_type === 'primary key'),
                                    default_value: defaultValue,
                                });
                            }
                            if (def.constraint_type === 'foreign key' && def.definition?.references) {
                                schema.relations.push({
                                    source_table: table.name,
                                    source_column: def.columns[0].column,
                                    target_table: def.definition.references.table[0].table,
                                    target_column: def.definition.references.columns[0].column,
                                });
                            }
                        }
                    }
                    schema.tables.push(table);
                    break;
                }
                case 'index': {
                    if (stmt.name && stmt.on && stmt.with) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const columns = stmt.with.map((col: any) => {
                            try {
                                return parser.sqlify(col);
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            } catch (_e) {
                                console.error(`Failed to sqlify index column for index '${stmt.name}':`, col);
                                return '[unsupported_expression]';
                            }
                        });

                        schema.indexes?.push({
                            name: stmt.name,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            table: stmt.on.map((t: any) => t.table).join('.'),
                            unique: !!stmt.unique,
                            columns: columns,
                        });
                    }
                    break;
                }
                 case 'view': {
                    if (stmt.name?.length > 0) {
                        schema.views?.push({
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            name: stmt.name.map((n: any) => n.table).join('.'),
                            definition: parser.sqlify(stmt),
                        });
                    }
                    break;
                }
            }
        } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error(`Error processing statement: ${JSON.stringify(stmt, null, 2)}`, e as any);
        }
    }
    return schema;
}

function generateMarkdown(schema: DbSchema): string {
    let md = '# Database Schema\n\n';
    if (schema.tables.length > 0) {
        md += '## Tables\n\n';
        for (const table of schema.tables) {
             md += `### \`${table.name}\`\n\n`;
             md += '| Column | Type | Nullable | Primary Key | Default |\n';
             md += '|--------|------|----------|-------------|---------|\n';
             for (const col of table.columns) {
                 md += `| \`${col.name}\` | \`${col.type}\` | ${col.is_nullable ? '✅' : '❌'} | ${col.is_primary_key ? '🔑' : ''} | ${col.default_value ? `\`${col.default_value}\``: ''} |\n`;
             }
             md += '\n';
         }
     }
     // TODO: Add rendering for other schema objects
     return md;
}

function splitSql(sql: string): string[] {
    // This split is naive and will fail on semicolons inside strings or complex functions.
    // However, it's sufficient for a standard pg_dump DDL file.
    return sql.split(';').map(s => s.trim()).filter(s => {
        const upper = s.toUpperCase();
        return s.length > 0 && !upper.startsWith('SET') && !upper.startsWith('SELECT PG_CATALOG.SET_CONFIG') && !upper.startsWith('COMMENT ON');
    });
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const sqlFile = formData.get('sqlFile') as File;
        if (!sqlFile) {
            return new Response(JSON.stringify({ message: 'No file uploaded.' }), { status: 400 });
        }

        const sqlContent = await sqlFile.text();
        const outputDir = path.resolve(process.cwd(), 'public');
        const jsonPath = path.join(outputDir, 'db-schema.json');
        const mdPath = path.join(process.cwd(), 'database-schema.md');

        try { await fs.rename(jsonPath, `${jsonPath}.old`); } catch { /* ignore */ }
        try { await fs.rename(mdPath, `${mdPath}.old`); } catch { /* ignore */ }

        const parser = new Parser();
        const statements = splitSql(sqlContent);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allAsts: any[] = [];
        for (const stmt of statements) {
            try {
                const ast = parser.astify(stmt, { database: 'PostgreSQL' });
                allAsts.push(...(Array.isArray(ast) ? ast : [ast]));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
                // Ignore statements that the parser can't handle, like unsupported function bodies
                console.warn(`Skipping unparsable statement: ${stmt.substring(0, 70)}...`);
            }
        }
        
        const schemaJson = extractSchema(allAsts, parser);
        const schemaMd = generateMarkdown(schemaJson);

        await fs.writeFile(jsonPath, JSON.stringify(schemaJson, null, 2));
        await fs.writeFile(mdPath, schemaMd);
        
        return new Response(JSON.stringify({ message: 'Schema updated successfully!' }), { status: 200 });
    } catch (error) {
        const err = error as Error;
        console.error('Error processing SQL file:', err);
        return new Response(JSON.stringify({ message: err.message || 'An unexpected error occurred.', stack: err.stack }), { status: 500 });
    }
};
