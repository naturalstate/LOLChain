// @ts-check
import { defineConfig } from 'astro/config';

// Static site, deployed to GitHub Pages at naturalstate.github.io/LOLChain/.
// For a custom domain or user/org page later, set base back to '/'.
export default defineConfig({
  site: 'https://naturalstate.github.io',
  base: '/LOLChain',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory', // /node/ssrf/ style URLs, matching the LoL-site family
  },
});
