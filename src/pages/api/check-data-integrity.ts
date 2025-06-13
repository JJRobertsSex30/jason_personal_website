import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

type VariantWithExperiment = {
  name: string;
  experiments: {
    name: string;
  };
};

type ConversionWithRelations = {
  id: string;
  user_profile_id: string;
  variant_id: string;
  experiment_id: string;
  created_at: string;
  conversion_type: string;
  variants: VariantWithExperiment;
};

// --- Integrity Check Functions ---

async function findMissingImpressions(issues: { type: string; conversion_id: string; variant_id: string; experiment_id: string; user_profile_id: string; issue: string; }[]) {
  const { data: conversions, error } = await supabase
    .from('conversions')
    .select<string, ConversionWithRelations>(`
      id,
      user_profile_id,
      variant_id,
      experiment_id,
      created_at,
      conversion_type,
      variants!inner(name, experiments!inner(name))
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching conversions for integrity check:', error);
    return;
  }
  if (!conversions) return;

  for (const conversion of conversions) {
    const { data: impression } = await supabase
      .from('impressions')
      .select('id')
      .eq('user_profile_id', conversion.user_profile_id)
      .eq('variant_id', conversion.variant_id)
      .limit(1)
      .maybeSingle();

    if (!impression) {
      issues.push({
        type: 'Missing Impression',
        conversion_id: conversion.id,
        variant_id: conversion.variant_id,
        experiment_id: conversion.experiment_id,
        user_profile_id: conversion.user_profile_id,
        issue: 'Conversion exists without corresponding impression'
      });
    }
  }
}

async function analyzeVariantPerformance(summary: { variant_id: string; variant_name: string; experiment_name: string; impressions: number; conversions: number; conversion_rate: number; has_integrity_issue: boolean; }[]) {
  const { data: variants, error } = await supabase
    .from('variants')
    .select(`
      id,
      name,
      experiments!inner(name)
    `);

  if (error) {
    console.error('Error fetching variants for performance analysis:', error);
    return;
  }
  if (!variants) return;

  for (const variant of variants) {
    const { count: variantImpressions } = await supabase
      .from('impressions')
      .select('id', { count: 'exact', head: true })
      .eq('variant_id', variant.id);

    const { count: variantConversions } = await supabase
      .from('conversions')
      .select('id', { count: 'exact', head: true })
      .eq('variant_id', variant.id);
    
    const hasIntegrityIssue = false; // Placeholder for more advanced logic

    summary.push({
      variant_id: variant.id,
      variant_name: variant.name,
      experiment_name: variant.experiments[0].name,
      impressions: variantImpressions ?? 0,
      conversions: variantConversions ?? 0,
      conversion_rate: (variantImpressions && variantConversions) ? (variantConversions / variantImpressions) * 100 : 0,
      has_integrity_issue: hasIntegrityIssue,
    });
  }
}

async function getOverallStats(stats: Record<string, number>) {
  const { count: totalImpressions } = await supabase.from('impressions').select('id', { count: 'exact', head: true });
  const { count: totalConversions } = await supabase.from('conversions').select('id', { count: 'exact', head: true });

  stats.total_impressions = totalImpressions ?? 0;
  stats.total_conversions = totalConversions ?? 0;
  stats.overall_conversion_rate = (totalImpressions && totalConversions) ? (totalConversions / totalImpressions) * 100 : 0;
}


export const GET: APIRoute = async () => {
  try {
    const issues: { type: string; conversion_id: string; variant_id: string; experiment_id: string; user_profile_id: string; issue: string; }[] = [];
    const summary: { variant_id: string; variant_name: string; experiment_name: string; impressions: number; conversions: number; conversion_rate: number; has_integrity_issue: boolean; }[] = [];
    const stats: Record<string, number> = {};

    await Promise.all([
      findMissingImpressions(issues),
      analyzeVariantPerformance(summary),
      getOverallStats(stats)
    ]);

    return new Response(JSON.stringify({
      integrity_issues: issues,
      variant_performance_summary: summary,
      overall_stats: stats,
      last_checked: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('Data integrity check failed:', error);
    return new Response(JSON.stringify({ error: 'Data integrity check failed', details: error }), { status: 500 });
  }
}; 