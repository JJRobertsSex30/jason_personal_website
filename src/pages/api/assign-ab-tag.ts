import type { APIRoute } from 'astro';
import { addTagToSubscriber } from '../../lib/convertkit-operations';

const TAG_ID_A = 8266494;
const TAG_ID_B = 8266495;

export const post: APIRoute = async ({ request }) => {
  try {
    const { email, group } = await request.json();
    if (!email || !group || (group !== 'A' && group !== 'B')) {
      return new Response(JSON.stringify({ success: false, message: 'Missing or invalid email/group' }), { status: 400 });
    }
    const tagId = group === 'A' ? TAG_ID_A : TAG_ID_B;
    const result = await addTagToSubscriber(email, tagId);
    if (result.success) {
      return new Response(JSON.stringify({ success: true, tagId }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ success: false, message: result.error || 'Failed to add tag' }), { status: 500 });
    }
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Server error' }), { status: 500 });
  }
}; 