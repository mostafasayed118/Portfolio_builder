import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@workspace/ui";
import { api } from "@/lib/api-client";
import { type Message as Msg } from "@/features/messages/components/MessageCard";

/**
 * Reply-dialog state and the send mutation. The fire-and-forget cache
 * invalidations after a successful send mirror the original manager code
 * (the dialog closes and the toast fires without waiting on the refetch).
 */
export function useMessageReply() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fail = useCallback(
    (title: string, err: unknown) => {
      toast({
        title,
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
    [toast],
  );

  const openReply = useCallback((msg: Msg) => {
    setReplyTo(msg);
    setSubject(`Re: ${msg.name}`);
    setBody(`Hi ${msg.name},\n\nThanks for reaching out.\n\n`);
  }, []);

  const closeReply = useCallback(() => setReplyTo(null), []);

  const sendReply = async () => {
    if (!replyTo) return;
    if (!body.trim()) {
      toast({ title: "Reply message is required", variant: "destructive" });
      return;
    }
    setSendingReply(true);
    try {
      let sent = false;
      if (replyTo.id) {
        const res = await api.messages.reply(replyTo.id, body);
        sent = (res as { sent?: boolean }).sent === true;
        if (!res.success) throw new Error(res.message);
        await api.messages.markRead(replyTo.id).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      }

      if (sent) {
        setReplyTo(null);
        setBody("");
        toast({ title: "Reply sent", description: `Replied to ${replyTo.email}` });
      } else {
        // Email delivery not configured — fall back to the user's mail client.
        const mailto = `mailto:${replyTo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        setReplyTo(null);
        setBody("");
        toast({ title: "Reply opened in email app (sending not configured)" });
      }
    } catch (err) {
      fail("Failed to send reply", err);
    } finally {
      setSendingReply(false);
    }
  };

  return {
    replyTo,
    subject,
    setSubject,
    body,
    setBody,
    sendingReply,
    openReply,
    closeReply,
    sendReply,
  };
}
