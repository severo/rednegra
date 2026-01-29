import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import { IdAttributePlugin, RenderPlugin } from "@11ty/eleventy";
import webc from "@11ty/eleventy-plugin-webc";

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
  eleventyConfig.addPlugin(IdAttributePlugin);
  eleventyConfig.addFilter("formatDate", function (value) {
    const offset = value.getTimezoneOffset();
    value = new Date(value.getTime() - offset * 60 * 1000);
    return value.toISOString().split("T")[0];
  });
  eleventyConfig.addPlugin(feedPlugin, {
		type: "atom", // or "rss", "json"
		outputPath: "/feed.xml",
		collection: {
			name: "posts", // iterate over `collections.posts`
			limit: 10,     // 0 means no limit
		},
		metadata: {
			language: "en",
			title: "Blog - Sylvain Lesage",
			subtitle: "Web development and data visualization.",
			base: "https://rednegra.net/blog/",
			author: {
				name: "Sylvain Lesage",
				email: "severo@rednegra.net",
			}
		}
  });
  // for web components
  eleventyConfig.addBundle("css");
  eleventyConfig.addBundle("js");
  eleventyConfig.addPlugin(RenderPlugin);
  eleventyConfig.addPlugin(webc, { components: './src/_components/*.webc' });
}
