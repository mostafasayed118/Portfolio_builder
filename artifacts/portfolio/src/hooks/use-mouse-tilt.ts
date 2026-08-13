import { useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";

type MouseHandlers = {
  onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
};

export function useMouseTilt(intensity = 15): {
  ref: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties | { rotateX: any; rotateY: any; scale: any; transformStyle: "preserve-3d"; perspective: number };
} & MouseHandlers {
  const ref = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };
  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [intensity, -intensity]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-intensity, intensity]),
    springConfig,
  );
  const scale = useSpring(1, { damping: 20, stiffness: 200 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced) return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    },
    [reduced, mouseX, mouseY],
  );

  const onMouseEnter = useCallback(() => {
    if (!reduced) scale.set(1.05);
  }, [reduced, scale]);

  const onMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    scale.set(1);
  }, [mouseX, mouseY, scale]);

  // When the user prefers reduced motion, return no handlers at all.
  // The hook's return type marks these as optional, so `undefined` is
  // valid without an `as unknown as` cast.
  if (reduced) {
    return {
      ref,
      style: {},
      onMouseMove: undefined,
      onMouseEnter: undefined,
      onMouseLeave: undefined,
    };
  }

  return {
    ref,
    style: {
      rotateX,
      rotateY,
      scale,
      transformStyle: "preserve-3d" as const,
      perspective: 1000,
    },
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
  };
}
