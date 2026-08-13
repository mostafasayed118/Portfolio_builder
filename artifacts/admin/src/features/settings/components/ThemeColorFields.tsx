import { Input, Label } from "@workspace/ui";

export function hslToHex(hsl: string): string {
  try {
    const parts = hsl.trim().split(/\s+/);
    if (parts.length !== 3) return "#888888";
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch { return "#888888"; }
}

export function hexToHsl(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch { return "0 0% 50%"; }
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const hex = hslToHex(value);
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded border border-border shrink-0" style={{ background: `hsl(${value})` }} />
      <Label className="w-36 text-xs shrink-0 text-muted-foreground">{label}</Label>
      <input type="color" value={hex} onChange={e => onChange(hexToHsl(e.target.value))} className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent shrink-0" aria-label={label} />
      <Input value={value} onChange={e => onChange(e.target.value)} className="text-xs font-mono h-8 flex-1" placeholder="H S% L%" />
    </div>
  );
}
