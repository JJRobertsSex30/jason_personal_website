// src/lib/posthog.js
const POSTHOG_KEY = 'phc_4jcbRlNZBafXJMgn9vq9Mzlrem5vT3FKH6AZ1EwhF6N';
const IS_LOCALHOST = typeof window !== 'undefined' && 
                    (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1');

// Use proxy in production, direct connection in development
const getPosthogConfig = () => {
  if (IS_LOCALHOST) {
    return {
      api_host: 'https://eu.i.posthog.com',
      ui_host: 'https://eu.i.posthog.com',
      scriptSrc: 'https://eu.i.posthog.com/static/array.js'
    };
  }
  
  // In production, use the proxied endpoints
  return {
    api_host: window.location.origin + '/ingest',
    ui_host: 'https://eu.i.posthog.com',
    scriptSrc: '/static/array.js'
  };
};

export function initPostHog() {
  if (typeof window === 'undefined') return;

  const { api_host, ui_host, scriptSrc } = getPosthogConfig();
  
  // Initialize PostHog queue
  window.posthog = window.posthog || [];
  window.posthog._i = [];
  window.posthog._q = window.posthog._q || [];
  
  // Skip if already loaded
  if (window.posthog.__loaded) {
    console.log('PostHog already loaded');
    window.dispatchEvent(new Event('posthog:ready'));
    return;
  }

  // Create and configure the script element
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = scriptSrc;
  script.crossOrigin = 'anonymous';
  
  script.onload = function() {
    window.posthog.init(POSTHOG_KEY, {
      api_host: api_host,
      ui_host: ui_host,
      capture_pageview: true,
      loaded: function() {
        console.log('PostHog initialized');
        window.posthog.__loaded = true;
        window.dispatchEvent(new Event('posthog:ready'));
      }
    });
  };
  
  script.onerror = function(error) {
    console.error('Failed to load PostHog script', error);
    // Fallback to direct connection if proxy fails in production
    if (!IS_LOCALHOST && scriptSrc.startsWith('/')) {
      console.log('Trying direct connection to PostHog...');
      script.src = 'https://eu.i.posthog.com/static/array.js';
      document.head.appendChild(script);
    }
  };

  // Insert the script into the document
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(script, firstScript);
}

// Helper function to use PostHog after it's loaded
export function posthogReady() {
  return new Promise((resolve) => {
    if (window.posthog && window.posthog.__loaded) {
      resolve(window.posthog);
    } else {
      window.addEventListener('posthog:ready', () => {
        resolve(window.posthog);
      }, { once: true });
    }
  });
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initPostHog();
}
