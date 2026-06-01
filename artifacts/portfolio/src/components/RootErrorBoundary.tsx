import React from "react";
import { logError } from "@/lib/logger";

export class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError("RootErrorBoundary caught error", error, "RootErrorBoundary");
    if (import.meta.env.DEV) {
      console.error("[RootErrorBoundary] Component stack:", errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background text-foreground">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
