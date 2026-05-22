import { CheckCircle, AlertTriangle, XCircle, MinusCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "online" | "warning" | "error" | "offline" | "loading";

const colorMap: Record<"green" | "amber" | "red" | "gray" | "blue", { text: string; bg: string; darkText: string }> = {
  green:  { text: "text-green-600",  bg: "bg-green-500",  darkText: "dark:text-green-400" },
  amber:  { text: "text-amber-600",  bg: "bg-amber-500",  darkText: "dark:text-amber-400" },
  red:    { text: "text-red-600",    bg: "bg-red-500",    darkText: "dark:text-red-400" },
  gray:   { text: "text-gray-600",   bg: "bg-gray-400",   darkText: "dark:text-gray-400" },
  blue:   { text: "text-blue-600",   bg: "bg-blue-500",   darkText: "dark:text-blue-400" },
};

const statusConfig: Record<Status, { color: string; icon: typeof CheckCircle; label: string }> = {
  online:  { color: "green",  icon: CheckCircle,    label: "Online"  },
  warning: { color: "amber",  icon: AlertTriangle,  label: "Warning" },
  error:   { color: "red",    icon: XCircle,        label: "Error"   },
  offline: { color: "gray",   icon: MinusCircle,    label: "Offline" },
  loading: { color: "blue",   icon: Loader2,        label: "Loading" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { color, icon: Icon, label } = statusConfig[status];
  const colors = colorMap[color] ?? colorMap.gray;

  return (
    <div
      className={cn("flex items-center gap-1.5", colors.text, colors.darkText)}
      aria-label={`Status: ${label}`}
    >
      <div className={cn("w-2 h-2 rounded-full", colors.bg)} aria-hidden="true" />
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
