module.exports = function (config) {
  config.addPassthroughCopy({ "./src/_includes/style.css": "style.css" });

  config.addPassthroughCopy({ "./src/_includes/favicon": "./" });

  //   config.addShortcode("user", function(name, twitterUsername) {
  //     return `<div class="user">
  // <div class="user_name">${name}</div>
  // <div class="user_twitter">@${twitterUsername}</div>
  // </div>`;
  //   });
};
