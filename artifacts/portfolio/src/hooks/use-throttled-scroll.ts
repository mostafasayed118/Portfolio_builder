import { useRef, useEffect } from "react";

export function useThrottledScroll(
  callback: (scrollY: number) => void,
  throttleMs: number = 16,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let lastCall = 0;

    const handler = () => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        callbackRef.current(window.scrollY);
      }
    };

    window.addEventListener("scroll", handler, { passive: true });

    return () => {
      window.removeEventListener("scroll", handler);
    };
  }, [throttleMs]);
}
