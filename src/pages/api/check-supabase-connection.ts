import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const GET: APIRoute = async () => {
  try {
    console.log('[Supabase Connection Check] Testing Supabase connectivity...');

    const startTime = Date.now();

    // Simple query to test connection
    const { data, error, status, statusText } = await supabase
      .from('experiments')
      .select('id')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      console.error('[Supabase Connection Check] Connection failed:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        details: error,
        response_time_ms: responseTime,
        status_code: status,
        status_text: statusText,
        timestamp: new Date().toISOString(),
        diagnosis: error.message?.includes('NetworkError') || error.message?.includes('fetch') 
          ? 'Network connectivity issue - check internet connection and Supabase status'
          : 'Database or authentication issue - check Supabase project status and credentials'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Supabase connection successful',
      response_time_ms: responseTime,
      data_returned: data ? data.length : 0,
      status_code: status,
      status_text: statusText,
      timestamp: new Date().toISOString(),
      health_status: responseTime < 1000 ? 'excellent' : responseTime < 3000 ? 'good' : 'slow'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Supabase Connection Check] Unexpected error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      diagnosis: 'Unexpected error occurred - check Supabase configuration and network'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 