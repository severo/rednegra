import { useCallback, useState } from "react";

import styles from "./Demo.module.css";
import stylesDownscaleAndDual from "./DemoDownscaleAndDual.module.css";

import PlayDualButton, { type ScrollTo } from "./PlayDualButton.tsx";
import Legend from "./Legend.tsx";
import Table from "./Table.tsx";

export default function DemoDual({
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
  top: string;
  setScrollHeight?: (value: number) => void;
  setClientHeight?: (value: number) => void;
  setScrollTop?: (value: number) => void;
}) {
  const [scrollTo, createScrollTo] = useState<ScrollTo | undefined>(undefined);

  const onViewportMount = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      const { scrollHeight, clientHeight } = element;
      setScrollHeight?.(scrollHeight);
      setClientHeight?.(clientHeight);
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
          <div className={stylesDownscaleAndDual.tableWrapper} style={{ top }}>
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
        <PlayDualButton scrollTo={scrollTo} duration={5000} />
      </div>
    </div>
  );
}
