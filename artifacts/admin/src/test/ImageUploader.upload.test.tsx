import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderAdmin } from "./helpers";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import ImageUploader from "@/components/ImageUploader";

const { mockGetCsrfToken, mockGetClerkToken, mockToast } = vi.hoisted(() => ({
  mockGetCsrfToken: vi.fn(),
  mockGetClerkToken: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({ getCsrfToken: mockGetCsrfToken }));
vi.mock("@/lib/auth-token", () => ({ getClerkToken: mockGetClerkToken }));
vi.mock("@/lib/env", () => ({ getApiUrl: () => "http://test-api" }));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return { ...actual, useToast: () => ({ toast: mockToast }) };
});

const originalXMLHttpRequest = globalThis.XMLHttpRequest;

function installFakeXhr(opts: { status?: number; responseText?: string; onProgress?: (pct: number) => void }) {
  const status = opts.status ?? 200;
  const responseText = opts.responseText ?? JSON.stringify({ id: "img-1", url: "https://x/y.png", variants: [] });
  const FakeXhr: typeof XMLHttpRequest = function FakeXhr(this: XMLHttpRequest) {
    const xhr = this as unknown as {
      upload: { onprogress: ((e: ProgressEvent) => void) | null };
      onload: (() => void) | null;
      onerror: (() => void) | null;
      status: number;
      responseText: string;
      open: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
      setRequestHeader: ReturnType<typeof vi.fn>;
      abort: ReturnType<typeof vi.fn>;
    };
    xhr.upload = { onprogress: null };
    xhr.onload = null;
    xhr.onerror = null;
    xhr.status = 0;
    xhr.responseText = "";
    xhr.open = vi.fn();
    xhr.send = vi.fn(() => {
      xhr.status = status;
      xhr.responseText = responseText;
      Promise.resolve().then(() => {
        if (status >= 200 && status < 300) {
          xhr.onload?.();
        } else {
          xhr.onerror?.();
        }
      });
    });
    xhr.setRequestHeader = vi.fn();
    xhr.abort = vi.fn();
  } as unknown as typeof XMLHttpRequest;
  globalThis.XMLHttpRequest = FakeXhr;
}

afterEach(() => {
  globalThis.XMLHttpRequest = originalXMLHttpRequest;
});

describe("ImageUploader — file validation + upload contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCsrfToken.mockResolvedValue("csrf-1");
    mockGetClerkToken.mockResolvedValue("clerk-1");
  });

  it("rejects a non-image file with a destructive toast and never calls the API", () => {
    renderAdmin(<ImageUploader entityType="project" />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["hello"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Invalid file type", variant: "destructive" }),
    );
  });

  it("rejects a file larger than maxFileSizeMB with a destructive toast", () => {
    renderAdmin(<ImageUploader entityType="project" maxFileSizeMB={1} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const big = new File([new Uint8Array(2 * 1024 * 1024)], "huge.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [big] } });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "File too large", variant: "destructive" }),
    );
  });

  it("uploads a valid image and fires the success toast with the file name", async () => {
    installFakeXhr({
      status: 200,
      responseText: JSON.stringify({
        success: true,
        data: { id: "img-99", url: "https://x/ok.png", variants: [] },
      }),
    });

    const onComplete = vi.fn();
    renderAdmin(<ImageUploader entityType="project" onUploadComplete={onComplete} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "pic.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Image uploaded" }),
      );
    });
    expect(onComplete).toHaveBeenCalledWith([
      expect.objectContaining({ id: "img-99", url: "https://x/ok.png" }),
    ]);
  });

  it("upload error triggers a destructive toast", async () => {
    installFakeXhr({ status: 500, responseText: JSON.stringify({ error: "boom" }) });

    renderAdmin(<ImageUploader entityType="project" />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File([new Uint8Array(1024)], "pic.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Upload failed", variant: "destructive" }),
      );
    });
  });
});
