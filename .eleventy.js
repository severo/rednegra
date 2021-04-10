module.exports = function (config) {
  config.addPassthroughCopy({ "./src/_includes/style.css": "style.css" });
  config.addPassthroughCopy({ "./src/_includes/favicon": "./" });
};
