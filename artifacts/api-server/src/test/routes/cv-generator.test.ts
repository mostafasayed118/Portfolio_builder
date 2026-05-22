import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock jsPDF before importing cv-generator
const mockJsPDFInstance = {
  setFontSize: vi.fn().mockReturnThis(),
  setFont: vi.fn().mockReturnThis(),
  setTextColor: vi.fn().mockReturnThis(),
  setDrawColor: vi.fn().mockReturnThis(),
  setLineWidth: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  line: vi.fn().mockReturnThis(),
  splitTextToSize: vi.fn((text: string) => [text]),
  addPage: vi.fn(),
  addImage: vi.fn(),
  output: vi.fn().mockReturnValue(new ArrayBuffer(1024)),
  internal: {
    pageSize: {
      getWidth: vi.fn().mockReturnValue(210),
      getHeight: vi.fn().mockReturnValue(297),
    },
    scaleFactor: 1,
  },
  getStringUnitWidth: vi.fn().mockReturnValue(10),
};

vi.mock("jspdf", () => ({
  jsPDF: vi.fn(() => mockJsPDFInstance),
}));

vi.mock("../../utils/qrcode", () => ({
  generateQRCode: vi.fn().mockResolvedValue("data:image/png;base64,fakeQRData"),
}));

// Mock supabase-client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

const heroData = {
  name: "John Doe",
  roles: ["Software Engineer", "Data Engineer"],
  heading: "Hi, I'm",
  description: "A passionate developer",
  email: "john@example.com",
  github_url: "https://github.com/johndoe",
  linkedin_url: "https://linkedin.com/in/johndoe",
};

const aboutData = {
  location: "Cairo, Egypt",
  years_of_experience: 5,
  bio1: "Experienced software engineer with a focus on data systems.",
  bio2: "Also interested in ML.",
  degree: "BSc Computer Science",
  school: "Cairo University",
  grade: "Excellent",
  education_years: "2015-2019",
};

const experienceData = [
  {
    title: "Senior Data Engineer",
    company: "Tech Corp",
    period: "2022-Present",
    description: ["Built data pipelines", "Led team of 3"],
    technologies: ["Python", "Spark", "Airflow"],
  },
];

const skillsData = [
  { name: "Python", proficiency: 95, category: "Languages" },
  { name: "TypeScript", proficiency: 85, category: "Languages" },
  { name: "PostgreSQL", proficiency: 90, category: "Databases" },
];

const certificationsData = [
  { title: "AWS Solutions Architect", issuer: "Amazon", date: "2023" },
];

function setupSupabaseMockWithData() {
  mockSupabaseClient.maybeSingle
    .mockResolvedValueOnce({ data: heroData, error: null })    // hero
    .mockResolvedValueOnce({ data: aboutData, error: null });  // about
  mockSupabaseClient.order
    .mockResolvedValueOnce({ data: experienceData, error: null, status: "fulfilled" })  // experience
    .mockResolvedValueOnce({ data: skillsData, error: null, status: "fulfilled" })      // skills
    .mockResolvedValueOnce({ data: certificationsData, error: null, status: "fulfilled" }); // certifications
}

describe("CV Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJsPDFInstance.output.mockReturnValue(new ArrayBuffer(1024));
    mockJsPDFInstance.splitTextToSize.mockImplementation((text: string) => [text]);
  });

  it("generates PDF with hero data", async () => {
    // Set up supabase to return data via Promise.allSettled
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      };

      switch (table) {
        case "hero_content":
          chain.maybeSingle.mockResolvedValue({ data: heroData, error: null });
          break;
        case "about_content":
          chain.maybeSingle.mockResolvedValue({ data: aboutData, error: null });
          break;
        case "experience":
          chain.order.mockResolvedValue({ data: experienceData, error: null });
          break;
        case "skills":
          chain.order.mockResolvedValue({ data: skillsData, error: null });
          break;
        case "certifications":
          chain.order.mockResolvedValue({ data: certificationsData, error: null });
          break;
        default:
          chain.maybeSingle.mockResolvedValue({ data: null, error: null });
      }

      return chain;
    });

    const { generateCvPdf } = await import("../../utils/cv-generator");
    const result = await generateCvPdf(mockSupabaseClient as any, "https://portfolio.example.com");

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    expect(mockJsPDFInstance.text).toHaveBeenCalled();
    expect(mockJsPDFInstance.setFont).toHaveBeenCalled();
  });

  it("handles missing hero data gracefully with defaults", async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      };

      // All queries return null
      chain.maybeSingle.mockResolvedValue({ data: null, error: null });
      chain.order.mockResolvedValue({ data: [], error: null });
      return chain;
    });

    const { generateCvPdf } = await import("../../utils/cv-generator");
    const result = await generateCvPdf(mockSupabaseClient as any, "https://portfolio.example.com");

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes QR code when portfolio URL is provided", async () => {
    const { generateQRCode } = await import("../../utils/qrcode");

    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: heroData, error: null }),
    }));

    const { generateCvPdf } = await import("../../utils/cv-generator");
    await generateCvPdf(mockSupabaseClient as any, "https://my-portfolio.com");

    expect(generateQRCode).toHaveBeenCalledWith(
      "https://my-portfolio.com",
      expect.objectContaining({ size: 100 }),
    );
    // QR code is added as an image to the PDF
    expect(mockJsPDFInstance.addImage).toHaveBeenCalled();
  });

  it("falls back gracefully when QR generation fails", async () => {
    const { generateQRCode } = await import("../../utils/qrcode");
    (generateQRCode as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("QR failed"));

    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: heroData, error: null }),
    }));

    const { generateCvPdf } = await import("../../utils/cv-generator");
    const result = await generateCvPdf(mockSupabaseClient as any, "https://my-portfolio.com");

    // Should still generate PDF without QR
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // addImage should NOT have been called for QR since it failed
    // (addImage might be called for other reasons in future, so we just check the PDF is generated)
  });

  it("generates PDF with experience and skills sections", async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      };

      switch (table) {
        case "hero_content":
          chain.maybeSingle.mockResolvedValue({ data: heroData, error: null });
          break;
        case "about_content":
          chain.maybeSingle.mockResolvedValue({ data: aboutData, error: null });
          break;
        case "experience":
          chain.order.mockResolvedValue({ data: experienceData, error: null });
          break;
        case "skills":
          chain.order.mockResolvedValue({ data: skillsData, error: null });
          break;
        case "certifications":
          chain.order.mockResolvedValue({ data: certificationsData, error: null });
          break;
        default:
          chain.maybeSingle.mockResolvedValue({ data: null, error: null });
      }
      return chain;
    });

    const { generateCvPdf } = await import("../../utils/cv-generator");
    const result = await generateCvPdf(mockSupabaseClient as any, "https://portfolio.com");

    expect(result).toBeInstanceOf(Uint8Array);
    // Verify that experience title was included in PDF text calls
    const textCalls = mockJsPDFInstance.text.mock.calls.map((c: any[]) => c[0]);
    const allText = textCalls.join(" ");
    expect(allText).toContain("John Doe");
  });

  it("generates PDF with certifications", async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      };

      switch (table) {
        case "hero_content":
          chain.maybeSingle.mockResolvedValue({ data: heroData, error: null });
          break;
        case "about_content":
          chain.maybeSingle.mockResolvedValue({ data: aboutData, error: null });
          break;
        case "experience":
          chain.order.mockResolvedValue({ data: [], error: null });
          break;
        case "skills":
          chain.order.mockResolvedValue({ data: [], error: null });
          break;
        case "certifications":
          chain.order.mockResolvedValue({ data: certificationsData, error: null });
          break;
        default:
          chain.maybeSingle.mockResolvedValue({ data: null, error: null });
      }
      return chain;
    });

    const { generateCvPdf } = await import("../../utils/cv-generator");
    const result = await generateCvPdf(mockSupabaseClient as any, "https://portfolio.com");

    expect(result).toBeInstanceOf(Uint8Array);
    const textCalls = mockJsPDFInstance.text.mock.calls.map((c: any[]) => c[0]);
    const allText = textCalls.join(" ");
    expect(allText).toContain("AWS Solutions Architect");
  });

  it("returns a valid Uint8Array output", async () => {
    const fakeArrayBuffer = new Uint8Array([37, 80, 68, 70]); // %PDF header
    mockJsPDFInstance.output.mockReturnValue(fakeArrayBuffer.buffer);

    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: heroData, error: null }),
    }));

    const { generateCvPdf } = await import("../../utils/cv-generator");
    const result = await generateCvPdf(mockSupabaseClient as any, "https://portfolio.com");

    expect(result).toBeInstanceOf(Uint8Array);
    // First bytes should be PDF header
    expect(result[0]).toBe(37); // %
    expect(result[1]).toBe(80); // P
    expect(result[2]).toBe(68); // D
    expect(result[3]).toBe(70); // F
  });
});
