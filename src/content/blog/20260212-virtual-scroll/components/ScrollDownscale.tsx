"use client";

import { useState } from "react";

import styles from "./common.module.css";

import DemoDownscale from "./DemoDownscale.tsx";
import Explanation from "./Explanation.tsx";
import Variable from "./Variable.tsx";
import Variables from "./Variables.tsx";

import { rowHeight, wideBorderWidth } from "./constants.ts";
import { px } from "./helpers.ts";

const numRows = 10_000_000_000;
const canvasHeight = 300;

export default function ScrollDownscale() {
  const [_scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const fullTableHeight = numRows * rowHeight;
  const downscaleFactor =
    fullTableHeight <= canvasHeight
      ? 1
      : (fullTableHeight - clientHeight) / (canvasHeight - clientHeight);

  const maxScrollTop = canvasHeight - clientHeight;
  const scrollTop = Math.min(Math.max(_scrollTop, 0), maxScrollTop);

  const maxRows = Math.ceil(clientHeight / rowHeight);
  const firstVisibleRow = Math.floor((scrollTop * downscaleFactor) / rowHeight);
  const lastVisibleRow = Math.min(
    Math.ceil((scrollTop * downscaleFactor + clientHeight) / rowHeight),
    numRows,
    firstVisibleRow + maxRows,
  );
  const top =
    scrollTop === maxScrollTop
      ? Math.round(canvasHeight - maxRows * rowHeight)
      : Math.round((firstVisibleRow * rowHeight) / downscaleFactor);
  const tableClientHeight = (lastVisibleRow - firstVisibleRow) * rowHeight + 1;

  return (
    <div
      className={styles.widget}
      style={
        {
          "--row-height": px(rowHeight),
          "--num-rows": numRows,
          "--wide-border-width": px(wideBorderWidth),
          "--canvas-height": px(canvasHeight),
          "--cells-font-size": "0.7em",
          "--variables-font-size": "0.85em",
        } as React.CSSProperties
      }
    >
      <div className={styles.main}>
        <section className={styles.content}>
          <DemoDownscale
            description="Scroll the left box: billions of rows can be scrolled. But scrolling by 1px skips intermediate rows."
            setClientHeight={setClientHeight}
            setScrollTop={setScrollTop}
            top={top}
            firstVisibleRow={firstVisibleRow}
            lastVisibleRow={lastVisibleRow}
          />
          <Explanation
            canvasHeight={canvasHeight + 2 * wideBorderWidth}
            firstVisibleRow={firstVisibleRow}
            lastVisibleRow={lastVisibleRow}
            scrollTop={scrollTop}
            wrapperTop={top}
          />
        </section>

        <Variables>
          <Variable
            prefix="canvas"
            label="clientHeight"
            value={px(canvasHeight)}
          />
          <Variable
            prefix="table"
            label="clientHeight"
            value={px(tableClientHeight)}
          />
          <Variable prefix="viewport" label="scrollTop" value={px(scrollTop)} />
          <Variable prefix="table" label="style.top" value={px(top)} />
          <Variable
            label="downscale factor"
            value={Math.round(downscaleFactor).toLocaleString("en-US")}
          />
          <Variable
            label="unreachable rows / px"
            value={(
              Math.round(downscaleFactor / rowHeight) - maxRows
            ).toLocaleString("en-US")}
          />
        </Variables>
      </div>
    </div>
  );
}
