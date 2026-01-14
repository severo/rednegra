---
title: Blog - Sylvain Lesage
layout: layouts/base.liquid
---

# Blog posts

{%- for post in collections.posts reversed %}

- {{post.date | formatDate }} [{{ post.data.title }}]({{ post.url}})
  {%- endfor %}

Subscribe to the [RSS feed](/feed.xml).
