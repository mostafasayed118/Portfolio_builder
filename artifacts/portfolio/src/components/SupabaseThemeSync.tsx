import { useSupabaseTheme, useSupabaseTypography } from "@/hooks/useSupabaseTheme";

export default function SupabaseThemeSync() {
  useSupabaseTheme();
  useSupabaseTypography();
  return null;
}
