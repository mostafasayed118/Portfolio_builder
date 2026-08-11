import { motion } from "framer-motion";

export function FloatingIcon({ icon: Icon, className, delay = 0, reduced }: { icon: React.ElementType; className: string; delay?: number; reduced?: boolean }) {
  if (reduced) return <div className={className}><Icon className="h-full w-full" /></div>;
  return (
    <motion.div className={className} animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}>
      <Icon className="h-full w-full" />
    </motion.div>
  );
}

export function BackgroundOrbs({ reduced }: { reduced?: boolean }) {
  if (reduced) return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
    </div>
  );
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <motion.div animate={{ x: [0, 30, 0, -20, 0], y: [0, -20, 30, 10, 0], scale: [1, 1.1, 0.95, 1.05, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <motion.div animate={{ x: [0, -25, 15, 0], y: [0, 20, -15, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
      <motion.div animate={{ x: [0, 15, -10, 0], y: [0, -10, 20, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-2xl" />
    </div>
  );
}
