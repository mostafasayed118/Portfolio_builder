import { z } from "zod";

// Mirror of the canonical CV consts in @workspace/validation
// (lib/validation/src/constants.ts). Kept as a local copy because this
// package must stay dependency-free; drift is pinned by
// src/drift-guard.test.ts on both sides.
const CV_EXT = ".pdf";
const cvFileExtPattern = new RegExp(`${CV_EXT.replace(".", "\\.")}$`, "i");

export const cvSettingsUpdateSchema = z.object({
  objectPath: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255).regex(cvFileExtPattern, `File name must end with ${CV_EXT}`),
});

export type CvSettingsUpdateInput = z.infer<typeof cvSettingsUpdateSchema>;
