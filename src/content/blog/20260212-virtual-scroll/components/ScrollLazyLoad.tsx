"use client";

import { useState } from "react";

import styles from "./common.module.css";

import Demo from "./Demo.tsx";
import Explanation from "./Explanation.tsx";
import Variable from "./Variable.tsx";
import Variables from "./Variables.tsx";

import { numRows, rowHeight, wideBorderWidth } from "./constants.ts";
import { px, row } from "./helpers.ts";

export default function ScrollLazyLoad() {
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const firstVisibleRow = Math.floor(scrollTop / rowHeight);
  const lastVisibleRow = Math.ceil((scrollTop + clientHeight) / rowHeight);

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
            description="Scroll the left box, to see on the right how the cells are loaded lazily."
            setClientHeight={setClientHeight}
            setScrollTop={setScrollTop}
          />
          <Explanation
            scrollTop={scrollTop}
            firstVisibleRow={firstVisibleRow}
            lastVisibleRow={lastVisibleRow}
          />
        </section>

        <Variables>
          <Variable prefix="viewport" label="scrollTop" value={px(scrollTop)} />
          <Variable label="row start" value={row(firstVisibleRow)} />
          <Variable label="row end" value={row(lastVisibleRow)} />
        </Variables>
      </div>
    </div>
  );
}
