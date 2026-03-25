"use client";

import { useCallback, useRef, useState } from "react";

export type OnProgress = (progress: number) => void;
export default function Button({
  onProgress,
  duration = 5000,
}: {
  onProgress?: OnProgress;
  duration: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameIdRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, []);
  const start = useCallback(() => {
    setIsPlaying(true);
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      onProgress?.(progress);
      if (progress < 1 && animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        animationFrameIdRef.current = null;
      }
    }
    animationFrameIdRef.current = requestAnimationFrame(animate);
  }, [duration, onProgress]);

  const onClick = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  return (
    <button type="button" className="play" onClick={onClick}>
      {isPlaying ? "Stop" : "Play"}
    </button>
  );
}
