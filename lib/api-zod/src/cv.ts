import { z } from "zod";

// Mirror of the canonical CV consts in @workspace/validation
// (lib/validation/src/constants.ts). Kept as a local copy because this
// package must stay dependency-free; drift is pinned by
// src/drift-guard.test.ts on both sides.
const CV_EXT = ".pdf";
const cvFileExtPattern = new RegExp(`${CV_EXT.replace(".", "\\.")}$`, "i");

// Only writer of CV storage objects is CvManager (artifacts/admin/
// src/features/cv/components/CvManager.tsx), which uploads to
// `cv-${Date.now()}.pdf`. Pinning objectPath to that shape (kept as a local
// pattern, dependency-free) blocks arbitrary-key/path writes through the
// settings endpoint.
const CV_OBJECT_PATH_PATTERN = /^cv-\d+\.pdf$/;
const CV_OBJECT_PATH_MESSAGE = "objectPath must be a CV storage path (cv-<unix-ms>.pdf)";

export const cvSettingsUpdateSchema = z.object({
  objectPath: z.string().regex(CV_OBJECT_PATH_PATTERN, CV_OBJECT_PATH_MESSAGE),
  fileName: z.string().min(1).max(255).regex(cvFileExtPattern, `File name must end with ${CV_EXT}`),
});

export type CvSettingsUpdateInput = z.infer<typeof cvSettingsUpdateSchema>;
