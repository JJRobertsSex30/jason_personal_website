import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { experimentId } = await request.json();

    if (!experimentId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Experiment ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Clear Experiment Data] Starting data cleanup for experiment: ${experimentId}`);

    // First, get all variant IDs for this experiment
    const { data: variants, error: variantsError } = await supabase
      .from('variants')
      .select('id')
      .eq('experiment_id', experimentId);

    if (variantsError) {
      console.error('[Clear Experiment Data] Error fetching variants:', variantsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch experiment variants' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!variants || variants.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No variants found for this experiment, no data to clear',
        deletedImpressions: 0,
        deletedConversions: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const variantIds = variants.map(v => v.id);
    console.log(`[Clear Experiment Data] Found ${variantIds.length} variants to clear data for`);

    // Delete all impressions for these variants
    const { count: deletedImpressions, error: impressionsError } = await supabase
      .from('impressions')
      .delete({ count: 'exact' })
      .in('variant_id', variantIds);

    if (impressionsError) {
      console.error('[Clear Experiment Data] Error deleting impressions:', impressionsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to delete impression data' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete all conversions for these variants
    const { count: deletedConversions, error: conversionsError } = await supabase
      .from('conversions')
      .delete({ count: 'exact' })
      .in('variant_id', variantIds);

    if (conversionsError) {
      console.error('[Clear Experiment Data] Error deleting conversions:', conversionsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to delete conversion data' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Clear Experiment Data] Successfully cleared data - Impressions: ${deletedImpressions}, Conversions: ${deletedConversions}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Experiment data cleared successfully',
      deletedImpressions: deletedImpressions || 0,
      deletedConversions: deletedConversions || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Clear Experiment Data] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred while clearing experiment data' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 