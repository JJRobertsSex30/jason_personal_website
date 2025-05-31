import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const GET: APIRoute = async ({ url }) => {
  try {
    const experimentId = url.searchParams.get('experimentId');
    
    if (!experimentId) {
      return new Response(JSON.stringify({ error: 'experimentId parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get experiment variants
    const { data: variants, error: variantsError } = await supabase
      .from('variants')
      .select('id')
      .eq('experiment_id', experimentId);

    if (variantsError) {
      console.error('Error fetching variants:', variantsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch variants' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!variants || variants.length === 0) {
      return new Response(JSON.stringify({
        totalImpressions: 0,
        totalConversions: 0,
        overallRate: 0,
        avgTimeOnPage: 0,
        topCountry: 'N/A',
        countryCount: 0,
        bestCountry: 'N/A',
        topDevice: 'N/A',
        topBrowser: 'N/A',
        mobilePercentage: 0,
        avgScroll: 0,
        bounceRate: 0,
        returnVisitors: 0,
        topUtmSource: 'Direct',
        topUtmCampaign: 'N/A',
        directTraffic: 100,
        sampleSize: 0,
        isSignificant: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const variantIds = variants.map(v => v.id);

    // Fetch impressions data
    const { data: impressions, error: impressionsError } = await supabase
      .from('impressions')
      .select('*')
      .in('variant_id', variantIds);

    if (impressionsError) {
      console.error('Error fetching impressions:', impressionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch impressions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch conversions data
    const { data: conversions, error: conversionsError } = await supabase
      .from('conversions')
      .select('*')
      .in('variant_id', variantIds);

    if (conversionsError) {
      console.error('Error fetching conversions:', conversionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch conversions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate analytics
    const totalImpressions = impressions?.length || 0;
    const totalConversions = conversions?.length || 0;
    const overallRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0;

    // Time on page calculation
    const timeOnPageValues = impressions?.filter(i => i.time_on_page_seconds).map(i => i.time_on_page_seconds) || [];
    const avgTimeOnPage = timeOnPageValues.length > 0 
      ? timeOnPageValues.reduce((sum, time) => sum + time, 0) / timeOnPageValues.length 
      : 0;

    // Geographic analysis
    const countries = impressions?.filter(i => i.country).map(i => i.country) || [];
    const countryCount = new Set(countries).size;
    const topCountry = countries.length > 0 
      ? countries.reduce((acc, country) => {
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};
    
    const topCountryName = Object.keys(topCountry).length > 0 
      ? Object.keys(topCountry).reduce((a, b) => topCountry[a] > topCountry[b] ? a : b)
      : 'N/A';

    // Best converting country
    const countryConversions = conversions?.filter(c => c.country).reduce((acc, conv) => {
      const country = conv.country;
      if (country) {
        acc[country] = (acc[country] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const countryImpressions = impressions?.filter(i => i.country).reduce((acc, imp) => {
      const country = imp.country;
      if (country) {
        acc[country] = (acc[country] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    let bestCountry = 'N/A';
    let bestRate = 0;
    Object.keys(countryImpressions).forEach(country => {
      const convs = countryConversions[country] || 0;
      const imps = countryImpressions[country] || 0;
      const rate = imps > 0 ? (convs / imps) * 100 : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestCountry = country;
      }
    });

    // Device analysis
    const devices = impressions?.filter(i => i.device_type).map(i => i.device_type) || [];
    const deviceCount = devices.reduce((acc, device) => {
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topDevice = Object.keys(deviceCount).length > 0 
      ? Object.keys(deviceCount).reduce((a, b) => deviceCount[a] > deviceCount[b] ? a : b)
      : 'N/A';
    
    const mobileCount = devices.filter(d => d?.toLowerCase().includes('mobile')).length;
    const mobilePercentage = devices.length > 0 ? (mobileCount / devices.length) * 100 : 0;

    // Browser analysis
    const browsers = impressions?.filter(i => i.browser).map(i => i.browser) || [];
    const browserCount = browsers.reduce((acc, browser) => {
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topBrowser = Object.keys(browserCount).length > 0 
      ? Object.keys(browserCount).reduce((a, b) => browserCount[a] > browserCount[b] ? a : b)
      : 'N/A';

    // Engagement metrics
    const scrollValues = impressions?.filter(i => i.scroll_depth_percent !== null && i.scroll_depth_percent !== undefined)
      .map(i => i.scroll_depth_percent) || [];
    const avgScroll = scrollValues.length > 0 
      ? scrollValues.reduce((sum, scroll) => sum + scroll, 0) / scrollValues.length 
      : 0;

    // Bounce rate (assuming < 30% scroll = bounce)
    const bounceCount = scrollValues.filter(scroll => scroll < 30).length;
    const bounceRate = scrollValues.length > 0 ? (bounceCount / scrollValues.length) * 100 : 0;

    // Return visitors (users with multiple impressions)
    const userCounts = impressions?.reduce((acc, imp) => {
      if (imp.user_identifier) {
        acc[imp.user_identifier] = (acc[imp.user_identifier] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};
    const returnVisitors = Object.values(userCounts).filter((count: number) => count > 1).length;

    // UTM analysis
    const utmSources = impressions?.filter(i => i.utm_source).map(i => i.utm_source) || [];
    const sourceCount = utmSources.reduce((acc, source) => {
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topUtmSource = Object.keys(sourceCount).length > 0 
      ? Object.keys(sourceCount).reduce((a, b) => sourceCount[a] > sourceCount[b] ? a : b)
      : 'Direct';

    const utmCampaigns = impressions?.filter(i => i.utm_campaign).map(i => i.utm_campaign) || [];
    const campaignCount = utmCampaigns.reduce((acc, campaign) => {
      acc[campaign] = (acc[campaign] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topUtmCampaign = Object.keys(campaignCount).length > 0 
      ? Object.keys(campaignCount).reduce((a, b) => campaignCount[a] > campaignCount[b] ? a : b)
      : 'N/A';

    // Direct traffic percentage
    const directCount = impressions?.filter(i => !i.utm_source && !i.referrer).length || 0;
    const directTraffic = totalImpressions > 0 ? (directCount / totalImpressions) * 100 : 0;

    // Statistical significance (simplified)
    const sampleSize = totalImpressions;
    const isSignificant = sampleSize >= 100 && overallRate > 0; // Basic threshold

    const analytics = {
      totalImpressions,
      totalConversions,
      overallRate,
      avgTimeOnPage,
      topCountry: topCountryName,
      countryCount,
      bestCountry,
      topDevice,
      topBrowser,
      mobilePercentage,
      avgScroll,
      bounceRate,
      returnVisitors,
      topUtmSource,
      topUtmCampaign,
      directTraffic,
      sampleSize,
      isSignificant
    };

    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 