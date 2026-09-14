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

  const phaseRef = useRef(phase);
  const textIndexRef = useRef(textIndex);
  const charIndexRef = useRef(charIndex);
  phaseRef.current = phase;
  textIndexRef.current = textIndex;
  charIndexRef.current = charIndex;

  useEffect(() => {
    if (!texts.length) return;

    const tick = (now: number) => {
      const elapsed = now - lastTimeRef.current;
      const delay =
        phaseRef.current === "pausing" ? pauseMs : phaseRef.current === "typing" ? typingSpeed : deletingSpeed;

      if (elapsed < delay) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTimeRef.current = now;

      const currentText = texts[textIndexRef.current];

      if (phaseRef.current === "typing") {
        if (charIndexRef.current < currentText.length) {
          setDisplayed(currentText.slice(0, charIndexRef.current + 1));
          setCharIndex((c) => c + 1);
        } else {
          setPhase("pausing");
        }
      } else if (phaseRef.current === "pausing") {
        setPhase("deleting");
      } else {
        if (charIndexRef.current > 0) {
          setDisplayed(currentText.slice(0, charIndexRef.current - 1));
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
  }, [texts, typingSpeed, deletingSpeed, pauseMs]);

  return displayed;
}
