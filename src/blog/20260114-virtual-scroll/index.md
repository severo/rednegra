---
title: Virtual Scrolling for Billions of Rows — Techniques from HighTable
tags: web, ui, javascript, performance, react, accessibility, virtualization
date: 2026-01-14
---

TL;DR: In this post, I present five techniques used in HighTable, a React component that can display billions of rows in a table with vertical scrolling, while keeping good performance and accessibility.

## Introduction

Showing data in a table is one of the first exercises you'll find in HTML 101 courses. But, as often in data science, what works for simple cases breaks when the size increases.

In this post, I'll showcase some techniques used in `<HighTable>`, a React component that can handle billions of rows. I'll focus on the challenges related to vertical scrolling. The component also provides features for columns (sort, hide, resize), rows (select), cells (keyboard navigation, pointer interactions, custom rendering). Feel free to look at the code if you're interested in them.

The [hyparam/hightable](https://github.com/hyparam/hightable/) library was created by [Kenny Daniel](https://github.com/platypii) for [Hyperparam](https://hyperparam.app/), and I've had the chance to contribute to the development for one year now. Try it in the [demo](https://hyparam.github.io/demos/hightable/#/large), or as part of the web [Parquet viewer](https://hyparam.github.io/demos/hyparquet/).

## Technique 1: load the data lazily

The first challenge when working on a large dataset is that it will not fit in your browser memory. The good news is that you'll not want to look at every row either. So, instead of loading the whole data file at start, HighTable only loads the cells it needs for the current view.

How you load the data is not part of HighTable. Instead, you pass the data as a [`DataFrame`](https://github.com/hyparam/hightable/blob/master/src/helpers/dataframe/types.ts#L38). This interface is designed for lazy-loading the cells on demand. For example, if the first 30 rows are visible, HighTable will call the dataframe's synchronous `getCell` method to fill the cells with the cached data, and at the same time, call the asynchronous `fetch` method to lazy-load the missing ones. The table will refresh on every loaded cell.

## Technique 2: table slice

In software engineering, when you try to optimize, the first step is to remove useless computing. In our case, if the table has one million rows and we can see only 30 at a time, why render one million `<tr>` HTML elements? HighTable only renders a small table, with the header, some padding rows, the visible rows, and then some other padding rows, which generally results in less than one hundred rows. This table slice is absolutely positioned on a background div that has the same height as the theoretical table, in order for the visible rows to be on the viewport.

When scrolling, the absolute position is updated to keep things aligned. The header is always visible and aligned at the top when scrolling thanks to CSS ([`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position#sticky)).

## Technique 3: downscale the scrollbar

Technique 2 works perfectly, until it breaks... As explained in Eric Meyer's blog post [Infinite Pixels](https://meyerweb.com/eric/thoughts/2025/08/07/infinite-pixels/), HTML elements have a maximum height, and the value depends on the browser. The worst case is Firefox: about 17 million pixels. As the background div height increases with the number of rows, if the row height is 33px (the default in HighTable), we cannot render more than 500K rows.

Our approach to this issue is to clamp the background div to some threshold (8M pixels), and for larger values, to apply a scale between the scroll position and the absolute position of the table slice. So, if you scroll 50% of the background div, we show the middle rows. It gives the ability to the user to navigate the whole table, but has a drawback: some rows are now unreachable.

Indeed, the scroll bar precision is about 1px. Well, it's 1 / [devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio), but let's keep one pixel for simplicity. It means that, if you have billions of rows, scrolling down by the minimal step will move thousands of rows down the table. If `scrollTop = 0` shows the first rows, and `scrollTop = 1` shows rows `1000-1030`, there is no way to set `scrollTop = 0.03` to show rows from `30-60`. If you try to scroll programmatically with `element.scrollTo({top: 0.03})`, the result will be rounded by the browser to `scrollTop = 0`.

As an additional anecdote, know that setting the scroll value programmatically isn't really predictable anyway. It depends on the browser, the zoom, the device pixel ratio, and maybe other factors. For example, `element.scrollTo({top: 100})` might result in `scrollTop = 100`, `scrollTop = 100.23`, or `scrollTop = 99.89`. You cannot know exactly, but within a margin of one pixel.

## Technique 4: local scrolling

The previous technique allows to scroll globally through the file, but it does not allow fine scrolling, and prevents some rows from being reachable. To fix that, we had to keep a state of the current scrollbar position and of the current visible rows, and implemented the following behavior:

- local scroll: if the scroll move is small, for example when using the mouse wheel, adjust the visible rows accordingly, so that the move appears local (for example, 3 rows downwards)
- global scroll: if the scroll move is big, typically on scrollbar drag and drop, jump to the global position given by technique 3
- resynchronization: if many local scrolls have been accumulated, stop the local scroll mode, and jump to the global position corresponding to the scrollbar. In HighTable, we trigger resynchronization after scrolling 500 rows locally.

## Technique 5: programmatic scrolling

One of the HighTable requirements was to allow keyboard navigation. Fortunately, the Web Accessibility Initiative (WAI) provides guides like the [Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) and the [Data Grid Examples](https://www.w3.org/WAI/ARIA/apg/patterns/grid/examples/data-grids/). We implemented them, using [tabindex roving](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex) to handle the focus, and providing all the expected [keyboard interactions](https://www.w3.org/WAI/ARIA/apg/patterns/grid/#datagridsforpresentingtabularinformation).

Focusing the current cell when navigating the keyboard is easy: calling `element.focus()` automatically scrolls to it. Alternatively, you can call `element.focus({preventScroll: true})` then `element.scrollIntoView()` if you want less magic. For local scroll, it works. Imagine the first 30 rows are visible, and we navigate to row 31 with the keyboard. It sets the focus to this row (which is already present in the DOM, as a padding row at the end of the slice), and scrolls to it by adding 33px to the scrollbar.

But if you jump far away from the current rows using the keyboard, for example, pressing End to jump to the last row, we have to programmatically scroll to the corresponding position, and at the same time, opportunistically set the internal state to the same position. Then, wait for the browser to apply the programmatic scroll (via the `scroll` event). To avoid any issue, we scroll with `.scrollTo({top, behavior: 'instant'})`, to avoid the `smooth` behavior which might emit multiple `scroll` events, at positions incoherent with our internal state.

Note that the top position we compute depends on the relative positions of the current row and the next row. If the next row is below, we set it at the top of the viewport. If it's above, we put it as the bottom of the viewport. This "algorithm" is analog to `element.scrollIntoView({block: 'nearest'})`.

## Conclusion

No need for a fake scroll bar. No need to render the table as a `<canvas>`. Thanks to these five techniques that rely on native HTML elements, HighTable lets you navigate through billions of rows of a remote data file, in the browser.
