import { Eye, Download, MessageSquare, MousePointerClick } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsRowProps {
  totalViews: number | undefined;
  cvDownloads: number | undefined;
  contactClicks: number | undefined;
  weeklyMessages: { total: number; unread: number } | undefined;
  isLoading: boolean;
}

export default function StatsRow({
  totalViews,
  cvDownloads,
  contactClicks,
  weeklyMessages,
  isLoading,
}: StatsRowProps) {
  const items = [
    {
      icon: Eye,
      label: "Total Views",
      value: totalViews,
      sub: "last 30 days",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Download,
      label: "CV Downloads",
      value: cvDownloads,
      sub: "last 30 days",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      value: weeklyMessages?.total,
      sub: weeklyMessages
        ? `${weeklyMessages.unread} unread`
        : "this week",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: MousePointerClick,
      label: "Contact Clicks",
      value: contactClicks,
      sub: "email, github, linkedin",
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-start gap-4 p-4">
            <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold">{item.value ?? 0}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.sub}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
