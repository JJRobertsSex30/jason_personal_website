import { c as createAstro, a as createComponent, b as renderTemplate, k as defineScriptVars, r as renderComponent, d as addAttribute, u as unescapeHTML, m as maybeRenderHead, F as Fragment, f as renderScript } from '../chunks/astro/server_DgPtluSo.mjs';
import 'kleur/colors';
import { $ as $$PageLayout } from '../chunks/PageLayout_j_B7ywtx.mjs';
import { $ as $$Image } from '../chunks/_astro_assets_CLKYWX5i.mjs';
import imgHeroMain from '../chunks/jj2_n6eWO6wy.mjs';
import { $ as $$Content } from '../chunks/Content_C75Zq4RS.mjs';
import { $ as $$Icon } from '../chunks/ToggleTheme_Bm6TxLZp.mjs';
import { s as supabase } from '../chunks/supabaseClient_C6_a71Ro.mjs';
import { handleReturnUserConversion, checkUserEligibilityForABTesting, trackIneligibleUserEngagement } from '../chunks/userEligibility_Do3eCcxG.mjs';
export { renderers } from '../renderers.mjs';

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(raw || cooked.slice()) }));
var _a$1;
const $$Astro$1 = createAstro("https://astrowind.vercel.app");
const $$HeroCustomAB = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$HeroCustomAB;
  const {
    headline = "Default Headline: Discover Your Path",
    subheadline = "Unlock insights and start your journey with our expert guidance. Enter your email to begin.",
    image = { src: imgHeroMain, alt: "Inspirational image for hero section" },
    abTestVariantKey = "default_variant_id_from_hero",
    // Default for the variant ID
    experimentName = "default_experiment_name_from_hero_component"
    // More specific default
  } = Astro2.props;
  console.log(`[HeroCustomAB SSR] Raw Astro.props.headline: "${Astro2.props.headline}"`);
  console.log(`[HeroCustomAB SSR] Raw Astro.props.experimentName: "${Astro2.props.experimentName}"`);
  console.log(`[HeroCustomAB SSR] Raw Astro.props.abTestVariantKey: "${Astro2.props.abTestVariantKey}"`);
  console.log(`[HeroCustomAB SSR] Destructured values: headline="${headline ? headline.substring(0, 30) + "..." : "N/A"}", experimentName="${experimentName}", abTestVariantKey (variantId)="${abTestVariantKey}"`);
  return renderTemplate(_a$1 || (_a$1 = __template$1(["", '<section class="py-16 md:py-24 bg-slate-50 dark:bg-slate-800/30"> <div class="container mx-auto px-4"> <div class="grid md:grid-cols-2 gap-8 lg:gap-12 items-center"> <div class="text-left"> ', " ", ' <form id="hero-custom-ab-form" class="flex flex-col sm:flex-row gap-4 max-w-md" aria-labelledby="hero-custom-ab-form-title"> <span id="hero-custom-ab-form-title" class="sr-only">Sign up for updates</span> <input type="hidden" name="ab_test_variant_id"', '> <input type="hidden" name="ab_test_experiment_name"', '> <input type="hidden" name="signup_source" value="hero-custom-ab"> <input type="hidden" name="ab_user_identifier" id="ab-user-identifier-input" value=""> <label for="hero-email-bg-custom-ab" class="sr-only">Email address</label> <input type="email" id="hero-email-bg-custom-ab" name="email" placeholder="your.email@example.com" required autocomplete="email" class="w-full sm:w-auto flex-grow px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400"> <button type="submit" class="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 whitespace-nowrap">\nGet Started Now\n</button> </form> <p id="hero-custom-ab-form-message" class="text-sm mt-4 min-h-[1.25em]" aria-live="polite"></p> </div> <div class="mt-8 md:mt-0 flex justify-center md:justify-end"> ', " </div> </div> </div> </section> <script>(function(){", `
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[HeroCustomAB Client] Component mounted. Variant ID:', clientVariantIdFromProps, 'Experiment Name:', clientExperimentNameFromProps);
    
    const form = document.getElementById('hero-custom-ab-form');
    const messageElement = document.getElementById('hero-custom-ab-form-message');
    const abUserIdentifierInput = document.getElementById('ab-user-identifier-input');
    
    // Populate ab_user_identifier from localStorage for consistent eligibility checking
    function getClientUserIdentifier() {
      let userId = localStorage.getItem('ab_user_identifier');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('ab_user_identifier', userId);
        console.log('[HeroCustomAB] New ab_user_identifier generated:', userId);
      }
      return userId;
    }
    
    if (abUserIdentifierInput) {
      const userIdentifier = getClientUserIdentifier();
      abUserIdentifierInput.value = userIdentifier;
      console.log('[HeroCustomAB] Set ab_user_identifier in form:', userIdentifier);
    }
    
    if (!form || !messageElement) {
        console.error('[HeroCustomAB Client] Form or message element not found.');
        return;
    }
    
    form.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const emailInput = form.querySelector('input[type="email"]');
      const submitButton = form.querySelector('button[type="submit"]');
      
      if (!(emailInput instanceof HTMLInputElement) || !(submitButton instanceof HTMLButtonElement)) {
          console.error("[HeroCustomAB Client] Email input or submit button not found or are of incorrect type.");
          messageElement.textContent = "Form error. Please refresh and try again.";
          messageElement.className = 'text-sm mt-4 text-red-600 dark:text-red-500 min-h-[1.25em]';
          return;
      }
      
      const email = emailInput.value.trim();
      
      if (!email || !email.includes('@')) {
        messageElement.textContent = 'Please enter a valid email address.';
        messageElement.className = 'text-sm mt-4 text-red-600 dark:text-red-500 min-h-[1.25em]';
        return;
      }
      
      submitButton.disabled = true;
      submitButton.textContent = 'Subscribing...';
      messageElement.textContent = 'Processing your request...';
      messageElement.className = 'text-sm mt-4 text-gray-700 dark:text-gray-300 min-h-[1.25em]';
      
      try {
        const formDataForApiSubscribe = new FormData(form); 
        
        const response = await fetch('/api/subscribe', { 
          method: 'POST',
          body: formDataForApiSubscribe
        });
        
        const result = await response.json();
        let conversionDisplayMessage = '';
        
        if (response.ok && result.success) {
          conversionDisplayMessage = result.message || 'Thank you for subscribing! Please check your email to confirm.'; 
          messageElement.className = 'text-sm mt-4 text-green-600 dark:text-green-500 min-h-[1.25em]';
          emailInput.value = ''; 
          
          if (typeof window.trackConversion === 'function') {
            console.log(\`[HeroCustomAB Client] Attempting to track A/B conversion. Variant ID: '\${clientVariantIdFromProps}', User: '\${email}'\`);
            
            const abResult = await window.trackConversion(
              clientVariantIdFromProps,    
              email,                       
              'hero_form_submission',      
              {                            
                source: 'hero-custom-ab',
                experiment_context_name: clientExperimentNameFromProps 
              } 
            );
            console.log(\`[HeroCustomAB Client] A/B Test Conversion track result:\`, abResult);
            
            if (abResult.status === 'DUPLICATE') {
              console.warn('[HeroCustomAB Client] A/B Test: Duplicate conversion detected by abTester for:', email);
            } else if (abResult.status === 'ERROR') {
              console.error('[HeroCustomAB Client] A/B Test: Error tracking conversion via abTester:', abResult.message);
            }
          } else {
            console.warn('[HeroCustomAB Client] window.trackConversion function not found. A/B conversion not tracked.');
          }

        } else {
          conversionDisplayMessage = result.message || 'Subscription failed. Please try again.';
          messageElement.className = 'text-sm mt-4 text-red-600 dark:text-red-500 min-h-[1.25em]';
        }
        messageElement.textContent = conversionDisplayMessage;

      } catch (error) {
        console.error('[HeroCustomAB Client] Error during form submission or A/B tracking:', error);
        messageElement.textContent = 'An unexpected error occurred. Please try again.';
        messageElement.className = 'text-sm mt-4 text-red-600 dark:text-red-500 min-h-[1.25em]';
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Get Started Now';
      }
    });
  });
})();<\/script>`], ["", '<section class="py-16 md:py-24 bg-slate-50 dark:bg-slate-800/30"> <div class="container mx-auto px-4"> <div class="grid md:grid-cols-2 gap-8 lg:gap-12 items-center"> <div class="text-left"> ', " ", ' <form id="hero-custom-ab-form" class="flex flex-col sm:flex-row gap-4 max-w-md" aria-labelledby="hero-custom-ab-form-title"> <span id="hero-custom-ab-form-title" class="sr-only">Sign up for updates</span> <input type="hidden" name="ab_test_variant_id"', '> <input type="hidden" name="ab_test_experiment_name"', '> <input type="hidden" name="signup_source" value="hero-custom-ab"> <input type="hidden" name="ab_user_identifier" id="ab-user-identifier-input" value=""> <label for="hero-email-bg-custom-ab" class="sr-only">Email address</label> <input type="email" id="hero-email-bg-custom-ab" name="email" placeholder="your.email@example.com" required autocomplete="email" class="w-full sm:w-auto flex-grow px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400"> <button type="submit" class="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 whitespace-nowrap">\nGet Started Now\n</button> </form> <p id="hero-custom-ab-form-message" class="text-sm mt-4 min-h-[1.25em]" aria-live="polite"></p> </div> <div class="mt-8 md:mt-0 flex justify-center md:justify-end"> ', " </div> </div> </div> </section> <script>(function(){", `
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[HeroCustomAB Client] Component mounted. Variant ID:', clientVariantIdFromProps, 'Experiment Name:', clientExperimentNameFromProps);
    
    const form = document.getElementById('hero-custom-ab-form');
    const messageElement = document.getElementById('hero-custom-ab-form-message');
    const abUserIdentifierInput = document.getElementById('ab-user-identifier-input');
    
    // Populate ab_user_identifier from localStorage for consistent eligibility checking
    function getClientUserIdentifier() {
      let userId = localStorage.getItem('ab_user_identifier');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('ab_user_identifier', userId);
        console.log('[HeroCustomAB] New ab_user_identifier generated:', userId);
      }
      return userId;
    }
    
    if (abUserIdentifierInput) {
      const userIdentifier = getClientUserIdentifier();
      abUserIdentifierInput.value = userIdentifier;
      console.log('[HeroCustomAB] Set ab_user_identifier in form:', userIdentifier);
    }
    
    if (!form || !messageElement) {
        console.error('[HeroCustomAB Client] Form or message element not found.');
        return;
    }
    
    form.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const emailInput = form.querySelector('input[type="email"]');
      const submitButton = form.querySelector('button[type="submit"]');
      
      if (!(emailInput instanceof HTMLInputElement) || !(submitButton instanceof HTMLButtonElement)) {
          console.error("[HeroCustomAB Client] Email input or submit button not found or are of incorrect type.");
          messageElement.textContent = "Form error. Please refresh and try again.";
          messageElement.className = 'text-sm mt-4 text-red-600 dark:text-red-500 min-h-[1.25em]';
          return;
      }
      
      const email = emailInput.value.trim();
      
      if (!email || !email.includes('@')) {
        messageElement.textContent = 'Please enter a valid email address.';
        messageElement.className = 'text-sm mt-4 text-red-600 dark:text-red-500 min-h-[1.25em]';
        return;
      }
      
      submitButton.disabled = true;
      submitButton.textContent = 'Subscribing...';
      messageElement.textContent = 'Processing your request...';
      messageElement.className = 'text-sm mt-4 text-gray-700 dark:text-gray-300 min-h-[1.25em]';
      
      try {
        const formDataForApiSubscribe = new FormData(form); 
        
        const response = await fetch('/api/subscribe', { 
          method: 'POST',
          body: formDataForApiSubscribe
        });
        
        const result = await response.json();
        let conversionDisplayMessage = '';
        
        if (response.ok && result.success) {
          conversionDisplayMessage = result.message || 'Thank you for subscribing! Please check your email to confirm.'; 
          messageElement.className = 'text-sm mt-4 text-green-600 dark:text-green-500 min-h-[1.25em]';
          emailInput.value = ''; 
          
          if (typeof window.trackConversion === 'function') {
            console.log(\\\`[HeroCustomAB Client] Attempting to track A/B conversion. Variant ID: '\\\${clientVariantIdFromProps}', User: '\\\${email}'\\\`);
            
            const abResult = await window.trackConversion(
              clientVariantIdFromProps,    
              email,                       
              'hero_form_submission',      
              {                            
                source: 'hero-custom-ab',
                experiment_context_name: clientExperimentNameFromProps 
              } 
            );
            console.log(\\\`[HeroCustomAB Client] A/B Test Conversion track result:\\\`, abResult);
            
            if (abResult.status === 'DUPLICATE') {
              console.warn('[HeroCustomAB Client] A/B Test: Duplicate conversion detected by abTester for:', email);
            } else if (abResult.status === 'ERROR') {
              console.error('[HeroCustomAB Client] A/B Test: Error tracking conversion via abTester:', abResult.message);
            }
          } else {
            console.warn('[HeroCustomAB Client] window.trackConversion function not found. A/B conversion not tracked.');
          }

        } else {
          conversionDisplayMessage = result.message || 'Subscription failed. Please try again.';
          messageElement.className = 'text-sm mt-4 text-red-600 dark:text-red-500 min-h-[1.25em]';
        }
        messageElement.textContent = conversionDisplayMessage;

      } catch (error) {
        console.error('[HeroCustomAB Client] Error during form submission or A/B tracking:', error);
        messageElement.textContent = 'An unexpected error occurred. Please try again.';
        messageElement.className = 'text-sm mt-4 text-red-600 dark:text-red-500 min-h-[1.25em]';
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Get Started Now';
      }
    });
  });
})();<\/script>`])), maybeRenderHead(), headline && renderTemplate`<h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">${unescapeHTML(headline)}</h1>`, subheadline && renderTemplate`<p class="text-lg text-gray-700 dark:text-gray-300 mb-8">${unescapeHTML(subheadline)}</p>`, addAttribute(abTestVariantKey, "value"), addAttribute(experimentName, "value"), image && image.src && renderTemplate`${renderComponent($$result, "Image", $$Image, { "src": image.src, "alt": image.alt || "Hero section image", "width": 500, "height": 500, "densities": [1, 1.5, 2], "format": "webp", "quality": 80, "class": "rounded-lg shadow-xl mx-auto w-full max-w-sm md:max-w-md object-cover aspect-square" })}`, defineScriptVars({
    clientVariantIdFromProps: abTestVariantKey,
    clientExperimentNameFromProps: experimentName
    // This uses the destructured 'experimentName' from frontmatter
  }));
}, "C:/Dev/jason_personal_website/src/components/widgets/HeroCustomAB.astro", void 0);

console.log("[abTester.ts] Module loading/starting...");
function parseVariantConfig(config, variantName) {
  const defaults = {
    headline: `Default Headline for ${variantName}`,
    subheadline: `Default subheadline for ${variantName}. Configure in DB.`
  };
  if (!config) {
    return defaults;
  }
  return {
    headline: typeof config.headline === "string" ? config.headline : defaults.headline,
    subheadline: typeof config.subheadline === "string" ? config.subheadline : defaults.subheadline
  };
}
async function fetchExperimentVariants(experimentName) {
  console.log(`[abTester] Fetching variants for experiment name: "${experimentName}"`);
  const { data: expData, error: expError } = await supabase.from("experiments").select("id, name").eq("name", experimentName).eq("is_active", true).maybeSingle();
  if (expError) {
    console.error(`[abTester] DB error fetching experiment by name "${experimentName}". Error:`, expError.message);
    return [];
  }
  if (!expData) {
    console.warn(`[abTester] No active experiment found with name "${experimentName}".`);
    return [];
  }
  const experimentId = expData.id;
  console.log(`[abTester] Found active experiment "${experimentName}" with ID: ${experimentId}. Fetching its variants.`);
  const { data: variantsData, error: variantsError } = await supabase.from("variants").select("id, name, experiment_id, description, config_json").eq("experiment_id", experimentId);
  if (variantsError) {
    console.error(`[abTester] Error fetching variants for experiment ID "${experimentId}":`, variantsError.message);
    return [];
  }
  if (!variantsData || variantsData.length === 0) {
    console.warn(`[abTester] No variants found for experiment "${experimentName}" (ID: ${experimentId}).`);
    return [];
  }
  return variantsData.map((v) => {
    const config = parseVariantConfig(v.config_json, v.name);
    return {
      id: v.id,
      // Variant's UUID
      name: v.name,
      // Variant's textual name (e.g., 'A', 'B')
      experiment_id: v.experiment_id,
      // Experiment's UUID (should match experimentId from above)
      headline: config.headline,
      subheadline: config.subheadline,
      raw_config_json: v.config_json
    };
  });
}
function getClientUserIdentifier() {
  if (typeof localStorage === "undefined") {
    console.warn("[abTester] Client user identifier requested in non-browser environment. Generating transient ID.");
    return "client_anon_ssr_" + crypto.randomUUID();
  }
  let userId = localStorage.getItem("ab_user_identifier");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("ab_user_identifier", userId);
    console.log("[abTester] New client user identifier generated and stored:", userId);
  }
  return userId;
}
function getClientSessionIdentifier() {
  if (typeof sessionStorage === "undefined") {
    console.warn("[abTester] Client session identifier requested in non-browser environment.");
    return null;
  }
  let sessionId = sessionStorage.getItem("ab_session_identifier");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("ab_session_identifier", sessionId);
    console.log("[abTester] New client session identifier generated and stored:", sessionId);
  }
  return sessionId;
}
function getDeviceType() {
  if (typeof window === "undefined") return null;
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
  if (isTablet) return "tablet";
  if (isMobile) return "mobile";
  return "desktop";
}
function getScreenResolution() {
  if (typeof window === "undefined" || !window.screen) return null;
  return `${window.screen.width}x${window.screen.height}`;
}
function getViewportSize() {
  if (typeof window === "undefined") return null;
  return `${window.innerWidth}x${window.innerHeight}`;
}
function getConnectionType() {
  if (typeof navigator === "undefined") {
    console.log("[abTester] getConnectionType: navigator undefined (SSR context)");
    return null;
  }
  const hasConnectionAPI = "connection" in navigator;
  const hasMozConnection = "mozConnection" in navigator;
  const hasWebkitConnection = "webkitConnection" in navigator;
  console.log("[abTester] Connection API availability:", {
    connection: hasConnectionAPI,
    mozConnection: hasMozConnection,
    webkitConnection: hasWebkitConnection
  });
  if (!hasConnectionAPI && !hasMozConnection && !hasWebkitConnection) {
    console.log("[abTester] getConnectionType: No connection API available, attempting fallback detection");
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("mobile") || userAgent.includes("android") || userAgent.includes("iphone")) {
      console.log("[abTester] getConnectionType: Mobile device detected, defaulting to 4g");
      return "4g";
    } else {
      console.log("[abTester] getConnectionType: Desktop device detected, defaulting to wifi");
      return "wifi";
    }
  }
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) {
    console.log("[abTester] getConnectionType: Connection object not available");
    return null;
  }
  console.log("[abTester] Connection object details:", {
    effectiveType: connection.effectiveType,
    type: connection.type,
    downlink: connection.downlink
  });
  const effectiveType = connection.effectiveType;
  switch (effectiveType) {
    case "slow-2g":
      console.log("[abTester] getConnectionType: detected slow-2g");
      return "slow-2g";
    case "2g":
      console.log("[abTester] getConnectionType: detected 2g");
      return "2g";
    case "3g":
      console.log("[abTester] getConnectionType: detected 3g");
      return "3g";
    case "4g":
      console.log("[abTester] getConnectionType: detected 4g");
      return "4g";
    default: {
      const type = connection.type;
      console.log("[abTester] getConnectionType: effectiveType not recognized, checking type:", type);
      switch (type) {
        case "wifi":
          console.log("[abTester] getConnectionType: detected wifi");
          return "wifi";
        case "ethernet":
          console.log("[abTester] getConnectionType: detected ethernet");
          return "ethernet";
        case "cellular":
          console.log("[abTester] getConnectionType: cellular detected, defaulting to 4g");
          return "4g";
        default: {
          if (connection.downlink !== void 0) {
            const downlink = connection.downlink;
            console.log("[abTester] getConnectionType: using downlink speed for detection:", downlink, "Mbps");
            if (downlink >= 10) return "4g";
            if (downlink >= 1.5) return "3g";
            if (downlink >= 0.15) return "2g";
            return "slow-2g";
          }
          console.log("[abTester] getConnectionType: falling back to 4g (unknown type)");
          return "4g";
        }
      }
    }
  }
}
function getLanguageCode() {
  if (typeof navigator === "undefined") return null;
  return navigator.language || navigator.userLanguage || null;
}
function getTimeZone() {
  if (typeof Intl === "undefined") return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}
function getPageLoadTime() {
  if (typeof performance === "undefined" || !performance.timing) return null;
  const timing = performance.timing;
  if (timing.loadEventEnd && timing.navigationStart) {
    return timing.loadEventEnd - timing.navigationStart;
  }
  if (performance.now) {
    return Math.round(performance.now());
  }
  return null;
}
function getUTMParameters() {
  if (typeof window === "undefined") return {};
  const urlParams = new URLSearchParams(window.location.search);
  const getParam = (key) => {
    const value = urlParams.get(key);
    return value && value.trim() !== "" ? value.trim() : void 0;
  };
  return {
    utm_source: getParam("utm_source"),
    utm_medium: getParam("utm_medium"),
    utm_campaign: getParam("utm_campaign")
  };
}
function checkIsFirstExposure(experimentId) {
  if (typeof localStorage === "undefined") return true;
  const exposureKey = `ab_first_exposure_${experimentId}`;
  const timestampKey = `ab_first_exposure_time_${experimentId}`;
  const hasBeenExposed = localStorage.getItem(exposureKey);
  console.log(`[abTester] checkIsFirstExposure: Experiment ${experimentId}, hasBeenExposed: ${hasBeenExposed}`);
  if (!hasBeenExposed) {
    const currentTimestamp = Date.now();
    localStorage.setItem(exposureKey, "true");
    localStorage.setItem(timestampKey, currentTimestamp.toString());
    console.log(`[abTester] checkIsFirstExposure: Set first exposure timestamp for experiment ${experimentId}: ${currentTimestamp}`);
    return true;
  }
  const existingTimestamp = localStorage.getItem(timestampKey);
  if (!existingTimestamp) {
    const recoveryTimestamp = Date.now();
    localStorage.setItem(timestampKey, recoveryTimestamp.toString());
    console.log(`[abTester] checkIsFirstExposure: Recovery - Set missing timestamp for experiment ${experimentId}: ${recoveryTimestamp}`);
  } else {
    console.log(`[abTester] checkIsFirstExposure: Existing timestamp found for experiment ${experimentId}: ${existingTimestamp}`);
  }
  return false;
}
function getScrollDepthPercent() {
  if (typeof window === "undefined") return 0;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const documentHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (documentHeight <= 0) return 100;
  return Math.round(scrollTop / documentHeight * 100);
}
function getBrowserMetadata() {
  if (typeof window === "undefined") return {};
  return {
    browser_features: {
      local_storage: typeof localStorage !== "undefined",
      session_storage: typeof sessionStorage !== "undefined",
      performance_api: typeof performance !== "undefined",
      connection_api: "connection" in navigator,
      intl_api: typeof Intl !== "undefined",
      geolocation_api: "geolocation" in navigator,
      touch_support: "ontouchstart" in window
    },
    page_info: {
      title: document.title,
      referrer: document.referrer || null,
      url_hash: window.location.hash || null,
      url_pathname: window.location.pathname,
      url_search: window.location.search || null
    },
    document_info: {
      ready_state: document.readyState,
      visibility_state: document.visibilityState || null
    }
  };
}
let pageLoadStartTime = null;
let hasUserInteracted = false;
if (typeof window !== "undefined") {
  pageLoadStartTime = Date.now();
  const interactionEvents = ["click", "keydown", "scroll", "mousemove", "touchstart"];
  const markInteraction = () => {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      interactionEvents.forEach((event) => {
        document.removeEventListener(event, markInteraction);
      });
    }
  };
  interactionEvents.forEach((event) => {
    document.addEventListener(event, markInteraction, { passive: true, once: true });
  });
}
async function getVariant(experimentName) {
  console.log(`[abTester] getVariant called for experiment name: "${experimentName}"`);
  const activeVariants = await fetchExperimentVariants(experimentName);
  if (!activeVariants || activeVariants.length === 0) {
    console.error(`[abTester] No active variants for experiment '${experimentName}'. Returning fallback variant.`);
    return {
      id: "fallback_no_variants",
      name: "Fallback",
      experiment_id: "unknown_experiment_id",
      // Fallback experiment_id
      headline: "Error: Experiment Not Configured",
      subheadline: "Please check A/B test setup or ensure experiment is active.",
      raw_config_json: {}
    };
  }
  let chosenVariant;
  if (typeof localStorage !== "undefined") {
    const localStorageKey = `ab_variant_${experimentName}`;
    const storedVariantId = localStorage.getItem(localStorageKey);
    if (storedVariantId) {
      chosenVariant = activeVariants.find((v) => v.id === storedVariantId);
      if (chosenVariant) ; else {
        console.warn(`[abTester] Stored variant ID "${storedVariantId}" not found in active variants for "${experimentName}". Clearing stored key.`);
        localStorage.removeItem(localStorageKey);
      }
    }
    if (!chosenVariant) {
      const randomIndex = Math.floor(Math.random() * activeVariants.length);
      chosenVariant = activeVariants[randomIndex];
      localStorage.setItem(localStorageKey, chosenVariant.id);
      console.log(`[abTester] Randomly selected and stored variant "${chosenVariant.name}" (ID: ${chosenVariant.id}) for experiment "${experimentName}"`);
    }
  } else {
    const randomIndex = Math.floor(Math.random() * activeVariants.length);
    chosenVariant = activeVariants[randomIndex];
    console.log(`[abTester] SSR/Non-browser: Randomly selected variant "${chosenVariant.name}" (ID: ${chosenVariant.id}) for experiment "${experimentName}"`);
  }
  return chosenVariant || activeVariants[0];
}
async function logClientImpression(variant, experimentNameFromContext) {
  if (typeof window === "undefined") {
    return;
  }
  if (!variant || variant.id === "fallback_no_variants") {
    console.log("[abTester] Impression logging skipped: Invalid or fallback variant provided.");
    return;
  }
  if (!variant.experiment_id || variant.experiment_id === "unknown_experiment_id") {
    console.error(`[abTester] Cannot log impression: Missing valid experiment_id on variant object. Experiment context: "${experimentNameFromContext || "N/A"}". Variant:`, variant);
    return;
  }
  const userIdentifier = getClientUserIdentifier();
  const sessionIdentifier = getClientSessionIdentifier();
  console.log(`[abTester] logClientImpression: Ensuring first exposure timestamp for experiment ${variant.experiment_id}`);
  const isFirstExposure = checkIsFirstExposure(variant.experiment_id);
  const eligibility = await checkUserEligibilityForABTesting(userIdentifier, variant.experiment_id);
  if (!eligibility.isEligible) {
    console.log(`[abTester] User ${userIdentifier} not eligible for A/B testing: ${eligibility.reason}`);
    await trackIneligibleUserEngagement(
      userIdentifier,
      experimentNameFromContext || "unknown_experiment",
      variant.name,
      window.location.href,
      "page_view"
    );
    return;
  }
  const shortTermKey = `impression_recent_${variant.experiment_id}_${variant.id}_${Math.floor(Date.now() / 12e4)}`;
  if (sessionStorage.getItem(shortTermKey)) {
    console.log(`[abTester] Impression for variant "${variant.name}" (ID: ${variant.id}) already logged in the last 2 minutes. Skipping to prevent spam.`);
    return;
  }
  console.log(`[abTester] Logging CLIENT IMPRESSION: Experiment ID: '${variant.experiment_id}', Variant ID: '${variant.id}', Name: '${variant.name}', User: '${userIdentifier}', Session: '${sessionIdentifier || "N/A"}'`);
  const utmParams = getUTMParameters();
  const timeOnPage = pageLoadStartTime ? Math.round((Date.now() - pageLoadStartTime) / 1e3) : null;
  let geoData = {
    country_code: null,
    region: null,
    city: null
  };
  try {
    console.log("[abTester] Fetching geolocation data...");
    const geoResponse = await fetch("/api/geolocation", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (geoResponse.ok) {
      const geoResult = await geoResponse.json();
      if (geoResult.success && geoResult.data) {
        geoData = {
          country_code: geoResult.data.country_code || null,
          region: geoResult.data.region || null,
          city: geoResult.data.city || null
        };
        console.log("[abTester] Geolocation data retrieved:", geoData);
      } else {
        console.log("[abTester] Geolocation API returned no data");
      }
    } else {
      console.warn("[abTester] Geolocation API request failed:", geoResponse.status);
    }
  } catch (error) {
    console.warn("[abTester] Failed to fetch geolocation data:", error);
  }
  const impressionData = {
    // Core A/B testing data
    variant_id: variant.id,
    user_identifier: userIdentifier,
    experiment_id: variant.experiment_id,
    session_identifier: sessionIdentifier,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    // Geographic & Location (now populated via IP geolocation)
    country_code: geoData.country_code,
    region: geoData.region,
    city: geoData.city,
    language_code: getLanguageCode(),
    time_zone: getTimeZone(),
    // Device & Technical
    device_type: getDeviceType(),
    screen_resolution: getScreenResolution(),
    viewport_size: getViewportSize(),
    connection_type: getConnectionType(),
    // Performance
    page_load_time: getPageLoadTime(),
    // Marketing & UTM
    utm_source: utmParams.utm_source || null,
    utm_medium: utmParams.utm_medium || null,
    utm_campaign: utmParams.utm_campaign || null,
    // Engagement
    time_on_page: timeOnPage,
    scroll_depth_percent: getScrollDepthPercent(),
    bounce: !hasUserInteracted,
    is_first_exposure: isFirstExposure,
    // A/B Testing Context
    user_was_eligible: eligibility.isEligible,
    user_eligibility_status: {
      reason: eligibility.reason,
      details: eligibility.details || {}
    },
    user_context: {
      experiment_name: experimentNameFromContext,
      variant_name: variant.name,
      user_identifier_type: "ab_user_identifier"
    },
    metadata: {
      ...getBrowserMetadata(),
      geolocation_source: geoData.country_code ? "ipgeolocation.io" : "unavailable",
      collection_timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  const { error: impressionError } = await supabase.from("impressions").insert(impressionData);
  if (impressionError) {
    if (impressionError.message.includes("created_at") && impressionError.message.includes("column") && impressionError.message.includes("does not exist")) {
      console.error(`[abTester] Supabase error logging client impression: The 'created_at' column might be missing or misconfigured in your 'impressions' table. Please ensure it exists and has a default value like NOW(). Original error:`, impressionError.message);
    } else {
      console.error("[abTester] Supabase error logging client impression:", impressionError.message, "Details:", impressionError.details);
    }
  } else {
    sessionStorage.setItem(shortTermKey, "true");
    console.log("[abTester] Client impression logged successfully to Supabase with comprehensive analytics data.");
  }
}
async function trackConversion(variantId, userIdentifierString, conversionType = "generic_conversion", details) {
  const sessionIdentifier = getClientSessionIdentifier();
  console.log(`[abTester] CLIENT CONVERSION ATTEMPT: Variant ID: '${variantId}', User: '${userIdentifierString}', Type: '${conversionType}', Session: '${sessionIdentifier || "N/A"}', Details:`, details);
  if (!userIdentifierString || userIdentifierString.trim() === "" || !variantId) {
    const msg = "[abTester] User identifier and variant ID are required for conversion tracking.";
    console.error(msg);
    return { status: "INVALID_INPUT", message: msg };
  }
  const returnUserCheck = await handleReturnUserConversion(
    userIdentifierString,
    variantId,
    conversionType,
    details?.conversion_value,
    details
  );
  if (!returnUserCheck.tracked) {
    console.log(`[abTester] Conversion not tracked as A/B test data: ${returnUserCheck.reason}`);
    return { status: "SUCCESS", message: returnUserCheck.reason };
  }
  const { data: variantRecord, error: variantError } = await supabase.from("variants").select("experiment_id").eq("id", variantId).single();
  if (variantError || !variantRecord || !variantRecord.experiment_id) {
    const msg = `[abTester] Could not find a valid variant or its experiment_id for variant_id: ${variantId}. Conversion not logged. Error: ${variantError?.message || "Variant not found or experiment_id missing"}`;
    console.error(msg);
    return { status: "ERROR", message: msg };
  }
  const associatedExperimentId = variantRecord.experiment_id;
  const { data: existingConversion, error: checkError } = await supabase.from("conversions").select("id").eq("experiment_id", associatedExperimentId).eq("variant_id", variantId).eq("user_identifier", userIdentifierString).eq("conversion_type", conversionType).limit(1).maybeSingle();
  if (checkError && checkError.code !== "PGRST116") {
    const msg = `[abTester] Supabase error checking for existing conversion: ${checkError.message}`;
    console.error(msg);
    return { status: "ERROR", message: msg };
  }
  if (existingConversion) {
    const msg = `[abTester] Conversion already logged for user '${userIdentifierString}', variant '${variantId}', type '${conversionType}'.`;
    console.log(msg);
    return { status: "DUPLICATE", message: "Conversion already recorded for these parameters." };
  }
  console.log(`[abTester] Logging new conversion for user '${userIdentifierString}', variant '${variantId}', experiment '${associatedExperimentId}', type '${conversionType}'.`);
  const utmParams = getUTMParameters();
  let geoData = {
    country_code: null,
    region: null,
    city: null
  };
  try {
    console.log("[abTester] Conversion: Fetching geolocation data...");
    const geoResponse = await fetch("/api/geolocation", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (geoResponse.ok) {
      const geoResult = await geoResponse.json();
      if (geoResult.success && geoResult.data) {
        geoData = {
          country_code: geoResult.data.country_code || null,
          region: geoResult.data.region || null,
          city: geoResult.data.city || null
        };
        console.log("[abTester] Conversion: Geolocation data retrieved:", geoData);
      } else {
        console.log("[abTester] Conversion: Geolocation API returned no data");
      }
    } else {
      console.warn("[abTester] Conversion: Geolocation API request failed:", geoResponse.status);
    }
  } catch (error) {
    console.warn("[abTester] Conversion: Failed to fetch geolocation data:", error);
  }
  const conversionData = {
    variant_id: variantId,
    experiment_id: associatedExperimentId,
    user_identifier: userIdentifierString,
    conversion_type: conversionType,
    details,
    session_identifier: sessionIdentifier,
    // Only fields that exist in conversions table schema
    country_code: geoData.country_code,
    device_type: getDeviceType(),
    referrer_source: getReferrerSource(),
    time_to_convert: calculateTimeToConvert(userIdentifierString, associatedExperimentId),
    conversion_value: details?.conversion_value || 1,
    // Default to 1 if not specified
    conversion_eligibility_verified: returnUserCheck.tracked,
    utm_source: utmParams.utm_source || null,
    utm_medium: utmParams.utm_medium || null,
    utm_campaign: utmParams.utm_campaign || null,
    original_exposure_date: (/* @__PURE__ */ new Date()).toISOString(),
    // Store additional data in metadata instead of non-existent columns
    metadata: {
      ...getBrowserMetadata(),
      geolocation_source: geoData.country_code ? "ipgeolocation.io" : "unavailable",
      collection_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      // Store data that doesn't have dedicated columns in metadata
      region: geoData.region,
      city: geoData.city,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      language_code: getLanguageCode(),
      time_zone: getTimeZone(),
      screen_resolution: getScreenResolution(),
      viewport_size: getViewportSize(),
      connection_type: getConnectionType()
    }
  };
  const { error: conversionError } = await supabase.from("conversions").insert(conversionData);
  if (conversionError) {
    const msg = `[abTester] Supabase error logging conversion: ${conversionError.message}`;
    console.error(msg);
    return { status: "ERROR", message: msg };
  } else {
    const msg = `[abTester] Conversion logged successfully for variant ${variantId}, user '${userIdentifierString}' in experiment ${associatedExperimentId}`;
    console.log(msg);
    return { status: "SUCCESS", message: "Conversion recorded successfully." };
  }
}
function calculateTimeToConvert(userIdentifier, experimentId) {
  if (typeof localStorage === "undefined") return null;
  const timestampKey = `ab_first_exposure_time_${experimentId}`;
  console.log(`[abTester] calculateTimeToConvert: Looking for timestamp key: ${timestampKey}`);
  const firstExposureTime = localStorage.getItem(timestampKey);
  console.log(`[abTester] calculateTimeToConvert: Found timestamp: ${firstExposureTime}`);
  if (firstExposureTime) {
    try {
      const exposureTimestamp = parseInt(firstExposureTime);
      const currentTime = Date.now();
      const timeToConvertSeconds = Math.round((currentTime - exposureTimestamp) / 1e3);
      console.log(`[abTester] calculateTimeToConvert: Exposure timestamp: ${exposureTimestamp}, Current: ${currentTime}, Time to convert: ${timeToConvertSeconds} seconds`);
      return timeToConvertSeconds;
    } catch (error) {
      console.warn("[abTester] Error parsing first exposure timestamp:", error);
      return null;
    }
  }
  console.log(`[abTester] calculateTimeToConvert: No timestamp found for experiment ${experimentId}. Checking for fallback options.`);
  const exposureKey = `ab_first_exposure_${experimentId}`;
  const hasBeenExposed = localStorage.getItem(exposureKey);
  if (!hasBeenExposed) {
    const currentTimestamp = Date.now();
    localStorage.setItem(exposureKey, "true");
    localStorage.setItem(timestampKey, currentTimestamp.toString());
    console.log(`[abTester] calculateTimeToConvert: Set fallback timestamp for first exposure: ${currentTimestamp}`);
    return 0;
  }
  console.log(`[abTester] calculateTimeToConvert: User has been exposed before but no timestamp found. Returning null.`);
  return null;
}
function getReferrerSource() {
  if (typeof document === "undefined") return null;
  const utmParams = getUTMParameters();
  if (utmParams.utm_source) {
    return utmParams.utm_source;
  }
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      return referrerUrl.hostname;
    } catch {
      return document.referrer;
    }
  }
  return null;
}
function debugABLocalStorage() {
  if (typeof localStorage === "undefined") {
    console.log("[debugAB] localStorage not available");
    return;
  }
  const abKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("ab_") || key.includes("experiment") || key.includes("variant"))) {
      abKeys.push(key);
    }
  }
  console.log("[debugAB] A/B Testing localStorage entries:");
  abKeys.forEach((key) => {
    const value = localStorage.getItem(key);
    if (key.includes("time")) {
      const timestamp = parseInt(value || "0");
      const date = new Date(timestamp);
      console.log(`[debugAB] ${key}: ${value} (${date.toISOString()})`);
    } else {
      console.log(`[debugAB] ${key}: ${value}`);
    }
  });
  if (abKeys.length === 0) {
    console.log("[debugAB] No A/B testing data found in localStorage");
  }
}
if (typeof window !== "undefined") {
  console.log("[abTester.ts] Running in browser, assigning functions to window object.");
  window.trackConversion = trackConversion;
  window.logClientImpression = logClientImpression;
  window.getClientSessionIdentifier = getClientSessionIdentifier;
  window.debugABLocalStorage = debugABLocalStorage;
  console.log("[abTester.ts] window.trackConversion assigned:", !!window.trackConversion);
  console.log("[abTester.ts] window.logClientImpression assigned:", !!window.logClientImpression);
  console.log("[abTester.ts] window.getClientSessionIdentifier assigned:", !!window.getClientSessionIdentifier);
  console.log("[abTester.ts] window.debugABLocalStorage assigned:", !!window.debugABLocalStorage);
}

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a, _b;
const $$Astro = createAstro("https://astrowind.vercel.app");
const $$IndexAbTest = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$IndexAbTest;
  const metadata = {
    title: "A/B Test Page | JJ Roberts",
    description: "Testing A/B variations."
  };
  const HERO_EXPERIMENT_NAME = "Hero Headline AB Test 1";
  const chosenHeroContent = await getVariant(HERO_EXPERIMENT_NAME);
  console.log(`[Index Page SSR] Assigned Hero variant for experiment "${HERO_EXPERIMENT_NAME}":`, JSON.stringify(chosenHeroContent, null, 2));
  console.log(`[Index Page SSR] HERO_EXPERIMENT_NAME to be passed to HeroCustomAB: "${HERO_EXPERIMENT_NAME}"`);
  console.log(`[Index Page SSR] chosenHeroContent.id to be passed as abTestVariantKey: "${chosenHeroContent.id}"`);
  const QUIZ_EXPERIMENT_NAME = "Lovelab Quiz 1 or 2 pages";
  let quizVariant;
  try {
    quizVariant = await getVariant(QUIZ_EXPERIMENT_NAME);
    console.log(`[Index Page SSR] Assigned Quiz variant for experiment "${QUIZ_EXPERIMENT_NAME}" (for path selection):`, JSON.stringify(quizVariant, null, 2));
  } catch (error) {
    console.error(`[Index Page SSR] Error getting quiz variant for "${QUIZ_EXPERIMENT_NAME}":`, error.message);
    quizVariant = {
      id: "fallback_quiz_variant_id_err",
      name: "Fallback Quiz Path DueToError",
      experiment_id: "fallback_quiz_experiment_id_err",
      headline: "",
      subheadline: "",
      raw_config_json: {
        quiz_path: "/quiz",
        quiz_name: "Default Quiz (Error Fallback)"
      }
    };
    console.log("[Index Page SSR] Using fallback quiz variant due to error:", quizVariant);
  }
  const quizVariantInfo = {
    experiment: QUIZ_EXPERIMENT_NAME,
    experimentId: quizVariant.experiment_id,
    variantId: quizVariant.id,
    variantName: quizVariant.name,
    quizPath: quizVariant.raw_config_json?.quiz_path || "/quiz",
    quizName: quizVariant.raw_config_json?.quiz_name || (quizVariant.name || "Quiz")
  };
  console.log("[Index Page SSR] quizVariantInfo prepared for client localStorage:", JSON.stringify(quizVariantInfo, null, 2));
  const heroImageForWidget = {
    src: imgHeroMain,
    alt: "JJ Roberts - Relationship Expert"
  };
  const finalCtaTagline = "Your Next Step to a Better Love Life";
  const finalCtaTitle = "Unlock Your Relationship Blueprint";
  const finalCtaImage = { src: imgHeroMain, alt: "Abstract graphic representing a blueprint or pathway" };
  const finalCtaDescription = `
  Ready to understand what's *really* going on in your relationships and how to make lasting positive changes?
  Our quick, insightful quiz will help you identify key patterns and provide a starting point for your personal transformation.
  Plus, you'll get exclusive free chapters from "Sex 3.0: A Sexual Revolution Manual" to guide you further!
`;
  const quizUrl = quizVariantInfo.quizPath;
  console.log("[Index Page SSR] Final Quiz URL for button:", quizUrl);
  const finalCtaButton = {
    text: "Enter The Love Lab",
    href: quizUrl,
    icon: "tabler:flask"
  };
  return renderTemplate(_b || (_b = __template(["", " <script>(function(){", "\n  // Simplified impression logging without fallback\n  function attemptHeroImpressionLog() {\n    if (!heroVariantForImpression?.id || !heroVariantForImpression?.experiment_id) {\n      console.log('[Index Page Hero Impression] Skipping: Invalid variant data');\n      return true;\n    }\n\n    if (typeof window.logClientImpression === 'function') {\n      console.log('[Index Page Hero Impression] Logging impression for variant:', heroVariantForImpression.id);\n      window.logClientImpression(heroVariantForImpression, heroExperimentNameForImpression)\n        .then(() => console.log('[Index Page Hero Impression] \u2705 Successfully logged'))\n        .catch(err => console.error('[Index Page Hero Impression] \u274C Error:', err));\n      return true;\n    } else {\n      console.log('[Index Page Hero Impression] window.logClientImpression not available yet');\n      return false;\n    }\n  }\n\n  // Retry mechanism for impression logging\n  function scheduleImpressionLog() {\n    if (!attemptHeroImpressionLog()) {\n      let attempts = 0;\n      const maxAttempts = 10;\n      const interval = setInterval(() => {\n        attempts++;\n        console.log(`[Index Page Hero Impression] Retry ${attempts}/${maxAttempts}`);\n        if (attemptHeroImpressionLog() || attempts >= maxAttempts) {\n          clearInterval(interval);\n          if (attempts >= maxAttempts) {\n            console.error('[Index Page Hero Impression] Max attempts reached. Impression not logged.');\n          }\n        }\n      }, 1000);\n    }\n  }\n\n  // Start impression logging when DOM is ready\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', scheduleImpressionLog);\n  } else {\n    scheduleImpressionLog();\n  }\n})();<\/script>"], ["", " <script>(function(){", "\n  // Simplified impression logging without fallback\n  function attemptHeroImpressionLog() {\n    if (!heroVariantForImpression?.id || !heroVariantForImpression?.experiment_id) {\n      console.log('[Index Page Hero Impression] Skipping: Invalid variant data');\n      return true;\n    }\n\n    if (typeof window.logClientImpression === 'function') {\n      console.log('[Index Page Hero Impression] Logging impression for variant:', heroVariantForImpression.id);\n      window.logClientImpression(heroVariantForImpression, heroExperimentNameForImpression)\n        .then(() => console.log('[Index Page Hero Impression] \u2705 Successfully logged'))\n        .catch(err => console.error('[Index Page Hero Impression] \u274C Error:', err));\n      return true;\n    } else {\n      console.log('[Index Page Hero Impression] window.logClientImpression not available yet');\n      return false;\n    }\n  }\n\n  // Retry mechanism for impression logging\n  function scheduleImpressionLog() {\n    if (!attemptHeroImpressionLog()) {\n      let attempts = 0;\n      const maxAttempts = 10;\n      const interval = setInterval(() => {\n        attempts++;\n        console.log(\\`[Index Page Hero Impression] Retry \\${attempts}/\\${maxAttempts}\\`);\n        if (attemptHeroImpressionLog() || attempts >= maxAttempts) {\n          clearInterval(interval);\n          if (attempts >= maxAttempts) {\n            console.error('[Index Page Hero Impression] Max attempts reached. Impression not logged.');\n          }\n        }\n      }, 1000);\n    }\n  }\n\n  // Start impression logging when DOM is ready\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', scheduleImpressionLog);\n  } else {\n    scheduleImpressionLog();\n  }\n})();<\/script>"])), renderComponent($$result, "Layout", $$PageLayout, { "metadata": metadata }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", "<main> ", " ", "   ", " </main> <script>(function(){", "\n    try {\n      sessionStorage.setItem('quizVariant', JSON.stringify(quizVariantInfoToStore));\n      localStorage.setItem('quizVariant', JSON.stringify(quizVariantInfoToStore));\n      console.log('[Index Page Client Script] Stored quizVariantInfo in localStorage:', quizVariantInfoToStore);\n    } catch (e) {\n      console.error('[Index Page Client Script] Error storing quizVariantInfo:', e);\n    }\n  })();<\/script> ", " "])), maybeRenderHead(), renderComponent($$result2, "HeroCustomAB", $$HeroCustomAB, { "headline": chosenHeroContent.headline, "subheadline": chosenHeroContent.subheadline, "image": heroImageForWidget, "abTestVariantKey": chosenHeroContent.id, "experimentName": HERO_EXPERIMENT_NAME }), Astro2.cookies.has("astro_developer_toolbar") && renderTemplate`<div class="fixed bottom-0 right-0 bg-yellow-300 text-black p-2 m-4 rounded shadow-lg text-xs z-50"> <p><strong>A/B Test Active (Hero)</strong></p> <p>Experiment Name: ${HERO_EXPERIMENT_NAME}</p> <p>Variant ID: ${chosenHeroContent.id}</p> <p>Variant Name: ${chosenHeroContent.name}</p> <p>Headline: ${chosenHeroContent.headline}</p> <hr class="my-1 border-black"> <p><strong>Quiz Path Test Active</strong></p> <p>Experiment Name: ${QUIZ_EXPERIMENT_NAME}</p> <p>Experiment ID (UUID): ${quizVariant.experiment_id}</p> <p>Variant ID: ${quizVariant.id}</p> <p>Variant Name: ${quizVariant.name}</p> <p>Selected Path: ${quizUrl}</p> </div>`, renderComponent($$result2, "Content", $$Content, { "id": "final-cta-quiz-section", "isReversed": false, "tagline": finalCtaTagline, "title": finalCtaTitle, "image": finalCtaImage, "classes": {
    container: "py-16 md:py-24 bg-brand-orange/5 dark:bg-brand-orange/5",
    // Example class
    panel: "gap-8 md:gap-12 lg:gap-16 items-center",
    content: "prose prose-lg dark:prose-invert max-w-none text-center md:text-left",
    image: "max-w-md lg:max-lg mx-auto md:mx-0 rounded-lg shadow-xl order-first md:order-last"
  } }, { "content": async ($$result3) => renderTemplate`${renderComponent($$result3, "Fragment", Fragment, { "slot": "content" }, { "default": async ($$result4) => renderTemplate` <div class="space-y-4">${unescapeHTML(finalCtaDescription)}</div> <div class="mt-8 flex justify-center md:justify-start"> <a${addAttribute(finalCtaButton.href, "href")} class="inline-flex items-center justify-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-700 dark:focus-visible:ring-offset-slate-900"${addAttribute(finalCtaButton.href.startsWith("http") ? "_blank" : "_self", "target")}${addAttribute(finalCtaButton.href.startsWith("http") ? "noopener noreferrer" : "", "rel")}> ${renderTemplate`${renderComponent($$result4, "Icon", $$Icon, { "name": finalCtaButton.icon, "class": "w-5 h-5 md:w-6 md:h-6" })}`} <span>${finalCtaButton.text}</span> </a> </div> ` })}` }), defineScriptVars({ quizVariantInfoToStore: quizVariantInfo }), renderScript($$result2, "C:/Dev/jason_personal_website/src/pages/index_ab_test.astro?astro&type=script&index=0&lang.ts")) }), defineScriptVars({
    heroVariantForImpression: chosenHeroContent,
    heroExperimentNameForImpression: HERO_EXPERIMENT_NAME
  }));
}, "C:/Dev/jason_personal_website/src/pages/index_ab_test.astro", void 0);

const $$file = "C:/Dev/jason_personal_website/src/pages/index_ab_test.astro";
const $$url = "/index_ab_test";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$IndexAbTest,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
