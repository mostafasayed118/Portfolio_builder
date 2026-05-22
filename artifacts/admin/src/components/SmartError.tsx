import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Card, CardContent } from "@workspace/ui";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SmartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error("[SmartErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="m-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" aria-hidden="true" />
              <h2 className="text-xl font-semibold">
                {this.props.title ?? "Something went wrong"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message ?? "An unexpected error occurred"}
              </p>
              {this.props.showRetry !== false && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={this.handleRetry} variant="default">
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline"
                  >
                    Reload Page
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export function useErrorHandler() {
  const handleError = (error: Error) => {
    console.error("[ErrorHandler]", error.message);
  };

  return { handleError };
}