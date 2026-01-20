---
title: Virtual Scrolling for Billions of Rows — Techniques from HighTable
description: Techniques used in HighTable to efficiently render and navigate billions of rows in the browser using lazy loading, slicing, scrollbar downscaling, local scrolling, and keyboard navigation.
tags: web, ui, javascript, performance, react, accessibility, virtualization
date: 2026-01-14
---

TL;DR: In this post, I present five techniques used in HighTable, a React component that can display billions of rows in a table with vertical scrolling, while keeping good performance and accessibility.

You can jump directly to the techniques if you want to skip the introduction.

- [Technique 1: load the data lazily](#technique-1-load-the-data-lazily)
- [Technique 2: table slice](#technique-2-table-slice)
- [Technique 3: downscale the scrollbar](#technique-3-downscale-the-scrollbar)
- [Technique 4: local scrolling](#technique-4-local-scrolling)
- [Technique 5: keyboard navigation](#technique-5-keyboard-navigation)

## Introduction

Showing data in a table is one of the first exercises you'll find in HTML 101 courses.

```html
<table>
  <thead>
    <tr><th>Name</th><th>Age</th></tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>64</td></tr>
    <tr><td>Bob</td><td>37</td></tr>
  </tbody>
</table>
```

But, as often in data science, what works for simple cases breaks when the size increases.

In this post, I'll showcase some techniques used in `<HighTable>`, a React component that can handle billions of rows, focusing on the challenges related to vertical scrolling. The component also provides features for columns (sort, hide, resize), rows (select), cells (keyboard navigation, pointer interactions, custom rendering). Feel free to ask and look at the code if you're interested in knowing more.

The [hyparam/hightable](https://github.com/hyparam/hightable/) library was created by [Kenny Daniel](https://github.com/platypii) for [Hyperparam](https://hyperparam.app/), and I've had the chance to contribute to the development for one year now. Try it in the [demo](https://hyparam.github.io/demos/hightable/#/large), or as part of the web [Parquet viewer](https://hyparam.github.io/demos/hyparquet/).

## Technique 1: load the data lazily

The first challenge when working on a large dataset is that it will not fit in your browser memory. The good news is that you'll not want to look at every row either, and not at the same time. So, instead of loading the whole data file at start, <strong>HighTable only loads the cells it needs for the current view</strong>.

How you load the data is not part of HighTable. Instead, you pass the data as a `DataFrame` object. The interface is designed for lazy-loading the cells on demand. Here is a minimal (and simplified) DataFrame implementation that generates random data for one column, with some delay, and persists the values in memory:

```typescript
const cache = new Map<number, number>();
const eventTarget = new EventTarget();
const df = {
  numRows: 1_000_000,
  columnDescriptors: [{name: 'Age'}],
  eventTarget,

  async fetch({ rowStart, rowEnd }: { rowStart: number, rowEnd: number}): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (let row = rowStart; row < rowEnd; row++) {
      if (cache.has(row)) continue;
      const value = Math.floor(Math.random() * 100);
      cache.set(row, {value});
    }
    // The resolve event tells HighTable to re-render the visible cells
    eventTarget.dispatchEvent(new Event('resolve'));
  },

  getCell({ row }: { row: number }): { value: number } | undefined {
    return cache.get(row);
  },
}
```

The dataframe loads the data from the source using the asynchronous `df.fetch()` method, which must cache the results, and dispatch a `resolve` event when new data is available. The source can be anything. Here it is randomly generated data. It can also be a [local file](https://developer.mozilla.org/en-US/docs/Web/API/File), an in-memory array, a remote file (using HTTP range requests), or a REST API, for example.

The dataframe must also provide a synchronous `df.getCell()` method to get the cached data for a given cell, or `undefined` if the data is not loaded yet.

When rendering, HighTable will first call `df.getCell()` for the visible rows. If some cells are missing, it will call `df.fetch()` to load them in the background, and re-render the table when the data is available (listening for the `resolve` event).

Read more:

- [DataFrame interface definition](https://github.com/hyparam/hightable/blob/master/src/helpers/dataframe/types.ts#L38).
- [Usage of DataFrame to load a remote Parquet file](https://github.com/hyparam/demos/blob/8cbaf815eb75af0699d44242be2cfb2756b02ce7/hyparquet/src/App.tsx#L23)

## Technique 2: table slice

In software engineering, when you try to optimize, the first step is to remove useless computing. In our case, if the table has one million rows and we can see only 30 at a time, why render one million `<tr>` HTML elements? HighTable only renders a small table, with the header, some padding rows, the visible rows, and then some other padding rows, which generally results in less than one hundred rows. This table slice is absolutely positioned on a background div that has the same height as the theoretical table, in order for the visible rows to be on the viewport.

When scrolling, the absolute position is updated to keep things aligned. The header is always visible and aligned at the top when scrolling thanks to CSS ([`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position#sticky)).

## Technique 3: downscale the scrollbar

Technique 2 works perfectly, until it breaks... As explained in Eric Meyer's blog post [Infinite Pixels](https://meyerweb.com/eric/thoughts/2025/08/07/infinite-pixels/), HTML elements have a maximum height, and the value depends on the browser. The worst case is Firefox: about 17 million pixels. As the background div height increases with the number of rows, if the row height is 33px (the default in HighTable), we cannot render more than 500K rows.

Our approach to this issue is to clamp the background div to some threshold (8M pixels), and for larger values, to apply a scale between the scroll position and the absolute position of the table slice. So, if you scroll 50% of the background div, we show the middle rows. It gives the ability to the user to navigate the whole table, but has a drawback: some rows are now unreachable.

Indeed, the scroll bar precision is about 1px. Well, it's 1 / [devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio), but let's keep one pixel for simplicity. It means that, if you have billions of rows, scrolling down by the minimal step will move thousands of rows down the table. If `scrollTop = 0` shows the first rows, and `scrollTop = 1` shows rows `1000-1030`, there is no way to set `scrollTop = 0.03` to show rows from `30-60`. If you try to scroll programmatically with `element.scrollTo({top: 0.03})`, the result will be rounded by the browser to `scrollTop = 0`.

As an additional anecdote, know that setting the scroll value programmatically isn't really predictable anyway. It depends on the browser, the zoom, the device pixel ratio, and maybe other factors. For example, `element.scrollTo({top: 100})` might result in `scrollTop = 100`, `scrollTop = 100.23`, or `scrollTop = 99.89`. You cannot know exactly, but within a margin of one pixel.

The scrollTop value can even be outside of the expected range, for example negative or larger than the requested value. To prevent such browser-specific over-scroll effects, when reacting to a scroll event, HighTable always clamps the `scrollTop` value within the expected range, and appies the CSS rule `overflow-y: clip` (`clip`, instead of `hidden`, shows the sticky header, even if I'm not sure why to be honest).

## Technique 4: local scrolling

The previous technique allows to scroll globally through the file, but it does not allow fine scrolling, and prevents some rows from being reachable. To fix that, we had to keep a state of the current scrollbar position and of the current visible rows, and implemented the following behavior:

- local scroll: if the scroll move is small, for example when using the mouse wheel, adjust the visible rows accordingly, so that the move appears local (for example, 3 rows downwards)
- global scroll: if the scroll move is big, typically on scrollbar drag and drop, jump to the global position given by technique 3
- resynchronization: if many local scrolls have been accumulated, stop the local scroll mode, and jump to the global position corresponding to the scrollbar. In HighTable, we trigger resynchronization after scrolling 500 rows locally.

## Technique 5: keyboard navigation

One of the HighTable requirements is to allow keyboard navigation. Fortunately, the Web Accessibility Initiative (WAI) provides guides like the [Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) and the [Data Grid Examples](https://www.w3.org/WAI/ARIA/apg/patterns/grid/examples/data-grids/). We use [tabindex roving](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex) to handle the focus, providing all the expected [keyboard interactions](https://www.w3.org/WAI/ARIA/apg/patterns/grid/#datagridsforpresentingtabularinformation).

Focusing the current cell when navigating the keyboard is easy: calling `element.focus()` automatically scrolls to it. In HighTable, we don't use this default behavior, because it positions the cell at the center of the viewport, causing jumps when navigating with the keyboard. Instead, we first call `element.scrollIntoView({block: 'nearest', inline: 'nearest'})` to scroll by the minimal amount to show the current row and column, then focus with `element.focus({preventScroll: true})`.

As an implementation detail, before calling the `scrollIntoView` method, we have to ensure that the target row is rendered. We achieve that by computing the next range of visible rows, updating the table slice accordingly, and then calling `scrollIntoView` once the cell is in the DOM. When computing the nex range, we have to reproduce the `block: 'nearest'` behavior by computing the top position depending on the relative positions of the current row and the next row: if the next row is below, we set it at the top of the viewport, it it's above, we put it as the bottom of the viewport.

Unfortunately, it conflicts with techniques 3 (downscaled scrollbar) and 4 (local scrolling). In that case, as the scroll bar precision is not enough to reach the target row, we cannot rely on it to reach the exact expected `scrollTop` position. Instead, we have to do the following:
- compute the exact `scrollTop` position that would show the target row at the expected place in the viewport
- set the internal state to this `scrollTop` position, so that the next render shows the table slice at the expected place
- programmatically scroll to this `scrollTop` position using `element.scrollTo({top, behavior: 'instant'})`. We force `behavior: 'instant` to avoid multiple `scroll` events due to smooth scrolling, which would conflict with our internal state due to intermediate unexpected `scrollTop` positions.
- and finally, after the browser applies the scroll, call `scrollIntoView()` only for horizontal alignment (with `inline: 'nearest'`) and focus the cell (with `preventScroll: true`)

## Conclusion

No need for a fake scroll bar. No need to render the table as a `<canvas>`. Thanks to these five techniques that rely on native HTML elements, HighTable lets you navigate through billions of rows of a remote data file, in the browser.
