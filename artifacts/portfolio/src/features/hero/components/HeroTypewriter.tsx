import { useTypewriter } from "@/hooks/use-typewriter";

export function HeroTypewriter({ texts, fallback }: { texts: string[]; fallback?: string }) {
  const effectiveTexts = texts.length > 0 ? texts : (fallback ? [fallback] : []);
  const role = useTypewriter(effectiveTexts, { typingSpeed: 70, deletingSpeed: 40, pauseMs: 2000 });
  return (
    <span className="text-primary">
      {role}
      <span className="typewriter-cursor" aria-hidden />
    </span>
  );
}
