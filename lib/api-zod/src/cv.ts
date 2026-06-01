import { z } from "zod";

export const cvSettingsUpdateSchema = z.object({
  objectPath: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255).regex(/\.pdf$/i, "File name must end with .pdf"),
});

export type CvSettingsUpdateInput = z.infer<typeof cvSettingsUpdateSchema>;
