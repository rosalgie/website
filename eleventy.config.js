/** @param {import('@11ty/eleventy/src/UserConfig').default} eleventyConfig */
import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

export default function (eleventyConfig) {
  const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
  });

  md.use(markdownItFootnote);

  const defaultInlineCodeRenderer = md.renderer.rules.code_inline;
  md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
    tokens[idx].attrJoin("class", "md-inline");
    if (defaultInlineCodeRenderer) {
      return defaultInlineCodeRenderer(tokens, idx, options, env, self);
    }
    return self.renderToken(tokens, idx, options);
  };

  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["avif", "webp", "auto"],
    widths: [480, 960, 1600, "auto"],
    urlPath: "/img/opt/",
    outputDir: "./_site/img/opt/",
    htmlOptions: {
      imgAttributes: {
        loading: "lazy",
        decoding: "async",
        sizes: "(max-width: 800px) 100vw, 800px",
      },
    },
  });

  eleventyConfig.addPassthroughCopy("styling.css");
  eleventyConfig.addPassthroughCopy("theme.js");
  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addPassthroughCopy("public");

  return {
    dir: {
      input: ".",
      includes: "blog/_includes",
      output: "_site",
    },
  };
}
