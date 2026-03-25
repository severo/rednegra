import { useCallback } from "react";
import styles from "./Legend.module.css";

export default function Legend({
  showCanvas,
  showFullTable,
  isFullTableVisible,
  setIsFullTableVisible,
}: {
  showCanvas?: boolean;
  showFullTable?: boolean;
  isFullTableVisible?: boolean;
  setIsFullTableVisible?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const toggleButton = useCallback(() => {
    setIsFullTableVisible?.((isFullTableVisible) => !isFullTableVisible);
  }, [setIsFullTableVisible]);

  return (
    <div className={styles.legend}>
      <p className={styles.viewportLegend}>viewport</p>
      {showCanvas && <p className={styles.canvasLegend}>canvas</p>}
      <p className={styles.tableLegend}>table</p>
      {showFullTable && (
        <p className={styles.fullTableLegend}>
          full table
          {isFullTableVisible !== undefined && (
            <button type="button" onClick={toggleButton}>
              {isFullTableVisible ? "Hide" : "Show"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
