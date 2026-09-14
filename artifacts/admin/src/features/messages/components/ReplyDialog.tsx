import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from "@workspace/ui";
import { type Message as Msg } from "../components/MessageCard";

interface ReplyDialogProps {
  replyTo: Msg | null;
  subject: string;
  body: string;
  sending: boolean;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onClose: () => void;
  onSend: () => void;
}

/** Reply composer for the selected message. */
export function ReplyDialog({
  replyTo,
  subject,
  body,
  sending,
  onSubjectChange,
  onBodyChange,
  onClose,
  onSend,
}: ReplyDialogProps) {
  return (
    <Dialog
      open={!!replyTo}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reply to {replyTo?.name}</DialogTitle>
          <DialogDescription>
            Send a reply to this message. If email sending isn't configured, it
            opens your email client instead.
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
          <Button onClick={onSend} disabled={!replyTo || sending || !body.trim()}>
            {sending ? "Sending…" : "Send Reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
