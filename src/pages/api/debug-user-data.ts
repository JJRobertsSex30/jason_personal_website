import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { userIdentifier } = await request.json();

    if (!userIdentifier) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User identifier is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Debug User Data] Analyzing data for user: ${userIdentifier}`);

    // Get all impressions for this user
    const { data: impressions, error: impressionsError } = await supabase
      .from('impressions')
      .select(`
        id,
        variant_id,
        experiment_id,
        user_identifier,
        created_at,
        user_was_eligible,
        user_eligibility_status,
        variants!inner(name, experiments!inner(name))
      `)
      .eq('user_identifier', userIdentifier)
      .order('created_at', { ascending: false });

    // Get all conversions for this user
    const { data: conversions, error: conversionsError } = await supabase
      .from('conversions')
      .select(`
        id,
        variant_id,
        experiment_id,
        user_identifier,
        conversion_type,
        created_at,
        conversion_eligibility_verified,
        variants!inner(name, experiments!inner(name))
      `)
      .eq('user_identifier', userIdentifier)
      .order('created_at', { ascending: false });

    if (impressionsError || conversionsError) {
      throw new Error(`Database error: ${impressionsError?.message || conversionsError?.message}`);
    }

    // Analyze data integrity
    const integrityAnalysis = [];
    
    for (const conversion of conversions || []) {
      const matchingImpression = impressions?.find(imp => 
        imp.variant_id === conversion.variant_id && 
        imp.experiment_id === conversion.experiment_id
      );

      if (!matchingImpression) {
        integrityAnalysis.push({
          issue: 'CONVERSION_WITHOUT_IMPRESSION',
          conversion_id: conversion.id,
          variant_id: conversion.variant_id,
          variant_name: conversion.variants.name,
          experiment_name: conversion.variants.experiments.name,
          conversion_type: conversion.conversion_type,
          conversion_time: conversion.created_at,
          conversion_eligibility: conversion.conversion_eligibility_verified
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      user_identifier: userIdentifier,
      summary: {
        total_impressions: impressions?.length || 0,
        total_conversions: conversions?.length || 0,
        integrity_issues: integrityAnalysis.length
      },
      impressions: impressions || [],
      conversions: conversions || [],
      integrity_analysis: integrityAnalysis,
      debug_info: {
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'server-side'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Debug User Data] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 