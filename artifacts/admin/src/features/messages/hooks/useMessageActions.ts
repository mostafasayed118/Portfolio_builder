import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@workspace/ui";
import { api } from "@/lib/api-client";
import { type Message as Msg } from "@/features/messages/components/MessageCard";
import { isPresetView, type MessageView } from "./useMessageFilters";

interface UseMessageActionsInput {
  selectedIds: Set<string>;
  clearSelection: () => void;
  view: MessageView;
  totalMatching: number;
  closeCleanupDialog: () => void;
  closeRestoreAllDialog: () => void;
}

/**
 * Every mutation the messages screen performs — reply, mark read, archive,
 * restore, bulk operations, and the one-click test-submission cleanup —
 * plus the reply-dialog state those actions drive.
 */
export function useMessageActions({
  selectedIds,
  clearSelection,
  view,
  totalMatching,
  closeCleanupDialog,
  closeRestoreAllDialog,
}: UseMessageActionsInput) {
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

  const invalidateMessages = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["messages"] });
    await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
  }, [queryClient]);

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

  const handleMarkRead = async (msg: Msg) => {
    try {
      if (msg.id) {
        const res = await api.messages.markRead(msg.id);
        if (!res.success) throw new Error(res.message);
        await invalidateMessages();
      }
    } catch (err) {
      fail("Failed to mark as read", err);
    }
  };

  const handleArchive = async (msg: Msg) => {
    try {
      if (!msg.id) return;
      const res = await api.messages.archive(msg.id);
      if (!res.success) throw new Error(res.message);
      await invalidateMessages();
      toast({ title: "Message archived", description: `"${msg.name}" moved to the Archived tab` });
    } catch (err) {
      fail("Failed to archive message", err);
    }
  };

  const handleUnarchive = async (msg: Msg) => {
    try {
      if (!msg.id) return;
      const res = await api.messages.unarchive(msg.id);
      if (!res.success) throw new Error(res.message);
      await invalidateMessages();
      toast({ title: "Message restored", description: `"${msg.name}" is back in the inbox` });
    } catch (err) {
      fail("Failed to unarchive message", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Server-side: marking every unread row in one statement. A client-side
      // loop over the fetched list would only reach the first page (50 rows).
      const res = await api.messages.markAllRead();
      if (!res.success) throw new Error(res.message);
      const marked = (res as { data?: { marked?: number } }).data?.marked ?? 0;
      await invalidateMessages();
      toast({
        title:
          marked > 0
            ? `Marked ${marked} message${marked === 1 ? "" : "s"} as read`
            : "No unread messages",
      });
    } catch (err) {
      fail("Failed to mark all as read", err);
    }
  };

  const handleCleanupTestSubmissions = async () => {
    try {
      const res = await api.messages.archiveTestSubmissions();
      if (!res.success) throw new Error(res.message);
      const archived = (res as { data?: { archived?: number } }).data?.archived ?? 0;
      await invalidateMessages();
      closeCleanupDialog();
      clearSelection();
      toast({
        title:
          archived > 0
            ? `Archived ${archived} test submission${archived === 1 ? "" : "s"}`
            : "No test submissions to archive",
      });
    } catch (err) {
      fail("Failed to archive test submissions", err);
    }
  };

  const handleRestoreAllArchived = async () => {
    try {
      const res = await api.messages.restoreAllArchived();
      if (!res.success) throw new Error(res.message);
      const restored = (res as { data?: { restored?: number } }).data?.restored ?? 0;
      await invalidateMessages();
      closeRestoreAllDialog();
      clearSelection();
      toast({
        title:
          restored > 0
            ? `Restored ${restored} message${restored === 1 ? "" : "s"} to the inbox`
            : "No archived messages to restore",
      });
    } catch (err) {
      fail("Failed to restore archived messages", err);
    }
  };

  const handleBulkArchive = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      // When every row matching the active view is selected, archive via the
      // server-side filter in ONE statement — no giant id payload, so it
      // scales to thousands of rows. A partial selection sends the ids.
      const allMatchingSelected = totalMatching > 0 && selectedIds.size >= totalMatching;
      const viewFilter = allMatchingSelected
        ? isPresetView(view)
          ? { preset: view }
          : view === "unread" || view === "read" || view === "spam"
            ? { status: view }
            : undefined
        : undefined;
      const res = viewFilter
        ? await api.messages.bulkArchive({ filter: viewFilter })
        : await api.messages.bulkArchive({ ids });
      if (!res.success) throw new Error(res.message);
      await invalidateMessages();
      clearSelection();
      toast({
        title: viewFilter
          ? `Archived all ${totalMatching} matching message${totalMatching === 1 ? "" : "s"}`
          : `Archived ${ids.length} message${ids.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      fail("Failed to archive messages", err);
    }
  }, [selectedIds, totalMatching, view, clearSelection, invalidateMessages, fail, toast]);

  const handleBulkUnarchive = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      // When every row matching the Archived view is selected, restore via
      // the server-side filter in ONE statement — no giant id payload, so it
      // scales to thousands of archived rows. A partial selection sends ids.
      const allMatchingSelected = totalMatching > 0 && selectedIds.size >= totalMatching;
      const res = allMatchingSelected
        ? await api.messages.bulkUnarchive({ filter: { status: "archived" } })
        : await api.messages.bulkUnarchive({ ids });
      if (!res.success) throw new Error(res.message);
      await invalidateMessages();
      clearSelection();
      toast({
        title: allMatchingSelected
          ? `Restored all ${totalMatching} matching message${totalMatching === 1 ? "" : "s"}`
          : `Restored ${ids.length} message${ids.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      fail("Failed to restore messages", err);
    }
  }, [selectedIds, totalMatching, clearSelection, invalidateMessages, fail, toast]);

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
    handleMarkRead,
    handleArchive,
    handleUnarchive,
    handleMarkAllRead,
    handleCleanupTestSubmissions,
    handleRestoreAllArchived,
    handleBulkArchive,
    handleBulkUnarchive,
  };
}
