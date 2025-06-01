// src/lib/geoLocationService.ts
// IP Geolocation Service using ipgeolocation.io API

interface GeoLocationResponse {
  ip: string;
  continent_code: string;
  continent_name: string;
  country_code2: string;
  country_code3: string;
  country_name: string;
  state_prov: string;
  city: string;
  zipcode: string;
  latitude: string;
  longitude: string;
  time_zone: {
    name: string;
    offset: number;
    current_time: string;
  };
  isp: string;
  organization: string;
  accuracy_radius?: string;
  // Error handling
  error?: {
    code: number;
    message: string;
  };
}

interface GeoLocationData {
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  time_zone: string | null;
  accuracy_radius: string | null;
  success: boolean;
  error?: string;
}

// Cache for geolocation results to avoid repeated API calls
const geoCache = new Map<string, { data: GeoLocationData; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get client IP address from request headers
 * This function extracts the real IP address considering various proxy headers
 */
function getClientIP(request: Request): string | null {
  // Try various headers for real IP address
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'true-client-ip',   // Cloudflare Enterprise
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  return null;
}

/**
 * Basic IP address validation
 */
function isValidIP(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 validation (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Check if IP is private/local
 */
function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^127\./, // Loopback
    /^192\.168\./, // Private Class C
    /^10\./, // Private Class A
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
    /^::1$/, // IPv6 loopback
    /^fc00:/, // IPv6 private
    /^fe80:/, // IPv6 link-local
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Fetch geolocation data from ipgeolocation.io API
 */
async function fetchGeoLocationData(ip: string): Promise<GeoLocationData> {
  const API_KEY = import.meta.env.IPGEOLOCATION_API_KEY;
  
  if (!API_KEY) {
    console.warn('[GeoLocation] IPGEOLOCATION_API_KEY not configured in environment variables');
    return {
      country_code: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      time_zone: null,
      accuracy_radius: null,
      success: false,
      error: 'API key not configured'
    };
  }

  try {
    const apiUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${API_KEY}&ip=${ip}&fields=country_code2,state_prov,city,latitude,longitude,time_zone,accuracy_radius`;
    
    console.log(`[GeoLocation] Fetching data for IP: ${ip}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Jason-Personal-Website/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GeoLocationResponse = await response.json();

    // Check for API errors
    if (data.error) {
      throw new Error(`API Error ${data.error.code}: ${data.error.message}`);
    }

    // Parse and return structured data
    const result: GeoLocationData = {
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
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get geolocation data with caching
 */
async function getCachedGeoLocationData(ip: string): Promise<GeoLocationData> {
  // Check cache first
  const cached = geoCache.get(ip);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`[GeoLocation] Using cached data for IP: ${ip}`);
    return cached.data;
  }

  // Fetch fresh data
  const data = await fetchGeoLocationData(ip);
  
  // Cache successful results
  if (data.success) {
    geoCache.set(ip, { data, timestamp: now });
  }

  return data;
}

/**
 * Main function to get geolocation data for impression tracking
 * This can be used in both client-side and server-side contexts
 */
export async function getGeoLocationForImpression(request?: Request): Promise<{
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  time_zone: string | null;
  accuracy_radius: string | null;
}> {
  try {
    let targetIP: string | null = null;

    // Server-side: extract IP from request
    if (request) {
      targetIP = getClientIP(request);
      console.log('[GeoLocation] Extracted IP from request:', targetIP);
    }
    
    // Client-side: we can't determine IP, return null values
    // (Client-side geolocation would require a separate API call)
    if (!targetIP) {
      console.log('[GeoLocation] No IP address available for geolocation');
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

    // Skip private/local IPs
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

    // Get geolocation data
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
    console.error('[GeoLocation] Error getting geolocation data:', error);
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

/**
 * Server-side API endpoint helper
 * Use this in API routes to get geolocation for the requesting IP
 */
export async function getServerSideGeoLocation(request: Request): Promise<{
  country_code: string | null;
  region: string | null;
  city: string | null;
}> {
  const geoData = await getGeoLocationForImpression(request);
  
  console.log('[GeoLocation] Server-side geolocation result:', geoData);
  
  return {
    country_code: geoData.country_code,
    region: geoData.region,
    city: geoData.city
  };
}

/**
 * Test function to verify API integration
 */
export async function testGeoLocationService(): Promise<void> {
  console.log('[GeoLocation] Testing service with known IP addresses...');
  
  // Test with known public IPs
  const testIPs = [
    '8.8.8.8', // Google DNS (should be US)
    '1.1.1.1', // Cloudflare DNS (should be US/AU)
  ];

  for (const ip of testIPs) {
    const result = await fetchGeoLocationData(ip);
    console.log(`[GeoLocation] Test result for ${ip}:`, result);
  }
}

// Cleanup cache periodically (run every hour)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, cached] of geoCache.entries()) {
      if (now - cached.timestamp > CACHE_DURATION) {
        geoCache.delete(ip);
      }
    }
  }, 60 * 60 * 1000); // 1 hour
} 