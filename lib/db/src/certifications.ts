import type { SupabaseClient } from "@supabase/supabase-js";
import type { Certification as DbCertification, InsertCertification } from "@workspace/supabase/types";
import { sanitizeUrl } from "./utils";

export type Certification = {
  id: string;
  title: string;
  issuer: string;
  category: string;
  date: string;
  cert_url?: string;
  image_url?: string;
  credential_id?: string;
  created_at?: string;
};

export type CertificationRow = DbCertification;

function mapDbToCertification(row: DbCertification): Certification {
  return {
    id: row.id,
    title: row.title,
    issuer: row.issuer,
    category: row.category ?? "",
    date: row.date,
    cert_url: row.credential_url ?? undefined,
    image_url: row.issuer_logo ?? undefined,
    credential_id: row.credential_id ?? undefined,
    created_at: row.created_at,
  };
}

export async function listCertifications(
  supabase: SupabaseClient,
): Promise<Certification[]> {
  return fetchCertifications(supabase);
}

export async function listCertificationRows(
  supabase: SupabaseClient,
): Promise<DbCertification[]> {
  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as DbCertification[];
}

export async function fetchCertifications(
  supabase: SupabaseClient,
): Promise<Certification[]> {
  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as DbCertification[]).map(mapDbToCertification);
}

export async function createCertification(
  supabase: SupabaseClient,
  data: {
    title: string;
    issuer: string;
    category: string;
    date: string;
    cert_url?: string | null;
    image_url?: string | null;
    credential_id?: string | null;
  },
): Promise<Certification> {
  const now = new Date().toISOString();
  const { data: result, error } = await supabase
    .from("certifications")
    .insert({
      title: data.title,
      issuer: data.issuer,
      date: data.date,
      date_sort: data.date,
      category: data.category,
      issuer_logo: sanitizeUrl(data.image_url),
      credential_url: sanitizeUrl(data.cert_url),
      credential_id: data.credential_id ?? null,
      sort_order: 0,
      is_published: true,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapDbToCertification(result as DbCertification);
}

export async function createCertificationRow(
  supabase: SupabaseClient,
  data: Partial<DbCertification> & { title: string; issuer: string; date: string },
): Promise<DbCertification> {
  const now = new Date().toISOString();
  const { data: result, error } = await supabase
    .from("certifications")
    .insert({
      title: data.title,
      issuer: data.issuer,
      date: data.date,
      date_sort: data.date_sort ?? data.date,
      category: data.category ?? "",
      issuer_logo: data.issuer_logo ?? null,
      credential_url: data.credential_url ?? null,
      credential_id: data.credential_id ?? null,
      sort_order: data.sort_order ?? 0,
      is_published: data.is_published ?? true,
      created_at: now,
      updated_at: now,
    } as InsertCertification)
    .select("*")
    .single();
  if (error) throw error;
  return result as DbCertification;
}

export async function updateCertification(
  supabase: SupabaseClient,
  id: string,
  data: {
    title?: string;
    issuer?: string;
    category?: string;
    date?: string;
    cert_url?: string | null;
    image_url?: string | null;
    credential_id?: string | null;
  },
): Promise<Certification> {
  const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
  if (data.date) {
    updateData.date_sort = data.date;
  }
  if (data.image_url !== undefined) {
    updateData.issuer_logo = sanitizeUrl(data.image_url);
  }
  if (data.cert_url !== undefined) {
    updateData.credential_url = sanitizeUrl(data.cert_url);
  }
  const { data: result, error } = await supabase
    .from("certifications")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapDbToCertification(result as DbCertification);
}

export async function updateCertificationRow(
  supabase: SupabaseClient,
  id: string,
  data: Partial<DbCertification>,
): Promise<DbCertification> {
  const now = new Date().toISOString();
  const { data: result, error } = await supabase
    .from("certifications")
    .update({ ...data, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return result as DbCertification;
}

export async function deleteCertification(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("certifications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}