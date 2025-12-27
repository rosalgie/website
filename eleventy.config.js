/** @param {import('@11ty/eleventy/src/UserConfig').default} eleventyConfig */
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("styling.css");
  eleventyConfig.addPassthroughCopy("theme.js");
  eleventyConfig.addPassthroughCopy("img");

  return {
    dir: {
      input: ".",
      includes: "blog/_includes",
      output: "_site",
    },
  };
}
