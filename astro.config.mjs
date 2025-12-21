import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import rehypeSlug from "rehype-slug";
import mdx from "@astrojs/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import sitemap from "@astrojs/sitemap";
import solidJs from "@astrojs/solid-js";
import vercel from "@astrojs/vercel";
// https://astro.build/config
export default defineConfig({
  integrations: [
    solidJs({
      include: ["src/solid/music-solid/*"],
    }),
    react({
      // include: ["**/*/react/*"],
      exclude: ["src/solid/music-solid/*"],
    }),
    tailwind({
      applyBaseStyles: false,
    }),
    mdx(),
    sitemap(),
  ],

  markdown: {
    syntaxHighlight: "shiki", // or 'prism'
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          content: {
            type: "text",
            value: `#`,
          },
          headingProperties: {
            className: ["anchor"],
          },
          properties: {
            className: ["anchor-link"],
          },
        },
      ],
    ],
  },

  site: "https://tools.aadishv.dev",
  base: "",
  output: "static",
  adapter: vercel(),
});
