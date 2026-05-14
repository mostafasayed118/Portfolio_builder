import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="text-6xl font-bold text-muted-foreground/30">404</div>
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <p className="text-muted-foreground">This page doesn't exist in the CMS.</p>
      <Link href="/" className="text-primary hover:underline text-sm">← Back to Overview</Link>
    </div>
  );
}
