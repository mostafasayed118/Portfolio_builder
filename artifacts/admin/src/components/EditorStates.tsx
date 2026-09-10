import { Button, Card, CardContent } from "@workspace/ui";
import { SkeletonForm, SkeletonPreview } from "./EditorSkeletons";

interface EditorLoadingStateProps {
  title: string;
}

export function EditorLoadingState({ title }: EditorLoadingStateProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonForm />
        <SkeletonPreview />
      </div>
    </div>
  );
}

interface EditorErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function EditorErrorState({ message, onRetry }: EditorErrorStateProps) {
  return (
    <Card className="border-destructive">
      <CardContent className="py-6">
        <p className="text-destructive">{message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 min-h-[44px]"
        >
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
