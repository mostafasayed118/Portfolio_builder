import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  fetchCertifications,
  listCertifications,
  listCertificationRows,
  createCertification,
  updateCertification,
  deleteCertification,
} from "./certifications";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("fetchCertifications", () => {
  it("selects non-deleted rows and maps DB columns to Certification shape", async () => {
    const dbRows = [
      {
        id: "1",
        title: "AWS Certified",
        issuer: "Amazon",
        category: "cloud",
        date: "2024-01",
        credential_url: "https://aws.amazon.com/verify/123",
        issuer_logo: "https://img.aws/logo.png",
        credential_id: "CID-001",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];
    supabase.order.mockResolvedValue({ data: dbRows, error: null });

    const result = await fetchCertifications(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("certifications");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result).toEqual([
      {
        id: "1",
        title: "AWS Certified",
        issuer: "Amazon",
        category: "cloud",
        date: "2024-01",
        cert_url: "https://aws.amazon.com/verify/123",
        image_url: "https://img.aws/logo.png",
        credential_id: "CID-001",
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);
  });

  it("maps null credential_url and issuer_logo to undefined", async () => {
    const dbRows = [
      {
        id: "2",
        title: "Cert",
        issuer: "Issuer",
        category: null,
        date: "2024-06",
        credential_url: null,
        issuer_logo: null,
        credential_id: null,
        created_at: "2024-06-01T00:00:00Z",
      },
    ];
    supabase.order.mockResolvedValue({ data: dbRows, error: null });

    const result = await fetchCertifications(supabase as any);

    expect(result[0].cert_url).toBeUndefined();
    expect(result[0].image_url).toBeUndefined();
    expect(result[0].credential_id).toBeUndefined();
    expect(result[0].category).toBe("");
  });

  it("throws on error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("db error") });

    await expect(fetchCertifications(supabase as any)).rejects.toThrow("db error");
  });
});

describe("listCertifications", () => {
  it("delegates to fetchCertifications and returns mapped results", async () => {
    const dbRows = [
      {
        id: "1",
        title: "Cert",
        issuer: "Issuer",
        category: "dev",
        date: "2024-01",
        credential_url: "https://example.com",
        issuer_logo: null,
        credential_id: null,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];
    supabase.order.mockResolvedValue({ data: dbRows, error: null });

    const result = await listCertifications(supabase as any);

    expect(result[0].cert_url).toBe("https://example.com");
    expect(result[0].image_url).toBeUndefined();
  });
});

describe("listCertificationRows", () => {
  it("returns raw DB rows without mapping", async () => {
    const dbRows = [
      {
        id: "1",
        title: "Cert",
        issuer: "Issuer",
        credential_url: "https://example.com",
        issuer_logo: "https://logo.com",
      },
    ];
    supabase.order.mockResolvedValue({ data: dbRows, error: null });

    const result = await listCertificationRows(supabase as any);

    // Raw rows preserve original DB column names
    expect(result[0]).toHaveProperty("credential_url", "https://example.com");
    expect(result[0]).toHaveProperty("issuer_logo", "https://logo.com");
  });

  it("throws on error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("fail") });

    await expect(listCertificationRows(supabase as any)).rejects.toThrow("fail");
  });
});

describe("createCertification", () => {
  it("inserts with sanitized URLs and returns mapped Certification", async () => {
    const dbRow = {
      id: "cert-1",
      title: "GCP Associate",
      issuer: "Google",
      category: "cloud",
      date: "2024-03",
      date_sort: "2024-03",
      credential_url: "https://cloud.google.com/cert",
      issuer_logo: "https://gcp.dev/logo.png",
      credential_id: null,
      sort_order: 0,
      is_published: true,
      created_at: "2024-03-01T00:00:00Z",
      updated_at: "2024-03-01T00:00:00Z",
    };
    supabase.single.mockResolvedValue({ data: dbRow, error: null });

    const result = await createCertification(supabase as any, {
      title: "GCP Associate",
      issuer: "Google",
      category: "cloud",
      date: "2024-03",
      cert_url: "https://cloud.google.com/cert",
      image_url: "https://gcp.dev/logo.png",
    });

    expect(supabase.from).toHaveBeenCalledWith("certifications");
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "GCP Associate",
        issuer: "Google",
        credential_url: "https://cloud.google.com/cert",
        issuer_logo: "https://gcp.dev/logo.png",
        date_sort: "2024-03",
      }),
    );
    // Returns mapped Certification
    expect(result.cert_url).toBe("https://cloud.google.com/cert");
    expect(result.image_url).toBe("https://gcp.dev/logo.png");
  });

  it("sanitizes empty URLs to null in the insert payload", async () => {
    supabase.single.mockResolvedValue({
      data: {
        id: "c2", title: "T", issuer: "I", category: "", date: "2024",
        credential_url: null, issuer_logo: null, credential_id: null,
        created_at: "2024-01-01", date_sort: "2024",
      },
      error: null,
    });

    const result = await createCertification(supabase as any, {
      title: "T",
      issuer: "I",
      category: "",
      date: "2024",
      cert_url: "",
      image_url: "#",
    });

    const insertArg = supabase.insert.mock.calls[0][0];
    expect(insertArg.credential_url).toBeNull();
    expect(insertArg.issuer_logo).toBeNull();
    expect(result.cert_url).toBeUndefined();
    expect(result.image_url).toBeUndefined();
  });

  it("throws on insert error", async () => {
    supabase.single.mockResolvedValue({
      data: null,
      error: new Error("duplicate"),
    });

    await expect(
      createCertification(supabase as any, {
        title: "T", issuer: "I", category: "c", date: "2024",
      }),
    ).rejects.toThrow("duplicate");
  });
});

describe("updateCertification", () => {
  it("maps input fields to DB column names and returns mapped Certification", async () => {
    const dbRow = {
      id: "cert-1",
      title: "Updated Cert",
      issuer: "Issuer",
      category: "cloud",
      date: "2024-06",
      credential_url: "https://new-url.com",
      issuer_logo: "https://new-logo.com",
      credential_id: null,
      created_at: "2024-01-01",
    };
    supabase.single.mockResolvedValue({ data: dbRow, error: null });

    const result = await updateCertification(supabase as any, "cert-1", {
      title: "Updated Cert",
      cert_url: "https://new-url.com",
      image_url: "https://new-logo.com",
      date: "2024-06",
    });

    const updateArg = supabase.update.mock.calls[0][0];
    // cert_url maps to credential_url
    expect(updateArg.credential_url).toBe("https://new-url.com");
    // image_url maps to issuer_logo
    expect(updateArg.issuer_logo).toBe("https://new-logo.com");
    // date maps to date_sort
    expect(updateArg.date_sort).toBe("2024-06");
    expect(updateArg.updated_at).toEqual(expect.any(String));
    // Returns mapped Certification
    expect(result.cert_url).toBe("https://new-url.com");
    expect(result.image_url).toBe("https://new-logo.com");
  });

  it("does not add date_sort when date is not provided", async () => {
    supabase.single.mockResolvedValue({
      data: {
        id: "c1", title: "T", issuer: "I", category: "", date: "2024",
        credential_url: null, issuer_logo: null, credential_id: null, created_at: "2024",
      },
      error: null,
    });

    await updateCertification(supabase as any, "c1", { title: "New Title" });

    const updateArg = supabase.update.mock.calls[0][0];
    expect(updateArg).not.toHaveProperty("date_sort");
  });

  it("throws on error", async () => {
    supabase.single.mockResolvedValue({
      data: null,
      error: new Error("not found"),
    });

    await expect(
      updateCertification(supabase as any, "bad", { title: "x" }),
    ).rejects.toThrow("not found");
  });
});

describe("deleteCertification", () => {
  it("soft-deletes by setting deleted_at", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await deleteCertification(supabase as any, "cert-1");

    expect(supabase.from).toHaveBeenCalledWith("certifications");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "cert-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("fail") });

    await expect(deleteCertification(supabase as any, "x")).rejects.toThrow("fail");
  });
});
