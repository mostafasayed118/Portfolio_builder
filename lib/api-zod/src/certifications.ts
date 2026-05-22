import { z } from "zod";

export const certificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  issuer: z.string().min(1, "Issuer is required"),
  title_ar: z.string().optional().or(z.null()),
  issuer_ar: z.string().optional().or(z.null()),
  issuer_logo: z.string().url().optional().or(z.literal("")).or(z.null()),
  date: z.string().min(1, "Date is required"),
  date_sort: z.string().optional().or(z.null()),
  category: z.string().optional().or(z.null()),
  credential_url: z.string().url().optional().or(z.literal("")).or(z.null()),
  credential_id: z.string().optional().or(z.null()),
  sort_order: z.number().int().optional(),
  is_published: z.boolean().optional(),
  skills: z.array(z.string()).max(20).optional(),
});

export type CertificationInput = z.infer<typeof certificationSchema>;
