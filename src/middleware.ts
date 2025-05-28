import type { MiddlewareHandler } from 'astro';

const AUTH_USER = import.meta.env.PUBLIC_AUTH_USER;
const AUTH_PASS = import.meta.env.AUTH_PASS; // Not prefixed with PUBLIC_ to keep it server-side

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Allow local development without auth
  if (import.meta.env.DEV) {
    return next();
  }

  const auth = context.request.headers.get('authorization');
  const isAuthenticated = auth === `Basic ${Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64')}`;

  if (!isAuthenticated) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Restricted"',
      },
    });
  }

  return next();
};
