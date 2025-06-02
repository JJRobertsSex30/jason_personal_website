import { c as createAstro, a as createComponent, m as maybeRenderHead, d as addAttribute, u as unescapeHTML, f as renderScript, b as renderTemplate, r as renderComponent, F as Fragment } from '../chunks/astro/server_DgPtluSo.mjs';
import 'kleur/colors';
import { $ as $$PageLayout } from '../chunks/PageLayout_j_B7ywtx.mjs';
import { $ as $$Hero } from '../chunks/Hero_no-8W7YM.mjs';
import { $ as $$Features } from '../chunks/Features_BSK89b-P.mjs';
import { $ as $$Testimonials } from '../chunks/Testimonials_ByTyn-e1.mjs';
import { $ as $$Content } from '../chunks/Content_C75Zq4RS.mjs';
import { $ as $$Headline } from '../chunks/Headline_CwcNjGxj.mjs';
import { $ as $$WidgetWrapper } from '../chunks/WidgetWrapper_1MgD6ryR.mjs';
import 'clsx';
/* empty css                                 */
import { $ as $$Icon } from '../chunks/ToggleTheme_Bm6TxLZp.mjs';
import imgHeroMain from '../chunks/jj_5__eLixI.mjs';
import imgAboutJJ from '../chunks/jj_upscale_BIp_nKMw.mjs';
import imgBookCover from '../chunks/book_thin_CEtgU34h.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro$3 = createAstro("https://astrowind.vercel.app");
const $$FAQItem = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$FAQItem;
  const { question, answer, initiallyOpen = false, id } = Astro2.props;
  const uniqueSuffix = id ?? Math.random().toString(36).substring(7);
  const questionId = `faq-question-${uniqueSuffix}`;
  const answerId = `faq-answer-${uniqueSuffix}`;
  const ariaExpandedValue = initiallyOpen ? "true" : "false";
  return renderTemplate`${maybeRenderHead()}<div class="faq-item border-b border-gray-200 dark:border-slate-700" data-astro-cid-4swbfzvj> <h2 class="faq-question-heading text-lg font-semibold" data-astro-cid-4swbfzvj> <button type="button" class="faq-question-button w-full flex justify-between items-center text-left py-5 px-1 md:px-2 text-dark-text dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition-colors duration-150 rounded-sm"${addAttribute(ariaExpandedValue, "aria-expanded")}${addAttribute(answerId, "aria-controls")}${addAttribute(questionId, "id")} data-astro-cid-4swbfzvj> <span class="flex-1" data-astro-cid-4swbfzvj>${question}</span> <span class="faq-arrow transform transition-transform duration-300 ease-out text-brand-orange ml-3" data-astro-cid-4swbfzvj> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-4swbfzvj><polyline points="6 9 12 15 18 9" data-astro-cid-4swbfzvj></polyline></svg> </span> </button> </h2> <div${addAttribute(answerId, "id")}${addAttribute([
    "faq-answer-content",
    "text-medium-text dark:text-slate-400 text-base px-1 md:px-2",
    { "hidden": !initiallyOpen }
  ], "class:list")} role="region"${addAttribute(questionId, "aria-labelledby")} data-astro-cid-4swbfzvj> <div class="pb-5 pt-1" data-astro-cid-4swbfzvj> <div class="prose prose-sm sm:prose-base dark:prose-invert max-w-none" data-astro-cid-4swbfzvj>${unescapeHTML(answer)}</div> </div> </div> </div> ${renderScript($$result, "C:/Dev/jason_personal_website/src/components/widgets/FAQItem.astro?astro&type=script&index=0&lang.ts")} `;
}, "C:/Dev/jason_personal_website/src/components/widgets/FAQItem.astro", void 0);

const $$Astro$2 = createAstro("https://astrowind.vercel.app");
const $$AccordionFAQ = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$AccordionFAQ;
  const {
    title = "Frequently Asked Questions",
    subtitle = "Find answers to common questions about this revolutionary approach.",
    tagline = "Quick Answers",
    items = [
      { question: "Is jealousy just a natural part of loving someone?", answer: "No. While envy is natural, sexual jealousy stems from a sense of ownership, a concept this new approach helps you dismantle for more peaceful connections." },
      { question: "Does this new approach mean avoiding commitment?", answer: "Absolutely not. True commitment is redefined as a conscious choice based on mutual reward, honesty, and respect\u2014stronger because it's freely chosen, not enforced.", initiallyOpen: false },
      { question: "Is this anti-marriage?", answer: "Not at all. Marriage becomes a valid *choice* within this framework, entered into consciously, honestly, and without societal pressure, understanding both its benefits and potential pitfalls." },
      { question: "How can relationships truly work without strict exclusivity?", answer: "The same way deep friendships thrive: through unwavering trust, open communication, profound respect, and ongoing mutual reward. Exclusivity becomes an *agreement*, not a prerequisite for love." }
    ],
    id,
    isDark = false,
    classes = {}
    // bg will be the content of the slot passed from the parent (index.astro)
    // Astro.slots.render('bg') returns string | undefined
  } = Astro2.props;
  const backgroundSlotContent = await Astro2.slots.render("bg");
  return renderTemplate`${renderComponent($$result, "WidgetWrapper", $$WidgetWrapper, { "id": id ?? "accordion-faq", "isDark": isDark, "containerClass": `py-12 md:py-16 lg:py-20 ${classes?.container ?? ""}`, "bg": backgroundSlotContent }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Headline", $$Headline, { "title": title, "subtitle": subtitle, "tagline": tagline, "classes": { container: `text-center mb-10 md:mb-14 ${classes?.headline ?? ""}`, title: "text-3xl lg:text-4xl" } })} ${maybeRenderHead()}<div class="max-w-3xl mx-auto"> ${items && items.length > 0 && items.map((faq, index) => renderTemplate`${renderComponent($$result2, "FAQItem", $$FAQItem, { "question": faq.question, "answer": faq.answer, "initiallyOpen": faq.initiallyOpen || false, "id": `faq-item-${faq.id ?? index}` })}`)} </div> <div class="text-center mt-10 md:mt-12"> <a href="/full-faq" class="text-brand-orange hover:text-brand-orange-darker font-semibold hover:underline transition duration-150 ease-in-out">
Have More Questions? Visit Our Full FAQ Page →
</a> </div> ` })}`;
}, "C:/Dev/jason_personal_website/src/components/widgets/AccordionFAQ.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro$1 = createAstro("https://astrowind.vercel.app");
const $$EmblaSlider = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$EmblaSlider;
  const {
    id = "",
    headline = "",
    subheadline = "",
    items = [],
    viewAllLink = "",
    viewAllText = "",
    classes = {}
  } = Astro2.props;
  return renderTemplate(_a || (_a = __template(["<!-- Embla Carousel CSS -->", "<section", "", "> ", " ", ' <div class="relative"> <button type="button" class="embla__arrow embla__arrow--prev absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-orange-500 hover:bg-orange-600 text-white shadow rounded-full p-1 transition pointer-events-auto" aria-label="Previous"> <svg class="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path> </svg> </button> <button type="button" class="embla__arrow embla__arrow--next absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-orange-500 hover:bg-orange-600 text-white shadow rounded-full p-1 transition pointer-events-auto" aria-label="Next"> <svg class="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path> </svg> </button> <div class="embla"> <div class="embla__container flex gap-6"> ', " </div> </div> </div> ", " </section> ", " <script>\n  document.addEventListener('DOMContentLoaded', function () {\n    const emblaNode = document.querySelector('.embla');\n    const prevBtn = document.querySelector('.embla__arrow--prev');\n    const nextBtn = document.querySelector('.embla__arrow--next');\n    if (emblaNode && window.EmblaCarousel) {\n      const embla = window.EmblaCarousel(emblaNode, { align: 'start', loop: false, dragFree: true });\n      prevBtn.addEventListener('click', function () { embla.scrollPrev(); });\n      nextBtn.addEventListener('click', function () { embla.scrollNext(); });\n    }\n  });\n<\/script>"])), maybeRenderHead(), addAttribute(id, "id"), addAttribute(classes.container ?? "", "class"), headline && renderTemplate`<h2 class="text-2xl md:text-3xl font-bold mb-2 text-center">${headline}</h2>`, subheadline && renderTemplate`<p class="text-lg text-center mb-6 text-gray-500 dark:text-gray-300">${subheadline}</p>`, items.map((item) => renderTemplate`<div class="embla__slide min-w-[280px] max-w-xs flex-shrink-0 relative rounded-lg overflow-hidden shadow-lg bg-white dark:bg-slate-900 group" style="height:340px;"> <a${addAttribute(item.link, "href")}${addAttribute(item.link?.startsWith("http") ? "_blank" : "_self", "target")}${addAttribute(item.link?.startsWith("http") ? "noopener noreferrer" : "", "rel")} class="block w-full h-full"> <div class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"${addAttribute(`background-image:url('${item.imageSrc?.src ?? item.imageSrc}')`, "style")}></div> <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div> <div class="absolute bottom-0 left-0 right-0 p-4 z-10"> ${item.isNew && renderTemplate`<span class="inline-block px-2 py-1 text-xs font-semibold bg-brand-green text-white rounded mb-2">NEW</span>`} <div class="text-white font-bold text-lg mb-1">${item.title}</div> <div class="text-white text-xs mb-1">${item.category}</div> <div class="text-white text-sm line-clamp-2">${item.description}</div> <div class="text-gray-300 text-xs mt-2 flex flex-wrap gap-2"> ${item.sourceName && renderTemplate`<span>${item.sourceName}</span>`} ${item.durationOrReadTime && renderTemplate`<span>${item.durationOrReadTime}</span>`} </div> </div> ${item.type === "video" && renderTemplate`<span class="absolute top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">Video</span>`} ${item.type === "audio" && renderTemplate`<span class="absolute top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">Audio</span>`} ${item.type === "blog" && renderTemplate`<span class="absolute top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">Blog</span>`} </a> </div>`), viewAllLink && viewAllText && renderTemplate`<div class="text-center mt-6"> <a${addAttribute(viewAllLink, "href")} class="inline-block px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 whitespace-nowrap">${viewAllText}</a> </div>`, renderScript($$result, "C:/Dev/jason_personal_website/src/components/widgets/EmblaSlider.astro?astro&type=script&index=0&lang.ts"));
}, "C:/Dev/jason_personal_website/src/components/widgets/EmblaSlider.astro", void 0);

const $$EmailCaptureModal = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div x-show="showEmailModal" x-cloak x-data="{
    email: '',
    submitted: false,
    loading: false,
    error: '',
    success: '',
    async submit() {
      this.error = '';
      this.success = '';
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
      if (!valid) {
        this.error = 'Please enter a valid email address.';
        return;
      }
      this.loading = true;
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ email: this.email })
        });
        const data = await res.json();
        if (res.ok) {
          this.success = 'You are now a member of the inner circle. Please check your email.';
          this.submitted = true;
          this.email = '';
        } else {
          this.error = data.message || 'Subscription failed. Please try again.';
        }
      } catch {
        this.error = 'Network error. Please try again.';
      } finally {
        this.loading = false;
      }
    }
  }" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"> <div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6 relative animate-fade-in"> <button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none" aria-label="Close" x-on:click="showEmailModal = false">&times;</button> <template x-if="!submitted"> <form x-on:submit.prevent="submit()" class="flex flex-col gap-4"> <h2 class="text-xl font-bold mb-2 text-gray-900 dark:text-white text-center">Get Free Chapter Samples</h2> <p class="mb-4 text-gray-600 dark:text-gray-300 text-center">Enter your email to receive free sample chapters from the book. You'll need to confirm your email address.</p> <input type="email" required placeholder="your@email.com" class="px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400" x-model="email"> <button type="submit" class="w-full px-6 py-3 bg-slate-400 hover:bg-slate-500 text-white text-lg font-semibold rounded-full shadow transition duration-200" x-bind:disabled="loading"> <template x-if="loading"> <span>Sending...</span> </template> <template x-if="!loading"> <span>Send Me The Chapters</span> </template> </button> <p class="text-sm mt-2 text-red-500" x-text="error" x-show="error"></p> <p class="text-sm mt-2 text-green-500" x-text="success" x-show="success"></p> </form> </template> <template x-if="submitted"> <div class="text-center py-8"> <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Check Your Inbox!</h3> <p class="text-gray-700 dark:text-gray-300">Please confirm your email address to receive your free chapter samples.</p> </div> </template> </div> </div> `;
}, "C:/Dev/jason_personal_website/src/components/ui/EmailCaptureModal.astro", void 0);

const $$Astro = createAstro("https://astrowind.vercel.app");
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const metadata = {
    title: "JJ Roberts | Upgrade Your Love Life Now",
    description: "Escape painful relationship cycles with JJ Roberts' revolutionary approach. Get free chapters and discover connections built on honesty, freedom, and lasting joy.",
    ignoreTitleTemplate: true
  };
  const heroImageForWidget = { src: imgHeroMain, alt: "JJ Roberts - Relationship Expert" };
  const benefitsItems = [
    { title: "End Destructive Jealousy & Possessiveness", description: "Discover how to build unwavering trust and eliminate possessive patterns for a truly peaceful connection.", icon: "tabler:shield-check" },
    { title: "Experience Radical Honesty & Deeper Trust", description: "Build relationships on a foundation of truth and transparency, creating the foundation for profound intimacy.", icon: "tabler:message-circle-2" },
    { title: "Achieve True Freedom & Choice in Love", description: "Move beyond societal pressure and obligation to create connections based on conscious choice and genuine desire.", icon: "tabler:mood-smile-beam" },
    { title: "Align Relationships with Your True Nature", description: "Understand how aligning your relationships with natural human connection patterns leads to less conflict and more ease.", icon: "tabler:atom-2" },
    { title: "Break Free From Painful Relationship Cycles", description: "Identify and release the outdated patterns that keep you stuck, and step into a new way of loving.", icon: "tabler:key" },
    { title: "Become the Architect of Your Relationship Destiny", description: "Reclaim your power from societal scripts to build the fulfilling love life you truly deserve.", icon: "tabler:user-check" }
  ];
  const myTestimonials = [
    { testimonial: "Reading this completely changed how I view relationships. The honesty is refreshing and empowering!", name: "Sarah K.", job: "Book Reader", image: { src: imgHeroMain, alt: "Sarah K." } },
    { testimonial: "JJ Roberts cuts through the noise. Finally, relationship advice that makes sense and addresses the root causes of conflict.", name: "Mark T.", job: "Coaching Client", image: { src: imgHeroMain, alt: "Mark T." } },
    { testimonial: "I realized I wasn't broken, the old rules were. This approach gave me the courage to build authentic connections.", name: "Elena P.", job: "Workshop Attendee", image: { src: imgHeroMain, alt: "Elena P." } }
  ];
  const aboutJJTagline = "Architect of a New Relationship Paradigm";
  const aboutJJTitle = "Meet JJ Roberts";
  const aboutJJsubtitle = "Discover the journey and insights that led to a revolutionary framework for transforming modern relationships";
  const aboutJJImageForWidget = { src: imgAboutJJ, alt: "JJ Roberts" };
  const aboutJJExpertDescription = "JJ Roberts is a pioneering voice in relationship psychology, dedicated to helping individuals escape the frustrating cycles of conventional relationships. For years, JJ experienced firsthand the limitations and disappointments of traditional relationship models\u2014a system fraught with unspoken rules and inevitable conflict. This personal journey culminated in an enlightening two-year research trip across more than 40 countries, a quest to understand the true nature of human connection beyond societal conditioning. <br/><br/>This global exploration led to profound breakthroughs and the deconstruction of outdated relationship paradigms. JJ saw clearly the flawed design inherent in the common approach to love and intimacy\u2014a system that often breeds misunderstanding, jealousy, and pain. From these realizations, the revolutionary modern framework for relationships was born.";
  const bookImageForWidget = { src: imgBookCover, alt: "Sex 3.0 A Sexual Revolution Manual Book Cover" };
  const bookExpertDescriptionAndOffer = "This framework, born from years of research and real-world experience, is detailed in JJ's groundbreaking book, 'Sex 3.0: A Sexual Revolution Manual.' It provides the clear blueprint and practical tools you need to break free from outdated patterns and build the fulfilling connections you've always desired. This isn't just another relationship guide\u2014it's a new operating system for your love life, already transforming lives worldwide.";
  const homepageFAQItems = [
    { question: "Is jealousy truly natural in love?", answer: "While possessiveness feels common, this new approach helps you understand its roots and build trust beyond it, leading to more peaceful connections.", id: "hp-q1" },
    { question: "How does this differ from traditional relationship advice?", answer: "It moves beyond surface-level fixes to address the fundamental flawed designs in how society views relationships, offering a path to authentic freedom and choice.", id: "hp-q2" },
    { question: "Can this approach really lead to lasting happiness?", answer: "Yes, by building relationships on a foundation of honesty, mutual reward, and respect for individual freedom, you create a more resilient and genuinely fulfilling bond.", id: "hp-q3", initiallyOpen: false }
  ];
  const allMyResources = [
    { type: "blog", title: 'The Truth About "Happily Ever After"', link: "/blog/truth-happily-ever-after", imageSrc: imgHeroMain, imageAlt: "Couple walking on beach", category: "Relationship Myths", durationOrReadTime: "5 min read", isNew: true, sourceName: "Our Blog", description: "Unpacking common misconceptions." },
    { type: "blog", title: "Honesty: The Ultimate Aphrodisiac", link: "/blog/honesty-aphrodisiac", imageSrc: imgHeroMain, imageAlt: "Couple talking intimately", category: "Communication", durationOrReadTime: "7 min read", sourceName: "Our Blog", description: "Why transparency builds deeper intimacy." },
    { type: "video", title: "Understanding Modern Relationships", link: "https://youtube.com/yourvideoid1", imageSrc: imgHeroMain, imageAlt: "Abstract design", category: "Core Concepts", durationOrReadTime: "10:23", sourceName: "YouTube", description: "JJ breaks down key concepts visually." },
    { type: "video", title: "Masterclass: Eliminating Jealousy", link: "https://youtube.com/yourvideoid2", imageSrc: imgHeroMain, imageAlt: "Serene person", category: "Problem Solving", durationOrReadTime: "15:05", sourceName: "YouTube", isNew: true, description: "Practical steps for peaceful connections." },
    { type: "audio", title: "Ep 01: The Relationship Upgrade Intro", link: "/podcast/ep-01", imageSrc: imgHeroMain, imageAlt: "Podcast logo", category: "Season 1", durationOrReadTime: "35:12", sourceName: "The Upgrade Podcast", description: "Introducing the new framework for love." },
    { type: "audio", title: "Ep 02: Commitment & Freedom Redefined", link: "/podcast/ep-02", imageSrc: imgHeroMain, imageAlt: "Sound waves", category: "Season 1", durationOrReadTime: "42:30", sourceName: "The Upgrade Podcast", description: "What these terms *truly* mean." }
  ];
  const finalCtaTagline = "Your Next Step to a Better Love Life";
  const finalCtaTitle = "Unlock Your Relationship Blueprint";
  const finalCtaImage = { src: imgHeroMain, alt: "Abstract graphic representing a blueprint or pathway" };
  const finalCtaDescription = `
  Ready to understand what's *really* going on in your relationships and how to make lasting positive changes?
  Our quick, insightful quiz will help you identify key patterns and provide a starting point for your personal transformation.
  Plus, you'll get exclusive free chapters from "Sex 3.0: A Sexual Revolution Manual" to guide you further!
`;
  const finalCtaButton = {
    text: "Enter The Love Lab",
    href: "/quiz",
    icon: "tabler:flask"
  };
  return renderTemplate`${renderComponent($$result, "Layout", $$PageLayout, { "metadata": metadata }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main>  ${renderComponent($$result2, "Hero", $$Hero, { "image": heroImageForWidget })}  ${renderComponent($$result2, "Features", $$Features, { "id": "benefits", "tagline": "Benefits", "title": "What You Will Discover", "subtitle": "Modern relationships are a mess we designed. Uncover the flawed blueprint, then discover the elegant path to rebuild.", "items": benefitsItems, "classes": { container: "py-16 md:py-20 bg-white dark:bg-slate-900" } })}  ${renderComponent($$result2, "Testimonials", $$Testimonials, { "id": "testimonials", "title": "What People Are Saying", "subtitle": "Hear from those who have started their journey to healthier, more fulfilling relationships.", "tagline": "Success Stories", "testimonials": myTestimonials, "classes": { container: "py-16 md:py-20" } }, { "bg": ($$result3) => renderTemplate`${renderComponent($$result3, "Fragment", Fragment, { "slot": "bg" }, { "default": ($$result4) => renderTemplate` <div class="absolute inset-0 bg-blue-50 dark:bg-slate-800/30"></div> ` })}` })} <section class="bg-slate-50 dark:bg-slate-800/30">  ${renderComponent($$result2, "Content", $$Content, { "id": "about-jj-roberts", "isReversed": false, "tagline": aboutJJTagline, "title": aboutJJTitle, "subtitle": aboutJJsubtitle, "image": aboutJJImageForWidget, "classes": { container: "pt-16 md:pt-20 pb-0 md:pb-0 bg-transparent", panel: "gap-8 md:gap-12 lg:gap-16 items-center", content: "prose prose-lg dark:prose-invert max-w-none text-left", image: "max-w-xs sm:max-w-sm md:max-w-md mx-auto md:mx-0 rounded-lg shadow-lg" } }, { "content": ($$result3) => renderTemplate`${renderComponent($$result3, "Fragment", Fragment, { "slot": "content" }, { "default": ($$result4) => renderTemplate` <h3 class="text-2xl font-bold tracking-tight dark:text-white sm:text-3xl mb-2">The Journey</h3> <div>${unescapeHTML(aboutJJExpertDescription)}</div> ` })}` })}  ${renderComponent($$result2, "Content", $$Content, { "id": "get-the-book", "isReversed": true, "image": bookImageForWidget, "classes": { container: "pt-0 md:pt-0 pb-16 md:pb-20 bg-transparent", panel: "gap-8 md:gap-12 lg:gap-16 items-center", content: "prose prose-lg dark:prose-invert max-w-none text-left", image: "max-w-[180px] sm:max-w-[200px] md:max-w-[240px] mx-auto md:mx-0 rounded-md shadow-2xl hover:scale-105 transition-transform duration-300" } }, { "content": ($$result3) => renderTemplate`${renderComponent($$result3, "Fragment", Fragment, { "slot": "content" }, { "default": ($$result4) => renderTemplate` <h3 class="text-2xl font-bold tracking-tight dark:text-white sm:text-3xl mb-2">The Culmination</h3> <div class="space-y-4">${unescapeHTML(bookExpertDescriptionAndOffer)}</div> <div x-data="{ showEmailModal: false }" class="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start"> <a href="https://www.amazon.com/Sex-3-0-J-Roberts-ebook/dp/B006PU2DLI" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 whitespace-nowrap"> ${renderComponent($$result4, "Icon", $$Icon, { "name": "tabler:brand-amazon", "class": "w-5 h-5 md:w-6 md:h-6" })} <span>Order Your Copy Now</span> </a> <button type="button" class="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-400 hover:bg-slate-500 text-white text-lg font-semibold rounded-full shadow transition duration-200 whitespace-nowrap" x-on:click="showEmailModal = true"> ${renderComponent($$result4, "Icon", $$Icon, { "name": "tabler:mail", "class": "w-5 h-5 md:w-6 md:h-6" })} <span>Get Free Chapter Samples First</span> </button> ${renderComponent($$result4, "EmailCaptureModal", $$EmailCaptureModal, { "x-show": "showEmailModal", "x-on:click.away": "showEmailModal = false" })} </div> ` })}` })} </section>  ${renderComponent($$result2, "AccordionFAQ", $$AccordionFAQ, { "id": "homepage-faqs", "title": "Quick Answers to Key Questions", "subtitle": "Get clarity on the core ideas of this transformative approach.", "tagline": "Clarifications", "items": homepageFAQItems, "classes": { container: "py-16 md:py-20 bg-white dark:bg-slate-900" } })}  ${renderComponent($$result2, "EmblaSlider", $$EmblaSlider, { "id": "all-resources-slider", "headline": "Dive Deeper: Latest Insights & Resources", "subheadline": "Explore articles, watch videos, and listen to podcasts designed to guide your relationship upgrade.", "items": allMyResources, "viewAllLink": "/resources", "viewAllText": "Explore All Resources", "classes": { container: "py-16 md:py-20 bg-slate-100 dark:bg-slate-800" } })}  ${renderComponent($$result2, "Content", $$Content, { "id": "final-cta-quiz-section", "isReversed": false, "tagline": finalCtaTagline, "title": finalCtaTitle, "image": finalCtaImage, "classes": {
    container: "py-16 md:py-24 bg-brand-orange/5 dark:bg-brand-orange/5",
    panel: "gap-8 md:gap-12 lg:gap-16 items-center",
    content: "prose prose-lg dark:prose-invert max-w-none text-center md:text-left",
    image: "max-w-md lg:max-w-lg mx-auto md:mx-0 rounded-lg shadow-xl order-first md:order-last"
  } }, { "content": ($$result3) => renderTemplate`${renderComponent($$result3, "Fragment", Fragment, { "slot": "content" }, { "default": ($$result4) => renderTemplate` <div class="space-y-4">${unescapeHTML(finalCtaDescription)}</div> <div class="mt-8 flex justify-center md:justify-start"> <a${addAttribute(finalCtaButton.href, "href")} class="inline-flex items-center justify-center gap-2
                   px-8 py-3 bg-orange-500 hover:bg-orange-600
                   text-white text-lg font-semibold rounded-full
                   shadow-md transition duration-300 ease-in-out
                   transform hover:scale-105 whitespace-nowrap
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-700 dark:focus-visible:ring-offset-slate-900"${addAttribute(finalCtaButton.href.startsWith("http") ? "_blank" : "_self", "target")}${addAttribute(finalCtaButton.href.startsWith("http") ? "noopener noreferrer" : "", "rel")}> ${renderTemplate`${renderComponent($$result4, "Icon", $$Icon, { "name": finalCtaButton.icon, "class": "w-5 h-5 md:w-6 md:h-6" })}`} <span>${finalCtaButton.text}</span> </a> </div> ` })}` })} </main>  ` })}`;
}, "C:/Dev/jason_personal_website/src/pages/index.astro", void 0);

const $$file = "C:/Dev/jason_personal_website/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
