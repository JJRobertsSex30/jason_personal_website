import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from "@astrojs/tailwind";
import astrowindIntegration from './vendor/integration/index.ts';
import icon from "astro-icon";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: {
      enabled: true // Enable Vercel Web Analytics
    }
  }),
  integrations: [
    astrowindIntegration(),
    tailwind(),
    icon(),
    react()
  ],
  site: 'https://www.jasonroberts.coach', // Replace with your actual domain
  vite: {
    ssr: {
      external: ['@libsql/client']
    }
  }
}); 