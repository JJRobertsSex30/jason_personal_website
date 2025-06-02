import { createClient } from '@supabase/supabase-js';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const supabaseUrl = "https://jlhcvjhmsgnuvbqvjnpc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaGN2amhtc2dudXZicXZqbnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU2MTEyNSwiZXhwIjoyMDYzMTM3MTI1fQ.UubX6VKuJVLfp93-ylwwpOCGhfb-rSfBvsb6ZEKC6NU";
const supabase = createClient(supabaseUrl, supabaseKey);
const GET = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("No session found");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.log("Authenticated user:", session.user.email);
    const { data: subscribers, error } = await supabase.from("subscribers").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching subscribers:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const data = {
      data: {
        subscribers: subscribers || []
      }
    };
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch dashboard data" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
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
