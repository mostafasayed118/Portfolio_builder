import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Textarea,
} from "@workspace/ui";
import type { Message } from "./MessageCard";

interface ReplyDialogProps {
  replyTo: Message | null;
  subject: string;
  body: string;
  onSubjectChange: (s: string) => void;
  onBodyChange: (s: string) => void;
  onSend: () => void;
  onClose: () => void;
}

export function ReplyDialog({
  replyTo,
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  onSend,
  onClose,
}: ReplyDialogProps) {
  return (
    <Dialog open={!!replyTo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reply via email</DialogTitle>
          <DialogDescription>
            Draft a reply and open your email client.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <Input value={replyTo?.email ?? ""} readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Message
            </label>
            <Textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSend} disabled={!replyTo}>
            Open Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
