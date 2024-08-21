import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightBlog from "starlight-blog";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Hardened JavaScript",
      favicon: "/favicon.svg",
      logo: {
        src: "./src/assets/hardened-javascript-logotype.svg",
        replacesTitle: true,
      },
      customCss: ["./src/custom.css"],
      plugins: [starlightBlog()],
      // social: {
      // 	github: 'https://github.com/withastro/starlight',
      // },
      // sidebar: [
      // 	{
      // 		label: 'Guides',
      // 		items: [
      // 			// Each item here is one entry in the navigation menu.
      // 			{ label: 'Example Guide', slug: 'guides/example' },
      // 		],
      // 	},
      // 	{
      // 		label: 'Reference',
      // 		autogenerate: { directory: 'reference' },
      // 	},
      // ],
    }),
  ],
});
