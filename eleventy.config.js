/** @param {import('@11ty/eleventy/src/UserConfig').default} eleventyConfig */
import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";

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
