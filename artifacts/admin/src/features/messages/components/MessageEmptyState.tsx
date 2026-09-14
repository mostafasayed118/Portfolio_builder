import { Mail } from "lucide-react";
import { Card, CardContent } from "@workspace/ui";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { type Message as Msg } from "../components/MessageCard";

interface MessageEmptyStateProps {
  /** The full All-view list — distinguishes "nothing at all" from "this filter". */
  allMessages: Msg[] | undefined;
}

/** Shown when the active view has no rows. */
export function MessageEmptyState({ allMessages }: MessageEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        {allMessages?.length === 0 ? (
          <SmartEmptyState type="messages" />
        ) : (
          <>
            <Mail size={32} className="mx-auto mb-3 opacity-30" />
            <div className="text-sm">No messages match this filter.</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
