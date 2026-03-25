import styles from "./Explanation.module.css";

import { px } from "./helpers.ts";

import Table from "./Table.tsx";

export default function Explanation({
  canvasHeight,
  firstVisibleRow,
  isFullTableVisible,
  lastVisibleRow,
  scrollTop,
  wrapperTop,
}: {
  canvasHeight?: number;
  firstVisibleRow?: number;
  isFullTableVisible?: boolean;
  lastVisibleRow?: number;
  scrollTop?: number;
  wrapperTop?: number;
}) {
  const showWrapper =
    firstVisibleRow !== undefined &&
    lastVisibleRow !== undefined &&
    wrapperTop !== undefined &&
    canvasHeight !== undefined;
  const scrollTopPx = scrollTop !== undefined ? px(-scrollTop) : "0px";
  return (
    <div className={styles.explanation}>
      <div
        className={styles.backgroundElement}
        style={{ transform: `translateY(${scrollTopPx})` }}
      >
        {showWrapper ? (
          <>
            {isFullTableVisible && <Table full={true} />}
            <div className={styles.wrapper} style={{ top: px(wrapperTop) }}>
              <Table
                firstRow={firstVisibleRow}
                numberOfRows={lastVisibleRow - firstVisibleRow}
              />
            </div>
          </>
        ) : (
          <Table
            firstVisibleRow={firstVisibleRow}
            lastVisibleRow={lastVisibleRow}
          />
        )}
      </div>
      {showWrapper && (
        <div className={styles.canvasWrapper}>
          <div
            className={styles.canvas}
            style={{
              height: px(canvasHeight),
              top: scrollTopPx,
            }}
          />
        </div>
      )}
      <div className={styles.viewport} />
    </div>
  );
}
