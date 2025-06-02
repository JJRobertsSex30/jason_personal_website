import { c as createAstro, a as createComponent, r as renderComponent, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DgPtluSo.mjs';
import 'kleur/colors';
import { $ as $$PageLayout } from '../chunks/PageLayout_j_B7ywtx.mjs';
import { createClient } from '@supabase/supabase-js';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://astrowind.vercel.app");
const $$Login = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Login;
  const supabaseUrl = "https://jlhcvjhmsgnuvbqvjnpc.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaGN2amhtc2dudXZicXZqbnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU2MTEyNSwiZXhwIjoyMDYzMTM3MTI1fQ.UubX6VKuJVLfp93-ylwwpOCGhfb-rSfBvsb6ZEKC6NU";
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { session } } = await supabase.auth.getSession();
  console.log("Current session:", session);
  if (session) {
    console.log("Found session, redirecting to dashboard");
    return new Response("", { status: 302, headers: { location: "/dashboard" } });
  }
  if (Astro2.request.method === "POST") {
    const formData = await Astro2.request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      console.log("Successfully logged in:", data.user.email);
      console.log("Session data:", data.session);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("supabase-session", JSON.stringify(data.session));
      }
      return new Response("", { status: 302, headers: {
        location: "/dashboard"
      } });
    } catch (error) {
      console.error("Login error:", error);
      return new Response("Login failed", { status: 400 });
    }
  }
  const authCookie = Astro2.request.headers.get("cookie")?.split("; ").find((c) => c.startsWith("supabase-auth-token="));
  if (authCookie) {
    return Astro2.redirect("/dashboard");
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$PageLayout, {}, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="container mx-auto px-4 py-8"> <h1 class="text-3xl font-bold mb-6">Login</h1> <form method="POST" class="max-w-md mx-auto space-y-4 p-6 bg-white dark:bg-slate-800 rounded-lg shadow"> <div> <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label> <input type="email" id="email" name="email" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-gray-600 dark:text-white"> </div> <div> <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label> <input type="password" id="password" name="password" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-gray-600 dark:text-white"> </div> <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
Sign in
</button> </form> </div> ` })}`;
}, "C:/Dev/jason_personal_website/src/pages/login.astro", void 0);
const $$file = "C:/Dev/jason_personal_website/src/pages/login.astro";
const $$url = "/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
