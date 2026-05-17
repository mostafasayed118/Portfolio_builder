import { jsPDF } from "jspdf";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateQRCode } from "./qrcode";

interface CvData {
  name: string;
  roles: string[];
  heading: string;
  description: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  location: string;
  yearsOfExperience: number;
  bio1: string;
  bio2: string;
  degree: string;
  school: string;
  grade: string;
  educationYears: string;
  experience: Array<{
    title: string;
    company: string;
    period: string;
    description: string[];
    technologies: string[];
  }>;
  skills: Array<{
    name: string;
    proficiency: number;
    category: string;
  }>;
  certifications: Array<{
    title: string;
    issuer: string;
    date: string;
  }>;
}

async function fetchCvData(supabase: SupabaseClient): Promise<CvData> {
  const [heroResult, aboutResult, expResult, skillsResult, certsResult] =
    await Promise.allSettled([
      supabase.from("hero_content").select("*").limit(1).maybeSingle(),
      supabase.from("about_content").select("*").limit(1).maybeSingle(),
      supabase
        .from("experience")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("skills")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("certifications")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

  const hero =
    heroResult.status === "fulfilled" ? heroResult.value.data : null;
  const about =
    aboutResult.status === "fulfilled" ? aboutResult.value.data : null;
  const experienceItems =
    expResult.status === "fulfilled" ? (expResult.value.data ?? []) : [];
  const skillItems =
    skillsResult.status === "fulfilled" ? (skillsResult.value.data ?? []) : [];
  const certItems =
    certsResult.status === "fulfilled" ? (certsResult.value.data ?? []) : [];

  return {
    name: hero?.name ?? "Mustafa Sayed",
    roles: hero?.roles ?? ["Data Engineer"],
    heading: hero?.heading ?? "Hi, I'm",
    description: hero?.description ?? "",
    email: hero?.email ?? "",
    github_url: hero?.github_url ?? "",
    linkedin_url: hero?.linkedin_url ?? "",
    location: about?.location ?? "Cairo, Egypt",
    yearsOfExperience: about?.years_of_experience ?? 1,
    bio1: about?.bio1 ?? "",
    bio2: about?.bio2 ?? "",
    degree: about?.degree ?? "",
    school: about?.school ?? "",
    grade: about?.grade ?? "",
    educationYears: about?.education_years ?? "",
    experience: (experienceItems as Array<{
      title: string;
      company: string;
      period?: string;
      description?: string[];
      technologies?: string[];
    }>).map((e) => ({
      title: e.title,
      company: e.company,
      period: e.period ?? "",
      description: e.description ?? [],
      technologies: e.technologies ?? [],
    })),
    skills: (skillItems as Array<{
      name: string;
      proficiency: number;
      category?: string;
    }>).map((s) => ({
      name: s.name,
      proficiency: s.proficiency,
      category: s.category ?? "General",
    })),
    certifications: (certItems as Array<{
      title: string;
      issuer?: string;
      date: string;
    }>).map((c) => ({
      title: c.title,
      issuer: c.issuer ?? "",
      date: c.date,
    })),
  };
}

export async function generateCvPdf(
  supabase: SupabaseClient,
  portfolioUrl: string,
): Promise<Uint8Array> {
  const data = await fetchCvData(supabase);

  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await generateQRCode(portfolioUrl, {
      size: 100,
      darkColor: "#1a1a2e",
      lightColor: "#ffffff",
    });
  } catch {
    // QR generation failure — generate CV without QR
  }

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function addSectionTitle(title: string) {
    checkPageBreak(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 60);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(50, 100, 180);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  }

  // --- QR Code (top right) ---
  if (qrDataUrl) {
    const qrSize = 22;
    doc.addImage(
      qrDataUrl,
      "PNG",
      pageWidth - margin - qrSize,
      margin - 2,
      qrSize,
      qrSize,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Scan to view portfolio",
      pageWidth - margin - qrSize / 2,
      margin + qrSize + 2,
      { align: "center" },
    );
  }

  // --- Header: Name + Title ---
  const fullName = data.name;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 30, 60);
  doc.text(fullName, margin, y);
  y += 7;

  if (data.roles.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 100);
    doc.text(data.roles.join(" · "), margin, y);
    y += 5;
  }

  // --- Contact bar ---
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 120);
  const contactParts: string[] = [];
  if (data.email) contactParts.push(data.email);
  if (data.github_url) contactParts.push(data.github_url.replace("https://", ""));
  if (data.linkedin_url) contactParts.push(data.linkedin_url.replace("https://", ""));
  if (data.location) contactParts.push(data.location);
  doc.text(contactParts.join("  |  "), margin, y);
  y += 8;

  // --- Divider ---
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- Professional Summary ---
  if (data.bio1 || data.description) {
    addSectionTitle("Professional Summary");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 80);
    const summary = data.bio1 || data.description;
    const lines = doc.splitTextToSize(summary, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // --- Experience ---
  if (data.experience.length > 0) {
    addSectionTitle("Experience");
    for (const exp of data.experience) {
      checkPageBreak(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 70);
      doc.text(exp.title, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 100);
      const companyLine = exp.company + (exp.period ? `  |  ${exp.period}` : "");
      doc.text(companyLine, margin, y + 4);
      y += 9;

      if (exp.description.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(70, 70, 90);
        for (const desc of exp.description) {
          checkPageBreak(5);
          const wrap = doc.splitTextToSize(`• ${desc}`, contentWidth - 5);
          doc.text(wrap, margin + 3, y);
          y += wrap.length * 4;
        }
      }

      if (exp.technologies.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 120);
        doc.text(`Technologies: ${exp.technologies.join(", ")}`, margin + 3, y);
        y += 5;
      }

      y += 2;
    }
  }

  // --- Skills ---
  if (data.skills.length > 0) {
    addSectionTitle("Skills");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 80);
    const skillGroups = new Map<string, string[]>();
    for (const skill of data.skills) {
      const group = skillGroups.get(skill.category) ?? [];
      group.push(skill.name);
      skillGroups.set(skill.category, group);
    }
    for (const [category, names] of skillGroups) {
      checkPageBreak(5);
      doc.setFont("helvetica", "bold");
      doc.text(`${category}: `, margin, y);
      doc.setFont("helvetica", "normal");
      const textWidth =
        (doc.getStringUnitWidth(`${category}: `) * 8) /
        doc.internal.scaleFactor;
      doc.text(names.join(", "), margin + textWidth, y);
      y += 5;
    }
    y += 2;
  }

  // --- Education ---
  if (data.degree) {
    addSectionTitle("Education");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 70);
    doc.text(data.degree, margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 100);
    const eduParts = [data.school, data.grade, data.educationYears].filter(
      Boolean,
    );
    doc.text(eduParts.join("  |  "), margin, y);
    y += 6;
  }

  // --- Certifications ---
  if (data.certifications.length > 0) {
    addSectionTitle("Certifications");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 80);
    for (const cert of data.certifications.slice(0, 8)) {
      checkPageBreak(5);
      doc.text(
        `• ${cert.title}${cert.issuer ? ` — ${cert.issuer}` : ""}${cert.date ? ` (${cert.date})` : ""}`,
        margin + 2,
        y,
      );
      y += 4.5;
    }
  }

  // --- Footer ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 160);
  doc.text(
    `Generated from ${portfolioUrl} · Scan QR code above to view full portfolio`,
    margin,
    pageHeight - 10,
  );

  return Buffer.from(doc.output("arraybuffer"));
}
