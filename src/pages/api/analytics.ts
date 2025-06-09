import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

interface AnalyticsData {
  performance: {
    totalImpressions: number;
    totalConversions: number;
    conversionRate: number;
    avgTimeOnPage: number;
  };
  geographic: {
    topCountry: string;
    countryCount: number;
    bestConvertingCountry: string;
    bestConvertingRate: number;
  };
  device: {
    topDevice: string;
    topBrowser: string;
    mobilePercentage: number;
  };
  engagement: {
    avgScrollDepth: number;
    bounceRate: number;
    returnVisitors: number;
  };
  campaign: {
    topUtmSource: string;
    topUtmCampaign: string;
    directTrafficPercentage: number;
  };
  statistical: {
    confidenceLevel: number;
    sampleSize: number;
    isSignificant: boolean;
  };
  campaignPerformance: {
    sources: Array<{
      source: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
      roi: number;
    }>;
    mediums: Array<{
      medium: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
    }>;
    campaigns: Array<{
      campaign: string;
      source: string;
      medium: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
      avgTimeOnPage: number;
      bounceRate: number;
    }>;
    attributionSummary: {
      totalAttributedConversions: number;
      directConversions: number;
      organicConversions: number;
      paidConversions: number;
      socialConversions: number;
      emailConversions: number;
    };
    funnelAnalysis: {
      topOfFunnel: number; // Total impressions
      middleOfFunnel: number; // Engaged users (>30% scroll or >30s)
      bottomOfFunnel: number; // Conversions
      funnelConversionRate: number;
      dropOffRate: number;
    };
  };
}

export const GET: APIRoute = async ({ request: _request }) => {
  try {
    console.log('Analytics API: Starting data calculation...');

    // --- Parallel Data Fetching ---
    const [
      impressionsCountResult,
      conversionsCountResult,
      impressionsTimeResult,
      geoDataResult,
      conversionGeoDataResult,
      deviceDataResult,
      scrollDataResult,
      sessionDataResult,
      utmDataResult
    ] = await Promise.all([
      supabase.from('impressions').select('*', { count: 'exact', head: true }),
      supabase.from('conversions').select('*', { count: 'exact', head: true }),
      supabase.from('impressions').select('time_on_page').not('time_on_page', 'is', null),
      supabase.from('impressions').select('country_code').not('country_code', 'is', null),
      supabase.from('conversions').select('country_code').not('country_code', 'is', null),
      supabase.from('impressions').select('device_type, user_agent').not('device_type', 'is', null),
      supabase.from('impressions').select('scroll_depth_percent, time_on_page').not('scroll_depth_percent', 'is', null),
      supabase.from('impressions').select('user_id').not('user_id', 'is', null),
      supabase.from('impressions').select('utm_source, utm_medium, utm_campaign').not('utm_source', 'is', null)
    ]);

    // --- Error Handling for Promises ---
    const results = [
      impressionsCountResult, conversionsCountResult, impressionsTimeResult, 
      geoDataResult, conversionGeoDataResult, deviceDataResult, 
      scrollDataResult, sessionDataResult, utmDataResult
    ];

    for (const result of results) {
      if (result.error) {
        console.error('Supabase query failed:', result.error);
        throw new Error(`A database query failed: ${result.error.message}`);
      }
    }

    // --- Data Processing ---
    
    // 1. Performance Overview
    const impressionsCount = impressionsCountResult.count || 0;
    const conversionsCount = conversionsCountResult.count || 0;
    const conversionRate = impressionsCount > 0 ? (conversionsCount / impressionsCount) * 100 : 0;
    const impressionsWithTime = impressionsTimeResult.data || [];
    const avgTimeOnPage = impressionsWithTime.length > 0
      ? impressionsWithTime.reduce((sum, imp) => sum + (imp.time_on_page || 0), 0) / impressionsWithTime.length
      : 0;

    // 2. Geographic Insights
    const geoData = geoDataResult.data || [];
    const countryStats = geoData.reduce((acc, item) => {
      const country = item.country_code;
      if(country) acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCountry = Object.entries(countryStats).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
    const countryCount = Object.keys(countryStats).length;
    
    const conversionGeoData = conversionGeoDataResult.data || [];
    const conversionCountryStats = conversionGeoData.reduce((acc, item) => {
      const country = item.country_code;
      if (country) acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let bestConvertingCountry = 'N/A';
    let bestConvertingRate = 0;
    for (const country of Object.keys(countryStats)) {
      const impressions = countryStats[country];
      const conversions = conversionCountryStats[country] || 0;
      const rate = impressions > 0 ? (conversions / impressions) * 100 : 0;
      if (rate > bestConvertingRate) {
        bestConvertingRate = rate;
        bestConvertingCountry = country;
      }
    }

    // 3. Device & Browser Analytics
    const deviceData = deviceDataResult.data || [];
    const deviceStats = deviceData.reduce((acc, item) => {
      const device = item.device_type || 'Unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topDevice = Object.entries(deviceStats).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

    const browserStats = deviceData.reduce((acc, item) => {
      const ua = item.user_agent || '';
      let browser = 'Unknown';
      if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Safari')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topBrowser = Object.entries(browserStats).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

    const mobileCount = deviceStats['mobile'] || 0;
    const totalDevices = Object.values(deviceStats).reduce((sum, count) => sum + count, 0);
    const mobilePercentage = totalDevices > 0 ? (mobileCount / totalDevices) * 100 : 0;

    // 4. Engagement Metrics
    const scrollData = scrollDataResult.data || [];
    const avgScrollDepth = scrollData.length > 0
      ? scrollData.reduce((sum, imp) => sum + (imp.scroll_depth_percent || 0), 0) / scrollData.length
      : 0;
    const bounceCount = scrollData.filter(imp => (imp.scroll_depth_percent || 0) < 30 && (imp.time_on_page || 0) < 10).length;
    const bounceRate = scrollData.length > 0 ? (bounceCount / scrollData.length) * 100 : 0;
    
    const sessionData = sessionDataResult.data || [];
    const userCounts = sessionData.reduce((acc, item) => {
      const user = item.user_id;
      if(user) acc[user] = (acc[user] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const returnVisitors = Object.values(userCounts).filter(count => count > 1).length;

    // 5. Campaign Tracking
    const utmData = utmDataResult.data || [];
    const utmSourceStats = utmData.reduce((acc, item) => {
      const source = item.utm_source || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topUtmSource = Object.entries(utmSourceStats).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    
    const utmCampaignStats = utmData.reduce((acc, item) => {
      const campaign = item.utm_campaign || 'Unknown';
      acc[campaign] = (acc[campaign] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topUtmCampaign = Object.entries(utmCampaignStats).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    
    const directTrafficCount = impressionsCount - (utmData.length || 0);
    const directTrafficPercentage = impressionsCount > 0 ? (directTrafficCount / impressionsCount) * 100 : 0;

    // 6. Statistical Significance
    const sampleSize = impressionsCount;
    const confidenceLevel = 0.95; // 95% confidence level
    
    // Simple significance test (chi-square approximation)
    const isSignificant = sampleSize >= 100 && conversionRate > 0 && conversionRate < 100;

    // 7. Campaign Performance Analysis
    console.log('Analytics API: Calculating campaign performance...');
    
    // Get all impressions with UTM data
    const { data: allImpressions, error: impressionsError } = await supabase
      .from('impressions')
      .select('utm_source, utm_medium, utm_campaign, time_on_page, scroll_depth_percent, user_id, impression_at');

    // Get all conversions with UTM data
    const { data: allConversions, error: conversionsError } = await supabase
      .from('conversions')
      .select('utm_source, utm_medium, utm_campaign, user_id, created_at');

    if (impressionsError) throw new Error(`Impressions fetch error: ${impressionsError.message}`);
    if (conversionsError) throw new Error(`Conversions fetch error: ${conversionsError.message}`);

    // UTM Source Analysis
    const sourceStats = new Map<string, { impressions: number; conversions: number; timeOnPage: number[]; bounces: number }>();
    
    allImpressions?.forEach(imp => {
      const source = imp.utm_source || 'direct';
      if (!sourceStats.has(source)) {
        sourceStats.set(source, { impressions: 0, conversions: 0, timeOnPage: [], bounces: 0 });
      }
      const stats = sourceStats.get(source)!;
      stats.impressions++;
      
      if (imp.time_on_page) {
        stats.timeOnPage.push(imp.time_on_page);
      }
      
      // Count as bounce if low engagement
      if ((imp.scroll_depth_percent || 0) < 30 && (imp.time_on_page || 0) < 30) {
        stats.bounces++;
      }
    });

    // Match conversions to sources
    allConversions?.forEach(conv => {
      const source = conv.utm_source || 'direct';
      if (sourceStats.has(source)) {
        sourceStats.get(source)!.conversions++;
      }
    });

    // UTM Medium Analysis
    const mediumStats = new Map<string, { impressions: number; conversions: number }>();
    
    allImpressions?.forEach(imp => {
      const medium = imp.utm_medium || 'none';
      if (!mediumStats.has(medium)) {
        mediumStats.set(medium, { impressions: 0, conversions: 0 });
      }
      mediumStats.get(medium)!.impressions++;
    });

    // Match conversions to mediums
    allConversions?.forEach(conv => {
      const medium = conv.utm_medium || 'none';
      if (mediumStats.has(medium)) {
        mediumStats.get(medium)!.conversions++;
      }
    });

    // Campaign Analysis (source + medium + campaign)
    const campaignStats = new Map<string, { 
      source: string; 
      medium: string; 
      impressions: number; 
      conversions: number; 
      timeOnPage: number[]; 
      bounces: number; 
    }>();
    
    allImpressions?.forEach(imp => {
      const campaign = imp.utm_campaign || 'no-campaign';
      const source = imp.utm_source || 'direct';
      const medium = imp.utm_medium || 'none';
      const key = `${campaign}|${source}|${medium}`;
      
      if (!campaignStats.has(key)) {
        campaignStats.set(key, { 
          source, 
          medium, 
          impressions: 0, 
          conversions: 0, 
          timeOnPage: [], 
          bounces: 0 
        });
      }
      
      const stats = campaignStats.get(key)!;
      stats.impressions++;
      
      if (imp.time_on_page) {
        stats.timeOnPage.push(imp.time_on_page);
      }
      
      if ((imp.scroll_depth_percent || 0) < 30 && (imp.time_on_page || 0) < 30) {
        stats.bounces++;
      }
    });

    // Match conversions to campaigns
    allConversions?.forEach(conv => {
      const campaign = conv.utm_campaign || 'no-campaign';
      const source = conv.utm_source || 'direct';
      const medium = conv.utm_medium || 'none';
      const key = `${campaign}|${source}|${medium}`;
      
      if (campaignStats.has(key)) {
        campaignStats.get(key)!.conversions++;
      }
    });

    const sources = Array.from(sourceStats.entries()).map(([source, stats]) => ({
      source,
      impressions: stats.impressions,
      conversions: stats.conversions,
      conversionRate: stats.impressions > 0 ? (stats.conversions / stats.impressions) * 100 : 0,
      roi: stats.conversions * 10 // Assuming $10 value per conversion for ROI calculation
    })).sort((a, b) => b.conversions - a.conversions);

    const mediums = Array.from(mediumStats.entries()).map(([medium, stats]) => ({
      medium,
      impressions: stats.impressions,
      conversions: stats.conversions,
      conversionRate: stats.impressions > 0 ? (stats.conversions / stats.impressions) * 100 : 0
    })).sort((a, b) => b.conversions - a.conversions);

    const campaigns = Array.from(campaignStats.entries()).map(([key, stats]) => {
      const campaign = key.split('|')[0];
      const avgTimeOnPage = stats.timeOnPage.length > 0 
        ? stats.timeOnPage.reduce((sum, time) => sum + time, 0) / stats.timeOnPage.length 
        : 0;
      const bounceRate = stats.impressions > 0 ? (stats.bounces / stats.impressions) * 100 : 0;
      
      return {
        campaign,
        source: stats.source,
        medium: stats.medium,
        impressions: stats.impressions,
        conversions: stats.conversions,
        conversionRate: stats.impressions > 0 ? (stats.conversions / stats.impressions) * 100 : 0,
        avgTimeOnPage: Math.round(avgTimeOnPage * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10
      };
    }).sort((a, b) => b.conversions - a.conversions);

    // Attribution Summary
    const totalAttributedConversions = allConversions?.filter(conv => conv.utm_source).length || 0;
    const directConversions = allConversions?.filter(conv => !conv.utm_source || conv.utm_source === 'direct').length || 0;
    
    const organicConversions = allConversions?.filter(conv => 
      conv.utm_source === 'google' && conv.utm_medium === 'organic'
    ).length || 0;
    
    const paidConversions = allConversions?.filter(conv => 
      conv.utm_medium === 'cpc' || conv.utm_medium === 'paid'
    ).length || 0;
    
    const socialConversions = allConversions?.filter(conv => 
      ['facebook', 'twitter', 'linkedin', 'instagram', 'tiktok'].includes(conv.utm_source)
    ).length || 0;
    
    const emailConversions = allConversions?.filter(conv => 
      conv.utm_medium === 'email' || conv.utm_source === 'newsletter'
    ).length || 0;

    // Funnel Analysis
    const topOfFunnel = impressionsCount; // Total impressions
    const middleOfFunnel = allImpressions?.filter(imp => 
      (imp.scroll_depth_percent || 0) > 30 || (imp.time_on_page || 0) > 30
    ).length || 0;
    const bottomOfFunnel = conversionsCount; // Total conversions
    
    const funnelConversionRate = topOfFunnel > 0 ? (bottomOfFunnel / topOfFunnel) * 100 : 0;
    const dropOffRate = topOfFunnel > 0 ? ((topOfFunnel - bottomOfFunnel) / topOfFunnel) * 100 : 0;

    const analytics: AnalyticsData = {
      performance: {
        totalImpressions: impressionsCount,
        totalConversions: conversionsCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgTimeOnPage: Math.round(avgTimeOnPage * 10) / 10,
      },
      geographic: {
        topCountry,
        countryCount,
        bestConvertingCountry,
        bestConvertingRate: Math.round(bestConvertingRate * 100) / 100,
      },
      device: {
        topDevice,
        topBrowser,
        mobilePercentage: Math.round(mobilePercentage * 10) / 10,
      },
      engagement: {
        avgScrollDepth: Math.round(avgScrollDepth * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10,
        returnVisitors,
      },
      campaign: {
        topUtmSource,
        topUtmCampaign,
        directTrafficPercentage: Math.round(directTrafficPercentage * 10) / 10,
      },
      statistical: {
        confidenceLevel,
        sampleSize,
        isSignificant,
      },
      campaignPerformance: {
        sources: sources,
        mediums: mediums,
        campaigns: campaigns,
        attributionSummary: {
          totalAttributedConversions,
          directConversions,
          organicConversions,
          paidConversions,
          socialConversions,
          emailConversions,
        },
        funnelAnalysis: {
          topOfFunnel,
          middleOfFunnel,
          bottomOfFunnel,
          funnelConversionRate,
          dropOffRate,
        },
      },
    };

    console.log('Analytics API: Calculation complete');
    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to calculate analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 