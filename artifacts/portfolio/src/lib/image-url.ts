import { getApiUrl } from "./env";

export function resolveImageUrl(url: string): string {
  const legacy = url.match(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/(project_images|projects|certifications|avatars)\/(.+)$/);
  const normalized = legacy
    ? `/api/v1/images/serve/${legacy[1]}/${legacy[2]}`
    : url.startsWith("serve/")
      ? `/api/v1/images/${url}`
      : url;
  return normalized.startsWith("/api/v1/images/serve/") ? `${getApiUrl().replace(/\/$/, "")}${normalized}` : normalized;
}
