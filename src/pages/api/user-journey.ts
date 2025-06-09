import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

// Define a unified event structure for the journey
interface JourneyEvent {
    type: 'Impression' | 'Conversion' | 'Engagement';
    timestamp: string;
    title: string;
    details: string;
    userId?: string;
    email?: string;
}

export const GET: APIRoute = async () => {
    try {
        // The original working approach was simpler. It fetched raw data and processed it.
        // This new approach mimics that simplicity to avoid the join ambiguity errors.
        
        // Fetch raw data from all relevant tables in parallel without complex joins
        const [impressionsRes, conversionsRes, engagementsRes] = await Promise.all([
            supabase.from('impressions').select('*').order('impression_at', { ascending: false }).limit(200),
            supabase.from('conversions').select('*').order('created_at', { ascending: false }).limit(200),
            supabase.from('user_engagements').select('*').order('created_at', { ascending: false }).limit(200)
        ]);

        if (impressionsRes.error) throw impressionsRes.error;
        if (conversionsRes.error) throw conversionsRes.error;
        if (engagementsRes.error) throw engagementsRes.error;

        // In the future, this data can be combined and processed here on the server
        // to create a unified timeline, but for now, we pass the raw, separated data
        // to fix the immediate database error and restore functionality.
        const journeyData = {
            impressions: impressionsRes.data || [],
            conversions: conversionsRes.data || [],
            engagements: engagementsRes.data || [],
        };
        
        // The old code expected a complex object with statistical analysis.
        // The *new* UI expects a simple timeline.
        // The *error* is in the database query.
        // The best path forward is to create the simple timeline data the new UI expects,
        // but using simple queries that don't fail.

        const usersRes = await supabase.from('user_profiles').select('id, email');
        const usersMap = new Map<string, string>((usersRes.data || []).map(u => [u.id, u.email]));
        
        const events: JourneyEvent[] = [];
        
        (journeyData.impressions || []).forEach(imp => events.push({
            type: 'Impression',
            timestamp: imp.impression_at,
            title: `Viewed Page`,
            details: `URL: ${imp.page_url || 'Unknown'}`,
            userId: imp.user_identifier,
            email: usersMap.get(imp.user_identifier),
        }));

        (journeyData.conversions || []).forEach(conv => events.push({
            type: 'Conversion',
            timestamp: conv.created_at,
            title: `Converted: ${conv.conversion_type}`,
            details: `Value: ${conv.conversion_value || 'N/A'}`,
            userId: conv.user_identifier,
            email: usersMap.get(conv.user_identifier),
        }));

        (journeyData.engagements || []).forEach(eng => events.push({
            type: 'Engagement',
            timestamp: eng.created_at,
            title: `Engaged: ${eng.event_type}`,
            details: (eng.event_metadata as { description: string })?.description || 'No details.',
            userId: eng.user_id,
            email: usersMap.get(eng.user_id),
        }));

        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return new Response(JSON.stringify(events.slice(0, 200)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in /api/user-journey:', error);
        const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        return new Response(JSON.stringify({ message }), { status: 500 });
    }
}; 