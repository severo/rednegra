import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

export default function (config) {
  config.addPassthroughCopy({ "./src/_includes/style.css": "style.css" });
  config.addPassthroughCopy({ "./src/_includes/favicon": "./" });
  config.addPassthroughCopy("assets");
  config.addPassthroughCopy("CNAME");
  config.addPlugin(eleventyImageTransformPlugin);
}
