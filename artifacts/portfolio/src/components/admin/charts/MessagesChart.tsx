import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MessagesChartProps {
  data: Array<{ date: string; total: number; unread: number }> | undefined;
  isLoading: boolean;
}

export default function MessagesChart({ data, isLoading }: MessagesChartProps) {
  const weekly = aggregateWeeks(data ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Messages (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : weekly.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No messages yet
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="total"
                  name="Total"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="unread"
                  name="Unread"
                  fill="hsl(var(--accent))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function aggregateWeeks(
  data: Array<{ date: string; total: number; unread: number }>,
): Array<{ label: string; total: number; unread: number }> {
  if (data.length === 0) return [];

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const weeks: Array<{ label: string; total: number; unread: number }> = [];
  let current: { label: string; total: number; unread: number } | null = null;

  for (const day of sorted) {
    const d = new Date(day.date + "T00:00:00");
    const weekStart = getWeekStart(d);
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (!current || current.label !== label) {
      if (current) weeks.push(current);
      current = { label, total: 0, unread: 0 };
    }
    current.total += day.total;
    current.unread += day.unread;
  }
  if (current) weeks.push(current);

  return weeks;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
