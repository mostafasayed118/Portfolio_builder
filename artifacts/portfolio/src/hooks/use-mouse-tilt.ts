import { useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";

export function useMouseTilt(intensity = 15) {
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

  if (reduced) {
    return {
      ref,
      style: {} as React.CSSProperties,
      onMouseMove: undefined as unknown as React.MouseEventHandler<HTMLDivElement>,
      onMouseEnter: undefined as unknown as React.MouseEventHandler<HTMLDivElement>,
      onMouseLeave: undefined as unknown as React.MouseEventHandler<HTMLDivElement>,
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
