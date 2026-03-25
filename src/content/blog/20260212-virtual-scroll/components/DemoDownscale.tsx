import { useCallback, useState } from "react";

import styles from "./Demo.module.css";
import stylesDownscaleAndDual from "./DemoDownscaleAndDual.module.css";

import PlayButton, { type OnProgress } from "./PlayButton.tsx";
import Legend from "./Legend.tsx";
import Table from "./Table.tsx";

import { px } from "./helpers.ts";

export default function DemoDownscale({
  description,
  firstVisibleRow,
  lastVisibleRow,
  top,
  setScrollHeight,
  setClientHeight,
  setScrollTop,
}: {
  description: string;
  firstVisibleRow: number;
  lastVisibleRow: number;
  top: number;
  setScrollHeight?: (value: number) => void;
  setClientHeight?: (value: number) => void;
  setScrollTop?: (value: number) => void;
}) {
  const [onProgress, createOnProgress] = useState<OnProgress | undefined>(
    undefined,
  );
  const [scrollTo, createScrollTo] = useState<
    ((top: number) => void) | undefined
  >(undefined);

  const onViewportMount = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      const { scrollHeight, clientHeight } = element;
      setScrollHeight?.(scrollHeight);
      setClientHeight?.(clientHeight);
      createOnProgress(() => (progress: number) => {
        element.scrollTo({ top: progress * (scrollHeight - clientHeight) });
      });
      createScrollTo(() => (top: number) => {
        element.scrollTo({ top });
      });
    }
  }, []);

  const onViewportScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop?.(event.currentTarget.scrollTop);
    },
    [],
  );

  return (
    <div className={styles.demo}>
      <Legend showCanvas={true} />
      <div
        className={styles.viewport}
        ref={onViewportMount}
        onScroll={onViewportScroll}
      >
        <div className={stylesDownscaleAndDual.backgroundElement}>
          <div
            className={stylesDownscaleAndDual.tableWrapper}
            style={{ top: px(top) }}
          >
            <Table
              firstRow={firstVisibleRow}
              firstVisibleRow={firstVisibleRow}
              lastVisibleRow={lastVisibleRow}
              numberOfRows={lastVisibleRow - firstVisibleRow}
            />
          </div>
        </div>
      </div>
      <div className={styles.textDescription}>
        <p>{description}</p>
        <ScrollToButton scrollTop={0} scrollTo={scrollTo} />
        <ScrollToButton scrollTop={1} scrollTo={scrollTo} />
        <ScrollToButton scrollTop={2} scrollTo={scrollTo} />
        <PlayButton onProgress={onProgress} duration={5000} />
      </div>
    </div>
  );
}

function ScrollToButton({
  scrollTop,
  scrollTo,
}: {
  scrollTop: number;
  scrollTo?: (top: number) => void;
}) {
  const onClick = useCallback(() => {
    if (scrollTo) {
      scrollTo(scrollTop);
    }
  }, [scrollTop, scrollTo]);

  return (
    <button type="button" onClick={onClick}>
      scrollTop: {scrollTop}px
    </button>
  );
}
