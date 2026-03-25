"use client";

import { useState } from "react";

import styles from "./common.module.css";

import Demo from "./Demo.tsx";
import Explanation from "./Explanation.tsx";
import Variable from "./Variable.tsx";
import Variables from "./Variables.tsx";

import { numRows, rowHeight, wideBorderWidth } from "./constants.ts";
import { px } from "./helpers.ts";

export default function ScrollNative() {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);
  const [tableClientHeight, setTableClientHeight] = useState(0);

  const firstVisiblePixel = scrollTop;
  const lastVisiblePixel = scrollTop + clientHeight;

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
            description="Scroll the left box to see how the right box mimics the scrolling effect."
            setScrollHeight={setScrollHeight}
            setClientHeight={setClientHeight}
            setScrollTop={setScrollTop}
            setTableClientHeight={setTableClientHeight}
          />
          <Explanation scrollTop={scrollTop} />
        </section>

        <Variables>
          <Variable
            prefix="viewport"
            label="clientHeight"
            value={px(clientHeight)}
          />
          <Variable
            prefix="viewport"
            label="scrollHeight"
            value={px(scrollHeight)}
          />
          <Variable
            prefix="table"
            label="clientHeight"
            value={px(tableClientHeight)}
          />
          <Variable prefix="viewport" label="scrollTop" value={px(scrollTop)} />
          <Variable label="first visible pixel" value={px(firstVisiblePixel)} />
          <Variable label="last visible pixel" value={px(lastVisiblePixel)} />
        </Variables>
      </div>
    </div>
  );
}
