import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui";
import { Eye } from "lucide-react";

interface TypographyPreviewProps {
  bodyFont: string;
  displayFont: string;
  baseFontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeightBody: string;
  fontWeightHeading: string;
}

export function TypographyPreview({ bodyFont, displayFont, baseFontSize, lineHeight, letterSpacing, fontWeightBody, fontWeightHeading }: TypographyPreviewProps) {
  const baseSize = parseFloat(baseFontSize);
  const scale = parseFloat("1.25");

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Eye size={15} /> Live Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border bg-background p-5 space-y-4">
          <div>
            <div className="text-muted-foreground text-xs mb-1 uppercase tracking-widest" style={{ fontFamily: bodyFont, letterSpacing: "0.1em" }}>Data Engineer</div>
            <div style={{ fontFamily: displayFont, fontSize: `${baseSize * scale * scale * scale}px`, fontWeight: fontWeightHeading, lineHeight: 1.1 }} className="text-foreground">Mustafa Sayed</div>
          </div>
          <div style={{ fontFamily: bodyFont, fontSize: `${baseSize}px`, lineHeight, letterSpacing, fontWeight: fontWeightBody }} className="text-muted-foreground">
            Building scalable data pipelines and transforming raw data into actionable insights. Passionate about ETL architecture and data warehouse design.
          </div>
          <div className="space-y-2">
            {["h1", "h2", "h3", "h4"].map((tag, i) => {
              const fSize = baseSize * Math.pow(scale, 4 - i);
              return <div key={tag} style={{ fontFamily: displayFont, fontSize: `${fSize}px`, fontWeight: fontWeightHeading, lineHeight: 1.2 }} className="text-foreground">{tag.toUpperCase()} — {fSize.toFixed(1)}px</div>;
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
