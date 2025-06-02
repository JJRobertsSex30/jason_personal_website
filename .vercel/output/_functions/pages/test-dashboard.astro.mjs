import { a as createComponent, r as renderComponent, b as renderTemplate, m as maybeRenderHead, d as addAttribute } from '../chunks/astro/server_DgPtluSo.mjs';
import 'kleur/colors';
import { $ as $$PageLayout } from '../chunks/PageLayout_j_B7ywtx.mjs';
import { createClient } from '@supabase/supabase-js';
/* empty css                                          */
export { renderers } from '../renderers.mjs';

const $$TestDashboard = createComponent(async ($$result, $$props, $$slots) => {
  const supabase = createClient(
    "https://jlhcvjhmsgnuvbqvjnpc.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaGN2amhtc2dudXZicXZqbnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU2MTEyNSwiZXhwIjoyMDYzMTM3MTI1fQ.UubX6VKuJVLfp93-ylwwpOCGhfb-rSfBvsb6ZEKC6NU"
  );
  async function fetchTableData(tableName) {
    try {
      const { data, error } = await supabase.from(tableName).select("*").order("created_at", { ascending: false }).limit(100);
      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return { tableName, data: null, error: error.message };
      }
      return { tableName, data, error: null };
    } catch (error) {
      console.error(`Unexpected error with table ${tableName}:`, error);
      return {
        tableName,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  const tables = [
    "user_profiles",
    "referrals",
    "gem_transactions"
  ];
  const tableData = await Promise.all(
    tables.map((table) => fetchTableData(table))
  );
  const validTables = tableData.filter((table) => table.data !== null);
  const convertKitApiKey = "psf8upzIjOh9udfmp-5687TrLR7XTcawMp_Kff9tLq4";
  const convertKitFormId = "8052635";
  let subscribersData = { subscriptions: [] };
  let convertKitError = null;
  {
    try {
      const response = await fetch(`https://api.convertkit.com/v3/forms/${convertKitFormId}/subscriptions?api_secret=${convertKitApiKey}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      if (response.ok) {
        subscribersData = await response.json();
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch ConvertKit data:", errorText);
        convertKitError = `Failed to load subscribers: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      console.error("Error fetching ConvertKit data:", error);
      convertKitError = error instanceof Error ? error.message : "Unknown error";
    }
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$PageLayout, { "data-astro-cid-cgafe4cq": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="container mx-auto px-4 py-8" data-astro-cid-cgafe4cq> <h1 class="text-3xl font-bold mb-8" data-astro-cid-cgafe4cq>Database Dashboard</h1> <!-- ConvertKit Subscribers --> <div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8" data-astro-cid-cgafe4cq> <h2 class="text-2xl font-semibold mb-4" data-astro-cid-cgafe4cq>ConvertKit Subscribers</h2> ${convertKitError ? renderTemplate`<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded" data-astro-cid-cgafe4cq> ${convertKitError} </div>` : subscribersData.subscriptions?.length > 0 ? renderTemplate`<div class="overflow-x-auto" data-astro-cid-cgafe4cq> <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-astro-cid-cgafe4cq> <thead class="bg-gray-50 dark:bg-slate-700" data-astro-cid-cgafe4cq> <tr data-astro-cid-cgafe4cq> <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" data-astro-cid-cgafe4cq>ID</th> <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" data-astro-cid-cgafe4cq>Email</th> <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" data-astro-cid-cgafe4cq>Status</th> <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" data-astro-cid-cgafe4cq>Created At</th> </tr> </thead> <tbody class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700" data-astro-cid-cgafe4cq> ${subscribersData.subscriptions.map((sub) => renderTemplate`<tr data-astro-cid-cgafe4cq> <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" data-astro-cid-cgafe4cq>${sub.id}</td> <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" data-astro-cid-cgafe4cq>${sub.subscriber.email_address}</td> <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" data-astro-cid-cgafe4cq>${sub.state}</td> <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" data-astro-cid-cgafe4cq> ${new Date(sub.created_at).toLocaleString()} </td> </tr>`)} </tbody> </table> </div>` : renderTemplate`<p class="text-center py-4 text-gray-500 dark:text-gray-400" data-astro-cid-cgafe4cq>No subscribers found</p>`} </div> <!-- Database Tables --> ${validTables.length > 0 ? validTables.map(({ tableName, data }) => renderTemplate`<div class="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8" data-astro-cid-cgafe4cq> <h2 class="text-2xl font-semibold mb-4" data-astro-cid-cgafe4cq> ${tableName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} <span class="ml-2 text-sm font-normal text-gray-500" data-astro-cid-cgafe4cq>(${data?.length || 0} records)</span> </h2> ${data && data.length > 0 ? renderTemplate`<div class="overflow-x-auto" data-astro-cid-cgafe4cq> <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-astro-cid-cgafe4cq> <thead class="bg-gray-50 dark:bg-slate-700" data-astro-cid-cgafe4cq> <tr data-astro-cid-cgafe4cq> ${Object.keys(data[0]).map((key) => renderTemplate`<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" data-astro-cid-cgafe4cq> ${key.replace(/_/g, " ")} </th>`)} </tr> </thead> <tbody class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700" data-astro-cid-cgafe4cq> ${data.map((row) => renderTemplate`<tr data-astro-cid-cgafe4cq> ${Object.values(row).map((value) => renderTemplate`<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate"${addAttribute(String(value), "title")} data-astro-cid-cgafe4cq> ${value === null ? "null" : typeof value === "object" ? JSON.stringify(value) : String(value)} </td>`)} </tr>`)} </tbody> </table> </div>` : renderTemplate`<p class="text-center py-4 text-gray-500 dark:text-gray-400" data-astro-cid-cgafe4cq>No data available</p>`} </div>`) : renderTemplate`<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded" data-astro-cid-cgafe4cq>
No database tables found or accessible. Make sure you have the correct database tables set up.
</div>`} </div> ` })} `;
}, "C:/Dev/jason_personal_website/src/pages/test-dashboard.astro", void 0);
const $$file = "C:/Dev/jason_personal_website/src/pages/test-dashboard.astro";
const $$url = "/test-dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$TestDashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
