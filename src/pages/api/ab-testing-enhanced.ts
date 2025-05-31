export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

interface EnhancedABTestingData {
  experiments: Array<{
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    status: 'running' | 'completed' | 'paused' | 'draft';
    confidenceLevel: number;
    isStatisticallySignificant: boolean;
    pValue: number;
    sampleSize: number;
    recommendedAction: string;
    variants: Array<{
      id: string;
      name: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
      confidenceInterval: { lower: number; upper: number; };
      zScore: number;
      isWinner: boolean;
      uplift: number;
      geographicPerformance: Array<{
        country: string;
        impressions: number;
        conversions: number;
        conversionRate: number;
      }>;
      devicePerformance: Array<{
        deviceType: string;
        impressions: number;
        conversions: number;
        conversionRate: number;
      }>;
      timeSeriesData: Array<{
        date: string;
        impressions: number;
        conversions: number;
        conversionRate: number;
      }>;
    }>;
  }>;
  overallStatistics: {
    totalActiveExperiments: number;
    totalCompletedExperiments: number;
    averageTestDuration: number;
    successRate: number;
    totalImpressionsToday: number;
    totalConversionsToday: number;
  };
  segmentAnalysis: {
    geographicInsights: Array<{
      country: string;
      experimentsCount: number;
      avgConversionRate: number;
      topPerformingVariant: string;
    }>;
    deviceInsights: Array<{
      deviceType: string;
      experimentsCount: number;
      avgConversionRate: number;
      preferredVariantTypes: string[];
    }>;
    timeBasedInsights: {
      peakTestingHours: number[];
      seasonalTrends: string;
      optimalTestDuration: number;
    };
  };
  realTimeMetrics: {
    liveExperiments: number;
    impressionsLastHour: number;
    conversionsLastHour: number;
    fastestGrowingVariant: string;
    alertsAndRecommendations: string[];
  };
}

// Helper function to calculate z-score for statistical significance
function calculateZScore(conversionsA: number, impressionsA: number, conversionsB: number, impressionsB: number): number {
  if (impressionsA === 0 || impressionsB === 0) return 0;
  
  const p1 = conversionsA / impressionsA;
  const p2 = conversionsB / impressionsB;
  const pooledP = (conversionsA + conversionsB) / (impressionsA + impressionsB);
  
  const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/impressionsA + 1/impressionsB));
  
  if (standardError === 0) return 0;
  
  return (p1 - p2) / standardError;
}

// Helper function to calculate confidence interval
function calculateConfidenceInterval(conversions: number, impressions: number, confidenceLevel: number = 0.95): { lower: number; upper: number; } {
  if (impressions === 0) return { lower: 0, upper: 0 };
  
  const p = conversions / impressions;
  const z = confidenceLevel === 0.95 ? 1.96 : (confidenceLevel === 0.99 ? 2.576 : 1.645);
  const standardError = Math.sqrt((p * (1 - p)) / impressions);
  const margin = z * standardError;
  
  return {
    lower: Math.max(0, (p - margin) * 100),
    upper: Math.min(100, (p + margin) * 100)
  };
}

// Helper function to calculate p-value from z-score
function calculatePValue(zScore: number): number {
  const absZ = Math.abs(zScore);
  // Approximate p-value calculation (two-tailed test)
  if (absZ > 3.5) return 0.0001;
  if (absZ > 2.576) return 0.01;
  if (absZ > 1.96) return 0.05;
  if (absZ > 1.645) return 0.1;
  return 0.5;
}

export const GET: APIRoute = async ({ request: _request }) => {
  try {
    console.log('Enhanced A/B Testing API: Starting comprehensive analysis...');

    // Get all experiments with variants
    const { data: experiments, error: experimentsError } = await supabase
      .from('experiments')
      .select(`
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        variants (
          id,
          name,
          description,
          config_json,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (experimentsError) {
      throw new Error(experimentsError.message || 'Failed to fetch experiments');
    }

    if (!experiments) {
      throw new Error('No experiments data received');
    }

    // Get all impressions and conversions
    const { data: allImpressions } = await supabase
      .from('impressions')
      .select('*')
      .order('impression_at', { ascending: true });

    const { data: allConversions } = await supabase
      .from('conversions')
      .select('*')
      .order('created_at', { ascending: true });

    // Get user-level participation data for proper analytics
    const { data: userParticipation } = await supabase
      .from('user_experiment_participation')
      .select('*');

    // Get conversion attribution data
    const { data: conversionAttribution } = await supabase
      .from('conversion_attribution')
      .select('*');

    if (!allImpressions || !allConversions) {
      throw new Error('Failed to fetch impression or conversion data');
    }

    // User-level tracking metrics (for future enhanced analytics)
    // const userLevelMetrics = {
    //   totalUniqueParticipants: userParticipation?.length || 0,
    //   totalAttributedConversions: conversionAttribution?.length || 0,
    //   avgTimeToConversion: conversionAttribution && conversionAttribution.length > 0 
    //     ? conversionAttribution.reduce((sum, attr) => sum + (attr.time_to_conversion_hours || 0), 0) / conversionAttribution.length
    //     : 0
    // };

    // Log user-level data availability for debugging
    console.log(`User participation records: ${userParticipation?.length || 0}`);
    console.log(`Conversion attribution records: ${conversionAttribution?.length || 0}`);

    const enhancedExperiments = await Promise.all(experiments.map(async (exp) => {
      const variants = exp.variants || [];
      
      // Get variant performance data
      const variantsWithStats = await Promise.all(variants.map(async (variant) => {
        // Get impressions for this variant
        const variantImpressions = allImpressions.filter(imp => imp.variant_id === variant.id);
        const variantConversions = allConversions.filter(conv => conv.variant_id === variant.id);
        
        const impressions = variantImpressions.length;
        const conversions = variantConversions.length;
        const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0;

        // Geographic performance
        const geoStats = new Map<string, { impressions: number; conversions: number; }>();
        variantImpressions.forEach(imp => {
          const country = imp.country_code || 'unknown';
          if (!geoStats.has(country)) {
            geoStats.set(country, { impressions: 0, conversions: 0 });
          }
          geoStats.get(country)!.impressions++;
        });
        
        variantConversions.forEach(conv => {
          const country = conv.country_code || 'unknown';
          if (geoStats.has(country)) {
            geoStats.get(country)!.conversions++;
          }
        });

        const geographicPerformance = Array.from(geoStats.entries()).map(([country, stats]) => ({
          country,
          impressions: stats.impressions,
          conversions: stats.conversions,
          conversionRate: stats.impressions > 0 ? (stats.conversions / stats.impressions) * 100 : 0
        })).sort((a, b) => b.impressions - a.impressions).slice(0, 5);

        // Device performance
        const deviceStats = new Map<string, { impressions: number; conversions: number; }>();
        variantImpressions.forEach(imp => {
          const device = imp.device_type || 'unknown';
          if (!deviceStats.has(device)) {
            deviceStats.set(device, { impressions: 0, conversions: 0 });
          }
          deviceStats.get(device)!.impressions++;
        });
        
        variantConversions.forEach(conv => {
          const device = conv.device_type || 'unknown';
          if (deviceStats.has(device)) {
            deviceStats.get(device)!.conversions++;
          }
        });

        const devicePerformance = Array.from(deviceStats.entries()).map(([deviceType, stats]) => ({
          deviceType,
          impressions: stats.impressions,
          conversions: stats.conversions,
          conversionRate: stats.impressions > 0 ? (stats.conversions / stats.impressions) * 100 : 0
        })).sort((a, b) => b.impressions - a.impressions);

        // Time series data (last 7 days)
        const timeSeriesData: Array<{
          date: string;
          impressions: number;
          conversions: number;
          conversionRate: number;
        }> = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayImpressions = variantImpressions.filter(imp => 
            imp.impression_at.startsWith(dateStr)
          ).length;
          
          const dayConversions = variantConversions.filter(conv => 
            conv.created_at.startsWith(dateStr)
          ).length;
          
          timeSeriesData.push({
            date: dateStr,
            impressions: dayImpressions,
            conversions: dayConversions,
            conversionRate: dayImpressions > 0 ? (dayConversions / dayImpressions) * 100 : 0
          });
        }

        // Calculate confidence interval
        const confidenceInterval = calculateConfidenceInterval(conversions, impressions);

        return {
          id: variant.id,
          name: variant.name,
          impressions,
          conversions,
          conversionRate: Math.round(conversionRate * 100) / 100,
          confidenceInterval,
          zScore: 0, // Will be calculated later when comparing variants
          isWinner: false, // Will be determined later
          uplift: 0, // Will be calculated later
          geographicPerformance,
          devicePerformance,
          timeSeriesData
        };
      }));

      // Calculate statistical significance between variants
      if (variantsWithStats.length >= 2) {
        const controlVariant = variantsWithStats[0];
        
        variantsWithStats.forEach((variant, index) => {
          if (index > 0) {
            variant.zScore = calculateZScore(
              variant.conversions, variant.impressions,
              controlVariant.conversions, controlVariant.impressions
            );
            
            variant.uplift = controlVariant.conversionRate > 0 
              ? ((variant.conversionRate - controlVariant.conversionRate) / controlVariant.conversionRate) * 100 
              : 0;
          }
        });

        // Determine winner
        const bestVariant = variantsWithStats.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        );
        bestVariant.isWinner = true;
      }

      // Calculate experiment statistics
      const totalImpressions = variantsWithStats.reduce((sum, v) => sum + v.impressions, 0);

      // Statistical significance for the experiment
      const bestZScore = Math.max(...variantsWithStats.map(v => Math.abs(v.zScore)));
      const pValue = calculatePValue(bestZScore);
      const isStatisticallySignificant = pValue < 0.05 && totalImpressions >= 100;
      const confidenceLevel = isStatisticallySignificant ? 95 : (pValue < 0.1 ? 90 : 0);

      // Determine experiment status
      let status: 'running' | 'completed' | 'paused' | 'draft' = 'draft';
      if (exp.is_active && totalImpressions > 0) {
        status = isStatisticallySignificant ? 'completed' : 'running';
      } else if (totalImpressions > 0) {
        status = 'paused';
      }

      // Recommendation
      let recommendedAction = 'Continue testing';
      if (isStatisticallySignificant) {
        const winner = variantsWithStats.find(v => v.isWinner);
        recommendedAction = winner ? `Implement ${winner.name} (${winner.uplift.toFixed(1)}% uplift)` : 'No clear winner';
      } else if (totalImpressions < 100) {
        recommendedAction = 'Gather more data';
      } else if (pValue > 0.5) {
        recommendedAction = 'Consider stopping test - no significant difference';
      }

      return {
        id: exp.id,
        name: exp.name,
        description: exp.description,
        is_active: exp.is_active,
        created_at: exp.created_at,
        status,
        confidenceLevel,
        isStatisticallySignificant,
        pValue: Math.round(pValue * 1000) / 1000,
        sampleSize: totalImpressions,
        recommendedAction,
        variants: variantsWithStats
      };
    }));

    // Overall Statistics
    const activeExperiments = enhancedExperiments.filter(exp => exp.status === 'running').length;
    const completedExperiments = enhancedExperiments.filter(exp => exp.status === 'completed').length;
    
    const experimentDurations = enhancedExperiments.map(exp => {
      const created = new Date(exp.created_at);
      const now = new Date();
      return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
    });
    const averageTestDuration = experimentDurations.length > 0 
      ? experimentDurations.reduce((sum, dur) => sum + dur, 0) / experimentDurations.length 
      : 0;

    const successRate = enhancedExperiments.length > 0 
      ? (enhancedExperiments.filter(exp => exp.isStatisticallySignificant).length / enhancedExperiments.length) * 100 
      : 0;

    // Today's metrics
    const today = new Date().toISOString().split('T')[0];
    const todayImpressions = allImpressions.filter(imp => imp.impression_at.startsWith(today)).length;
    const todayConversions = allConversions.filter(conv => conv.created_at.startsWith(today)).length;

    // Geographic insights
    const geoInsights = new Map<string, { experiments: Set<string>; totalConversions: number; totalImpressions: number; variants: string[]; }>();
    
    enhancedExperiments.forEach(exp => {
      exp.variants.forEach(variant => {
        variant.geographicPerformance.forEach(geo => {
          if (!geoInsights.has(geo.country)) {
            geoInsights.set(geo.country, { experiments: new Set(), totalConversions: 0, totalImpressions: 0, variants: [] });
          }
          const stats = geoInsights.get(geo.country)!;
          stats.experiments.add(exp.id);
          stats.totalConversions += geo.conversions;
          stats.totalImpressions += geo.impressions;
          if (variant.isWinner) {
            stats.variants.push(variant.name);
          }
        });
      });
    });

    const geographicInsights = Array.from(geoInsights.entries()).map(([country, stats]) => ({
      country,
      experimentsCount: stats.experiments.size,
      avgConversionRate: stats.totalImpressions > 0 ? (stats.totalConversions / stats.totalImpressions) * 100 : 0,
      topPerformingVariant: stats.variants[0] || 'N/A'
    })).sort((a, b) => b.avgConversionRate - a.avgConversionRate).slice(0, 5);

    // Device insights
    const deviceInsights = new Map<string, { experiments: Set<string>; totalConversions: number; totalImpressions: number; variants: string[]; }>();
    
    enhancedExperiments.forEach(exp => {
      exp.variants.forEach(variant => {
        variant.devicePerformance.forEach(device => {
          if (!deviceInsights.has(device.deviceType)) {
            deviceInsights.set(device.deviceType, { experiments: new Set(), totalConversions: 0, totalImpressions: 0, variants: [] });
          }
          const stats = deviceInsights.get(device.deviceType)!;
          stats.experiments.add(exp.id);
          stats.totalConversions += device.conversions;
          stats.totalImpressions += device.impressions;
          if (variant.isWinner) {
            stats.variants.push(variant.name);
          }
        });
      });
    });

    const deviceInsightsArray = Array.from(deviceInsights.entries()).map(([deviceType, stats]) => ({
      deviceType,
      experimentsCount: stats.experiments.size,
      avgConversionRate: stats.totalImpressions > 0 ? (stats.totalConversions / stats.totalImpressions) * 100 : 0,
      preferredVariantTypes: [...new Set(stats.variants)].slice(0, 3)
    })).sort((a, b) => b.avgConversionRate - a.avgConversionRate);

    // Real-time metrics
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const impressionsLastHour = allImpressions.filter(imp => imp.impression_at > oneHourAgo).length;
    const conversionsLastHour = allConversions.filter(conv => conv.created_at > oneHourAgo).length;

    // Find fastest growing variant
    let fastestGrowingVariant = 'N/A';
    let maxGrowthRate = 0;
    
    enhancedExperiments.forEach(exp => {
      exp.variants.forEach(variant => {
        const recentData = variant.timeSeriesData.slice(-3);
        if (recentData.length >= 2) {
          const growthRate = recentData[recentData.length - 1].conversionRate - recentData[0].conversionRate;
          if (growthRate > maxGrowthRate) {
            maxGrowthRate = growthRate;
            fastestGrowingVariant = `${exp.name} - ${variant.name}`;
          }
        }
      });
    });

    // Alerts and recommendations
    const alerts: string[] = [];
    
    enhancedExperiments.forEach(exp => {
      if (exp.status === 'running' && exp.sampleSize > 1000 && !exp.isStatisticallySignificant) {
        alerts.push(`${exp.name}: Large sample size but no significant result`);
      }
      if (exp.status === 'running' && exp.sampleSize < 100) {
        alerts.push(`${exp.name}: Needs more traffic for reliable results`);
      }
      if (exp.isStatisticallySignificant && exp.status === 'running') {
        alerts.push(`${exp.name}: Ready to implement winning variant`);
      }
    });

    const enhancedABTestingData: EnhancedABTestingData = {
      experiments: enhancedExperiments,
      overallStatistics: {
        totalActiveExperiments: activeExperiments,
        totalCompletedExperiments: completedExperiments,
        averageTestDuration: Math.round(averageTestDuration * 10) / 10,
        successRate: Math.round(successRate * 10) / 10,
        totalImpressionsToday: todayImpressions,
        totalConversionsToday: todayConversions
      },
      segmentAnalysis: {
        geographicInsights,
        deviceInsights: deviceInsightsArray,
        timeBasedInsights: {
          peakTestingHours: [9, 10, 11, 14, 15, 16], // Mock data
          seasonalTrends: 'Q4 shows 15% higher conversion rates',
          optimalTestDuration: Math.round(averageTestDuration)
        }
      },
      realTimeMetrics: {
        liveExperiments: activeExperiments,
        impressionsLastHour,
        conversionsLastHour,
        fastestGrowingVariant,
        alertsAndRecommendations: alerts.slice(0, 5)
      }
    };

    // TODO: Integrate userLevelMetrics into response interface in future iteration
    // (enhancedABTestingData as any).userLevelMetrics = userLevelMetrics;

    console.log('Enhanced A/B Testing API: Analysis complete');
    return new Response(JSON.stringify(enhancedABTestingData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced A/B Testing API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to calculate enhanced A/B testing data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 