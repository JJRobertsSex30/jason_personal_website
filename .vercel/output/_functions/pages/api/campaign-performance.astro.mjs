import { s as supabase } from '../../chunks/supabaseClient_C6_a71Ro.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request: _request }) => {
  try {
    console.log("Campaign Performance API: Starting comprehensive analysis...");
    const { data: allImpressions } = await supabase.from("impressions").select("metadata, user_identifier, created_at, user_agent, device_type").order("created_at", { ascending: true });
    const { data: allConversions } = await supabase.from("conversions").select("metadata, user_identifier, created_at, conversion_value").order("created_at", { ascending: true });
    if (!allImpressions || !allConversions) {
      throw new Error("Failed to fetch impression or conversion data");
    }
    const sourceStats = /* @__PURE__ */ new Map();
    allImpressions.forEach((imp) => {
      const source = imp.metadata?.utm_source || "direct";
      if (!sourceStats.has(source)) {
        sourceStats.set(source, {
          impressions: 0,
          conversions: 0,
          timeOnPage: [],
          bounces: 0,
          conversionValue: 0
        });
      }
      const stats = sourceStats.get(source);
      stats.impressions++;
      if (imp.metadata?.time_on_page_seconds) {
        stats.timeOnPage.push(imp.metadata.time_on_page_seconds);
      }
      if ((imp.metadata?.scroll_depth_percent || 0) < 30 && (imp.metadata?.time_on_page_seconds || 0) < 30) {
        stats.bounces++;
      }
    });
    allConversions.forEach((conv) => {
      const source = conv.metadata?.utm_source || "direct";
      if (sourceStats.has(source)) {
        const stats = sourceStats.get(source);
        stats.conversions++;
        stats.conversionValue += conv.conversion_value || 1;
      }
    });
    const sources = Array.from(sourceStats.entries()).map(([source, stats]) => {
      const avgTimeOnPage = stats.timeOnPage.length > 0 ? stats.timeOnPage.reduce((sum, time) => sum + time, 0) / stats.timeOnPage.length : 0;
      const bounceRate = stats.impressions > 0 ? stats.bounces / stats.impressions * 100 : 0;
      const conversionRate = stats.impressions > 0 ? stats.conversions / stats.impressions * 100 : 0;
      return {
        source,
        impressions: stats.impressions,
        conversions: stats.conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        roi: stats.conversionValue * 10,
        // Assuming each conversion worth $10
        averageTimeOnPage: Math.round(avgTimeOnPage * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10
      };
    }).sort((a, b) => b.conversions - a.conversions);
    const mediumStats = /* @__PURE__ */ new Map();
    allImpressions.forEach((imp) => {
      const medium = imp.metadata?.utm_medium || "none";
      if (!mediumStats.has(medium)) {
        mediumStats.set(medium, { impressions: 0, conversions: 0, timeOnPage: [] });
      }
      const stats = mediumStats.get(medium);
      stats.impressions++;
      if (imp.metadata?.time_on_page_seconds) {
        stats.timeOnPage.push(imp.metadata.time_on_page_seconds);
      }
    });
    allConversions.forEach((conv) => {
      const medium = conv.metadata?.utm_medium || "none";
      if (mediumStats.has(medium)) {
        mediumStats.get(medium).conversions++;
      }
    });
    const mediums = Array.from(mediumStats.entries()).map(([medium, stats]) => {
      const avgTimeOnPage = stats.timeOnPage.length > 0 ? stats.timeOnPage.reduce((sum, time) => sum + time, 0) / stats.timeOnPage.length : 0;
      const conversionRate = stats.impressions > 0 ? stats.conversions / stats.impressions * 100 : 0;
      return {
        medium,
        impressions: stats.impressions,
        conversions: stats.conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageTimeOnPage: Math.round(avgTimeOnPage * 10) / 10
      };
    }).sort((a, b) => b.conversions - a.conversions);
    const campaignStats = /* @__PURE__ */ new Map();
    allImpressions.forEach((imp) => {
      const campaign = imp.metadata?.utm_campaign || "no-campaign";
      const source = imp.metadata?.utm_source || "direct";
      const medium = imp.metadata?.utm_medium || "none";
      const key = `${campaign}|${source}|${medium}`;
      if (!campaignStats.has(key)) {
        campaignStats.set(key, {
          source,
          medium,
          impressions: 0,
          conversions: 0,
          timeOnPage: [],
          bounces: 0,
          conversionValue: 0
        });
      }
      const stats = campaignStats.get(key);
      stats.impressions++;
      if (imp.metadata?.time_on_page_seconds) {
        stats.timeOnPage.push(imp.metadata.time_on_page_seconds);
      }
      if ((imp.metadata?.scroll_depth_percent || 0) < 30 && (imp.metadata?.time_on_page_seconds || 0) < 30) {
        stats.bounces++;
      }
    });
    allConversions.forEach((conv) => {
      const campaign = conv.metadata?.utm_campaign || "no-campaign";
      const source = conv.metadata?.utm_source || "direct";
      const medium = conv.metadata?.utm_medium || "none";
      const key = `${campaign}|${source}|${medium}`;
      if (campaignStats.has(key)) {
        const stats = campaignStats.get(key);
        stats.conversions++;
        stats.conversionValue += conv.conversion_value || 1;
      }
    });
    const campaigns = Array.from(campaignStats.entries()).map(([key, stats]) => {
      const campaign = key.split("|")[0];
      const avgTimeOnPage = stats.timeOnPage.length > 0 ? stats.timeOnPage.reduce((sum, time) => sum + time, 0) / stats.timeOnPage.length : 0;
      const bounceRate = stats.impressions > 0 ? stats.bounces / stats.impressions * 100 : 0;
      const conversionRate = stats.impressions > 0 ? stats.conversions / stats.impressions * 100 : 0;
      return {
        campaign,
        source: stats.source,
        medium: stats.medium,
        impressions: stats.impressions,
        conversions: stats.conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgTimeOnPage: Math.round(avgTimeOnPage * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10,
        roi: stats.conversionValue * 10
      };
    }).sort((a, b) => b.conversions - a.conversions);
    const totalAttributedConversions = allConversions.filter((conv) => conv.metadata?.utm_source).length;
    const directConversions = allConversions.filter(
      (conv) => !conv.metadata?.utm_source || conv.metadata.utm_source === "direct"
    ).length;
    const organicConversions = allConversions.filter(
      (conv) => conv.metadata?.utm_source === "google" && conv.metadata?.utm_medium === "organic"
    ).length;
    const paidConversions = allConversions.filter(
      (conv) => conv.metadata?.utm_medium === "cpc" || conv.metadata?.utm_medium === "paid" || conv.metadata?.utm_medium === "ppc"
    ).length;
    const socialConversions = allConversions.filter(
      (conv) => ["facebook", "twitter", "linkedin", "instagram", "tiktok", "youtube"].includes(conv.metadata?.utm_source) || conv.metadata?.utm_medium === "social"
    ).length;
    const emailConversions = allConversions.filter(
      (conv) => conv.metadata?.utm_medium === "email" || conv.metadata?.utm_source === "newsletter" || conv.metadata?.utm_source === "mailchimp"
    ).length;
    const referralConversions = allConversions.filter(
      (conv) => conv.metadata?.utm_medium === "referral"
    ).length;
    const totalImpressions = allImpressions.length;
    const engagedUsers = allImpressions.filter(
      (imp) => (imp.metadata?.scroll_depth_percent || 0) > 50 || (imp.metadata?.time_on_page_seconds || 0) > 60
    ).length;
    const qualifiedUsers = allImpressions.filter(
      (imp) => (imp.metadata?.scroll_depth_percent || 0) > 80 || (imp.metadata?.time_on_page_seconds || 0) > 120
    ).length;
    const totalConversions = allConversions.length;
    const funnelStages = [
      {
        stage: "Visitors",
        users: totalImpressions,
        conversions: totalImpressions,
        conversionRate: 100,
        dropOffRate: 0
      },
      {
        stage: "Engaged",
        users: engagedUsers,
        conversions: engagedUsers,
        conversionRate: totalImpressions > 0 ? engagedUsers / totalImpressions * 100 : 0,
        dropOffRate: totalImpressions > 0 ? (totalImpressions - engagedUsers) / totalImpressions * 100 : 0
      },
      {
        stage: "Qualified",
        users: qualifiedUsers,
        conversions: qualifiedUsers,
        conversionRate: engagedUsers > 0 ? qualifiedUsers / engagedUsers * 100 : 0,
        dropOffRate: engagedUsers > 0 ? (engagedUsers - qualifiedUsers) / engagedUsers * 100 : 0
      },
      {
        stage: "Converted",
        users: totalConversions,
        conversions: totalConversions,
        conversionRate: qualifiedUsers > 0 ? totalConversions / qualifiedUsers * 100 : 0,
        dropOffRate: qualifiedUsers > 0 ? (qualifiedUsers - totalConversions) / qualifiedUsers * 100 : 0
      }
    ];
    const overallFunnelConversionRate = totalImpressions > 0 ? totalConversions / totalImpressions * 100 : 0;
    const biggestDropOff = funnelStages.reduce(
      (max, stage) => stage.dropOffRate > max.dropOffRate ? stage : max
    ).stage;
    const timeSeriesData = [];
    const now = /* @__PURE__ */ new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayImpressions = allImpressions.filter(
        (imp) => imp.created_at.startsWith(dateStr)
      ).length;
      const dayConversions = allConversions.filter(
        (conv) => conv.created_at.startsWith(dateStr)
      ).length;
      const dayConversionRate = dayImpressions > 0 ? dayConversions / dayImpressions * 100 : 0;
      timeSeriesData.push({
        date: dateStr,
        impressions: dayImpressions,
        conversions: dayConversions,
        conversionRate: Math.round(dayConversionRate * 100) / 100
      });
    }
    const campaignPerformanceData = {
      sources: sources.slice(0, 10),
      // Top 10 sources
      mediums: mediums.slice(0, 10),
      // Top 10 mediums
      campaigns: campaigns.slice(0, 15),
      // Top 15 campaigns
      attributionSummary: {
        totalAttributedConversions,
        directConversions,
        organicConversions,
        paidConversions,
        socialConversions,
        emailConversions,
        referralConversions
      },
      funnelAnalysis: {
        stages: funnelStages,
        overallFunnelConversionRate: Math.round(overallFunnelConversionRate * 100) / 100,
        biggestDropOff
      },
      timeSeriesData
    };
    console.log("Campaign Performance API: Analysis complete");
    return new Response(JSON.stringify(campaignPerformanceData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Campaign Performance API error:", error);
    return new Response(JSON.stringify({
      error: "Failed to calculate campaign performance",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
