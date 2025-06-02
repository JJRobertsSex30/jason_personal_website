import { c as createAstro, a as createComponent, r as renderComponent, f as renderScript, b as renderTemplate, m as maybeRenderHead, d as addAttribute } from '../chunks/astro/server_DgPtluSo.mjs';
import 'kleur/colors';
import { $ as $$PageLayout } from '../chunks/PageLayout_j_B7ywtx.mjs';
import { s as supabase } from '../chunks/supabaseClient_C6_a71Ro.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://astrowind.vercel.app");
const $$DbTest = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$DbTest;
  const metadata = {
    title: "Supabase DB Test",
    description: "Login to Supabase and view user profiles & A/B Tests."
  };
  let userProfiles = null;
  let error = null;
  let session = null;
  let experiments = null;
  let abTestError = null;
  if (Astro2.request.method === "POST") {
    const formData = await Astro2.request.formData();
    const action = formData.get("_action")?.toString();
    if (!session) {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession) session = freshSession;
    }
    if (action === "create_experiment") {
      if (!session) {
        abTestError = "Authentication required. Please log in again to create an experiment.";
      } else {
        try {
          const name = formData.get("experiment_name")?.toString();
          const description = formData.get("experiment_description")?.toString();
          const is_active = formData.get("experiment_is_active") === "on";
          if (!name || name.trim() === "") {
            throw new Error("Experiment name is required.");
          }
          const { error: createError } = await supabase.from("experiments").insert([{ name, description, is_active }]);
          if (createError) {
            console.error("Supabase create experiment error:", createError);
            throw new Error(createError.message || "Failed to save experiment to the database.");
          }
          return Astro2.redirect(Astro2.url.pathname, 303);
        } catch (e) {
          if (e instanceof Error) {
            abTestError = e.message;
          } else {
            abTestError = "An unexpected error occurred while creating the experiment.";
          }
          console.error("Create experiment processing error:", e);
        }
      }
    } else if (action === "create_variant") {
      if (!session) {
        abTestError = "Authentication required. Please log in again to add a variant.";
      } else {
        try {
          const experimentId = formData.get("experiment_id")?.toString();
          const name = formData.get("variant_name")?.toString();
          const description = formData.get("variant_description")?.toString();
          const configJsonString = formData.get("variant_config_json")?.toString();
          if (!experimentId || !name || name.trim() === "") {
            throw new Error("Experiment ID and Variant Name are required.");
          }
          let config_json = null;
          if (configJsonString && configJsonString.trim() !== "") {
            try {
              config_json = JSON.parse(configJsonString);
            } catch {
              throw new Error("Invalid JSON format for Variant Configuration.");
            }
          }
          const { error: createVariantError } = await supabase.from("variants").insert([{
            experiment_id: experimentId,
            name,
            description,
            config_json
          }]);
          if (createVariantError) {
            console.error("Supabase create variant error:", createVariantError);
            throw new Error(createVariantError.message || "Failed to save variant to the database.");
          }
          return Astro2.redirect(Astro2.url.pathname + `?openExperiment=${experimentId}`, 303);
        } catch (e) {
          if (e instanceof Error) {
            abTestError = e.message;
          } else {
            abTestError = "An unexpected error occurred while creating the variant.";
          }
          console.error("Create variant processing error:", e);
        }
      }
    } else if (action === "update_experiment") {
      if (!session) {
        abTestError = "Authentication required. Please log in again to update an experiment.";
      } else {
        try {
          const experimentId = formData.get("experiment_id")?.toString();
          const name = formData.get("experiment_name")?.toString();
          const description = formData.get("experiment_description")?.toString();
          const is_active = formData.get("experiment_is_active") === "on";
          if (!experimentId || !name || name.trim() === "") {
            throw new Error("Experiment ID and Experiment name are required for an update.");
          }
          const { error: updateError } = await supabase.from("experiments").update({ name, description, is_active, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", experimentId);
          if (updateError) {
            console.error("Supabase update experiment error:", updateError);
            throw new Error(updateError.message || "Failed to update experiment in the database.");
          }
          return Astro2.redirect(Astro2.url.pathname, 303);
        } catch (e) {
          if (e instanceof Error) {
            abTestError = e.message;
          } else {
            abTestError = "An unexpected error occurred while updating the experiment.";
          }
          console.error("Update experiment processing error:", e);
        }
      }
    } else if (action === "update_variant") {
      if (!session) {
        abTestError = "Authentication required. Please log in again to update a variant.";
      } else {
        try {
          const experimentId = formData.get("experiment_id")?.toString();
          const variantId = formData.get("variant_id")?.toString();
          const name = formData.get("variant_name")?.toString();
          const description = formData.get("variant_description")?.toString();
          const configJsonString = formData.get("variant_config_json")?.toString();
          if (!experimentId || !variantId || !name || name.trim() === "") {
            throw new Error("Experiment ID, Variant ID, and Variant Name are required for an update.");
          }
          const { data: existingVariantConfig, error: fetchConfigError } = await supabase.from("variants").select("config_json").eq("id", variantId).single();
          if (fetchConfigError || !existingVariantConfig) {
            console.error("Supabase fetch existing variant config error:", fetchConfigError);
            throw new Error(fetchConfigError?.message || "Failed to fetch existing variant configuration.");
          }
          const { count: impressionsCount, error: impressionsError } = await supabase.from("impressions").select("*", { count: "exact", head: true }).eq("variant_id", variantId);
          if (impressionsError) {
            console.error("Supabase count impressions error:", impressionsError);
            throw new Error(impressionsError.message || "Failed to count impressions for variant.");
          }
          let newConfigJson = null;
          if (configJsonString && configJsonString.trim() !== "") {
            try {
              newConfigJson = JSON.parse(configJsonString);
            } catch {
              throw new Error("Invalid JSON format for Variant Configuration.");
            }
          }
          const currentImpressions = impressionsCount || 0;
          const configChanged = JSON.stringify(existingVariantConfig.config_json) !== JSON.stringify(newConfigJson);
          if (currentImpressions > 0 && configChanged) {
            throw new Error("Cannot change the configuration of a variant that has existing impressions. Please create a new variant instead.");
          }
          const { error: updateVariantError } = await supabase.from("variants").update({
            name,
            description,
            config_json: newConfigJson,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("id", variantId);
          if (updateVariantError) {
            console.error("Supabase update variant error:", updateVariantError);
            throw new Error(updateVariantError.message || "Failed to update variant in the database.");
          }
          return Astro2.redirect(Astro2.url.pathname + `?openExperiment=${experimentId}#variant-${variantId}`, 303);
        } catch (e) {
          if (e instanceof Error) {
            abTestError = e.message;
          } else {
            abTestError = "An unexpected error occurred while updating the variant.";
          }
          console.error("Update variant processing error:", e);
        }
      }
    } else if (action === "delete_variant") {
      if (!session) {
        abTestError = "Authentication required. Please log in again to delete a variant.";
      } else {
        try {
          const experimentId = formData.get("experiment_id")?.toString();
          const variantId = formData.get("variant_id")?.toString();
          if (!experimentId || !variantId) {
            throw new Error("Experiment ID and Variant ID are required to delete a variant.");
          }
          const { count: variantImpressions, error: fetchImpressionsError } = await supabase.from("impressions").select("*", { count: "exact", head: true }).eq("variant_id", variantId);
          if (fetchImpressionsError) {
            console.error("Supabase fetch impressions count for delete error:", fetchImpressionsError);
            throw new Error(fetchImpressionsError.message || "Failed to fetch impression count for variant before deletion.");
          }
          if (variantImpressions && variantImpressions > 0) {
            throw new Error("Cannot delete a variant that has existing impressions. Consider deactivating the experiment or creating a new one.");
          }
          const { error: deleteVariantError } = await supabase.from("variants").delete().eq("id", variantId);
          if (deleteVariantError) {
            console.error("Supabase delete variant error:", deleteVariantError);
            throw new Error(deleteVariantError.message || "Failed to delete variant from the database.");
          }
          await supabase.from("impressions").delete().eq("variant_id", variantId);
          await supabase.from("conversions").delete().eq("variant_id", variantId);
          return Astro2.redirect(Astro2.url.pathname + `?openExperiment=${experimentId}`, 303);
        } catch (e) {
          if (e instanceof Error) {
            abTestError = e.message;
          } else {
            abTestError = "An unexpected error occurred while deleting the variant.";
          }
          console.error("Delete variant processing error:", e);
        }
      }
    } else if (action === "delete_experiment") {
      if (!session) {
        abTestError = "Authentication required. Please log in again to delete an experiment.";
      } else {
        try {
          const experimentId = formData.get("experiment_id")?.toString();
          if (!experimentId) {
            throw new Error("Experiment ID is required to delete an experiment.");
          }
          const { data: variants, error: fetchVariantsError } = await supabase.from("variants").select("id").eq("experiment_id", experimentId);
          if (fetchVariantsError) {
            console.error("Supabase fetch variants for experiment deletion error:", fetchVariantsError);
            throw new Error(fetchVariantsError.message || "Failed to fetch variants for experiment deletion.");
          }
          const variantIds = variants ? variants.map((v) => v.id) : [];
          if (variantIds.length > 0) {
            const { error: deleteConversionsError } = await supabase.from("conversions").delete().in("variant_id", variantIds);
            if (deleteConversionsError) {
              console.error("Supabase delete conversions error:", deleteConversionsError);
              throw new Error(deleteConversionsError.message || "Failed to delete conversions for experiment.");
            }
            const { error: deleteImpressionsError } = await supabase.from("impressions").delete().in("variant_id", variantIds);
            if (deleteImpressionsError) {
              console.error("Supabase delete impressions error:", deleteImpressionsError);
              throw new Error(deleteImpressionsError.message || "Failed to delete impressions for experiment.");
            }
            const { error: deleteVariantsError } = await supabase.from("variants").delete().eq("experiment_id", experimentId);
            if (deleteVariantsError) {
              console.error("Supabase delete variants error:", deleteVariantsError);
              throw new Error(deleteVariantsError.message || "Failed to delete variants for experiment.");
            }
          }
          const { error: deleteExperimentError } = await supabase.from("experiments").delete().eq("id", experimentId);
          if (deleteExperimentError) {
            console.error("Supabase delete experiment error:", deleteExperimentError);
            throw new Error(deleteExperimentError.message || "Failed to delete experiment.");
          }
          return Astro2.redirect(Astro2.url.pathname, 303);
        } catch (e) {
          if (e instanceof Error) {
            abTestError = e.message;
          } else {
            abTestError = "An unexpected error occurred while deleting the experiment.";
          }
          console.error("Delete experiment processing error:", e);
        }
      }
    } else {
      try {
        const email = formData.get("email")?.toString();
        const password = formData.get("password")?.toString();
        if (!email || !password) {
          throw new Error("Email and password are required for login.");
        }
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (authError) {
          throw authError;
        }
        if (data.session) {
          session = data.session;
          const { data: profilesData, error: profilesError } = await supabase.from("user_profiles").select("*");
          if (profilesError) {
            console.error("Error fetching user profiles post-login:", profilesError);
            error = "Logged in, but failed to fetch user profiles: " + profilesError.message;
          } else {
            userProfiles = profilesData;
          }
        } else {
          throw new Error("Login failed. Please check your credentials.");
        }
      } catch (e) {
        if (e instanceof Error) {
          error = e.message;
        } else {
          error = "An unexpected error occurred during login.";
        }
        console.error("Login processing error:", e);
        session = null;
        userProfiles = null;
        experiments = null;
      }
    }
  }
  async function fetchExperimentsWithStats(currentSession, openExperimentIdParam) {
    if (!currentSession) return null;
    let fetchedExperiments = [];
    try {
      const { data: experimentsData, error: experimentsDbError } = await supabase.from("experiments").select("*, variants(*)").order("created_at", { ascending: false });
      if (experimentsDbError) {
        console.error("Supabase fetch experiments error:", experimentsDbError);
        throw new Error(experimentsDbError.message || "Failed to retrieve experiments from database.");
      }
      if (experimentsData) {
        for (const exp of experimentsData) {
          let variantsWithStats = [];
          if (exp.variants && exp.variants.length > 0) {
            for (const variant of exp.variants) {
              const { count: impressionsCount, error: impError } = await supabase.from("impressions").select("*", { count: "exact", head: true }).eq("variant_id", variant.id).eq("experiment_id", exp.id);
              const { count: conversionsCount, error: convError } = await supabase.from("conversions").select("*", { count: "exact", head: true }).eq("variant_id", variant.id).eq("experiment_id", exp.id);
              if (impError) console.error(`Error fetching impressions for variant ${variant.id}:`, impError.message);
              if (convError) console.error(`Error fetching conversions for variant ${variant.id}:`, convError.message);
              const impressions = impressionsCount ?? 0;
              const conversions = conversionsCount ?? 0;
              const conversionRate = impressions > 0 ? conversions / impressions * 100 : 0;
              variantsWithStats.push({
                ...variant,
                impressions_count: impressions,
                conversions_count: conversions,
                conversion_rate: parseFloat(conversionRate.toFixed(2))
                // Store as number with 2 decimal places
              });
            }
          }
          fetchedExperiments.push({
            ...exp,
            variants: variantsWithStats,
            managingVariants: exp.id === openExperimentIdParam
          });
        }
      }
      return fetchedExperiments;
    } catch (e) {
      if (e instanceof Error) {
        abTestError = e.message;
      } else {
        abTestError = "An unexpected error occurred while fetching A/B test experiments with stats.";
      }
      console.error("A/B Test experiment fetch with stats error:", e);
      return [];
    }
  }
  if (Astro2.request.method === "GET" || abTestError || error) {
    const { data: { session: currentSessionFromSupabase } } = await supabase.auth.getSession();
    if (currentSessionFromSupabase && !session) {
      session = currentSessionFromSupabase;
    }
    const openExperimentId = Astro2.url.searchParams.get("openExperiment");
    if (session) {
      if (!userProfiles && !error) {
        try {
          const { data: profilesData, error: profilesError } = await supabase.from("user_profiles").select("*");
          if (profilesError) throw profilesError;
          userProfiles = profilesData;
        } catch (e) {
          if (e instanceof Error) {
            error = `Failed to fetch profile data: ${e.message}`;
          } else {
            error = "An unexpected error occurred while fetching profile data.";
          }
          console.error("Initial profile fetch error:", e);
          userProfiles = null;
        }
      }
      const fetchedExperiments = await fetchExperimentsWithStats(session, openExperimentId);
      if (fetchedExperiments) {
        experiments = fetchedExperiments;
      } else if (!session) {
        experiments = null;
        userProfiles = null;
      }
    } else {
      userProfiles = null;
      experiments = null;
    }
  } else if (Astro2.request.method === "POST" && session && !abTestError && !error) {
    const openExperimentId = Astro2.url.searchParams.get("openExperiment");
    const fetchedExperiments = await fetchExperimentsWithStats(session, openExperimentId);
    if (fetchedExperiments) {
      experiments = fetchedExperiments;
    }
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$PageLayout, { "metadata": metadata }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container mx-auto px-4 py-12"> <div class="max-w-2xl mx-auto">  <h1 class="text-4xl font-bold text-center mb-10 text-slate-800 dark:text-white">Supabase Admin Panel</h1>  ${session && !error && // Show only if session exists AND no general login error
  renderTemplate`<div class="mb-6 p-4 bg-green-50 dark:bg-green-800/30 border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg shadow-sm"> <div class="flex justify-between items-center"> <div> <p class="font-semibold text-lg">Logged in as:</p> <p class="text-sm break-all">${session.user.email}</p> </div> <form method="POST" action="/api/logout"> <button type="submit" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-md hover:shadow-lg transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
Logout
</button> </form> </div> </div>`}  ${!session && renderTemplate`<form method="POST" class="bg-white dark:bg-slate-800 shadow-xl rounded-lg p-8 pt-6 mb-8"> <h2 class="text-2xl font-semibold text-center mb-6 text-slate-700 dark:text-slate-200">User Login</h2> <div class="mb-6"> <label for="email" class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
Email Address
</label> <input type="email" id="email" name="email" required class="shadow-sm appearance-none border border-slate-300 dark:border-slate-600 rounded-md w-full py-3 px-4 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 dark:placeholder-slate-500" placeholder="you@example.com"> </div> <div class="mb-8"> <label for="password" class="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2">
Password
</label> <input type="password" id="password" name="password" required class="shadow-sm appearance-none border border-slate-300 dark:border-slate-600 rounded-md w-full py-3 px-4 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 dark:placeholder-slate-500" placeholder="••••••••••••"> </div> <div class="flex items-center justify-center"> <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition duration-150 ease-in-out">
Sign In
</button> </div> </form>`}  ${error && // This 'error' is for login or critical load issues
  renderTemplate`<div class="my-6 p-4 bg-red-50 dark:bg-red-800/30 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg shadow-sm" role="alert"> <p class="font-bold text-lg">Error:</p> <p>${error}</p> </div>`}  ${session && !error && renderTemplate`<section class="my-12 pt-10 border-t border-slate-200 dark:border-slate-700"> <h2 class="text-3xl font-semibold mb-8 text-slate-800 dark:text-white text-center">A/B Test Management</h2>  ${abTestError && renderTemplate`<div class="mb-6 p-4 bg-orange-50 dark:bg-orange-800/30 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 rounded-lg shadow-sm" role="alert"> <p class="font-bold text-lg">A/B Test Error:</p> <p>${abTestError}</p> </div>`}  <div class="mb-10 p-6 bg-white dark:bg-slate-800 shadow-xl rounded-lg"> <h3 class="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200">Create New Experiment</h3> <form method="POST"${addAttribute(Astro2.url.pathname, "action")} class="space-y-6">  <input type="hidden" name="_action" value="create_experiment"> <div> <label for="experiment_name" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
Experiment Name <span class="text-red-500">*</span> </label> <input type="text" id="experiment_name" name="experiment_name" required class="shadow-sm appearance-none border border-slate-300 dark:border-slate-600 rounded-md w-full py-2.5 px-3 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500" placeholder="e.g., Homepage Headline Test"> </div> <div> <label for="experiment_description" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
Description (Optional)
</label> <textarea id="experiment_description" name="experiment_description" rows="3" class="shadow-sm appearance-none border border-slate-300 dark:border-slate-600 rounded-md w-full py-2.5 px-3 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500" placeholder="Briefly describe the goal of this experiment."></textarea> </div> <div class="flex items-center"> <input id="experiment_is_active" name="experiment_is_active" type="checkbox" checked class="h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 bg-white dark:bg-slate-700 dark:checked:bg-blue-500"> <label for="experiment_is_active" class="ml-2 block text-sm text-slate-700 dark:text-slate-300">
Activate this experiment immediately
</label> </div> <div class="flex justify-end"> <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-md shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition duration-150 ease-in-out">
Create Experiment
</button> </div> </form> </div>  <h3 class="text-2xl font-semibold mb-6 text-slate-700 dark:text-slate-200 mt-10">Existing Experiments</h3> ${experiments && experiments.length > 0 ? renderTemplate`<div class="space-y-6"> ${experiments.map((exp) => renderTemplate`<div class="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6"${addAttribute(`experiment-${exp.id}`, "id")}>  <div${addAttribute(`experiment-display-section-${exp.id}`, "class")}> <div class="flex justify-between items-start mb-2"> <div> <h4 class="text-xl font-semibold text-blue-600 dark:text-blue-400">${exp.name}</h4> <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ID: ${exp.id}</p> </div> <span${addAttribute(`px-3 py-1 text-xs font-medium rounded-full ${exp.is_active ? "bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300" : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"}`, "class")}> ${exp.is_active ? "Active" : "Inactive"} </span> </div> <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">${exp.description || "No description provided."}</p> </div>  <div${addAttribute(`experiment-edit-form-section-${exp.id} hidden`, "class")}> <h4 class="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Edit Experiment: <span class="italic">${exp.name}</span></h4> <form method="POST"${addAttribute(Astro2.url.pathname, "action")} class="space-y-4"> <input type="hidden" name="_action" value="update_experiment"> <input type="hidden" name="experiment_id"${addAttribute(exp.id, "value")}> <div> <label${addAttribute(`edit_experiment_name-${exp.id}`, "for")} class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
Experiment Name <span class="text-red-500">*</span> </label> <input type="text"${addAttribute(`edit_experiment_name-${exp.id}`, "id")} name="experiment_name" required${addAttribute(exp.name, "value")} class="shadow-sm appearance-none border border-slate-300 dark:border-slate-600 rounded-md w-full py-2.5 px-3 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"> </div> <div> <label${addAttribute(`edit_experiment_description-${exp.id}`, "for")} class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
Description (Optional)
</label> <textarea${addAttribute(`edit_experiment_description-${exp.id}`, "id")} name="experiment_description" rows="3" class="shadow-sm appearance-none border border-slate-300 dark:border-slate-600 rounded-md w-full py-2.5 px-3 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500">${exp.description}</textarea> </div> <div class="flex items-center"> <input${addAttribute(`edit_experiment_is_active-${exp.id}`, "id")} name="experiment_is_active" type="checkbox"${addAttribute(exp.is_active, "checked")} class="h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 bg-white dark:bg-slate-700 dark:checked:bg-blue-500"> <label${addAttribute(`edit_experiment_is_active-${exp.id}`, "for")} class="ml-2 block text-sm text-slate-700 dark:text-slate-300">
Activate this experiment
</label> </div> <div class="flex justify-end space-x-3"> <button type="button" class="cancel-edit-experiment-btn text-sm bg-slate-500 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition duration-150"${addAttribute(exp.id, "data-experiment-id")}>
Cancel
</button> <button type="submit" class="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition duration-150 ease-in-out">
Save Changes
</button> </div> </form> </div>  <div${addAttribute(`experiment-actions-section-${exp.id}`, "class")}> <div class="mt-4 pt-4 border-t border-dashed border-slate-300 dark:border-slate-600"> <h5 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Current Variants (${exp.variants?.length || 0}):</h5> ${exp.variants && exp.variants.length > 0 ? renderTemplate`<ul class="list-disc list-inside pl-1 space-y-0.5 text-sm text-slate-500 dark:text-slate-400"> ${exp.variants.map((variant) => renderTemplate`<li> ${variant.name} <span class="text-xs text-slate-400">(ID: ${variant.id})</span> ${typeof variant.impressions_count === "number" && renderTemplate`<span class="text-xs text-slate-400 ml-2">
(Imp: ${variant.impressions_count}, Conv: ${variant.conversions_count ?? 0}, Rate: ${variant.conversion_rate?.toFixed(1) ?? "N/A"}%)
</span>`} </li>`)} </ul>` : renderTemplate`<p class="text-sm text-slate-500 dark:text-slate-400 italic">No variants defined for this experiment yet.</p>`} </div>  ${exp.variants && exp.variants.filter((v) => typeof v.conversion_rate === "number").length > 0 ? renderTemplate`<div class="mt-6 pt-6 border-t border-dashed border-slate-300 dark:border-slate-600"> <h5 class="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3 text-center">Variant Conversion Rates</h5> <div class="chart-container relative mx-auto" style="max-width: 350px; height: 350px;"${addAttribute(exp.id, "data-experiment-id")}${addAttribute(JSON.stringify(exp.variants.map((v) => ({ name: v.name, rate: v.conversion_rate ?? 0, impressions: v.impressions_count ?? 0, conversions: v.conversions_count ?? 0 }))), "data-variants")}> <canvas${addAttribute(`chart-${exp.id}`, "id")}></canvas> </div> </div>` : renderTemplate`<div class="mt-6 pt-6 border-t border-dashed border-slate-300 dark:border-slate-600"> <h5 class="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3 text-center">Variant Conversion Rates</h5> <p class="text-sm text-slate-400 dark:text-slate-500 text-center italic">No conversion data available to display chart.</p> </div>`} <div class="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700"> <button type="button" class="text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition duration-150 edit-experiment-btn"${addAttribute(exp.id, "data-experiment-id")}>Edit Details</button> <button type="button" class="text-sm bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition duration-150 manage-variants-btn"${addAttribute(exp.id, "data-experiment-id")}${addAttribute(exp.managingVariants ? "true" : "false", "aria-expanded")}${addAttribute(`manage-variants-section-${exp.id}`, "aria-controls")}> ${exp.managingVariants ? "Hide Variants" : "Manage Variants"} </button> <form method="POST"${addAttribute(Astro2.url.pathname, "action")} class="inline-block delete-experiment-form"${addAttribute(exp.name, "data-experiment-name")}> <input type="hidden" name="_action" value="delete_experiment"> <input type="hidden" name="experiment_id"${addAttribute(exp.id, "value")}> <button type="submit" class="text-sm bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition duration-150 delete-experiment-btn-submit">
Delete Exp.
</button> </form> </div> </div>  <div${addAttribute(`manage-variants-section-${exp.id}`, "id")}${addAttribute(`mt-6 pt-6 border-t border-dashed border-slate-300 dark:border-slate-600 ${!exp.managingVariants ? "hidden" : ""}`, "class")}> <h4 class="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Manage Variants for: <span class="italic">${exp.name}</span></h4>  ${exp.variants && exp.variants.length > 0 ? renderTemplate`<div class="mb-6"> <h5 class="text-md font-medium text-slate-600 dark:text-slate-300 mb-2">Existing Variants:</h5> <ul class="space-y-3"> ${exp.variants.map((variant) => renderTemplate`<li${addAttribute(variant.id, "data-variant-id")} class="variant-item p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md shadow-sm">  <div class="variant-display-section"> <div class="flex justify-between items-start"> <div> <p class="font-semibold text-slate-700 dark:text-slate-200">${variant.name}</p> <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ID: ${variant.id}</p> <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${variant.description || "No description"}</p> </div> <div class="variant-stats text-xs text-slate-500 dark:text-slate-400 text-right"> <p>Impressions: ${variant.impressions_count ?? 0}</p> <p>Conversions: ${variant.conversions_count ?? 0}</p> <p>Rate: ${variant.conversion_rate?.toFixed(1) ?? "N/A"}%</p> </div> </div> ${variant.config_json && renderTemplate`<details class="mt-2"> <summary class="text-xs text-blue-500 dark:text-blue-400 cursor-pointer hover:underline">Show/Hide Config JSON</summary> <pre class="mt-1 text-xs p-2 bg-slate-100 dark:bg-slate-600 rounded overflow-x-auto whitespace-pre-wrap break-all">${JSON.stringify(variant.config_json, null, 2)}</pre> </details>`} <div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 flex justify-end space-x-2"> <button type="button" class="edit-variant-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-1 px-3 rounded-md shadow-sm transition duration-150"${addAttribute(exp.id, "data-experiment-id")}${addAttribute(variant.id, "data-variant-id")}>
Edit
</button> <form method="POST"${addAttribute(Astro2.url.pathname, "action")} class="inline-block delete-variant-form"${addAttribute(variant.name, "data-variant-name")}> <input type="hidden" name="_action" value="delete_variant"> <input type="hidden" name="experiment_id"${addAttribute(exp.id, "value")}> <input type="hidden" name="variant_id"${addAttribute(variant.id, "value")}> <button type="submit" class="delete-variant-btn-submit text-xs bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded-md shadow-sm transition duration-150">
Delete
</button> </form> </div> </div>  <div class="variant-edit-form-section hidden mt-2"> <h6 class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Editing Variant: <span class="italic">${variant.name}</span></h6> <form method="POST"${addAttribute(Astro2.url.pathname, "action")} class="space-y-3"> <input type="hidden" name="_action" value="update_variant"> <input type="hidden" name="experiment_id"${addAttribute(exp.id, "value")}> <input type="hidden" name="variant_id"${addAttribute(variant.id, "value")}> <div> <label${addAttribute(`edit_variant_name-${variant.id}`, "for")} class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-0.5">Variant Name <span class="text-red-500">*</span></label> <input type="text" name="variant_name"${addAttribute(`edit_variant_name-${variant.id}`, "id")} required${addAttribute(variant.name, "value")} class="w-full p-1.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"> </div> <div> <label${addAttribute(`edit_variant_description-${variant.id}`, "for")} class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-0.5">Variant Description</label> <textarea name="variant_description"${addAttribute(`edit_variant_description-${variant.id}`, "id")} rows="2" class="w-full p-1.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white">${variant.description}</textarea> </div> <div> <label${addAttribute(`edit_variant_config_json-${variant.id}`, "for")} class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-0.5">Variant Configuration (JSON)</label> <textarea name="variant_config_json"${addAttribute(`edit_variant_config_json-${variant.id}`, "id")} rows="3" class="w-full p-1.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm font-mono text-xs focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white" placeholder="{
  &quot;headline&quot;: &quot;New Headline!&quot;,
  &quot;buttonColor&quot;: &quot;blue&quot;
}">${JSON.stringify(variant.config_json, null, 2)}</textarea> <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter valid JSON. <strong class="text-orange-500">Cannot be changed if variant has impressions.</strong></p> </div> <div class="flex justify-end space-x-2 pt-2"> <button type="button" class="cancel-edit-variant-btn text-xs bg-slate-500 hover:bg-slate-600 text-white font-medium py-1.5 px-3 rounded-md shadow-sm transition duration-150"${addAttribute(variant.id, "data-variant-id")}>
Cancel
</button> <button type="submit" class="save-variant-btn text-xs bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500">
Save Changes
</button> </div> </form> </div> </li>`)} </ul> </div>` : renderTemplate`<p class="text-sm text-slate-500 dark:text-slate-400 italic mb-4">No variants currently exist for this experiment.</p>`} <h5 class="text-md font-medium text-slate-600 dark:text-slate-300 mb-3 pt-4 border-t border-slate-200 dark:border-slate-700">Add New Variant</h5> <form method="POST"${addAttribute(Astro2.url.pathname, "action")} class="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg shadow"> <input type="hidden" name="_action" value="create_variant"> <input type="hidden" name="experiment_id"${addAttribute(exp.id, "value")}> <div> <label${addAttribute(`variant_name-${exp.id}`, "for")} class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variant Name <span class="text-red-500">*</span></label> <input type="text" name="variant_name"${addAttribute(`variant_name-${exp.id}`, "id")} required class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white" placeholder="e.g., Control, Variation A"> </div> <div> <label${addAttribute(`variant_description-${exp.id}`, "for")} class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variant Description</label> <textarea name="variant_description"${addAttribute(`variant_description-${exp.id}`, "id")} rows="2" class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white" placeholder="Brief description of this variant"></textarea> </div> <div> <label${addAttribute(`variant_config_json-${exp.id}`, "for")} class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variant Configuration (JSON)</label> <textarea name="variant_config_json"${addAttribute(`variant_config_json-${exp.id}`, "id")} rows="3" class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm dark:bg-slate-700 dark:text-white" placeholder="{
  &quot;headline&quot;: &quot;New Headline!&quot;,
  &quot;buttonColor&quot;: &quot;blue&quot;
}"></textarea> <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter valid JSON or leave blank.</p> </div> <div class="flex justify-end"> <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">Add Variant</button> </div> </form> </div> </div>`)} </div>` : !abTestError && experiments && experiments.length === 0 && renderTemplate`<div class="text-center py-8 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-md"> <svg class="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"> <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"></path> </svg> <h3 class="mt-2 text-md font-medium text-slate-700 dark:text-slate-200">No Experiments Found</h3> <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Get started by creating your first A/B experiment using the form above.</p> </div>`} </section>`}  ${session && !error && userProfiles && renderTemplate`<section class="mt-12 pt-10 border-t border-slate-200 dark:border-slate-700"> <h2 class="text-3xl font-semibold mb-6 text-slate-800 dark:text-white text-center">User Profiles Data</h2> ${userProfiles.length > 0 ? renderTemplate`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> ${userProfiles.map((profile) => renderTemplate`<div class="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col"> <h3 class="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2 capitalize">${profile.username || profile.full_name || "Unnamed User"}</h3> <div class="text-sm text-slate-600 dark:text-slate-400 space-y-1 mt-auto"> <p><span class="font-semibold">ID:</span> <span class="break-all">${profile.id}</span></p> ${profile.full_name && renderTemplate`<p><span class="font-semibold">Full Name:</span> ${profile.full_name}</p>`} ${profile.website && renderTemplate`<p><span class="font-semibold">Website:</span> <a${addAttribute(profile.website, "href")} target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline hover:text-blue-400">${profile.website}</a></p>`} ${Object.entries(profile).map(([key, value]) => {
    if (!["id", "username", "full_name", "website", "updated_at", "avatar_url"].includes(key) && value) {
      return renderTemplate`<p><span class="font-semibold capitalize">${key.replace(/_/g, " ")}:</span> ${String(value)}</p>`;
    }
    return null;
  })} </div> </div>`)} </div>` : renderTemplate`<div class="text-center py-10 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-md"> <svg class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"> <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 00-2-2zm3-12V3M16 3v2"></path> </svg> <h3 class="mt-2 text-lg font-medium text-slate-900 dark:text-white">No User Profiles Found</h3> <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">There are currently no user profiles to display from the database, or your profile is empty.</p> </div>`} </section>`}  ${!session && !error && renderTemplate`<div class="text-center py-10 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-md"> <svg class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path> </svg> <h3 class="mt-2 text-lg font-medium text-slate-900 dark:text-white">Please Log In</h3> <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your Supabase credentials to view the admin panel.</p> </div>`} </div> </main> ` })} ${renderScript($$result, "C:/Dev/jason_personal_website/src/pages/dbTest.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Dev/jason_personal_website/src/pages/dbTest.astro", void 0);

const $$file = "C:/Dev/jason_personal_website/src/pages/dbTest.astro";
const $$url = "/dbTest";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$DbTest,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
