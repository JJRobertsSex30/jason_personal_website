import { c as createAstro, a as createComponent, m as maybeRenderHead, d as addAttribute, e as renderSlot, b as renderTemplate, s as spreadAttributes, r as renderComponent, F as Fragment, u as unescapeHTML } from './astro/server_DgPtluSo.mjs';
import 'kleur/colors';
import { $ as $$Layout } from './Layout_iY7EO_hk.mjs';
import { a as $$ToggleTheme, $ as $$Icon } from './ToggleTheme_Bm6TxLZp.mjs';
import 'clsx';
import { t as trimSlash, b as getHomePermalink, a as getPermalink, d as getAsset } from './permalinks_BYwYTM8z.mjs';

const $$Astro$3 = createAstro("https://astrowind.vercel.app");
const $$ToggleMenu = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$ToggleMenu;
  const {
    label = "Toggle Menu",
    class: className = "flex flex-col h-12 w-12 rounded justify-center items-center cursor-pointer group"
  } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<button type="button"${addAttribute(className, "class")}${addAttribute(label, "aria-label")} data-aw-toggle-menu> <span class="sr-only">${label}</span> ${renderSlot($$result, $$slots["default"], renderTemplate` <span aria-hidden="true" class="h-0.5 w-6 my-1 rounded-full bg-black dark:bg-white transition ease transform duration-200 opacity-80 group-[.expanded]:rotate-45 group-[.expanded]:translate-y-2.5"></span> <span aria-hidden="true" class="h-0.5 w-6 my-1 rounded-full bg-black dark:bg-white transition ease transform duration-200 opacity-80 group-[.expanded]:opacity-0"></span> <span aria-hidden="true" class="h-0.5 w-6 my-1 rounded-full bg-black dark:bg-white transition ease transform duration-200 opacity-80 group-[.expanded]:-rotate-45 group-[.expanded]:-translate-y-2.5"></span> `)} </button>`;
}, "C:/Dev/jason_personal_website/src/components/common/ToggleMenu.astro", void 0);

const $$Astro$2 = createAstro("https://astrowind.vercel.app");
const $$Header = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$Header;
  const {
    id = "header",
    links = [],
    actions = [],
    isSticky = false,
    isDark = false,
    isFullWidth = false,
    showToggleTheme = false,
    position = "center"
  } = Astro2.props;
  const currentPath = `/${trimSlash(new URL(Astro2.url).pathname)}`;
  return renderTemplate`${maybeRenderHead()}<header${addAttribute([
    { sticky: isSticky, relative: !isSticky, dark: isDark },
    "top-0 z-40 flex-none mx-auto w-full border-b border-gray-50/0 transition-[opacity] ease-in-out"
  ], "class:list")}${spreadAttributes(isSticky ? { "data-aw-sticky-header": true } : {})}${spreadAttributes(id ? { id } : {})}> <div class="absolute inset-0"></div> <div${addAttribute([
    "relative text-default py-3 px-3 md:px-6 mx-auto w-full",
    {
      "md:flex md:justify-between": position !== "center"
    },
    {
      "md:grid md:grid-cols-3 md:items-center": position === "center"
    },
    {
      "max-w-7xl": !isFullWidth
    }
  ], "class:list")}> <div${addAttribute([
    { "md:col-span-1 md:flex": position === "center" },
    "flex items-center justify-start"
  ], "class:list")}> <a class="flex items-center"${addAttribute(getHomePermalink(), "href")} title="JJ Roberts | Sex 3.0 Home"> <span class="self-center text-xl lg:text-2xl font-bold whitespace-nowrap text-brand-green dark:text-white">
JJ Roberts | Sex 3.0
</span> </a> <div class="flex items-center md:hidden ml-auto"> ${renderComponent($$result, "ToggleMenu", $$ToggleMenu, {})} </div> </div> <nav class="items-center w-full md:w-auto hidden md:flex md:mx-5 text-default overflow-y-auto overflow-x-hidden md:overflow-y-visible md:overflow-x-auto md:justify-self-center" aria-label="Main navigation"> <ul class="flex flex-col md:flex-row md:self-center w-full md:w-auto text-xl md:text-[0.9375rem] tracking-[0.01rem] font-medium md:justify-center"> ${links.map(({ text, href, links: links2 }) => renderTemplate`<li${addAttribute(links2?.length ? "dropdown" : "", "class")}> ${links2?.length ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate` <button type="button" class="hover:text-link dark:hover:text-white px-4 py-3 flex items-center whitespace-nowrap"> ${text}${" "} ${renderComponent($$result2, "Icon", $$Icon, { "name": "tabler:chevron-down", "class": "w-3.5 h-3.5 ml-0.5 rtl:ml-0 rtl:mr-0.5 hidden md:inline" })} </button> <ul class="dropdown-menu md:backdrop-blur-md dark:md:bg-dark rounded md:absolute pl-4 md:pl-0 md:hidden font-medium md:bg-white/90 md:min-w-[200px] drop-shadow-xl"> ${links2.map(({ text: text2, href: href2 }) => renderTemplate`<li> <a${addAttribute([
    "first:rounded-t last:rounded-b md:hover:bg-gray-100 hover:text-link dark:hover:text-white dark:hover:bg-gray-700 py-2 px-5 block whitespace-no-wrap",
    { "aw-link-active": href2 === currentPath }
  ], "class:list")}${addAttribute(href2, "href")}> ${text2} </a> </li>`)} </ul> ` })}` : renderTemplate`<a${addAttribute([
    "hover:text-link dark:hover:text-white px-4 py-3 flex items-center whitespace-nowrap",
    { "aw-link-active": href === currentPath }
  ], "class:list")}${addAttribute(href, "href")}></a>`} </li>`)} </ul> </nav> <div${addAttribute([
    { "ml-auto rtl:ml-0 rtl:mr-auto": position === "left" },
    "hidden md:self-center md:flex items-center md:mb-0 fixed w-full md:w-auto md:static justify-end left-0 rtl:left-auto rtl:right-0 bottom-0 p-3 md:p-0 md:justify-self-end"
  ], "class:list")}> <div class="items-center flex justify-between w-full md:w-auto"> <div class="flex"> ${showToggleTheme && renderTemplate`${renderComponent($$result, "ToggleTheme", $$ToggleTheme, { "iconClass": "w-6 h-6 md:w-5 md:h-5 md:inline-block" })}`} </div> </div> </div> </div> </header>`;
}, "C:/Dev/jason_personal_website/src/components/widgets/Header.astro", void 0);

const $$Astro$1 = createAstro("https://astrowind.vercel.app");
const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Footer;
  const { socialLinks = [], secondaryLinks = [], links = [], footNote = "", theme = "light" } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<footer${addAttribute([{ dark: theme === "dark" }, "relative border-t border-gray-200 dark:border-slate-800 not-prose"], "class:list")}> <div class="dark:bg-dark absolute inset-0 pointer-events-none" aria-hidden="true"></div> <div class="relative max-w-7xl mx-auto px-4 sm:px-6 dark:text-slate-300 intersect-once intersect-quarter intercept-no-queue motion-safe:md:opacity-0 motion-safe:md:intersect:animate-fade"> <div class="grid grid-cols-12 gap-4 gap-y-8 sm:gap-8 py-8 md:py-12"> <div class="col-span-12 lg:col-span-4"> <div class="mb-2"> <a class="inline-block font-bold text-xl"${addAttribute(getHomePermalink(), "href")}>JJ Roberts</a> </div> <div class="text-sm text-muted flex gap-1"> ${secondaryLinks.map(({ text, href }, index) => renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`${index !== 0 ? " \xB7 " : ""}<a class="text-muted hover:text-gray-700 dark:text-gray-400 hover:underline transition duration-150 ease-in-out"${addAttribute(href, "href")}>${unescapeHTML(text)}</a> ` })}`)} </div> </div> ${links.map(({ title, links: links2 }) => renderTemplate`<div class="col-span-6 md:col-span-3 lg:col-span-2"> <div class="dark:text-gray-300 font-medium mb-2">${title}</div> ${links2 && Array.isArray(links2) && links2.length > 0 && renderTemplate`<ul class="text-sm"> ${links2.map(({ text, href, ariaLabel }) => renderTemplate`<li class="mb-2"> <a class="text-muted hover:text-gray-700 hover:underline dark:text-gray-400 transition duration-150 ease-in-out"${addAttribute(href, "href")}${addAttribute(ariaLabel, "aria-label")}> ${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`${unescapeHTML(text)}` })} </a> </li>`)} </ul>`} </div>`)} </div> <div class="md:flex md:items-center md:justify-between py-6 md:py-8"> ${socialLinks?.length ? renderTemplate`<ul class="flex mb-4 md:order-1 -ml-2 md:ml-4 md:mb-0 rtl:ml-0 rtl:-mr-2 rtl:md:ml-0 rtl:md:mr-4"> ${socialLinks.map(({ ariaLabel, href, text, icon }) => renderTemplate`<li> <a class="text-muted dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 inline-flex items-center"${addAttribute(ariaLabel, "aria-label")}${addAttribute(href, "href")}> ${icon && renderTemplate`${renderComponent($$result, "Icon", $$Icon, { "name": icon, "class": "w-5 h-5" })}`} ${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`${unescapeHTML(text)}` })} </a> </li>`)} </ul>` : ""} <div class="text-sm mr-4 dark:text-muted"> ${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`${unescapeHTML(footNote)}` })} </div> </div> </div> </footer>`;
}, "C:/Dev/jason_personal_website/src/components/widgets/Footer.astro", void 0);

const headerData = {
  links: [
    {
      text: "The Framework",
      links: [
        {
          text: "What is Sex 3.0",
          href: getPermalink("/#")
        },
        {
          text: "Key Benefits",
          href: getPermalink("/#")
        },
        {
          text: "Why the Old Way Fails",
          href: getPermalink("/#")
        }
      ]
    },
    {
      text: "Resources",
      links: [
        {
          text: "The Book - Sex 3.0",
          href: getPermalink("/#")
        },
        {
          text: "Blog",
          href: getPermalink("/#")
        },
        {
          text: "Videos",
          href: getPermalink("/#")
        },
        {
          text: "Podcast",
          href: getPermalink("/#")
        }
      ]
    },
    {
      text: "Love Lab",
      links: [
        {
          text: "Take the Quiz",
          href: getPermalink("/quiz")
        },
        {
          text: "Relationship Blueprint Tool",
          href: getPermalink("/#")
        },
        {
          text: "Interactive Exercises",
          href: getPermalink("/#")
        }
      ]
    },
    {
      text: "About JJ",
      links: [
        {
          text: "My Story",
          href: getPermalink("/#")
        },
        {
          text: "My Mission",
          href: getPermalink("/#")
        },
        {
          text: "Contact",
          href: getPermalink("/#")
        }
      ]
    }
  ],
  actions: [{ text: "Download", href: "https://github.com/onwidget/astrowind", target: "_blank" }]
};
const footerData = {
  // We can use one or two main columns for this flatter list.
  // Let's aim for two columns for better readability if the list is long.
  links: [
    {
      title: "Navigate",
      // Column 1 Title (Optional, can be empty if no title needed)
      links: [
        { text: "Home", href: getPermalink("/") },
        { text: "Full JJ Bio", href: getPermalink("/about-jj") },
        { text: "Love Lab (Quiz)", href: getPermalink("/quiz") },
        { text: "Courses", href: getPermalink("/courses") },
        { text: "Contact / Work With JJ", href: getPermalink("/work-with-jj") }
      ]
    },
    {
      title: "Resources",
      // Column 2 Title (Optional)
      links: [
        { text: "The Book", href: getPermalink("/book-details") },
        { text: "Blog", href: getPermalink("/blog") },
        { text: "Videos", href: getPermalink("/videos") },
        { text: "Podcast", href: getPermalink("/podcast") },
        { text: "Full FAQ", href: getPermalink("/faq") }
        // You can add more links here if needed for the second column
      ]
    }
    // If you want a third column for legal, or merge legal into secondaryLinks:
    /*
    {
      title: 'Legal',
      links: [
        { text: 'Privacy Policy', href: getPermalink('/privacy') },
        { text: 'Terms of Service', href: getPermalink('/terms') },
      ]
    }
    */
  ],
  // Secondary links (these usually appear horizontally below the main columns or site name)
  secondaryLinks: [
    { text: "Privacy Policy", href: getPermalink("/privacy") },
    { text: "Terms of Service", href: getPermalink("/terms") }
    // You could also put FAQ here if not in main columns:
    // { text: 'FAQ', href: getPermalink('/faq') },
  ],
  socialLinks: [
    { ariaLabel: "X", icon: "tabler:brand-x", href: "#" },
    { ariaLabel: "Instagram", icon: "tabler:brand-instagram", href: "#" },
    { ariaLabel: "Facebook", icon: "tabler:brand-facebook", href: "#" },
    { ariaLabel: "RSS", icon: "tabler:rss", href: getAsset("/rss.xml") },
    { ariaLabel: "Github", icon: "tabler:brand-github", href: "https://github.com/onwidget/astrowind" }
  ],
  footNote: `
    JJ Roberts · All rights reserved 2025.
  `
};

const $$Astro = createAstro("https://astrowind.vercel.app");
const $$PageLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$PageLayout;
  const { metadata } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "metadata": metadata }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["header"], renderTemplate` ${renderComponent($$result2, "Header", $$Header, { ...headerData, "isSticky": true, "showRssFeed": true, "showToggleTheme": true })} `)} ${maybeRenderHead()}<main> ${renderSlot($$result2, $$slots["default"])} </main> ${renderSlot($$result2, $$slots["footer"], renderTemplate` ${renderComponent($$result2, "Footer", $$Footer, { ...footerData })} `)} ` })}`;
}, "C:/Dev/jason_personal_website/src/layouts/PageLayout.astro", void 0);

export { $$PageLayout as $, $$Header as a, headerData as h };
