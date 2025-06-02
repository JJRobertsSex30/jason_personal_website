import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const GET: APIRoute = async () => {
  try {
    console.log('[Data Integrity Check] Starting comprehensive A/B testing data integrity check...');

    // Find conversions that don't have corresponding impressions (the bug we just fixed)
    const { data: orphanedConversions, error: orphanedError } = await supabase
      .from('conversions')
      .select(`
        id,
        variant_id,
        experiment_id,
        user_identifier,
        conversion_type,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (orphanedError) {
      throw new Error(`Failed to fetch conversions: ${orphanedError.message}`);
    }

    const integrityIssues = [];

    // Check each conversion for corresponding impression
    for (const conversion of orphanedConversions || []) {
      const { data: impression, error: impressionError } = await supabase
        .from('impressions')
        .select('id, created_at')
        .eq('variant_id', conversion.variant_id)
        .eq('user_identifier', conversion.user_identifier)
        .eq('experiment_id', conversion.experiment_id)
        .limit(1)
        .maybeSingle();

      if (impressionError) {
        console.error(`Error checking impression for conversion ${conversion.id}:`, impressionError);
        continue;
      }

      if (!impression) {
        integrityIssues.push({
          type: 'conversion_without_impression',
          conversion_id: conversion.id,
          variant_id: conversion.variant_id,
          experiment_id: conversion.experiment_id,
          user_identifier: conversion.user_identifier,
          conversion_type: conversion.conversion_type,
          conversion_created_at: conversion.created_at,
          issue: 'Conversion exists without corresponding impression'
        });
      }
    }

    // Get summary statistics
    const { count: totalImpressions } = await supabase
      .from('impressions')
      .select('*', { count: 'exact', head: true });

    const { count: totalConversions } = await supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true });

    // Get variant-level statistics to identify inconsistencies
    const { data: variants, error: variantsError } = await supabase
      .from('variants')
      .select(`
        id,
        name,
        experiment_id,
        experiments!inner(name)
      `);

    if (variantsError) {
      throw new Error(`Failed to fetch variants: ${variantsError.message}`);
    }

    const variantStats = [];
    for (const variant of variants || []) {
      const { count: variantImpressions } = await supabase
        .from('impressions')
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', variant.id);

      const { count: variantConversions } = await supabase
        .from('conversions')
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', variant.id);

      const rate = variantImpressions > 0 ? (variantConversions / variantImpressions) * 100 : 0;

      variantStats.push({
        variant_id: variant.id,
        variant_name: variant.name,
        experiment_name: variant.experiments.name,
        impressions: variantImpressions,
        conversions: variantConversions,
        conversion_rate: rate,
        has_integrity_issue: variantConversions > variantImpressions
      });
    }

    const summary = {
      total_impressions: totalImpressions,
      total_conversions: totalConversions,
      overall_conversion_rate: totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0,
      integrity_issues_found: integrityIssues.length,
      variants_with_issues: variantStats.filter(v => v.has_integrity_issue).length,
      check_timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      success: true,
      summary,
      integrity_issues: integrityIssues,
      variant_stats: variantStats,
      recommendations: integrityIssues.length > 0 ? [
        'Consider clearing data for affected experiments and restarting A/B tests',
        'Update tracking code to ensure impressions are logged before conversions',
        'Monitor user eligibility logic to prevent similar issues'
      ] : [
        'Data integrity looks good!',
        'Continue monitoring for future integrity issues'
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Data Integrity Check] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 