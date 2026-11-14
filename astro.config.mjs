// @ts-check
import { defineConfig } from 'astro/config';

// Static site. `site`/`base` get set when a real domain/repo is chosen.
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory', // /node/ssrf/ style URLs, matching the LoL-site family
  },
});
