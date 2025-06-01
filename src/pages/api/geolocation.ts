export const prerender = false;
import type { APIRoute } from 'astro';
import { getServerSideGeoLocation } from '~/lib/geoLocationService';

export const GET: APIRoute = async ({ request }) => {
  try {
    console.log('[Geolocation API] Processing geolocation request');
    console.log('[Geolocation API] Request headers:', Object.fromEntries(request.headers.entries()));

    // Get geolocation data for the requesting IP
    const geoData = await getServerSideGeoLocation(request);
    
    console.log('[Geolocation API] Geolocation result:', geoData);

    // Return geolocation data
    return new Response(JSON.stringify({
      success: true,
      data: geoData,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('[Geolocation API] Error processing request:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get geolocation data',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}; 