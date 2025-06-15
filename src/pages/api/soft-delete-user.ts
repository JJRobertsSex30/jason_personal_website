import type { APIRoute } from 'astro';
import { softDeleteUserById } from '../../lib/database-operations';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing userId' }), { status: 400 });
    }
    const result = await softDeleteUserById(userId);
    if (result.success) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ success: false, error: result.error || 'Unknown error' }), { status: 500 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}; 