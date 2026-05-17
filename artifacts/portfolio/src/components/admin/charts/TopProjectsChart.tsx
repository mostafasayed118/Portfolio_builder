import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TopProjectsChartProps {
  data: Array<{ slug: string; title: string; views: number }> | undefined;
  isLoading: boolean;
}

export default function TopProjectsChart({ data, isLoading }: TopProjectsChartProps) {
  const items = (data ?? []).slice(0, 5);
  const maxViews = items.length > 0 ? Math.max(...items.map((i) => i.views)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Top Projects by Views</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : items.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No project views yet
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={items}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={{ fontSize: 11 }}
                  width={120}
                  className="text-muted-foreground"
                  tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + "..." : v}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number, _name: string) => [`${value} views`, "Views"]}
                />
                <Bar
                  dataKey="views"
                  name="Views"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  label={{
                    position: "right",
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                    formatter: (v: number) => v,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
