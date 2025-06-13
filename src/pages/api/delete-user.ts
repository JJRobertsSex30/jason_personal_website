import type { APIRoute } from 'astro';
import { hardDeleteUserById } from '~/lib/database-operations';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing userId' }), { status: 400 });
    }
    const result = await hardDeleteUserById(userId);
    if (result.success) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ success: false, error: result.error }), { status: 500 });
    }
  } catch (err) {
    console.error('[API] Error in delete-user:', err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
};

export const GET: APIRoute = async () => new Response('Method Not Allowed', { status: 405 });
export const PUT: APIRoute = async () => new Response('Method Not Allowed', { status: 405 });
export const DELETE: APIRoute = async () => new Response('Method Not Allowed', { status: 405 });
export const PATCH: APIRoute = async () => new Response('Method Not Allowed', { status: 405 }); 