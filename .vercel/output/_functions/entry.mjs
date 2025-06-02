import { renderers } from './renderers.mjs';
import { c as createExports } from './chunks/entrypoint_BcLO2wHF.mjs';
import { manifest } from './manifest_Cvw5FOBV.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/about.astro.mjs');
const _page3 = () => import('./pages/api/ab-testing-enhanced.astro.mjs');
const _page4 = () => import('./pages/api/analytics.astro.mjs');
const _page5 = () => import('./pages/api/campaign-performance.astro.mjs');
const _page6 = () => import('./pages/api/dashboard-data.astro.mjs');
const _page7 = () => import('./pages/api/geolocation.astro.mjs');
const _page8 = () => import('./pages/api/logout.astro.mjs');
const _page9 = () => import('./pages/api/quiz-submit.astro.mjs');
const _page10 = () => import('./pages/api/subscribe.astro.mjs');
const _page11 = () => import('./pages/api/user-journey.astro.mjs');
const _page12 = () => import('./pages/contact.astro.mjs');
const _page13 = () => import('./pages/dashboard.astro.mjs');
const _page14 = () => import('./pages/dbtest.astro.mjs');
const _page15 = () => import('./pages/homes/mobile-app.astro.mjs');
const _page16 = () => import('./pages/homes/personal.astro.mjs');
const _page17 = () => import('./pages/homes/saas.astro.mjs');
const _page18 = () => import('./pages/homes/startup.astro.mjs');
const _page19 = () => import('./pages/index_ab_test.astro.mjs');
const _page20 = () => import('./pages/index2.astro.mjs');
const _page21 = () => import('./pages/landing/click-through.astro.mjs');
const _page22 = () => import('./pages/landing/lead-generation.astro.mjs');
const _page23 = () => import('./pages/landing/pre-launch.astro.mjs');
const _page24 = () => import('./pages/landing/product.astro.mjs');
const _page25 = () => import('./pages/landing/sales.astro.mjs');
const _page26 = () => import('./pages/landing/subscription.astro.mjs');
const _page27 = () => import('./pages/login.astro.mjs');
const _page28 = () => import('./pages/pricing.astro.mjs');
const _page29 = () => import('./pages/privacy.astro.mjs');
const _page30 = () => import('./pages/quiz.astro.mjs');
const _page31 = () => import('./pages/quiz-lovelab.astro.mjs');
const _page32 = () => import('./pages/rss.xml.astro.mjs');
const _page33 = () => import('./pages/services.astro.mjs');
const _page34 = () => import('./pages/terms.astro.mjs');
const _page35 = () => import('./pages/test-dashboard.astro.mjs');
const _page36 = () => import('./pages/_---blog_/_category_/_---page_.astro.mjs');
const _page37 = () => import('./pages/_---blog_/_tag_/_---page_.astro.mjs');
const _page38 = () => import('./pages/_---blog_/_---page_.astro.mjs');
const _page39 = () => import('./pages/index.astro.mjs');
const _page40 = () => import('./pages/_---blog_.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/about.astro", _page2],
    ["src/pages/api/ab-testing-enhanced.ts", _page3],
    ["src/pages/api/analytics.ts", _page4],
    ["src/pages/api/campaign-performance.ts", _page5],
    ["src/pages/api/dashboard-data.ts", _page6],
    ["src/pages/api/geolocation.ts", _page7],
    ["src/pages/api/logout.ts", _page8],
    ["src/pages/api/quiz-submit.ts", _page9],
    ["src/pages/api/subscribe.ts", _page10],
    ["src/pages/api/user-journey.ts", _page11],
    ["src/pages/contact.astro", _page12],
    ["src/pages/dashboard.astro", _page13],
    ["src/pages/dbTest.astro", _page14],
    ["src/pages/homes/mobile-app.astro", _page15],
    ["src/pages/homes/personal.astro", _page16],
    ["src/pages/homes/saas.astro", _page17],
    ["src/pages/homes/startup.astro", _page18],
    ["src/pages/index_ab_test.astro", _page19],
    ["src/pages/index2.astro", _page20],
    ["src/pages/landing/click-through.astro", _page21],
    ["src/pages/landing/lead-generation.astro", _page22],
    ["src/pages/landing/pre-launch.astro", _page23],
    ["src/pages/landing/product.astro", _page24],
    ["src/pages/landing/sales.astro", _page25],
    ["src/pages/landing/subscription.astro", _page26],
    ["src/pages/login.astro", _page27],
    ["src/pages/pricing.astro", _page28],
    ["src/pages/privacy.md", _page29],
    ["src/pages/quiz.astro", _page30],
    ["src/pages/quiz-lovelab.astro", _page31],
    ["src/pages/rss.xml.ts", _page32],
    ["src/pages/services.astro", _page33],
    ["src/pages/terms.md", _page34],
    ["src/pages/test-dashboard.astro", _page35],
    ["src/pages/[...blog]/[category]/[...page].astro", _page36],
    ["src/pages/[...blog]/[tag]/[...page].astro", _page37],
    ["src/pages/[...blog]/[...page].astro", _page38],
    ["src/pages/index.astro", _page39],
    ["src/pages/[...blog]/index.astro", _page40]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "middlewareSecret": "153e4409-45e8-4b87-a743-b64f51090cb5",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;

export { __astrojsSsrVirtualEntry as default, pageMap };
