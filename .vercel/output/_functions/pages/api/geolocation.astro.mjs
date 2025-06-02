export { renderers } from '../../renderers.mjs';

const geoCache = /* @__PURE__ */ new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1e3;
function getClientIP(request) {
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "cf-connecting-ip",
    // Cloudflare
    "true-client-ip",
    // Cloudflare Enterprise
    "x-cluster-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded"
  ];
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      const ip = value.split(",")[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }
  return null;
}
function isValidIP(ip) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
function isPrivateIP(ip) {
  const privateRanges = [
    /^127\./,
    // Loopback
    /^192\.168\./,
    // Private Class C
    /^10\./,
    // Private Class A
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    // Private Class B
    /^::1$/,
    // IPv6 loopback
    /^fc00:/,
    // IPv6 private
    /^fe80:/
    // IPv6 link-local
  ];
  return privateRanges.some((range) => range.test(ip));
}
async function fetchGeoLocationData(ip) {
  const API_KEY = "1c9f1959ad164c4c8341da36df5ccc24";
  try {
    const apiUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${API_KEY}&ip=${ip}&fields=country_code2,state_prov,city,latitude,longitude,time_zone,accuracy_radius`;
    console.log(`[GeoLocation] Fetching data for IP: ${ip}`);
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Jason-Personal-Website/1.0"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(`API Error ${data.error.code}: ${data.error.message}`);
    }
    const result = {
      country_code: data.country_code2 || null,
      region: data.state_prov || null,
      city: data.city || null,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      time_zone: data.time_zone?.name || null,
      accuracy_radius: data.accuracy_radius || null,
      success: true
    };
    console.log(`[GeoLocation] Successfully retrieved data for ${ip}:`, {
      country: result.country_code,
      region: result.region,
      city: result.city
    });
    return result;
  } catch (error) {
    console.error(`[GeoLocation] Failed to fetch data for IP ${ip}:`, error);
    return {
      country_code: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      time_zone: null,
      accuracy_radius: null,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function getCachedGeoLocationData(ip) {
  const cached = geoCache.get(ip);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`[GeoLocation] Using cached data for IP: ${ip}`);
    return cached.data;
  }
  const data = await fetchGeoLocationData(ip);
  if (data.success) {
    geoCache.set(ip, { data, timestamp: now });
  }
  return data;
}
async function getGeoLocationForImpression(request) {
  try {
    let targetIP = null;
    if (request) {
      targetIP = getClientIP(request);
      console.log("[GeoLocation] Extracted IP from request:", targetIP);
    }
    if (!targetIP) {
      console.log("[GeoLocation] No IP address available for geolocation");
      return {
        country_code: null,
        region: null,
        city: null,
        latitude: null,
        longitude: null,
        time_zone: null,
        accuracy_radius: null
      };
    }
    if (isPrivateIP(targetIP)) {
      console.log(`[GeoLocation] Skipping private IP: ${targetIP}`);
      return {
        country_code: null,
        region: null,
        city: null,
        latitude: null,
        longitude: null,
        time_zone: null,
        accuracy_radius: null
      };
    }
    const geoData = await getCachedGeoLocationData(targetIP);
    return {
      country_code: geoData.country_code,
      region: geoData.region,
      city: geoData.city,
      latitude: geoData.latitude,
      longitude: geoData.longitude,
      time_zone: geoData.time_zone,
      accuracy_radius: geoData.accuracy_radius
    };
  } catch (error) {
    console.error("[GeoLocation] Error getting geolocation data:", error);
    return {
      country_code: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      time_zone: null,
      accuracy_radius: null
    };
  }
}
async function getServerSideGeoLocation(request) {
  const geoData = await getGeoLocationForImpression(request);
  console.log("[GeoLocation] Server-side geolocation result:", geoData);
  return {
    country_code: geoData.country_code,
    region: geoData.region,
    city: geoData.city
  };
}
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, cached] of geoCache.entries()) {
      if (now - cached.timestamp > CACHE_DURATION) {
        geoCache.delete(ip);
      }
    }
  }, 60 * 60 * 1e3);
}

const prerender = false;
const GET = async ({ request }) => {
  try {
    console.log("[Geolocation API] Processing geolocation request");
    console.log("[Geolocation API] Request headers:", Object.fromEntries(request.headers.entries()));
    const geoData = await getServerSideGeoLocation(request);
    console.log("[Geolocation API] Geolocation result:", geoData);
    return new Response(JSON.stringify({
      success: true,
      data: geoData,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("[Geolocation API] Error processing request:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to get geolocation data",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
const OPTIONS = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  OPTIONS,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
