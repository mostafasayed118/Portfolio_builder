import { useState, useEffect, useRef } from "react";

interface TypewriterOptions {
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseMs?: number;
}

export function useTypewriter(
  texts: string[],
  { typingSpeed = 70, deletingSpeed = 40, pauseMs = 2000 }: TypewriterOptions = {}
): string {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!texts.length) return;

    const tick = (now: number) => {
      const elapsed = now - lastTimeRef.current;
      const delay =
        phase === "pausing" ? pauseMs : phase === "typing" ? typingSpeed : deletingSpeed;

      if (elapsed < delay) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTimeRef.current = now;

      const currentText = texts[textIndex];

      if (phase === "typing") {
        if (charIndex < currentText.length) {
          setDisplayed(currentText.slice(0, charIndex + 1));
          setCharIndex((c) => c + 1);
        } else {
          setPhase("pausing");
        }
      } else if (phase === "pausing") {
        setPhase("deleting");
      } else {
        if (charIndex > 0) {
          setDisplayed(currentText.slice(0, charIndex - 1));
          setCharIndex((c) => c - 1);
        } else {
          setTextIndex((i) => (i + 1) % texts.length);
          setPhase("typing");
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [texts, phase, textIndex, charIndex, typingSpeed, deletingSpeed, pauseMs]);

  return displayed;
}
