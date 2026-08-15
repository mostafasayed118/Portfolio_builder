import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Code, Cpu } from "lucide-react";
import { useBranding } from "@/lib/branding";
import { FloatingIcon } from "./HeroBackground";

function RotatingRing({ reduced }: { reduced?: boolean }) {
  if (reduced) return <div className="absolute -inset-8 rounded-full border-2 border-dashed border-primary/15" />;
  return (
    <motion.div className="absolute -inset-8 rounded-full border-2 border-dashed border-primary/15"
      animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
  );
}

export function AvatarContent({ reduced }: { reduced?: boolean }) {
  const { siteName, tagline, avatarUrl } = useBranding();
  const [imageError, setImageError] = useState(false);
  const initials = siteName
    ? siteName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "MS"
    : "MS";

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    <div className="relative h-56 w-56 md:h-72 md:w-72">
      <RotatingRing reduced={reduced} />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-xl" />
      <div className="relative h-full w-full rounded-3xl glass border border-primary/20 flex items-center justify-center overflow-hidden">
        {avatarUrl && !imageError && (
          <img
            src={avatarUrl}
            alt={`${siteName} profile`}
            className="absolute inset-0 z-10 h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
        <div className="absolute inset-0 z-20 bg-gradient-to-br from-primary/10 to-accent/10" />
        {!avatarUrl || imageError ? (
          <div className="relative z-30 text-center p-6">
            <div className="font-display font-bold text-6xl md:text-7xl text-primary mb-1">{initials}</div>
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{tagline || "Data Engineer"}</div>
          </div>
        ) : null}
      </div>
      <FloatingIcon icon={Code} className="absolute -top-4 -right-4 h-7 w-7 text-primary/40" delay={0} reduced={reduced} />
      <FloatingIcon icon={Cpu} className="absolute -bottom-4 -left-4 h-7 w-7 text-accent/40" delay={1} reduced={reduced} />
    </div>
  );
}
