export const prerender = false;

import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

// Initialize Supabase client
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const GET: APIRoute = async () => {
  try {
    // Get authentication state
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session found');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', session.user.email);

    // Fetch real data from Supabase
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscribers:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = {
      data: {
        subscribers: subscribers || []
      }
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch dashboard data' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      }
    });
  }
};
