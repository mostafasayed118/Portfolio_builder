import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Mail, 
  Trash2, 
  Check, 
  CheckCheck, 
  MailOpen,
  Loader2,
  AlertCircle,
  Inbox
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import EmptyState from "@/components/EmptyState";
import { getSupabase } from "@/lib/supabase-provider";
import { 
  ContactMessage,
  listContactMessages,
  markContactMessageRead,
  markContactMessageUnread,
  deleteContactMessage,
  bulkDeleteContactMessages 
} from "@workspace/db/contact-messages";

type FilterType = "all" | "unread" | "read";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  }) + " · " + date.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  });
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
    </TableRow>
  );
}

interface MessageRowProps {
  message: ContactMessage;
  isExpanded: boolean;
  onExpand: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
}

function MessageRow({ 
  message, 
  isExpanded, 
  onExpand, 
  onMarkRead, 
  onMarkUnread,
  onDelete,
  isSelected,
  onSelect 
}: MessageRowProps) {
  return (
    <>
      <TableRow 
        className={`
          cursor-pointer transition-colors
          ${!message.is_read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"}
          ${isExpanded ? "bg-muted" : ""}
        `}
        onClick={onExpand}
      >
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={onSelect}
          />
        </TableCell>
        <TableCell className="font-medium">
          {message.name}
        </TableCell>
        <TableCell className="text-muted-foreground hidden md:table-cell">
          {message.email}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <span className="truncate max-w-[200px] block">
            {message.subject || "(No subject)"}
          </span>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {formatDate(message.created_at)}
        </TableCell>
        <TableCell>
          <Badge variant={message.is_read ? "secondary" : "default"}>
            {message.is_read ? "Read" : "Unread"}
          </Badge>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {message.is_read ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={onMarkUnread}
                title="Mark as unread"
              >
                <MailOpen className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={onMarkRead}
                title="Mark as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-4">
            <div className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    From: <a href={`mailto:${message.email}`} className="text-primary hover:underline">
                      {message.name} &lt;{message.email}&gt;
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Subject: {message.subject || "(No subject)"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(message.created_at)}
                  </p>
                </div>
              </div>
              <div className="border-t pt-3 mb-3">
                <p className="whitespace-pre-wrap text-sm">{message.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  asChild
                >
                  <a href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject || "")}`}>
                    <Mail className="h-4 w-4" />
                    Reply via Email
                  </a>
                </Button>
                {!message.is_read && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={onMarkRead}
                  >
                    <Check className="h-4 w-4" />
                    Mark as Read
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function MessagesViewer() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: messages, isLoading, error } = useQuery<ContactMessage[]>({
    queryKey: ["admin", "messages"],
    queryFn: async () => {
      const supabase = getSupabase();
      return listContactMessages(supabase);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      await markContactMessageRead(supabase, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "unread-count"] });
      toast.success("Message marked as read");
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      await markContactMessageUnread(supabase, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "unread-count"] });
      toast.success("Message marked as unread");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      await deleteContactMessage(supabase, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "unread-count"] });
      toast.success("Message deleted");
      setDeleteId(null);
      setDeleteDialogOpen(false);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const supabase = getSupabase();
      await bulkDeleteContactMessages(supabase, ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "unread-count"] });
      toast.success("Messages deleted");
      setSelectedIds(new Set());
    },
  });

  const filteredMessages = messages?.filter(msg => {
    if (filter === "unread") return !msg.is_read;
    if (filter === "read") return msg.is_read;
    return true;
  }) ?? [];

  const unreadCount = messages?.filter(m => !m.is_read).length ?? 0;
  const readCount = messages?.filter(m => m.is_read).length ?? 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredMessages.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setTimeout(() => {
        const supabase = getSupabase();
        const msg = messages?.find(m => m.id === id);
        if (msg && !msg.is_read) {
          markContactMessageRead(supabase, id);
          queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "unread-count"] });
        }
      }, 1000);
    }
  };

  const handleSingleDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const allSelected = filteredMessages.length > 0 && 
    filteredMessages.every(m => selectedIds.has(m.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Messages</h1>
          <p className="text-muted-foreground text-sm">
            Manage contact form submissions
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-1"
            onClick={confirmBulkDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
        <TabsList>
          <TabsTrigger value="all">
            All {messages ? `(${messages.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({readCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Failed to load messages</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Skeleton className="h-4 w-4" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableHead>
                <TableHead className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(7)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filteredMessages.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Inbox}
              title={filter === "all" ? "No messages yet" : `No ${filter} messages`}
              description={
                filter === "all"
                  ? "Contact form submissions will appear here."
                  : filter === "unread"
                    ? "All messages have been read."
                    : "No messages have been marked as read yet."
              }
              compact
            />
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  isExpanded={expandedId === message.id}
                  onExpand={() => handleExpand(message.id)}
                  onMarkRead={() => markReadMutation.mutate(message.id)}
                  onMarkUnread={() => markUnreadMutation.mutate(message.id)}
                  onDelete={() => handleSingleDelete(message.id)}
                  isSelected={selectedIds.has(message.id)}
                  onSelect={(checked) => handleSelect(message.id, checked)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              {deleteId 
                ? "This message will be permanently deleted. This cannot be undone."
                : `Delete ${selectedIds.size} messages? This cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteId ? confirmDelete : confirmBulkDelete}
              disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}
            >
              {deleteMutation.isPending || bulkDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}