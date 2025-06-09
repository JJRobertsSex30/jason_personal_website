import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

// Define explicit types for the nested query results
type VariantWithExperiment = {
  name: string;
  experiments: {
    name: string;
  };
};

type ConversionWithRelations = {
  id: string;
  variant_id: string;
  experiment_id: string;
  user_id: string;
  conversion_type: string;
  created_at: string;
  conversion_eligibility_verified: boolean;
  variants: VariantWithExperiment;
};

type ImpressionWithRelations = {
    id: string;
    variant_id: string;
    experiment_id: string;
    user_id: string;
    created_at: string;
    user_was_eligible: boolean;
    user_eligibility_status: string;
    variants: VariantWithExperiment;
};

type IntegrityIssue = {
  issue: string;
  conversion_id: string;
  variant_id: string;
  variant_name: string;
  experiment_name: string;
  conversion_type: string;
  conversion_time: string;
  conversion_eligibility: boolean;
};

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const userIdentifier = url.searchParams.get('user_id');

  try {
    if (!userIdentifier) return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400 });

    const { data: impressions, error: impressionsError } = await supabase
      .from('impressions')
      .select<string, ImpressionWithRelations>(`
        id,
        variant_id,
        experiment_id,
        user_id,
        created_at,
        user_was_eligible,
        user_eligibility_status,
        variants!inner(name, experiments!inner(name))
      `)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: false });

    const { data: conversions, error: conversionsError } = await supabase
      .from('conversions')
      .select<string, ConversionWithRelations>(`
        id,
        variant_id,
        experiment_id,
        user_id,
        conversion_type,
        created_at,
        conversion_eligibility_verified,
        variants!inner(name, experiments!inner(name))
      `)
      .eq('user_id', userIdentifier)
      .order('created_at', { ascending: false });

    if (impressionsError || conversionsError) {
      throw new Error(`Database error: ${impressionsError?.message || conversionsError?.message}`);
    }

    // Analyze data integrity
    const integrityIssues: IntegrityIssue[] = [];
    if (conversions) {
      for (const conversion of conversions) {
        if (!conversion.conversion_eligibility_verified) {
          const matchingImpression = impressions?.find(imp => 
            imp.variant_id === conversion.variant_id && 
            imp.experiment_id === conversion.experiment_id
          );

          if (!matchingImpression) {
            integrityIssues.push({
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
      }
    }

    const { error: engagementError } = await supabase
      .from('user_engagement_tracking')
      .insert({
        user_id: userIdentifier,
        engagement_type: 'debug_data_viewed',
        experiment_context: `Debug for user: ${userIdentifier}`,
      });

    if (engagementError) console.error(`Engagement Tracking Error:`, engagementError.message);

    return new Response(JSON.stringify({ 
      success: true,
      user_identifier: userIdentifier,
      summary: {
        total_impressions: impressions?.length || 0,
        total_conversions: conversions?.length || 0,
        integrity_issues: integrityIssues.length
      },
      impressions: impressions || [],
      conversions: conversions || [],
      integrity_analysis: integrityIssues,
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