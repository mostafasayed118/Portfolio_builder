import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui";
import { api } from "@/lib/api-client";

export function SeedDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    summary: Record<string, number>;
    errors: string[];
  } | null>(null);
  const queryClient = useQueryClient();

  const handleSeed = async () => {
    setLoading(true);
    setResult(null);

    const res = await api.seed.run();
    if (res.success && res.data) {
      setResult({
        success: true,
        summary: res.data.summary,
        errors: res.data.errors,
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["experience"] });
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      queryClient.invalidateQueries({ queryKey: ["heroContent"] });
      queryClient.invalidateQueries({ queryKey: ["aboutContent"] });
    } else {
      setResult({
        success: false,
        summary: {},
        errors: [
          (res as { message: string }).message || "Failed to seed data",
        ],
      });
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          setResult(null);
        }}
        variant="outline"
        className="shrink-0 gap-2"
      >
        <Sparkles size={16} />
        Import Static Data
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Static Data</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button onClick={handleSeed} disabled={loading} className="w-full">
              {loading ? "Importing…" : "Import Now"}
            </Button>

            {result && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium mb-2">
                  {result.success ? "Import Complete" : "Import Failed"}
                </div>
                {result.success &&
                  Object.entries(result.summary).length > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-xs min-w-0">
                      {Object.entries(result.summary).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key}
                          </span>
                          <span>{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                {result.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-500">
                    {result.errors.map((e) => (
                      <div key={e}>• {e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
