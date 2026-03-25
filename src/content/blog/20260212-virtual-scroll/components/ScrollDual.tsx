"use client";

import { useCallback, useReducer, useState } from "react";

import styles from "./common.module.css";

import DemoDual from "./DemoDual.tsx";
import Explanation from "./Explanation.tsx";
import Variable from "./Variable.tsx";
import Variables from "./Variables.tsx";

import { rowHeight, wideBorderWidth } from "./constants.ts";
import { px } from "./helpers.ts";

const numRows = 10_000_000_000;
const canvasHeight = 300;

interface State {
  globalAnchor: number;
  localOffset: number;
  scrollTop: number;
}

const initialState: State = {
  globalAnchor: 0,
  localOffset: 0,
  scrollTop: 0,
};

function reducer(
  state: State,
  action: { type: "scroll"; scrollTop: number; maxScrollTop: number },
): State {
  if (action.type === "scroll") {
    const { scrollTop, maxScrollTop } = action;
    const delta = scrollTop - state.scrollTop;
    if (Math.abs(delta) > 30 || scrollTop === 0 || scrollTop === maxScrollTop) {
      // global scroll
      return { globalAnchor: scrollTop, localOffset: 0, scrollTop };
    } else {
      // local scroll
      return { ...state, localOffset: state.localOffset + delta, scrollTop };
    }
  }
  throw new Error("Unknown action type");
}

export default function ScrollDownscale() {
  const [clientHeight, setClientHeight] = useState(0);
  const [state, dispatch] = useReducer(reducer, initialState);

  const maxScrollTop = canvasHeight - clientHeight;
  const scrollTop = Math.min(Math.max(state.scrollTop, 0), maxScrollTop);

  const onScrollTopChange = useCallback(
    (scrollTop: number) => {
      dispatch({ type: "scroll", scrollTop, maxScrollTop });
    },
    [maxScrollTop],
  );

  const fullTableHeight = numRows * rowHeight;
  const downscaleFactor =
    fullTableHeight <= canvasHeight
      ? 1
      : (fullTableHeight - clientHeight) / (canvasHeight - clientHeight);
  const virtualScrollTop =
    state.globalAnchor * downscaleFactor + state.localOffset;
  const maxRows = Math.ceil(clientHeight / rowHeight);
  const firstVisibleRow = Math.max(
    0,
    Math.min(numRows - 1, Math.floor(virtualScrollTop / rowHeight)),
  );
  const lastVisibleRow = Math.max(
    firstVisibleRow + 1,
    Math.min(
      numRows,
      firstVisibleRow + maxRows,
      Math.ceil((virtualScrollTop + clientHeight) / rowHeight),
    ),
  );
  const hiddenPixelsBefore = virtualScrollTop - firstVisibleRow * rowHeight;
  const top =
    scrollTop === maxScrollTop
      ? Math.round(canvasHeight - maxRows * rowHeight)
      : Math.round(scrollTop - hiddenPixelsBefore);
  const tableClientHeight = (lastVisibleRow - firstVisibleRow) * rowHeight + 1;
  /* ^ +1 for the bottom border - hardcoded for simplicity */

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
        } as React.CSSProperties
      }
    >
      <div className={styles.main}>
        <section className={styles.content}>
          <DemoDual
            description="Scroll the left box: small step for local scroll, large step for global scroll."
            setClientHeight={setClientHeight}
            setScrollTop={onScrollTopChange}
            top={px(top)}
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
          <Variable label="global anchor" value={px(state.globalAnchor)} />
          <Variable label="local offset" value={px(state.localOffset)} />
          <Variable prefix="table" label="style.top" value={px(top)} />
        </Variables>
      </div>
    </div>
  );
}
