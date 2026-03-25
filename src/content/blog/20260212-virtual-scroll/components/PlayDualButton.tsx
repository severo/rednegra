"use client";

import { useCallback, useRef, useState } from "react";

export type ScrollTo = (top: number) => void;
export default function Button({
  scrollTo,
  duration = 5000,
}: {
  scrollTo?: ScrollTo;
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

    // animation:
    // 1. scroll smoothly during 2 seconds to 100px
    // 2. jump to scrollTop 400px
    // 3. scroll smoothly during 2 seconds as a wave between 400px, 300px and 500px
    // 4. jump to the last scrollTop
    const steps = [
      { from: 0, to: 20, duration: 2000 },
      { from: 100, to: 90, duration: 1500 },
      { from: 90, to: 110, duration: 3000 },
      { from: 50, to: 50, duration: 1000 },
      { from: 90, to: 90, duration: 1000 },
      { from: 120, to: 120, duration: 1000 },
      { from: 0, to: 0, duration: 0 },
    ];

    const maxDuration = steps.reduce((sum, step) => sum + step.duration, 0);

    function getScrollTopAtTime(time: number) {
      let elapsed = 0;
      for (const step of steps) {
        if (time < elapsed + step.duration) {
          const progress = (time - elapsed) / step.duration;
          return step.from + (step.to - step.from) * progress;
        }
        elapsed += step.duration;
      }
      return steps[steps.length - 1].to;
    }

    function animate() {
      const elapsed = performance.now() - startTime;
      const scrollTop = getScrollTopAtTime(elapsed);
      scrollTo?.(scrollTop);
      if (elapsed < maxDuration && animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        animationFrameIdRef.current = null;
      }
    }
    animationFrameIdRef.current = requestAnimationFrame(animate);
  }, [duration, scrollTo]);

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
