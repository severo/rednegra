import { useCallback } from "react";

import styles from "./Table.module.css";

const defaultNumberOfRows = 10;

export default function Table({
  numberOfRows = defaultNumberOfRows,
  firstRow = 0,
  firstVisibleRow = firstRow,
  full = false,
  lastVisibleRow = numberOfRows + firstRow,
  setTableClientHeight,
}: {
  numberOfRows?: number;
  firstRow?: number;
  firstVisibleRow?: number;
  full?: boolean;
  lastVisibleRow?: number;
  setTableClientHeight?: (value: number) => void;
} = {}) {
  const onMount = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      // TODO(SL): why is it called on every scroll?
      setTableClientHeight?.(element.clientHeight);
    }
  }, []);

  return (
    <table className={full ? styles.fullTable : styles.table} ref={onMount}>
      <tbody>
        {[...Array(isNaN(numberOfRows) ? 0 : numberOfRows)].map((_, index) => {
          const rowIndex = index + firstRow;
          return (
            <tr key={rowIndex}>
              <td>
                {rowIndex < firstVisibleRow || rowIndex >= lastVisibleRow
                  ? ""
                  : `row ${rowIndex.toLocaleString("en-US")}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
