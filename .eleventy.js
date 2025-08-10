import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "./src/_includes/style.css": "style.css",
    "./src/_includes/prism.css": "prism.css",
  });
  eleventyConfig.addPassthroughCopy({ "./src/_includes/favicon": "./" });
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPlugin(eleventyImageTransformPlugin);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addFilter("formatDate", function (value) {
    const offset = value.getTimezoneOffset();
    value = new Date(value.getTime() - offset * 60 * 1000);
    return value.toISOString().split("T")[0];
  });
}
