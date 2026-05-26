# Image Pipeline — Feature Roadmap & Technical Specification

## Current State
The schema already anticipates images:
- `projects` table has `image_url TEXT`, `image_url TEXT` columns
- `hero_content` has `cv_file_name TEXT` (PDF, not image)
- No image upload/processing exists
- No image storage bucket configured

---

## Phase 1: Infrastructure (Week 1)

### 1a. Supabase Storage Buckets

```sql
-- supabase/migrations/003_storage_images.sql

-- Project images (public — displayed on portfolio)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project_images', 'project_images', true)
ON CONFLICT (id) DO NOTHING;

-- Optimized/generated variants (private — processed by pipeline)
INSERT INTO storage.buckets (id, name, public)
VALUES ('image_variants', 'image_variants', false)
ON CONFLICT (id) DO NOTHING;

-- Avatar/profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: public read for public buckets
CREATE POLICY "public_read_project_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project_images');

CREATE POLICY "public_read_avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "admin_all_images"
  ON storage.objects FOR ALL
  USING (bucket_id IN ('project_images', 'image_variants', 'avatars'));
```

### 1b. Database Schema Extensions

```sql
-- supabase/migrations/003_storage_images.sql (continued)

-- Image metadata table
CREATE TABLE IF NOT EXISTS image_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size_bytes BIGINT NOT NULL,
  blur_hash TEXT,
  dominant_color TEXT,
  alt_text TEXT,
  entity_type TEXT NOT NULL,        -- 'project', 'hero', 'about', 'certification'
  entity_id UUID,                    -- FK to the owning entity (nullable for standalone)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image variants (thumbnails, webp, etc.)
CREATE TABLE IF NOT EXISTS image_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_image_id UUID REFERENCES image_metadata(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,        -- 'thumbnail', 'webp', 'blur', 'social'
  storage_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_image_metadata_entity ON image_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_image_variants_parent ON image_variants(parent_image_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_storage ON image_metadata(storage_path);
```

### 1c. Image Processing Service Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Browser     │     │  API Server  │     │  Supabase   │
│  Upload UI   │────▶│  /api/images │────▶│  Storage    │
│  (React)     │     │  (Express)   │     │  (S3)       │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Sharp       │     │  image_     │
                    │  (resize/    │     │  metadata   │
                    │   optimize)  │     │  (Postgres) │
                    └──────────────┘     └─────────────┘
```

**Key decisions:**
- **Server-side processing** via Express using `sharp` (Node.js binding to libvips)
- **No external API dependency** for basic operations (resize, format convert, blurhash)
- **Optional AI enhancement** via Replicate API (Phase 3)
- **Storage**: Supabase S3-compatible storage (already configured)

### 1d. API Server — Image Routes

**File:** `api-server/src/routes/images.ts`

```typescript
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { validateBody, v, schema } from "../middleware/validate";

const router = Router();

// --- Types ---
type ImageVariant = {
  suffix: string;
  width: number;
  height?: number;
  fit?: "cover" | "inside" | "contain";
};

const VARIANTS: ImageVariant[] = [
  { suffix: "thumbnail", width: 150, height: 150, fit: "cover" },
  { suffix: "small", width: 400, fit: "inside" },
  { suffix: "medium", width: 800, fit: "inside" },
  { suffix: "large", width: 1200, fit: "inside" },
  { suffix: "social", width: 1200, height: 630, fit: "cover" },
];

// --- Upload ---
const uploadSchema = schema({
  entityType: v.enum("project", "hero", "about", "certification", "avatar"),
  entityId: v.optional(v.string({ label: "Entity ID" })),
  altText: v.optional(v.string({ max: 500, label: "Alt text" })),
});

router.post("/images/upload", validateBody(uploadSchema), async (req, res) => {
  // 1. Parse multipart form data (file upload)
  // 2. Validate file type (image/jpeg, image/png, image/webp)
  // 3. Store original in Supabase Storage
  // 4. Spawn async variant generation (thumbnail, webp, etc.)
  // 5. Record metadata in image_metadata table
  // 6. Return image ID and URLs
});

// --- Serve optimized variant ---
router.get("/images/:id/:variant", async (req, res) => {
  // 1. Look up variant in image_variants table
  // 2. Stream from Supabase Storage with correct Content-Type
  // 3. Cache: set Cache-Control: public, max-age=31536000
});

// --- Delete ---
router.delete("/images/:id", async (req, res) => {
  // 1. Delete all variants from storage
  // 2. Delete original from storage
  // 3. Delete metadata rows
});
```

---

## Phase 2: Admin Image Manager (Week 2)

### 2a. Admin UI — Image Upload Component

**File:** `admin/src/components/ImageUploader.tsx`

```
┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │    ┌─────┐  Drop images here     │  │
│  │    │  📤 │  or click to browse   │  │
│  │    └─────┘  PNG, JPG, WebP       │  │
│  │             Max 10MB              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  [=====-----------------]  45%   │  │
│  │  project-hero.png        2.3MB   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌──────────┐ ┌────────────────────┐   │
│  │  ✅      │ │ project-thumb.jpg  │   │
│  │  Preview │ │ 150×150 · 12KB    │   │
│  └──────────┘ └────────────────────┘   │
│                                         │
│  Select entity: [Project: ETL Pipe ▼]  │
│  Alt text: [A diagram of the pipeline ] │
│                                         │
│  [Upload]                          [Cancel] │
└─────────────────────────────────────────┘
```

**Specification:**

```typescript
interface ImageUploaderProps {
  entityType: "project" | "hero" | "about" | "certification" | "avatar";
  entityId?: string;
  existingImages?: ImageMetadata[];
  maxFiles?: number;        // default 5
  maxFileSizeMB?: number;   // default 10
  acceptedTypes?: string[]; // default ['image/jpeg', 'image/png', 'image/webp']
  onUploadComplete?: (images: ImageMetadata[]) => void;
}
```

**States to handle:**
| State | Visual | Behavior |
|-------|--------|----------|
| Empty | Dashed border, upload icon, hint text | Click or drag opens file picker |
| Dragging | Border turns blue, background tint | `onDragOver` / `onDragLeave` |
| Uploading | Progress bar per file, cancel button | `XMLHttpRequest` with `upload.onprogress` |
| Success | Green check, thumbnail preview, variant sizes listed | Shows all generated variants |
| Error | Red border, error message | "File too large" / "Invalid type" / "Upload failed" |
| Existing | Thumbnail grid with delete button | Pre-populated from `image_metadata` query |

### 2b. Drag-and-Drop Zone Implementation

```typescript
// File: admin/src/components/DragDropZone.tsx
// Uses: native HTML5 Drag and Drop API
// No external library — vanilla React

function DragDropZone({ onFiles, accept, maxSizeMB, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer?.items?.length) setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer?.files ?? []);
    const valid = files.filter(f => accept.includes(f.type));
    if (valid.length !== files.length) {
      toast({ title: "Some files were skipped", description: "Only PNG, JPG, WebP accepted", variant: "warning" });
    }
    onFiles(valid);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
        ${dragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"}
        ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Upload images — drag and drop or click to browse"
    >
      <input ref={inputRef} type="file" hidden accept={accept?.join(",")} multiple onChange={handleChange} />
      {dragging ? <DragActiveState /> : <DragInactiveState />}
    </div>
  );
}
```

### 2c. Image Variant Gallery Component

```
┌──────────────────────────────────────────────────┐
│  Images (3)                                      │
│                                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐                │
│  │        │ │        │ │        │  [+] Add       │
│  │  🖼️   │ │  🖼️   │ │  🖼️   │                │
│  │        │ │        │ │        │                │
│  │ Delete │ │ Delete │ │ Delete │                │
│  └────────┘ └────────┘ └────────┘                │
│                                                   │
│  Variants for selected image:                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │Original│ │Thumb   │ │Small   │ │Social  │    │
│  │1200×800│ │150×150 │ │400×267 │ │1200×630│    │
│  │245KB   │ │8KB     │ │32KB    │ │85KB    │    │
│  └────────┘ └────────┘ └────────┘ └────────┘    │
│                                                   │
│  Alt text: [A diagram of the ETL pipeline      ] │
└──────────────────────────────────────────────────┘
```

### 2d. Integration into Existing Admin Pages

**ProjectsManager Enhancement:**
```typescript
// In projects table schema — already has image_url
// Add ImageUploader to the project edit dialog:
<ImageUploader
  entityType="project"
  entityId={editing?.id}
  existingImages={projectImages}
  onUploadComplete={(images) => {
    // Set first image as primary
    setEditing(prev => ({ ...prev, image_url: images[0]?.url }));
  }}
/>
```

**HeroManager Enhancement:**
```typescript
// Add background/avatar image picker
<ImageUploader
  entityType="hero"
  maxFiles={1}
  acceptedTypes={['image/jpeg', 'image/png']}
  onUploadComplete={([img]) => setField("avatarUrl", img.url)}
/>
```

**CertificationsManager Enhancement:**
```typescript
// Replace emoji issuer logo with image upload
<ImageUploader
  entityType="certification"
  entityId={editing?.id}
  maxFiles={1}
  maxFileSizeMB={2}
  onUploadComplete={([img]) => setField("issuer_logo", img.url)}
/>
```

---

## Phase 3: AI Image Enhancement (Week 3)

### 3a. AI Service Integration

```typescript
// File: api-server/src/lib/imageAI.ts
// Uses: Replicate API (or Stability AI, or OpenAI)
// Environment: REPLICATE_API_KEY in .env

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

interface AIEnhanceOptions {
  model: "upscale" | "denoise" | "background-remove" | "generate";
  prompt?: string;
}

async function enhanceImage(imagePath: string, options: AIEnhanceOptions): Promise<string> {
  // 1. Download original from Supabase Storage
  // 2. Call Replicate API:
  //    - Upscale:   "nightmareai/real-esrgan"
  //    - Denoise:   "sparkling-dream/photo-restoration"  
  //    - Remove BG: "cjwbw/rembg"
  //    - Generate:  "stability-ai/stable-diffusion" (text-to-image)
  // 3. Upload result to 'image_variants' bucket
  // 4. Record in image_variants table with variant_type = 'ai-upscale'
  // 5. Return URL
}

// Example route:
router.post("/images/:id/enhance", async (req, res) => {
  const { model, prompt } = req.body;
  const resultPath = await enhanceImage(req.params.id, { model, prompt });
  res.json({ url: resultPath });
});
```

### 3b. Admin AI Enhancement UI

```
┌──────────────────────────────────────┐
│  Enhance Image                       │
│                                       │
│  ┌────────────────────────────────┐  │
│  │  Original         Enhanced    │  │
│  │  ┌────────┐      ┌────────┐  │  │
│  │  │        │  ▶  │        │  │  │
│  │  │  blurry │      │  sharp  │  │  │
│  │  └────────┘      └────────┘  │  │
│  └────────────────────────────────┘  │
│                                       │
│  Enhancement: [Upscale 2x        ▼]  │
│  Prompt (for AI gen):                │
│  [A data pipeline diagram with     ] │
│  [blue arrows and database icons  ] │
│                                       │
│  [Enhance] ← shows spinner + progress │
│                                       │
│  (Cost per operation: $0.002)         │
└──────────────────────────────────────┘
```

### 3c. Client-Side Image Generation

For AI image generation (text-to-image) directly from the admin:

```typescript
// File: admin/src/hooks/useImageGeneration.ts

export function useImageGeneration() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  const generate = async (prompt: string, options?: {
    style?: "realistic" | "artistic" | "schema-diagram";
    width?: number;
    height?: number;
  }) => {
    setGenerating(true);
    setProgress("Sending prompt to AI...");
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...options }),
      });
      const { id } = await res.json();
      // Poll for completion
      while (true) {
        const status = await fetch(`/api/images/${id}/status`);
        const data = await status.json();
        if (data.status === "completed") {
          setProgress("Image ready");
          return data.imageUrl;
        }
        setProgress(data.progress || "Processing...");
        await new Promise(r => setTimeout(r, 2000));
      }
    } finally {
      setGenerating(false);
    }
  };

  return { generate, generating, progress };
}
```

---

## Phase 4: Portfolio Integration (Week 4)

### 4a. Portfolio Image Component

```typescript
// File: portfolio/src/components/OptimizedImage.tsx

interface OptimizedImageProps {
  imageId: string;
  alt: string;
  variant?: "thumbnail" | "small" | "medium" | "large" | "original";
  className?: string;
  loading?: "lazy" | "eager";
  fetchpriority?: "high" | "low" | "auto";
}

function OptimizedImage({ imageId, alt, variant = "medium", className, loading = "lazy" }: Props) {
  const [loaded, setLoaded] = useState(false);
  const { data: metadata } = useQuery({
    queryKey: ["image", imageId],
    queryFn: () => fetch(`/api/images/${imageId}/metadata`).then(r => r.json()),
  });

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${metadata?.width}/${metadata?.height}` }}>
      {/* Blur-up placeholder */}
      {metadata?.blurHash && !loaded && (
        <div className="absolute inset-0" style={{ backgroundColor: metadata.dominantColor }} />
      )}
      <img
        src={`/api/images/${imageId}/${variant}`}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        srcSet={`
          /api/images/${imageId}/thumbnail 150w,
          /api/images/${imageId}/small 400w,
          /api/images/${imageId}/medium 800w,
          /api/images/${imageId}/large 1200w
        `}
      />
    </div>
  );
}
```

### 4b. Project Cards with Images

```typescript
// Update ProjectCard to show image
function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="masonry-item group relative">
      {project.imageId && (
        <OptimizedImage
          imageId={project.imageId}
          alt={project.title}
          variant="medium"
          className="rounded-t-2xl h-48"
          loading="lazy"
        />
      )}
      <div className="glass rounded-2xl p-6 border ...">
        {/* existing content */}
      </div>
    </div>
  );
}
```

### 4c. Responsive Image Gallery Page

New portfolio page: `/gallery`

```
┌──────────────────────────────────────────────┐
│  Project Gallery                             │
│                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │      │ │      │ │      │ │      │       │
│  │  img │ │  img │ │  img │ │  img │       │
│  │      │ │      │ │      │ │      │       │
│  └──────┘ └──────┘ └──────┘ └──────┘       │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Lightbox overlay on click             │  │
│  │  ┌────────────────────────────────┐    │  │
│  │  │         Full image             │    │  │
│  │  │         ◀ ┌────────┐ ▶        │    │  │
│  │  │           │  🖼️   │           │    │  │
│  │  │           └────────┘           │    │  │
│  │  │  Caption: ETL Pipeline Diagram │    │  │
│  │  └────────────────────────────────┘    │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## Phase 5: Performance & Polish (Week 5)

### 5a. Image CDN & Caching

```typescript
// Supabase Storage CDN is automatically behind Cloudflare
// Add cache headers:
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
};

// Pre-generate all variants on upload (async via queue)
// Serve variants directly from storage URL (not proxied through Express)
const VARIANT_STORAGE_PATH = `${userId}/${imageId}/${variant.suffix}.webp`;
```

### 5b. Lazy Loading & Intersection Observer

```typescript
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} style={{ minHeight: 200 }}>
    {inView && <OptimizedImage imageId={src} alt={alt} />}
  </div>;
}
```

### 5c. BlurHash Generation

```typescript
// Server-side (via sharp + blurhash package):
import { blurhashEncode } from "blurhash";
import sharp from "sharp";

async function generateBlurhash(imageBuffer: Buffer): Promise<string> {
  const { data, info } = await sharp(imageBuffer)
    .resize(32, 32, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data);
  return blurhashEncode(pixels, info.width, info.height, 4, 4);
}
```

### 5d. Progressive Web App Support

```json
// Add to portfolio manifest.json
{
  "name": "Mustafa Sayed — Data Engineer",
  "short_name": "MS Portfolio",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "display": "standalone",
  "theme_color": "#0284c7"
}
```

---

## Implementation Phases Summary

| Phase | Timeline | Deliverables | Dependencies |
|-------|----------|-------------|--------------|
| **1** | Week 1 | Storage buckets, DB schema, Express routes, `sharp` integration | Existing Supabase project |
| **2** | Week 2 | `ImageUploader`, `DragDropZone`, variant gallery, admin page integration | Phase 1 routes |
| **3** | Week 3 | AI enhancement (upscale, denoise, remove BG, generate), admin AI UI | Replicate API key |
| **4** | Week 4 | `OptimizedImage` component, project card images, gallery page, lightbox | Phase 2 components |
| **5** | Week 5 | BlurHash, CDN caching, lazy loading, PWA manifest, performance tuning | Phase 4 components |

## Cost Estimate

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| Supabase Storage | 5GB images, 10GB variants | $0 (free tier) |
| Sharp processing | Server-side (included in existing Express) | $0 |
| Replicate API | ~100 AI enhancements/month | ~$5 |
| Total | | ~$5/month |

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Large uploads exhaust memory | Stream to disk before processing; limit to 10MB |
| AI API rate limits | Queue system with exponential backoff; fallback to basic sharp processing |
| Storage costs grow | Variant cleanup job (delete orphans); compress originals to WebP |
| Slow variant generation | Worker queue (Bull/PgBoss); generate thumbnail synchronously, rest async |
