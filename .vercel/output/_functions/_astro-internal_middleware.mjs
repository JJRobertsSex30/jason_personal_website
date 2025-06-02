import 'es-module-lexer';
import './chunks/astro-designed-error-pages_DOrV6xw-.mjs';
import 'kleur/colors';
import './chunks/astro/server_DgPtluSo.mjs';
import 'clsx';
import 'cookie';
import { s as sequence } from './chunks/index_DA6wXAIr.mjs';

const AUTH_USER = undefined                                ;
const AUTH_PASS = undefined                         ;
const onRequest$1 = async (context, next) => {
  const auth = context.request.headers.get("authorization");
  const isAuthenticated = auth === `Basic ${Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString("base64")}`;
  if (!isAuthenticated) {
    return new Response("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Restricted"'
      }
    });
  }
  return next();
};

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
