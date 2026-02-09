---
title: Virtual Scrolling for Billions of Rows — Techniques from HighTable
description: Techniques used in HighTable to efficiently render and navigate billions of rows in the browser using lazy loading, slicing, scrollbar downscaling, local scrolling, and vertical/horizontal scroll decoupling.
tags: web, ui, javascript, performance, react, accessibility, virtualization
date: 2026-02-02
---

TL;DR: In this post, I present <strong>five techniques related to vertical scrolling</strong> used in HighTable, a React component that can display billions of rows in a table while keeping good performance and accessibility.

<a title="Christies.com, Public domain, via Wikimedia Commons" href="https://commons.wikimedia.org/wiki/File:A_Qur%27an_scroll_(tumar)_commissioned_for_Ghiyath_al-Din_Sultan_Muhammad_ibn_Sultan_Eretna,_signed_Mubarakshah_ibn_%27Abdullah,_eastern_Anatolia,_dated_1353-54.jpg"><img  alt="A Qur&#039;an scroll (tumar) commissioned for Ghiyath al-Din Sultan Muhammad ibn Sultan Eretna, signed Mubarakshah ibn &#039;Abdullah, eastern Anatolia, dated 1353-54" src="./scroll.jpg"></a>

You can jump directly to the techniques if you want to skip the introduction.

- [Technique 1: load the data lazily](#technique-1-load-the-data-lazily)
- [Technique 2: only render a table slice](#technique-2-only-render-a-table-slice)
- [Technique 3: downscale the scrollbar for global scrolling](#technique-3-downscale-the-scrollbar-for-global-scrolling)
- [Technique 4: add a local scrolling mode](#technique-4-add-a-local-scrolling-mode)
- [Technique 5: decouple vertical and horizontal scrolling](#technique-5-decouple-vertical-and-horizontal-scrolling)

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

In this post, I'll showcase five techniques we use to <strong>solve challenges related to vertical scrolling</strong> in `<HighTable>`, a table React component that can handle billions of rows.

The component also provides features for columns (sort, hide, resize), rows (select), cells (keyboard navigation, pointer interactions, custom rendering). Feel free to ask and look at the code if you're interested in knowing more.

The `<HighTable>` component is developed at [hyparam/hightable](https://github.com/hyparam/hightable/). It was created by [Kenny Daniel](https://github.com/platypii) for [Hyperparam](https://hyperparam.app/), and I've had the chance to contribute to its development for one year now. Try it in the [demo](https://hyparam.github.io/demos/hightable/#/large), or as part of the [Parquet viewer](https://hyparam.github.io/demos/hyparquet/).

## Scrolling basics

Before diving into the techniques, let's describe how scrolling works using a standard HTML table. In the following widget, scroll the left box up and down to see how the right box mimics the scrolling effect:

<!-- add a button to run the animation -->
{% renderTemplate "webc" %}
<scroll-native></scroll-native>
{% endrenderTemplate %}

The component is delimited by its fixed-size <em>viewport</em> (blue border). The table (golden border) is rendered inside the component. As its height is larger than the viewport height, only part of the table is visible, and a vertical scrollbar lets changing the visible part. When scrolling, the inner table element moves up and down within the viewport, creating the scrolling effect.

On the right side, we mimic the scrolling effect, showing the position of the table relative to the viewport.

Let's settle some definitions and formulas that will be useful later:

1. in this post, we assume <code class="viewport">viewport.clientHeight</code>, the height of the visible area, is constant. In HighTable, it's measured and we react to resizing.

2. <code class="viewport">viewport.scrollHeight</code>, the total height of the scrollable content, is equal to <code class="table">table.clientHeight</code>. Both are equal to the number of rows multiplied by the row height:

    ```typescript
    const rowHeight = 33; // in pixels
    const numRows = df.numRows; // total number of rows in the table
    const height = numRows * rowHeight;
    ```

    In this post, we assume the row height and the number of rows are constant. In HighTable, we react to changes in the number of rows (for example when filtering), but the row height is fixed (see [issue #395](https://github.com/hyparam/hightable/issues/395) about variable row heights).

3. <code class="viewport">viewport.scrollTop</code>, the vertical scroll position in pixels, indicates how many pixels the table has been scrolled upwards.
    - its minimum value is <code class="viewport">0</code> (top of the table)
    - its maximum value is <code class="viewport">viewport.scrollHeight - viewport.clientHeight</code> (bottom of the table).

4. The visible pixels can be computed from the viewport scroll position:

    ```typescript
    // firstVisiblePixel is inclusive, lastVisiblePixel is exclusive
    const firstVisiblePixel = viewport.scrollTop;
    const lastVisiblePixel = viewport.scrollTop + viewport.clientHeight;
    ```


## Technique 1: load the data lazily

The first challenge when working on a large dataset is that it will not fit in your browser memory. The good news is that you'll not want to look at every row either, and not at the same time. So, instead of loading the whole data file at start, <strong>HighTable only loads the cells it needs for the current view</strong>.

The following widget shows how lazy loading works. Scroll the left box up and down to see how the cells are loaded on demand on the right side:

<!-- add a button to run the animation -->
{% renderTemplate "webc" %}
<scroll-lazy-load></scroll-lazy-load>
{% endrenderTemplate %}

In the table, only the visible cells are loaded. When scrolling, newly visible cells are requested and loaded in the background, and rendered when available.

To do so, we compute the visible rows, and only load them:

```typescript
// rowStart is inclusive, rowEnd is exclusive
const rowStart = Math.floor(viewport.scrollTop / rowHeight);
const rowEnd = Math.ceil(
  (viewport.scrollTop + viewport.clientHeight) / rowHeight
);
```

> This computation requires the row height to be constant. HighTable currently relies on fixed-height rows. See the ["Allow variable row height"](https://github.com/hyparam/hightable/issues/395) issue.


How you load the data is not part of HighTable. Instead, you pass the data as a [`DataFrame`](https://github.com/hyparam/hightable/blob/master/src/helpers/dataframe/types.ts#L38) object. The interface is designed for lazy-loading the cells on demand. Here is a simplified DataFrame implementation that generates random data for one column, with some delay, and persists the values in memory:

```typescript
const cache = new Map<number, number>();
const eventTarget = new EventTarget();
const df = {
  numRows: 1_000_000,
  columnDescriptors: [{name: 'Age'}],
  eventTarget,

  async fetch(
    { rowStart, rowEnd }: { rowStart: number, rowEnd: number}
  ): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Generate random values for the missing rows, and cache them
    for (let row = rowStart; row < rowEnd; row++) {
      if (cache.has(row)) continue;
      const value = Math.floor(Math.random() * 100);
      cache.set(row, {value});
    }
    // Emit an event to tell HighTable to re-render the visible cells
    eventTarget.dispatchEvent(new Event('resolve'));
  },

  getCell({ row }: { row: number }): { value: number } | undefined {
    // Synchronously return the cached value (if any)
    return cache.get(row);
  },
}
```

The dataframe loads the data from the source using the asynchronous `df.fetch()` method. It must cache the results, and dispatch a `resolve` event when new data is available. The source can be anything. Here the data is randomly generated. It can also be a [local file](https://developer.mozilla.org/en-US/docs/Web/API/File), an in-memory array, a remote file (using HTTP range requests), or a REST API, for example.

The dataframe must also provide a synchronous `df.getCell()` method to get the cached data for a given cell, or `undefined` if the data is not loaded yet.

When rendering, HighTable will call `df.getCell()` for the visible rows. If some cells are missing, it will also call `df.fetch()` to load them in the background, and re-render the table when the data is available (listening for the `resolve` event).

> You can find a more complete example of a DataFrame that loads a remote Parquet file using HTTP range requests in the [hyparquet demo](https://github.com/hyparam/demos/blob/8cbaf815eb75af0699d44242be2cfb2756b02ce7/hyparquet/src/App.tsx#L23).

Lazy loading the data is the first step to handle large datasets. The next step is to avoid rendering too many HTML elements at once.

## Technique 2: only render a table slice

In software engineering, when you try to optimize, the first step is to remove useless computing. In our case, if the table has one million rows and we can see only 30 at a time, why render one million `<tr>` HTML elements? As a reference, Chrome [recommends](https://developer.chrome.com/docs/performance/insights/dom-size) creating or updating less than 300 HTML elements for optimal responsiveness.

HighTable is a virtual table, which <strong>renders only the visible slice of the table</strong>.

The following widget shows how table slicing works. Scroll the left box up and down to see how the right box mimics the scrolling effect, while rendering only the visible rows. Toggle the "full table" button to see how the rendered rows fit in the full table:

<!-- add a button to run the animation -->
{% renderTemplate "webc" %}
<scroll-slice></scroll-slice>
{% endrenderTemplate %}

On the right side, you see that only the visible rows are rendered. The rendered table only contains 6 rows instead of 10 (or 7, depending on the scroll position). Its top position is adjusted to fit in the full table ("Show" the full table to see it).

The corresponding HTML structure looks like this. Let's assume the table has 1,000,000 rows, each row is 30px height, and the viewport height is 600px (so that about 20 rows are visible at once). If the user has scrolled down to show rows 1000 to 1019, HighTable only renders these rows:

```html
<table>
  <tbody>
    <!-- Rows 0 to 999 are not rendered -->

    <!-- Visible rows -->
    <tr>...row 1000...</tr>
    <tr>...row 1001...</tr>
    ...
    <tr>...row 1019...</tr>

    <!-- Rows 1020 to 999,999 are not rendered -->
  </tbody>
</table>
```

> The HTML above is a simplification. In reality, HighTable renders a table header, and adds some padding rows before and after the visible rows, to improve the scrolling experience.

The padding rows are used to prevent empty spaces when scrolling quickly. When the user scrolls down, the visible rows are updated accordingly, and the padding rows are adjusted to keep some extra rows before and after the visible rows.

This table slice is rendered inside wrappers that handle the scrolling:

```html
<!-- the viewport has a scrollbar; its height is small, e.g. 600px -->
<div class="viewport" style="overflow-y: auto;">
  <!-- the background height is big, e.g. 33px * 1_000_000 (rows) -->
  <div class="bg" style="height: 33000000px; position: relative;">
    <!-- the wrapper is positioned at the viewport scrollTop value,
      e.g. 33,000px -->
    <div class="wrapper" style="position: absolute; top: 33000px;">
      <!-- the table renders rows from 1000 to 1030
        (first visible row: scrollTop / 33) -->
      <table>...</table>
      ...
    </div>
  </div>
</div>
```

In this structure, the viewport is a div with `overflow-y: auto` and a fixed height (for example 600px, or the available height of the container). It has a vertical scrollbar, the user scrolls to navigate through the table. The important value is `viewport.scrollTop`, which gives the vertical scroll position in pixels.

The background div has a height equal to the theoretical height of the full table (number of rows multiplied by the row height). It is used to provide the scrollbar with the correct size (`viewport.scrollHeight` is equal to `background.style.height - viewport.clientHeight`).

The wrapper div is absolutely positioned inside the background div, at a `top` position equal to the current `viewport.scrollTop` value, so that the its top pixel is shown at the top of the viewport.

The table element is rendered inside the wrapper. The visible rows are computed from the `viewport.scrollTop` value: if each row is 33px height, and `viewport.scrollTop = 33000px`, the first visible row is `33000 / 33 = 1000`.

HighTable reacts to resizing and scrolling. If the user scrolls, it recomputes the indexes of the visible rows, fetches the data if needed (technique 1), and re-renders the table slice. At the same time, it updates the absolute positioning to keep things aligned. If the user resizes the viewport, for example by resizing the browser window, HighTable recomputes how many rows are visible at once, and re-renders accordingly.

<!-- TODO: add a diagram, or an interactive widget -->

> A detail worth mentioning is the sticky header. In HighTable, the table header is rendered as part of the table element, not as a separate element. It helps with accessibility, as screen readers can easily identify the header cells associated with each data cell, and with columns resizing, as the header and data cells are aligned automatically by the browser. Thanks to  CSS ([`position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position#sticky)), the header row remains visible at the top of the viewport when scrolling. We take it into account to compute the first visible row.

> Also, note that the same approach can be used for horizontal scrolling (rendering only the visible columns). It's less critical, as tables generally have less columns than rows. Join the pending [discussion on virtual columns](https://github.com/hyparam/hightable/issues/297) if you're interested in having it in HighTable.

Until now, everything is pretty standard. The next techniques are more specific to HighTable, and address challenges that arise when dealing with billions of rows.

## Technique 3: downscale the scrollbar for global scrolling

Technique 2 works perfectly, until it breaks... As explained in Eric Meyer's blog post [Infinite Pixels](https://meyerweb.com/eric/thoughts/2025/08/07/infinite-pixels/), HTML elements have a maximum height, and the value depends on the browser. The worst case is Firefox: about 17 million pixels. As the background div height increases with the number of rows, if the row height is 33px (the default in HighTable), we cannot render more than 500K rows.

Our approach to this issue in HighTable is to <strong>set a maximum height for the background div (8M pixels) and downscale the scrollbar above this limit.<strong>

Concretely, above the threshold, we compute a downscaling factor between the theoretical height of the full table and the maximum height of the background div, and use it to compute the visible rows from the scroll position, so that if you scroll to half the scrollbar, you reach the middle of the table.

Below the threshold, the downscaling factor is 1, so everything works as before.

The downscale factor is computed with:

```typescript
maxBackgroundHeight = 8_000_000 // in pixels
rowHeight = 33 // in pixels
numRows = df.numRows // total number of rows in the table
if (numRows * rowHeight <= maxBackgroundHeight) {
  downscaleFactor = 1
} else {
  downscaleFactor = (numRows * rowHeight) / maxBackgroundHeight
}
```

<!-- Diagram/widget with the height vs the number of rows -->

And the first visible row is computed with:

```typescript
firstVisibleRow = Math.floor(
  (viewport.scrollTop * downscaleFactor) / rowHeight
)
```

This lets the user navigate through the whole table, even with billions of rows.

But there is a drawback, due to the limited precision of the scrollbar. The scroll bar precision is 1 <em>physical</em> pixel. Hence, on "high-resolution" screens, the apparent precision is a fraction of a <em>CSS</em> pixel (1 / [devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio).

Let's keep one pixel for simplicity.

So, if the downscale factor is big, let's say 10,000, the minimal scroll move (1px) corresponds to 10,000 pixels in the full table. With a row height of 33px, it means that the minimal scroll move corresponds to about 300 rows. It creates <em>gaps</em> in the reachable rows:

- if `scrollTop = 0`, the visible rows are `0-30`
- if `scrollTop = 1`, the visible rows are `1000-1030`
- if `scrollTop = 2`, the visible rows are `2000-2030`
- and so on...

There is no way to reach rows `31-60`, for example. Setting `scrollTop = 0.03` to reach rows `30-60` is impossible, because the browser rounds the scroll position to the nearest integer pixel.

<!-- Diagram/widget showing the unreachable rows -->

> As an anecdote, know that setting the scroll value programmatically is hard to predict anyway. It depends on the device pixel ratio, which itself depends on the zoom, and maybe other factors. For example, `element.scrollTo({top: 100})` might result in `scrollTop = 100`, `scrollTop = 100.23`, or `scrollTop = 99.89`. You cannot know exactly, but within a margin of one pixel.
>
> The scrollTop value can even be outside of the expected range, for example negative or larger than the requested value. To prevent such browser-specific over-scroll effects, when reacting to a scroll event, HighTable always clamps the `scrollTop` value within the expected range, and applies the CSS rule `overflow-y: clip` (`clip`, instead of `hidden`, shows the sticky header, even if I'm not sure why to be honest).

Hence, if technique 3 provides global navigation through billions of rows, it does not allow fine scrolling, and some rows are unreachable. Technique 4 addresses this issue.

## Technique 4: add a local scrolling mode

The previous technique allows to scroll globally through the file, but prevent users to scroll locally because any scroll gesture will jump over gaps of unreachable rows.

To fix that, we implement <strong>two scrolling modes: local and global scrolling</strong>. Local scrolling means moving row by row, while global scrolling means jumping to the position given by the scrollbar.

The logic requires a state with:
- the global anchor (`globalAnchor`) corresponding to a scrollbar position,
- an offset (`localOffset`) to adjust the position for local scrolling.

The absolute positioning of the table wrapper is:

```typescript
wrapper.style.top = `${viewport.scrollTop * downscaleFactor + state.localOffset}px`;
```

On every scroll event, we compute the magnitude of the scroll move (difference between the viewport's scrollTop and the global anchor) and apply one of the three cases:

- <b>global scroll</b>: if the scroll move is big, typically on scrollbar drag and drop, jump to the new global position (technique 3)
- <b>resynchronization</b>: if many local scrolls have been accumulated, stop the local scroll mode, and jump to the global position corresponding to the scrollbar. In HighTable, we trigger resynchronization after scrolling 500 rows locally.
- <b>local scroll</b>: if the scroll move is small, for example when using the mouse wheel, keep the state's `globalAnchor` value unchanged (ie: desynchronized from the real `scrollTop` value) and adjust the `localOffset`, so that the move appears local (for example, 3 rows downwards)

Represented as code, the logic looks like this (simplified, pseudo-code):

```typescript
const state = getState()
const delta = viewport.scrollTop - state.globalAnchor;
if (Math.abs(delta) > localThreshold) {
  // global scroll
  state.localOffset = 0;
  state.globalAnchor = viewport.scrollTop;
} else if (Math.abs(state.localOffset + delta) > resyncThreshold) {
  // resync to global scroll
  state.localOffset = 0;
  state.globalAnchor = viewport.scrollTop;
} else {
  // local scroll.
  // Accumulate the local offset, leaving the global anchor unchanged
  state.localOffset += delta
}
setState(state);
```

With this approach, small scroll moves appear local, while large scroll moves jump to the expected global position. The user can navigate through the whole table, and reach every row. The user can scroll as expected in the browser, with their mouse wheel, touchpad, keyboard (when the table is focused) or scrollbar.

<!-- video showing the three cases (with annotations on the video) -->

But we also wanted to navigate the table with the keyboard by moving an active cell as in any Excel / Google Sheet. It requires programmatic scrolling, and is not trivial due to virtual scrolling. We explain it in the next section.

## Technique 5: decouple vertical and horizontal scrolling

One of the HighTable requirements is to allow keyboard navigation (e.g. Down Arrow to go to the next row). Fortunately, the Web Accessibility Initiative (WAI) provides guides like the [Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) and the [Data Grid Examples](https://www.w3.org/WAI/ARIA/apg/patterns/grid/examples/data-grids/). We use [tabindex roving](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex) to handle the focus, providing all the expected [keyboard interactions](https://www.w3.org/WAI/ARIA/apg/patterns/grid/#datagridsforpresentingtabularinformation).

> The simplest way to focus the current cell when navigating the keyboard is to call `cell.focus()`: it automatically scrolls to the focused cell. In HighTable, we don't use this default behavior, because it positions the cell at the <em>center</em> of the viewport, which does not feel natural.
>
> Instead, we first call `cell.scrollIntoView({block: 'nearest', inline: 'nearest'})` to scroll by the minimal amount to show the next row and column.
>
> We then only set the focus, with no scroll action, with `cell.focus({preventScroll: true})`.

Unfortunately, the keyboard navigation techniques explained in the WAI resources are designed for fully rendered tables. Due to techniques 3 and 4, the vertical and horizontal scroll positions must be handled differently. In HighTable, to let the user navigate moving the current cell with the keyboard, we <strong>separate the vertical scrolling logic from the horizontal one</strong>.

When the user moves the active cell, the next cell can be anywhere in the table, as all the expected keyboard interactions are supported. The next row can be near or far from the current row, which means that we might have to update the scrollbar position.

To update the table view accordingly, we first ensure the row is visible by:

1. computing the next state (global position: scrollTop, and local position: localOffset),
2. re-rendering the table slice,
3. programmatically scrolling to the new scrollTop position, if the global position has changed.

Once the row is visible, we ensure the column is visible by calling `cell.scrollIntoView({inline: 'nearest'})`, which only scrolls horizontally if needed.

Then, we set the focus to the new cell with `cell.focus({preventScroll: true})`.

Note that, for point 1. (computing the next state), we follow the `block: nearest` behavior by minimizing the scroll move. If the next row is below the current viewport, it will be the last visible row in the next viewport. If it is above, it will be the first visible row. If it is already visible, no vertical scroll is applied.

The pseudo-code for decoupling vertical and horizontal scrolling requires a semaphore to prevent horizontal scrolling and focus during the programmatic vertical scroll:

```typescript
/* in the cell navigation code */
const shouldScroll = state.update() // technique 4
renderTableSlice()
if (shouldScroll) {
  // set a semaphore to prevent horizontal scrolling + focus
  // during programmatic scroll
  setSemaphore('programmaticScroll')
  viewport.scrollTo({top: state.globalAnchor, behavior: 'instant'})
}
```

```typescript
/* in the scroll event handler */
if (isSemaphoreSet('programmaticScroll')) {
  // allow horizontal scrolling + focus,
  // once the programmatic scroll is done
  clearSemaphore('programmaticScroll')
}
```

```typescript
/* in the cell rendering code */
if (!isSemaphoreSet('programmaticScroll')) {
  // horizontal scrolling + focus allowed
  cell.scrollIntoView({inline: 'nearest'})
  cell.focus({preventScroll: true})
}
```

> Note that we set `behavior: 'instant'` as a `scrollTo()` option, to ensure we only receive one `scroll` event. The alternative (`behavior: 'smooth'`) would trigger multiple `scroll` events, clearing the semaphore too early, and generating conflicts with the internal state due to intermediate unexpected `scrollTop` positions. An alternative would be to compare the `scrollTop` value in the scroll event handler with the expected value ([issue opened](https://github.com/hyparam/hightable/issues/393)).


## Conclusion

No need for a [fake scroll bar](https://dev.to/kohii/how-to-implement-virtual-scrolling-beyond-the-browsers-limit-16ol). No need to render the table [as a `<canvas>`](https://github.com/xwinstone/canvastable). Thanks to these five techniques that rely on native HTML elements, [HighTable](https://github.com/hyparam/hightable) lets you navigate through billions of rows of a remote data file, in the browser.

Give a star ⭐ to the [GitHub repo](https://github.com/hyparam/hightable) if you liked the article!
