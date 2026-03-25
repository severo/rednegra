"use client";

import { useState } from "react";

import styles from "./common.module.css";

import Demo from "./Demo.tsx";
import Explanation from "./Explanation.tsx";
import Variable from "./Variable.tsx";
import Variables from "./Variables.tsx";

import { numRows, rowHeight, wideBorderWidth } from "./constants.ts";
import { px } from "./helpers.ts";

export default function ScrollSlice() {
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);
  const [tableClientHeight, setTableClientHeight] = useState(0);
  const [isFullTableVisible, setIsFullTableVisible] = useState(false);

  const firstVisibleRow = Math.floor(scrollTop / rowHeight);
  const lastVisibleRow = Math.min(
    Math.ceil((scrollTop + clientHeight) / rowHeight),
    numRows,
  );
  const wrapperTop = firstVisibleRow * rowHeight;
  const canvasHeight = tableClientHeight + 2 * wideBorderWidth;

  return (
    <div
      className={styles.widget}
      style={
        {
          "--row-height": px(rowHeight),
          "--num-rows": numRows,
          "--wide-border-width": px(wideBorderWidth),
        } as React.CSSProperties
      }
    >
      <div className={styles.main}>
        <section className={styles.content}>
          <Demo
            description="Scroll the left box, and see on the right how only a table slice is rendered."
            setClientHeight={setClientHeight}
            setScrollTop={setScrollTop}
            setTableClientHeight={setTableClientHeight}
            showCanvas={true}
            showFullTable={true}
            isFullTableVisible={isFullTableVisible}
            setIsFullTableVisible={setIsFullTableVisible}
          />
          <Explanation
            canvasHeight={canvasHeight}
            firstVisibleRow={firstVisibleRow}
            lastVisibleRow={lastVisibleRow}
            scrollTop={scrollTop}
            wrapperTop={wrapperTop}
            isFullTableVisible={isFullTableVisible}
          />
        </section>

        <Variables>
          <Variable
            prefix="canvas"
            label="clientHeight"
            value={px(canvasHeight)}
          />
          <Variable prefix="viewport" label="scrollTop" value={px(scrollTop)} />
          <Variable
            prefix="table"
            label="clientHeight"
            value={px(tableClientHeight)}
          />
          <Variable prefix="table" label="style.top" value={px(wrapperTop)} />
          <Variable
            label="pixels above"
            value={px(scrollTop - firstVisibleRow * rowHeight)}
          />
        </Variables>
      </div>
    </div>
  );
}
