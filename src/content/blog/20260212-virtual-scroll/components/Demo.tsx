import { useCallback, useState } from "react";

import styles from "./Demo.module.css";

import PlayButton, { type OnProgress } from "./PlayButton.tsx";
import Legend from "./Legend";
import Table from "./Table.tsx";

export default function Demo({
  description,
  isFullTableVisible,
  showCanvas,
  showFullTable,
  setScrollHeight,
  setClientHeight,
  setScrollTop,
  setTableClientHeight,
  setIsFullTableVisible,
}: {
  description: string;
  isFullTableVisible?: boolean;
  showCanvas?: boolean;
  showFullTable?: boolean;
  setScrollHeight?: (value: number) => void;
  setClientHeight?: (value: number) => void;
  setScrollTop?: (value: number) => void;
  setTableClientHeight?: (value: number) => void;
  setIsFullTableVisible?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [onProgress, createOnProgress] = useState<OnProgress | undefined>(
    undefined,
  );

  const onViewportMount = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      const { scrollHeight, clientHeight } = element;
      setScrollHeight?.(scrollHeight);
      setClientHeight?.(clientHeight);
      createOnProgress(() => (progress: number) => {
        element.scrollTo({ top: progress * (scrollHeight - clientHeight) });
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
      <Legend
        showCanvas={showCanvas}
        showFullTable={showFullTable}
        isFullTableVisible={isFullTableVisible}
        setIsFullTableVisible={setIsFullTableVisible}
      />
      <div
        className={styles.viewport}
        ref={onViewportMount}
        onScroll={onViewportScroll}
      >
        <div className={styles.backgroundElement}>
          <Table setTableClientHeight={setTableClientHeight} />
        </div>
      </div>
      <div className={styles.textDescription}>
        <p>{description}</p>
        <PlayButton onProgress={onProgress} duration={5000} />
      </div>
    </div>
  );
}
