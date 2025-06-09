import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

interface Impression {
    user_identifier: string;
    session_identifier: string;
    page_url: string;
    impression_at: string;
    time_on_page: number;
    scroll_depth_percent: number;
    bounce: boolean;
    device_type: string;
    utm_source: string;
    connection_type: string;
    screen_resolution: string;
    page_load_time: number;
}

// Helper to safely calculate averages, avoiding division by zero
const calculateAverage = (sum: number, count: number, toFixed = 0) => {
    if (count === 0) return 0;
    return parseFloat((sum / count).toFixed(toFixed));
};

// Helper to count occurrences of a key in an array of objects
const countBy = (data: Impression[], key: keyof Impression) => {
    return data.reduce((acc, item) => {
        const value = item[key] as string | number | boolean;
        const stringValue = String(value) || 'unknown';
        acc[stringValue] = (acc[stringValue] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
};

const ensureNumber = (value: unknown): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
};

// Main function to get all journey stats
export const GET: APIRoute = async () => {
    try {
        // Fetch all impressions and conversions once
        const [{ data: impressions, error: impressionsError }, { data: conversions, error: conversionsError }] = await Promise.all([
            supabase.from('impressions').select('user_identifier, session_identifier, page_url, impression_at, time_on_page, scroll_depth_percent, bounce, device_type, utm_source, connection_type, screen_resolution, page_load_time'),
            supabase.from('conversions').select('user_identifier, conversion_type, device_type')
        ]);

        if (impressionsError) throw new Error(`Impressions fetch error: ${impressionsError.message}`);
        if (conversionsError) throw new Error(`Conversions fetch error: ${conversionsError.message}`);
        if (!impressions) throw new Error('No impression data available.');

        const totalImpressions = impressions.length;
        const sessions = new Map<string, typeof impressions>();
        impressions.forEach(imp => {
            if (!sessions.has(imp.session_identifier)) {
                sessions.set(imp.session_identifier, []);
            }
            sessions.get(imp.session_identifier)?.push(imp);
        });
        const sessionCount = sessions.size;

        // --- Session Flow Analysis ---
        const totalSessionDuration = impressions.reduce((sum, imp) => sum + ensureNumber(imp.time_on_page), 0);
        const averageSessionDuration = calculateAverage(totalSessionDuration, sessionCount, 1);
        const averagePagesPerSession = calculateAverage(totalImpressions, sessionCount, 1);

        // --- Bounce Rate Analysis ---
        const totalBounces = impressions.filter(imp => imp.bounce).length;
        const overallBounceRate = calculateAverage(totalBounces, sessionCount, 2) * 100;

        const bounceRateByDevice = Object.entries(countBy(impressions.filter(i => i.bounce), 'device_type'))
            .map(([device, count]) => ({ device, bounceRate: calculateAverage(count, totalBounces, 2) * 100 }))
            .sort((a,b) => b.bounceRate - a.bounceRate);

        // --- Engagement Metrics ---
        const averageTimeOnPage = calculateAverage(impressions.reduce((sum, imp) => sum + ensureNumber(imp.time_on_page), 0), totalImpressions, 1);
        const averageScrollDepth = calculateAverage(impressions.reduce((sum, imp) => sum + ensureNumber(imp.scroll_depth_percent), 0), totalImpressions, 1);
        
        // --- Device & Connection Impact ---
        const performanceByDevice = Object.entries(countBy(impressions, 'device_type')).map(([deviceType, count]) => {
            const deviceImpressions = impressions.filter(i => i.device_type === deviceType);
            const deviceConversions = conversions?.filter(c => c.device_type === deviceType).length || 0;
            return {
                deviceType,
                sessions: count,
                avgLoadTime: calculateAverage(deviceImpressions.reduce((sum, i) => sum + ensureNumber(i.page_load_time), 0) / 1000, count, 2),
                conversionRate: calculateAverage(deviceConversions, count, 2) * 100
            };
        });

        const finalStats = {
            sessionFlowAnalysis: {
                sessionCount,
                averageSessionDuration,
                averagePagesPerSession,
                returningUserRate: 0, // Placeholder
                topEntryPages: [], // Placeholder
                topExitPages: [], // Placeholder
            },
            engagementMetrics: {
                averageTimeOnPage,
                averageScrollDepth,
                engagementRate: 0, // Placeholder
                interactionRate: 0, // Placeholder
                contentConsumptionScore: 0, // Placeholder
                engagementByPage: [], // Placeholder
            },
            bounceRateAnalysis: {
                overallBounceRate,
                bounceRateByPage: [], // Placeholder
                bounceRateBySource: [], // Placeholder
                bounceRateFactors: {
                    deviceType: bounceRateByDevice,
                },
            },
            deviceConnectionImpact: {
                performanceByDevice,
                connectionTypeAnalysis: [], // Placeholder
                screenResolutionImpact: [], // Placeholder
            },
            userBehaviorPatterns: { // Placeholder
                newVsReturning: {},
                sessionFrequency: [],
                engagementSegments: [],
            },
        };

        return new Response(JSON.stringify(finalStats), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching user journey stats:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return new Response(JSON.stringify({ message }), { status: 500 });
    }
}; 