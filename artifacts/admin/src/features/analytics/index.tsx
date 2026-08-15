import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api-client";
import { Eye, MousePointerClick, Download, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui";
import { AdminErrorState } from "@/components/AdminErrorState";

interface AnalyticsStats {
  days: number;
  pageViews: Array<{ date: string; count: number }>;
  topProjects: Array<{ slug: string; title: string; views: number }>;
  cvDownloads: number;
  contactClicks: number;
  totalViews: number;
  messages: Array<{ date: string; total: number; unread: number }>;
}

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const PROJECT_COLORS = ["#4f6ef7", "#7c5cff", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#64748b"];

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics", days],
    queryFn: async () => {
      const res = await api.analytics.stats(Number(days));
      if (!res.success) throw new Error(res.message);
      return res.data!;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Analytics</h1>
            <p className="text-muted-foreground text-sm">Visitor activity and contact-form insights</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <AdminErrorState title="Failed to load analytics" message={error?.message} onRetry={() => refetch()} />;
  }

  const stats = data as AnalyticsStats;
  const messageSeries = stats.messages.map((m) => ({
    date: formatDate(m.date),
    Total: m.total,
    Unread: m.unread,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Analytics</h1>
          <p className="text-muted-foreground text-sm">Visitor activity and contact-form insights</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard icon={Eye} label="Page views" value={stats.totalViews} />
        <MetricCard icon={Download} label="CV downloads" value={stats.cvDownloads} />
        <MetricCard icon={MousePointerClick} label="Contact clicks" value={stats.contactClicks} />
        <MetricCard
          icon={MessageSquare}
          label="Messages"
          value={stats.messages.reduce((sum, m) => sum + m.total, 0)}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <StatCard title="Page views over time">
          {stats.pageViews.length === 0 ? (
            <EmptyChart message="No page views recorded in this range yet." />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <LineChart data={stats.pageViews.map((p) => ({ date: formatDate(p.date), Views: p.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="Views" stroke="#4f6ef7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </StatCard>

        <StatCard title="Messages over time">
          {messageSeries.length === 0 ? (
            <EmptyChart message="No messages in this range yet." />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={messageSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                />
                <Bar dataKey="Total" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Unread" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </StatCard>
      </div>

      <StatCard title="Top projects by views">
        {stats.topProjects.length === 0 ? (
          <EmptyChart message="No project views recorded in this range yet." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, stats.topProjects.length * 34)}>
            <BarChart data={stats.topProjects} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="title"
                width={150}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
              />
              <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                {stats.topProjects.map((_, i) => (
                  <Cell key={i} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </StatCard>
    </div>
  );
}
