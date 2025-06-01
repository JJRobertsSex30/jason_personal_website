import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Basic validation
    if (!data.variant_id || !data.experiment_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing required fields: variant_id, experiment_id' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get geolocation data
    let geoData = {};
    try {
      const geoResponse = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=' + import.meta.env.IPGEOLOCATION_API_KEY + '&ip=' + (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'auto'));
      if (geoResponse.ok) {
        const geoJson = await geoResponse.json();
        geoData = {
          country_code: geoJson.country_code2 || null,
          region: geoJson.state_prov || null,
          city: geoJson.city || null
        };
      }
    } catch (error) {
      console.error('[Fallback Impression] Geolocation fetch failed:', error);
    }

    // Get connection type from user agent (basic detection)
    const userAgent = data.user_agent || '';
    let connectionType: string | null = null;
    if (userAgent.includes('Mobile')) {
      connectionType = '4g'; // Default for mobile
    } else {
      connectionType = 'wifi'; // Default for desktop
    }

    // Parse UTM parameters from page URL
    const urlParams = new URLSearchParams(new URL(data.page_url).search);
    const utmData = {
      utm_source: urlParams.get('utm_source') || null,
      utm_medium: urlParams.get('utm_medium') || null,  
      utm_campaign: urlParams.get('utm_campaign') || null
    };

    // Insert impression into database
    const impressionData = {
      variant_id: data.variant_id,
      experiment_id: data.experiment_id,
      user_identifier: data.user_identifier,
      session_identifier: data.session_identifier,
      page_url: data.page_url,
      user_agent: data.user_agent,
      language_code: 'en', // Default
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      device_type: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      connection_type: connectionType,
      ...geoData,
      ...utmData,
      metadata: {
        ...data.metadata,
        fallback_api: true,
        ip_address: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
      }
    };

    const { data: insertResult, error } = await supabase
      .from('impressions')
      .insert([impressionData])
      .select()
      .single();

    if (error) {
      console.error('[Fallback Impression] Database error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Database error: ' + error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[Fallback Impression] Successfully logged impression:', insertResult.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Impression logged successfully',
      impression_id: insertResult.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Fallback Impression] API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 