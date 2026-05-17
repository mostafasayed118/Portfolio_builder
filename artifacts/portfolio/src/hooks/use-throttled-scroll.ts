import { useRef, useEffect } from "react";

export function useThrottledScroll(
  callback: (scrollY: number) => void,
  throttleMs: number = 16,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let lastCall = 0;
    let rafId: number;

    const handler = () => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        callbackRef.current(window.scrollY);
      }
    };

    const rafHandler = () => {
      handler();
      rafId = requestAnimationFrame(rafHandler);
    };

    rafId = requestAnimationFrame(rafHandler);
    window.addEventListener("scroll", handler, { passive: true });

    return () => {
      window.removeEventListener("scroll", handler);
      cancelAnimationFrame(rafId);
    };
  }, [throttleMs]);
}
