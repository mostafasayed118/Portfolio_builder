import { useQuery } from "@tanstack/react-query";
import { Users, X, ChevronDown } from "lucide-react";
import { api, type User } from "@/lib/api-client";
import { useAuthUser } from "@workspace/auth";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui";

interface UserSwitcherProps {
  viewingUserId: string | null;
  onViewUserChange: (userId: string | null) => void;
}

export default function UserSwitcher({ viewingUserId, onViewUserChange }: UserSwitcherProps) {
  const { isSuperadmin } = useAuthUser();

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.users.list();
      if (!res.success) throw new Error(res.message);
      return res.data ?? [];
    },
    enabled: isSuperadmin,
    staleTime: 60_000,
  });

  const users = usersData ?? [];
  const viewingUser = viewingUserId ? users.find(u => u.id === viewingUserId) : null;

  if (!isSuperadmin) return null;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={viewingUserId ?? "__all__"}
        onValueChange={(val) => onViewUserChange(val === "__all__" ? null : val)}
      >
        <SelectTrigger className="w-[200px] h-9 text-sm">
          <Users size={14} className="mr-2 text-muted-foreground" />
          <SelectValue placeholder="All users" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All users</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name || u.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {viewingUser && (
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs rounded-md">
          <span>Viewing as: <strong>{viewingUser.name || viewingUser.email}</strong></span>
          <button
            onClick={() => onViewUserChange(null)}
            className="ml-1 hover:text-yellow-600 dark:hover:text-yellow-100"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
