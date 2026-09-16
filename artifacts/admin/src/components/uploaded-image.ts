/**
 * Shared shape of an image returned by the upload endpoint. Lives here (not
 * in ImageUploader.tsx) so ImageUploader and UploadedImagesGrid don't import
 * from each other.
 */
export interface UploadedImage {
  id: string;
  url: string;
  variants: { type: string; url: string }[];
}
