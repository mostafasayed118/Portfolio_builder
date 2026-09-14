import { useCallback, useState } from "react";
import { SHORTCUTS_OPENED_EVENT } from "@/components/ShortcutsDialog";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { type Message as Msg } from "@/features/messages/components/MessageCard";
import { MessageFilterBar } from "@/features/messages/components/MessageFilterBar";
import { MessagePresetBar } from "@/features/messages/components/MessagePresetBar";
import { MessagePagination } from "@/features/messages/components/MessagePagination";
import { MessageList } from "@/features/messages/components/MessageList";
import { MessageEmptyState } from "@/features/messages/components/MessageEmptyState";
import { MessageSelectionToolbar } from "@/features/messages/components/MessageSelectionToolbar";
import { MessageConfirmDialogs } from "@/features/messages/components/MessageConfirmDialogs";
import { MessagesHeader } from "@/features/messages/components/MessagesHeader";
import { ReplyDialog } from "@/features/messages/components/ReplyDialog";
import { useMessageActions } from "@/features/messages/hooks/useMessageActions";
import { useMessageFilters, type MessageView } from "@/features/messages/hooks/useMessageFilters";
import { useMessageSelection } from "@/features/messages/hooks/useMessageSelection";
import { useMessageShortcuts } from "@/features/messages/hooks/useMessageShortcuts";
import { useAllMessages } from "@/lib/use-entity-query";

/** Thin composition shell: wires the messages hooks to the child components. */
export default function MessagesManager() {
  // The All view: always fetched, drives the header/chip counts and the
  // default tab. Kept separate from the filtered fetch so switching chips
  // never recomputes counts from a filtered page. Fetches EVERY visible
  // row (batched at 200) so the total is real, not the first 50-row page.
  const { data: messages, isLoading: allLoading, isError, error, refetch } = useAllMessages();
  const allMsgs = messages as Msg[] | undefined;

  const {
    view, activePreset, msgs, isLoading, unread,
    readCount, archivedCount, spamCount, totalMatching, allMatchingIds,
    page, setPage, pageSize, setPageSize, paginatedMessages,
    changeView: changeFilterView,
  } = useMessageFilters({ allMessages: allMsgs, allLoading });

  const {
    selectedIds, focusedId, pageIds, allPageSelected, selectAllRef, toggleSelectAllOnPage,
    clearSelection, canSelectAllMatching, selectAllMatching, toggleSelect, navigate,
  } = useMessageSelection({ pageMessages: paginatedMessages, allMatchingIds, totalMatching });

  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showRestoreAllDialog, setShowRestoreAllDialog] = useState(false);

  const actions = useMessageActions({
    selectedIds, clearSelection, view, totalMatching,
    closeCleanupDialog: () => setShowCleanupDialog(false),
    closeRestoreAllDialog: () => setShowRestoreAllDialog(false),
  });

  // The keyboard-shortcuts help is global now: the `?` / `Shift+?` keys and
  // the modal live in the shell (ShortcutsHelp), so the header icon below
  // only needs to request it via the shared event.
  const openShortcuts = useCallback(() => {
    window.dispatchEvent(new Event(SHORTCUTS_OPENED_EVENT));
  }, []);

  // Switching the active chip/preset also clears the selection.
  const changeView = useCallback((v: MessageView) => {
    changeFilterView(v);
    clearSelection();
  }, [changeFilterView, clearSelection]);

  const dialogsOpen = !!actions.replyTo || showCleanupDialog || showRestoreAllDialog;

  useMessageShortcuts({
    enabled: !dialogsOpen, view, msgs, allPageSelected, pageIds, selectedIds,
    focusedId,
    onToggleSelectAllOnPage: toggleSelectAllOnPage,
    onToggleSelect: toggleSelect,
    onReply: actions.openReply,
    onNavigate: navigate,
    onBulkArchive: actions.handleBulkArchive,
    onBulkUnarchive: actions.handleBulkUnarchive,
  });

  if (isLoading) return <AdminLoadingState />;

  if (isError) {
    return <AdminErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <>
    <div className="max-w-3xl mx-auto space-y-6">
      <MessagesHeader
        unread={unread ?? 0}
        totalMessages={allMsgs?.length ?? 0}
        isArchivedView={view === "archived"}
        onMarkAllRead={actions.handleMarkAllRead}
        onRestoreAll={() => setShowRestoreAllDialog(true)}
        onArchiveTestSubmissions={() => setShowCleanupDialog(true)}
        onOpenShortcuts={openShortcuts}
      />

      {msgs && msgs.length > 0 && (
        <MessageSelectionToolbar
          selectAllRef={selectAllRef}
          allPageSelected={allPageSelected}
          onToggleSelectAll={toggleSelectAllOnPage}
          selectedCount={selectedIds.size}
          canSelectAllMatching={canSelectAllMatching}
          totalMatching={totalMatching}
          onSelectAllMatching={selectAllMatching}
          isArchivedView={view === "archived"}
          onBulkArchive={actions.handleBulkArchive}
          onBulkUnarchive={actions.handleBulkUnarchive}
          onClear={clearSelection}
        />
      )}

      <MessagePresetBar active={activePreset} onSelect={(p) => changeView(p)} />

      <MessageFilterBar
        filter={view}
        setFilter={(f) => changeView(f as MessageView)}
        totalCount={msgs?.length ?? 0}
        unreadCount={unread ?? 0}
        readCount={readCount}
        archivedCount={archivedCount}
        spamCount={spamCount}
      />

      {msgs && msgs.length === 0 && <MessageEmptyState allMessages={allMsgs} />}

      <MessageList
        messages={paginatedMessages}
        focusedId={focusedId}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onReply={actions.openReply}
        onMarkRead={actions.handleMarkRead}
        onArchive={actions.handleArchive}
        onUnarchive={actions.handleUnarchive}
      />

      {msgs && msgs.length > pageSize && (
        <MessagePagination
          filteredCount={msgs.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <ReplyDialog
        replyTo={actions.replyTo}
        subject={actions.subject}
        body={actions.body}
        sending={actions.sendingReply}
        onSubjectChange={actions.setSubject}
        onBodyChange={actions.setBody}
        onClose={actions.closeReply}
        onSend={actions.sendReply}
      />
    </div>

    <MessageConfirmDialogs
      cleanupOpen={showCleanupDialog}
      restoreOpen={showRestoreAllDialog}
      onCleanup={actions.handleCleanupTestSubmissions}
      onCleanupClose={() => setShowCleanupDialog(false)}
      onRestore={actions.handleRestoreAllArchived}
      onRestoreClose={() => setShowRestoreAllDialog(false)}
    />
    </>
  );
}
