import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@workspace/ui";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <Icon size={20} className={color} />
          <div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
