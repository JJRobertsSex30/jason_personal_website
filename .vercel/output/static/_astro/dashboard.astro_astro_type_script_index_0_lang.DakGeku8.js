let B=null;function D(){const i=document.querySelectorAll(".tab-button"),a=document.querySelectorAll(".tab-panel");if(i.length===0||a.length===0){console.log("Dashboard: No tabs found, skipping tab initialization (user likely not authenticated)");return}let s=window.location.hash;const d=new URLSearchParams(window.location.search);console.log(`Tab initialization called. Current hash: "${s}", Current active: "${B}"`),B&&(!s||s==="")?(console.log(`Preserving current active tab: ${B}`),s=B):d.has("openExperiment")?(console.log("Found openExperiment param, forcing A/B testing tab"),s="#ab-testing-panel"):s&&(s==="#analytics-panel"||s==="#campaign-performance-panel"||s==="#ab-testing-panel"||s==="#user-journey-panel")?console.log(`Using URL hash tab: ${s}`):(console.log("No valid tab found, defaulting to Analytics"),s="#analytics-panel"),B===s&&console.log(`Tab ${s} already active, skipping re-initialization`);const o=e=>{console.log(`Setting active tab to: ${e}`),B=e,i.forEach(l=>{const r=l;r.hash===e?(r.classList.add("active-tab","border-blue-500","text-blue-600"),r.classList.remove("border-transparent","text-slate-500","hover:text-slate-700","hover:border-slate-300"),r.setAttribute("aria-current","page")):(r.classList.remove("active-tab","border-blue-500","text-blue-600"),r.classList.add("border-transparent","text-slate-500","hover:text-slate-700","hover:border-slate-300"),r.setAttribute("aria-current","false"))}),a.forEach(l=>{l.id===e.slice(1)?l.classList.remove("hidden"):l.classList.add("hidden")})};i.forEach(e=>{e.addEventListener("click",l=>{l.preventDefault();const r=l.currentTarget.hash;if(o(r),r==="#ab-testing-panel"){const c=new URL(window.location.href);c.searchParams.has("openExperiment")&&(c.searchParams.delete("openExperiment"),window.history.replaceState({path:c.href},"",c.pathname+c.search+c.hash))}})}),o(s),console.log(`Tab initialization complete. Active tab: ${s}`)}async function S(){const i=document.getElementById("analytics-loading"),a=document.getElementById("analytics-error"),s=document.getElementById("analytics-content"),d=document.getElementById("analytics-error-message");if(!i||!a||!s||!d){console.error("Analytics UI elements not found");return}try{i.classList.remove("hidden"),a.classList.add("hidden"),s.classList.add("hidden"),console.log("Fetching analytics data...");const o=await fetch("/api/analytics");if(!o.ok)throw new Error(`Analytics API error: ${o.status} ${o.statusText}`);const e=await o.json();console.log("Analytics data received:",e);const l=document.getElementById("total-impressions"),r=document.getElementById("total-conversions"),c=document.getElementById("conversion-rate"),m=document.getElementById("avg-time-on-page");l&&(l.textContent=e.performance.totalImpressions.toLocaleString()),r&&(r.textContent=e.performance.totalConversions.toLocaleString()),c&&(c.textContent=`${e.performance.conversionRate}%`),m&&(m.textContent=`${e.performance.avgTimeOnPage}s`);const u=document.getElementById("top-country"),v=document.getElementById("country-count"),x=document.getElementById("best-converting-country"),y=document.getElementById("best-converting-rate");u&&(u.textContent=e.geographic.topCountry),v&&(v.textContent=e.geographic.countryCount.toString()),x&&(x.textContent=e.geographic.bestConvertingCountry),y&&(y.textContent=`${e.geographic.bestConvertingRate}%`);const p=document.getElementById("top-device"),f=document.getElementById("top-browser"),E=document.getElementById("mobile-percentage");p&&(p.textContent=e.device.topDevice),f&&(f.textContent=e.device.topBrowser),E&&(E.textContent=`${e.device.mobilePercentage}%`);const b=document.getElementById("avg-scroll-depth"),g=document.getElementById("bounce-rate"),n=document.getElementById("return-visitors");b&&(b.textContent=`${e.engagement.avgScrollDepth}%`),g&&(g.textContent=`${e.engagement.bounceRate}%`),n&&(n.textContent=e.engagement.returnVisitors.toString());const C=document.getElementById("top-utm-source"),$=document.getElementById("top-utm-campaign"),I=document.getElementById("direct-traffic-percentage");C&&(C.textContent=e.campaign.topUtmSource),$&&($.textContent=e.campaign.topUtmCampaign),I&&(I.textContent=`${e.campaign.directTrafficPercentage}%`);const w=document.getElementById("confidence-level"),L=document.getElementById("sample-size"),h=document.getElementById("is-significant");w&&(w.textContent=`${Math.round(e.statistical.confidenceLevel*100)}%`),L&&(L.textContent=e.statistical.sampleSize.toLocaleString()),h&&(h.textContent=e.statistical.isSignificant?"Yes":"No"),c&&(e.performance.conversionRate>5?c.classList.add("text-green-200"):e.performance.conversionRate<2&&c.classList.add("text-red-200")),g&&(e.engagement.bounceRate<30?g.classList.add("text-green-200"):e.engagement.bounceRate>70&&g.classList.add("text-red-200")),h&&(e.statistical.isSignificant?h.classList.add("text-green-200"):h.classList.add("text-red-200")),i.classList.add("hidden"),s.classList.remove("hidden")}catch(o){console.error("Error loading analytics:",o),i.classList.add("hidden"),a.classList.remove("hidden"),d.textContent=o.message||"Failed to load analytics data"}}async function k(){const i=document.getElementById("campaign-loading"),a=document.getElementById("campaign-error"),s=document.getElementById("campaign-content"),d=document.getElementById("campaign-error-message");if(!i||!a||!s||!d){console.error("Campaign performance UI elements not found");return}try{i.classList.remove("hidden"),a.classList.add("hidden"),s.classList.add("hidden"),console.log("Fetching campaign performance data...");const o=await fetch("/api/campaign-performance");if(!o.ok)throw new Error(`Campaign Performance API error: ${o.status} ${o.statusText}`);const e=await o.json();console.log("Campaign performance data received:",e);const l=document.getElementById("total-attributed-conversions"),r=document.getElementById("direct-conversions"),c=document.getElementById("organic-conversions"),m=document.getElementById("paid-conversions"),u=document.getElementById("social-conversions"),v=document.getElementById("email-conversions"),x=document.getElementById("referral-conversions");l&&(l.textContent=e.attributionSummary.totalAttributedConversions.toString()),r&&(r.textContent=e.attributionSummary.directConversions.toString()),c&&(c.textContent=e.attributionSummary.organicConversions.toString()),m&&(m.textContent=e.attributionSummary.paidConversions.toString()),u&&(u.textContent=e.attributionSummary.socialConversions.toString()),v&&(v.textContent=e.attributionSummary.emailConversions.toString()),x&&(x.textContent=e.attributionSummary.referralConversions.toString());const y=document.getElementById("sources-table");y&&(y.innerHTML=e.sources.map(n=>`
          <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div>
              <div class="font-semibold text-slate-800 dark:text-white">${n.source}</div>
              <div class="text-sm text-slate-600 dark:text-slate-400">ROI: $${n.roi}</div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-slate-800 dark:text-white">${n.conversions}/${n.impressions}</div>
              <div class="text-sm ${n.conversionRate>3?"text-green-600":n.conversionRate<1?"text-red-600":"text-slate-600"}">${n.conversionRate}%</div>
            </div>
          </div>
        `).join(""));const p=document.getElementById("mediums-table");p&&(p.innerHTML=e.mediums.map(n=>`
          <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div>
              <div class="font-semibold text-slate-800 dark:text-white">${n.medium}</div>
              <div class="text-sm text-slate-600 dark:text-slate-400">Avg Time: ${n.averageTimeOnPage}s</div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-slate-800 dark:text-white">${n.conversions}/${n.impressions}</div>
              <div class="text-sm ${n.conversionRate>3?"text-green-600":n.conversionRate<1?"text-red-600":"text-slate-600"}">${n.conversionRate}%</div>
            </div>
          </div>
        `).join(""));const f=document.getElementById("overall-funnel-rate"),E=document.getElementById("biggest-dropoff");f&&(f.textContent=`${e.funnelAnalysis.overallFunnelConversionRate}%`),E&&(E.textContent=e.funnelAnalysis.biggestDropOff);const b=document.getElementById("funnel-stages");b&&(b.innerHTML=e.funnelAnalysis.stages.map(n=>`
          <div class="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div class="text-2xl font-bold text-slate-800 dark:text-white">${n.users.toLocaleString()}</div>
            <div class="text-sm font-semibold text-slate-600 dark:text-slate-400">${n.stage}</div>
            <div class="text-xs text-slate-500 dark:text-slate-500">${n.conversionRate.toFixed(1)}% rate</div>
            ${n.dropOffRate>0?`<div class="text-xs text-red-500">${n.dropOffRate.toFixed(1)}% drop-off</div>`:""}
          </div>
        `).join(""));const g=document.getElementById("campaigns-table");g&&(g.innerHTML=e.campaigns.map(n=>`
          <tr class="border-b border-slate-100 dark:border-slate-700">
            <td class="py-3 text-slate-800 dark:text-white">${n.campaign}</td>
            <td class="py-3 text-slate-600 dark:text-slate-400">${n.source}</td>
            <td class="py-3 text-slate-600 dark:text-slate-400">${n.medium}</td>
            <td class="py-3 text-right text-slate-800 dark:text-white">${n.impressions.toLocaleString()}</td>
            <td class="py-3 text-right text-slate-800 dark:text-white">${n.conversions}</td>
            <td class="py-3 text-right ${n.conversionRate>3?"text-green-600":n.conversionRate<1?"text-red-600":"text-slate-800 dark:text-white"}">${n.conversionRate}%</td>
            <td class="py-3 text-right text-slate-800 dark:text-white">$${n.roi}</td>
          </tr>
        `).join("")),i.classList.add("hidden"),s.classList.remove("hidden")}catch(o){console.error("Error loading campaign performance:",o),i.classList.add("hidden"),a.classList.remove("hidden"),d.textContent=o.message||"Failed to load campaign performance data"}}document.addEventListener("astro:page-load",()=>{console.log("Dashboard astro:page-load: Initializing tabs..."),D();const i=window.location.hash;console.log(`Loading content for active tab: ${i}`),i==="#analytics-panel"?S():i==="#campaign-performance-panel"?k():i==="#user-journey-panel"&&R();const a=document.getElementById("refresh-analytics");a&&a.addEventListener("click",S);const s=document.getElementById("refresh-campaign-performance");s&&s.addEventListener("click",k);const d=document.getElementById("refresh-user-journey");d&&d.addEventListener("click",R);const o=document.getElementById("campaign-performance-tab");o&&o.addEventListener("click",()=>{setTimeout(k,100)});const e=document.getElementById("user-journey-tab");e&&e.addEventListener("click",()=>{setTimeout(R,100)})});window.addEventListener("popstate",()=>{if(document.querySelectorAll(".tab-button").length===0){console.log("Dashboard: No tabs found on popstate, skipping tab navigation");return}let a=window.location.hash;(!a||a!=="#analytics-panel"&&a!=="#campaign-performance-panel"&&a!=="#ab-testing-panel"&&a!=="#user-journey-panel")&&(a="#analytics-panel"),D(),a==="#analytics-panel"&&S(),a==="#campaign-performance-panel"&&k(),a==="#user-journey-panel"&&R()});async function R(){const i=document.getElementById("user-journey-loading"),a=document.getElementById("user-journey-error"),s=document.getElementById("user-journey-content"),d=document.getElementById("user-journey-error-message");if(!i||!a||!s||!d){console.error("User Journey UI elements not found");return}try{i.classList.remove("hidden"),a.classList.add("hidden"),s.classList.add("hidden"),console.log("Fetching user journey data...");const o=await fetch("/api/user-journey");if(!o.ok)throw new Error(`User Journey API error: ${o.status} ${o.statusText}`);const e=await o.json();console.log("User journey data received:",e);const l=document.getElementById("session-count"),r=document.getElementById("avg-session-duration"),c=document.getElementById("avg-pages-per-session"),m=document.getElementById("returning-user-rate");l&&(l.textContent=e.sessionFlowAnalysis.sessionCount.toLocaleString()),r&&(r.textContent=e.sessionFlowAnalysis.averageSessionDuration.toString()),c&&(c.textContent=e.sessionFlowAnalysis.averagePagesPerSession.toFixed(1)),m&&(m.textContent=`${e.sessionFlowAnalysis.returningUserRate}%`);const u=document.getElementById("entry-pages-list");u&&(u.innerHTML=e.sessionFlowAnalysis.topEntryPages.map(t=>`
          <div class="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
            <div class="font-medium">${t.page}</div>
            <div class="text-slate-600 dark:text-slate-400">
              ${t.sessions} sessions • ${t.bounceRate.toFixed(1)}% bounce • ${t.avgTimeOnPage.toFixed(1)}s avg
            </div>
          </div>
        `).join(""));const v=document.getElementById("exit-pages-list");v&&(v.innerHTML=e.sessionFlowAnalysis.topExitPages.map(t=>`
          <div class="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
            <div class="font-medium">${t.page}</div>
            <div class="text-slate-600 dark:text-slate-400">
              ${t.exits} exits • ${t.exitRate.toFixed(1)}% exit rate
            </div>
          </div>
        `).join(""));const x=document.getElementById("avg-time-on-page-journey"),y=document.getElementById("avg-scroll-depth-journey"),p=document.getElementById("engagement-rate-journey"),f=document.getElementById("interaction-rate-journey"),E=document.getElementById("content-consumption-score");x&&(x.textContent=e.engagementMetrics.averageTimeOnPage.toString()),y&&(y.textContent=`${e.engagementMetrics.averageScrollDepth}%`),p&&(p.textContent=`${e.engagementMetrics.engagementRate}%`),f&&(f.textContent=`${e.engagementMetrics.interactionRate}%`),E&&(E.textContent=e.engagementMetrics.contentConsumptionScore.toString());const b=document.getElementById("page-engagement-list");b&&(b.innerHTML=e.engagementMetrics.engagementByPage.map(t=>`
          <div class="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
            <div class="font-medium">${t.page}</div>
            <div class="text-slate-600 dark:text-slate-400">
              ${t.avgTimeOnPage}s • ${t.avgScrollDepth}% scroll • Score: ${t.engagementScore} • ${t.interactions} interactions
            </div>
          </div>
        `).join(""));const g=document.getElementById("overall-bounce-rate");g&&(g.textContent=`${e.bounceRateAnalysis.overallBounceRate}%`);const n=document.getElementById("bounce-rate-by-page");n&&(n.innerHTML=e.bounceRateAnalysis.bounceRateByPage.map(t=>`
          <div class="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
            <div class="font-medium">${t.page}</div>
            <div class="text-slate-600 dark:text-slate-400">
              ${t.bounceRate.toFixed(1)}% bounce (${t.sessions} sessions)
            </div>
          </div>
        `).join(""));const C=document.getElementById("bounce-rate-by-source");C&&(C.innerHTML=e.bounceRateAnalysis.bounceRateBySource.map(t=>`
          <div class="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
            <div class="font-medium">${t.source}</div>
            <div class="text-slate-600 dark:text-slate-400">
              ${t.bounceRate.toFixed(1)}% bounce (${t.sessions} sessions)
            </div>
          </div>
        `).join(""));const $=document.getElementById("bounce-rate-by-device");$&&($.innerHTML=e.bounceRateAnalysis.bounceRateFactors.deviceType.map(t=>`
          <div class="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
            <div class="font-medium">${t.device}</div>
            <div class="text-slate-600 dark:text-slate-400">
              ${t.bounceRate.toFixed(1)}% bounce rate
            </div>
          </div>
        `).join(""));const I=document.getElementById("device-performance-table");I&&(I.innerHTML=e.deviceConnectionImpact.performanceByDevice.map(t=>`
          <tr class="border-b border-slate-100 dark:border-slate-700">
            <td class="py-2 text-slate-800 dark:text-white">${t.deviceType}</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.sessions}</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.avgLoadTime}s</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.conversionRate}%</td>
          </tr>
        `).join(""));const w=document.getElementById("connection-analysis-table");w&&(w.innerHTML=e.deviceConnectionImpact.connectionTypeAnalysis.map(t=>`
          <tr class="border-b border-slate-100 dark:border-slate-700">
            <td class="py-2 text-slate-800 dark:text-white">${t.connectionType}</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.sessions}</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.avgLoadTime}s</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.engagementScore}</td>
          </tr>
        `).join(""));const L=document.getElementById("resolution-impact-table");L&&(L.innerHTML=e.deviceConnectionImpact.screenResolutionImpact.map(t=>`
          <tr class="border-b border-slate-100 dark:border-slate-700">
            <td class="py-2 text-slate-800 dark:text-white">${t.resolution}</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.sessions}</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.scrollDepth.toFixed(1)}%</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.timeOnPage.toFixed(1)}s</td>
            <td class="py-2 text-right text-slate-800 dark:text-white">${t.conversionRate.toFixed(2)}%</td>
          </tr>
        `).join(""));const h=document.getElementById("new-users-count"),T=document.getElementById("new-users-engagement"),P=document.getElementById("new-users-conversion"),j=document.getElementById("returning-users-count"),A=document.getElementById("returning-users-engagement"),F=document.getElementById("returning-users-conversion");h&&(h.textContent=e.userBehaviorPatterns.newVsReturning.newUsers.count.toString()),T&&(T.textContent=e.userBehaviorPatterns.newVsReturning.newUsers.avgEngagement.toFixed(1)),P&&(P.textContent=e.userBehaviorPatterns.newVsReturning.newUsers.conversionRate.toFixed(2)),j&&(j.textContent=e.userBehaviorPatterns.newVsReturning.returningUsers.count.toString()),A&&(A.textContent=e.userBehaviorPatterns.newVsReturning.returningUsers.avgEngagement.toFixed(1)),F&&(F.textContent=e.userBehaviorPatterns.newVsReturning.returningUsers.conversionRate.toFixed(2));const U=document.getElementById("session-frequency-list");U&&(U.innerHTML=e.userBehaviorPatterns.sessionFrequency.map(t=>`
          <div class="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
            <div class="font-medium">${t.frequency}</div>
            <div class="text-slate-600 dark:text-slate-400">
              ${t.userCount} users • $${t.avgLifetimeValue} LTV
            </div>
          </div>
        `).join(""));const M=document.getElementById("engagement-segments-list");M&&(M.innerHTML=e.userBehaviorPatterns.engagementSegments.map(t=>`
          <div class="p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
            <div class="font-medium">${t.segment}</div>
            <div class="text-slate-600 dark:text-slate-400 text-xs">
              ${t.characteristics}
            </div>
            <div class="text-slate-600 dark:text-slate-400">
              ${t.userCount} users • ${t.conversionRate.toFixed(2)}% conv
            </div>
          </div>
        `).join("")),i.classList.add("hidden"),s.classList.remove("hidden")}catch(o){console.error("Error loading user journey:",o),i.classList.add("hidden"),a.classList.remove("hidden"),d.textContent=o.message||"Failed to load user journey data"}}
