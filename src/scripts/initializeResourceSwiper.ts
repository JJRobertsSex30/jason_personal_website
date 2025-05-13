// src/scripts/initializeResourceSwiper.ts
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, Keyboard, A11y, FreeMode } from 'swiper/modules';

// Import Swiper's core and module styles
// These imports ensure Vite/Astro bundles the necessary CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/free-mode';

console.log("SCRIPT_FILE: initializeResourceSwiper.ts has been loaded by the browser.");

// Interface for the options expected from the data attribute
interface SwiperConfigOptions {
  containerClass: string; // The unique class of the Swiper container to initialize
  paginationClass: string;
  nextElClass: string;
  prevElClass: string;
  slidesPerView: number | 'auto';
  mdSlidesPerView: number | 'auto';
  lgSlidesPerView: number | 'auto';
  spaceBetween: number;
  loop: boolean;
  itemsLength: number;
}

// This function will be called by the script tag in ResourceSwiper.astro
// if this script is loaded globally or if that script tag specifically calls it.
// To make it self-executing for each swiper instance based on data attributes:
function initializeAllSwipersOnPage(): void {
  const swiperElements = document.querySelectorAll<HTMLElement>('.swiper[data-swiper-options]');
  console.log(`SCRIPT_FILE: Found ${swiperElements.length} swiper(s) with data-swiper-options.`);

  swiperElements.forEach((swiperEl, index) => {
    // Prevent re-initializing if already done (e.g., by Astro view transitions)
    if ((swiperEl as any).swiper) {
      console.log(`SCRIPT_FILE: Swiper instance already exists for element ${index + 1}:`, swiperEl.classList);
      return;
    }

    const optionsString = swiperEl.dataset.swiperOptions;
    if (!optionsString) {
      console.error("SCRIPT_FILE: Swiper options data-swiper-options attribute not found on element:", swiperEl);
      return;
    }

    try {
      const options: SwiperConfigOptions = JSON.parse(optionsString);

      if (!options || typeof options.itemsLength !== 'number' || !options.containerClass) {
        console.error("SCRIPT_FILE: Swiper options not valid, itemsLength missing, or containerClass missing for", swiperEl, options);
        return;
      }

      // Ensure we are initializing the correct swiper instance
      // This check is redundant if querySelectorAll is specific enough or if each instance has unique options.
      // if (!swiperEl.classList.contains(options.containerClass)) {
      //   console.warn(`SCRIPT_FILE: Element class list does not match options.containerClass for element ${index + 1}. Skipping.`);
      //   return;
      // }

      console.log(`SCRIPT_FILE: Initializing Swiper for .${options.containerClass} (Element ${index + 1}) with ${options.itemsLength} items.`);

      if (options.itemsLength > 0) {
        new Swiper(swiperEl, { // Pass the swiperEl directly
          modules: [Navigation, Pagination, Autoplay, Keyboard, A11y, FreeMode],
          slidesPerView: options.slidesPerView,
          spaceBetween: options.spaceBetween,
          loop: options.loop,
          freeMode: { enabled: true, sticky: false, momentumBounce: false, },
          pagination: { el: `.${options.paginationClass}`, clickable: true, dynamicBullets: options.itemsLength > 5, },
          navigation: { nextEl: `.${options.nextElClass}`, prevEl: `.${options.prevElClass}`, },
          keyboard: { enabled: true },
          a11y: { enabled: true, prevSlideMessage: 'Previous resource', nextSlideMessage: 'Next resource', paginationBulletMessage: 'Go to resource {{index}}', },
          watchOverflow: true,
          slidesOffsetBefore: (options.slidesPerView === 'auto' || (typeof options.slidesPerView === 'number' && options.slidesPerView > 1) || (typeof options.mdSlidesPerView === 'number' && options.mdSlidesPerView > 1) || (typeof options.lgSlidesPerView === 'number' && options.lgSlidesPerView > 1) ) ? 0 : 16,
          slidesOffsetAfter: (options.slidesPerView === 'auto' || (typeof options.slidesPerView === 'number' && options.slidesPerView > 1) || (typeof options.mdSlidesPerView === 'number' && options.mdSlidesPerView > 1) || (typeof options.lgSlidesPerView === 'number' && options.lgSlidesPerView > 1) ) ? 0 : 16,
          breakpoints: {
            640: { slidesPerView: options.mdSlidesPerView, spaceBetween: options.spaceBetween + 4, },
            768: { slidesPerView: options.mdSlidesPerView, spaceBetween: options.spaceBetween + 8, slidesOffsetBefore: 0, slidesOffsetAfter: 0, },
            1024: { slidesPerView: options.lgSlidesPerView, spaceBetween: options.spaceBetween + 14, },
          },
        });
        console.log(`SCRIPT_FILE: Swiper initialized successfully for .${options.containerClass} (Element ${index + 1})`);
      } else {
        console.log(`SCRIPT_FILE: No items for Swiper (.${options.containerClass}) (Element ${index + 1}), skipping initialization.`);
      }
    } catch (e) {
      console.error(`SCRIPT_FILE: Error parsing Swiper options or initializing for element ${index + 1}:`, swiperEl, e);
    }
  });
}

// Automatically initialize swipers when the script loads and DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllSwipersOnPage);
} else {
    initializeAllSwipersOnPage(); // DOMContentLoaded has already fired
}

// Optional: Re-initialize on Astro view transitions if needed
document.addEventListener('astro:page-load', initializeAllSwipersOnPage);