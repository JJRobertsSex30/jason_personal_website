export const prerender = false;
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}; 