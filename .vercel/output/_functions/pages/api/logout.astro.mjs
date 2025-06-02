import { s as supabase } from '../../chunks/supabaseClient_C6_a71Ro.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ cookies: _cookies, redirect }) => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout error:", error.message);
  }
  return redirect("/dbTest", 302);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
