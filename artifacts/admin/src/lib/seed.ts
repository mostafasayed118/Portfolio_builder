import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@workspace/supabase/admin";
import { upsertHeroContent } from "@workspace/db/hero-content";
import { listSkills, createSkill } from "@workspace/db/skills";
import { listExperience, createExperience } from "@workspace/db/experience";
import { listCertifications, createCertificationRow } from "@workspace/db/certifications";
import { listProjects, createProject } from "@workspace/db/projects";
import { fetchAboutContent, upsertAboutContent } from "@workspace/db/about";
import type { InsertSkill, InsertExperience, InsertCertification, InsertProject } from "@workspace/supabase/types";

const HERO = {
  heading: "Hi, I'm",
  name: "Mustafa Sayed",
  roles: [
    "Data Engineer",
    "Python Developer",
    "Full-Stack Developer",
    "ETL Specialist",
    "Web Scraping Expert",
    "Azure Cloud Practitioner",
  ],
  description:
    "Software & Data Engineer passionate about building scalable web platforms with Next.js, cross-platform mobile apps with Flutter, and robust ETL pipelines using Python, SQL, and Azure.",
  github: "https://github.com/mustafa-sayed",
  linkedin: "https://www.linkedin.com/in/mustafa-sayed",
  email: "mustafasayed20002@gmail.com",
};

const ABOUT_DATA = {
  bio1: "I'm a Data Engineer from Cairo, Egypt, graduated with Very Good with Honors from Obour High Institute of Computer Science. I specialise in building automated data pipelines, web scraping systems, and cloud-native ETL solutions.",
  bio2: "Currently expanding my skills through the Microsoft DEPI scholarship, where I work with Azure Data Factory, Synapse Analytics, and large-scale data transformation workflows.",
  location: "Cairo, Egypt",
  yearsOfExperience: 1,
  education: {
    degree: "B.Sc. Computer Science",
    school: "Obour High Institute of Computer Science",
    grade: "Very Good with Honors",
    years: "2020 – 2024",
  },
  languages: [
    { lang: "Arabic", level: "Native", pct: 100 },
    { lang: "English", level: "B2 Upper-Intermediate", pct: 72 },
  ],
};

const SKILL_CATEGORIES = [
  {
    key: "languages",
    label: "Languages",
    color: "blue",
    skills: [
      { name: "Python", proficiency: 95, icon: "🐍" },
      { name: "SQL", proficiency: 87, icon: "🗄️" },
      { name: "JavaScript", proficiency: 82, icon: "🟨" },
      { name: "TypeScript", proficiency: 80, icon: "🔷" },
      { name: "HTML / CSS", proficiency: 85, icon: "🌐" },
      { name: "Dart", proficiency: 73, icon: "🎯" },
      { name: "C++", proficiency: 68, icon: "⚙️" },
      { name: "Bash Script", proficiency: 65, icon: "🖥️" },
    ],
  },
  {
    key: "frameworks",
    label: "Frameworks",
    color: "cyan",
    skills: [
      { name: "BeautifulSoup", proficiency: 93, icon: "🍵" },
      { name: "Pandas", proficiency: 90, icon: "🐼" },
      { name: "Next.js", proficiency: 83, icon: "▲" },
      { name: "React", proficiency: 80, icon: "⚛️" },
      { name: "Flutter", proficiency: 80, icon: "💙" },
      { name: "Tailwind CSS", proficiency: 85, icon: "🎨" },
      { name: "BLoC / Cubit", proficiency: 76, icon: "🧱" },
      { name: "Shadcn/UI", proficiency: 72, icon: "🪟" },
    ],
  },
  {
    key: "cloud",
    label: "Cloud",
    color: "indigo",
    skills: [
      { name: "Microsoft Azure", proficiency: 80, icon: "☁️" },
      { name: "Azure Data Factory", proficiency: 78, icon: "🏭" },
      { name: "Azure Synapse Analytics", proficiency: 75, icon: "🔬" },
      { name: "Azure Data Lake Gen2", proficiency: 75, icon: "🏔️" },
      { name: "Cloud Computing", proficiency: 70, icon: "🌤️" },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    color: "violet",
    skills: [
      { name: "Data Engineering", proficiency: 86, icon: "🛠️" },
      { name: "ETL Pipelines", proficiency: 83, icon: "🔄" },
      { name: "Data Analysis", proficiency: 82, icon: "📊" },
      { name: "Jupyter Notebooks", proficiency: 80, icon: "📒" },
      { name: "Power BI", proficiency: 73, icon: "📈" },
      { name: "Tableau", proficiency: 70, icon: "📉" },
      { name: "Prompt Engineering", proficiency: 68, icon: "🤖" },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    color: "emerald",
    skills: [
      { name: "Git & GitHub", proficiency: 88, icon: "🐙" },
      { name: "REST APIs", proficiency: 86, icon: "🔌" },
      { name: "OOP", proficiency: 85, icon: "🧩" },
      { name: "Clean Architecture", proficiency: 78, icon: "🏛️" },
      { name: "Convex", proficiency: 80, icon: "⚡" },
      { name: "Clerk Auth", proficiency: 73, icon: "🔐" },
      { name: "JWT / Jose", proficiency: 68, icon: "🪙" },
      { name: "Microsoft Office", proficiency: 80, icon: "📋" },
    ],
  },
];

const PROJECTS = [
  {
    slug: "depi-azure-data-engineering",
    title: "DEPI Azure Data Engineering Capstone",
    description: "End-to-end cloud data pipeline built during the Microsoft DEPI scholarship.",
    fullDescription: "This capstone project demonstrates a complete cloud-native data engineering pipeline built entirely within the Microsoft Azure ecosystem. It ingests raw data from multiple sources, transforms it using Azure Data Factory and Synapse Analytics, stores it in Azure Data Lake Gen2, and visualises the results in Power BI.",
    challenges: "Handling large-scale data transformations efficiently while maintaining cost-effectiveness. Implementing proper data governance and Delta Lake versioning.",
    outcome: "Built a production-ready pipeline processing millions of records daily, with comprehensive monitoring and alerting. Achieved Azure Data Engineer Associate certification.",
    techStack: ["Azure Data Factory", "Azure Synapse", "Azure Data Lake Gen2", "SQL", "Python", "Power BI"],
    category: "cloud",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Cloud-native ETL", "Azure DP-900 certified", "Production-grade pipeline"],
    liveUrl: undefined,
    completedAt: "2025-12",
  },
  {
    slug: "aqarmap-real-estate-scraper",
    title: "AqarMap Real Estate Scraper & Analysis",
    description: "Comprehensive real estate data pipeline for AqarMap.com with EDA and visualizations.",
    fullDescription: "A comprehensive data pipeline that scrapes real estate listings from AqarMap.com, performs exploratory data analysis, and generates visual insights into Cairo's property market.",
    challenges: "Handling anti-scraping measures and CAPTCHAs while maintaining high success rate. Processing large datasets efficiently for meaningful insights.",
    outcome: "Created a comprehensive Cairo real estate dataset with 10,000+ listings, enabling data-driven market analysis and price predictions.",
    techStack: ["Python", "BeautifulSoup", "Pandas", "Matplotlib", "Jupyter"],
    category: "scraping",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    liveUrl: undefined,
    metrics: ["Cairo market coverage", "Price trend visualisation", "Geo-segmented analysis"],
    completedAt: "2025-10",
  },
  {
    slug: "isagha-e-commerce-data-pipeline",
    title: "Isagha E-Commerce Data Pipeline",
    description: "Automated scraping and structuring of product data for e-commerce analytics.",
    fullDescription: "An automated data pipeline that scrapes e-commerce product data, structures it into a clean format, and prepares it for BI analytics.",
    challenges: "Handling dynamic content loading and pagination. Ensuring data quality and consistency across different product categories.",
    outcome: "Built a scalable scraping solution processing over 1,000 products daily, feeding a competitive pricing dashboard.",
    techStack: ["Python", "Requests", "BeautifulSoup", "Pandas", "Jupyter"],
    category: "scraping",
    githubUrl: "https://github.com/mustafa-sayed",
    liveUrl: undefined,
    metrics: ["1,000+ products scraped", "Automated scheduling", "Clean BI-ready export"],
    completedAt: "2025-08",
  },
  {
    slug: "yalakora-sports-news-scraper",
    title: "YalaKora Sports News Scraper",
    description: "Date-filtered sports news scraper with JSON output for trend analysis.",
    fullDescription: "A date-filtered sports news scraper that collects articles from YalaKora, structures them as JSON, and enables trend analysis over time.",
    challenges: "Parsing complex HTML structures with varying formats. Implementing efficient date filtering logic.",
    outcome: "Created an automated news collection system powering a sports trend analysis dashboard with daily updates.",
    techStack: ["Python", "BeautifulSoup", "JSON", "Pandas", "Automation"],
    category: "scraping",
    githubUrl: "https://github.com/mustafa-sayed",
    liveUrl: undefined,
    metrics: ["Daily automation", "Multi-date filtering", "Structured JSON output"],
    completedAt: "2025-07",
  },
  {
    slug: "aloustaz-store-pos",
    title: "Aloustaz Store — POS System",
    description: "Full-stack Point-of-Sale web application with real-time analytics.",
    fullDescription: "A modern Point-of-Sale web application built with Next.js, featuring real-time inventory management, sales analytics, and a responsive tablet-optimised interface.",
    challenges: "Designing an intuitive POS interface that works efficiently on tablets. Implementing real-time inventory updates across multiple devices.",
    outcome: "Deployed a fully functional POS system used daily by retail staff, improving checkout speed by 40%.",
    techStack: ["Next.js", "Convex", "Clerk", "TanStack Table", "Recharts", "Tailwind CSS"],
    category: "web",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    liveUrl: undefined,
    metrics: ["Real-time data sync", "Secure auth with Clerk", "Analytics dashboards"],
    completedAt: "2025-06",
  },
  {
    slug: "al-hakim-store-ecommerce",
    title: "Al-Hakim Store — E-Commerce Platform",
    description: "Modern e-commerce platform with real-time sync and secure checkout.",
    fullDescription: "A feature-rich e-commerce platform with real-time product synchronisation, secure checkout, and webhook-based order processing.",
    challenges: "Building a smooth checkout flow while maintaining security. Handling concurrent inventory updates efficiently.",
    outcome: "Launched a fully functional e-commerce store with 500+ products and integrated payment processing.",
    techStack: ["Next.js", "Convex", "Clerk", "Svix", "Tailwind CSS"],
    category: "web",
    githubUrl: "https://github.com/mustafa-sayed",
    liveUrl: undefined,
    metrics: ["Real-time product sync", "Secure checkout", "Webhook integration"],
    completedAt: "2025-05",
  },
  {
    slug: "home-management-property-system",
    title: "Home Management — Property System",
    description: "Full-stack property management with custom JWT authentication.",
    fullDescription: "A comprehensive property management system featuring custom JWT authentication, email verification, and real-time property tracking.",
    challenges: "Building a secure authentication system from scratch. Implementing email verification and password reset flows.",
    outcome: "Created a property management solution serving 50+ properties with automated rent tracking and maintenance workflows.",
    techStack: ["Next.js", "Convex", "JWT", "Bcryptjs", "Nodemailer", "Tailwind CSS"],
    category: "web",
    githubUrl: "https://github.com/mustafa-sayed",
    liveUrl: undefined,
    metrics: ["Custom JWT auth", "Email verification", "Real-time updates"],
    completedAt: "2025-04",
  },
  {
    slug: "chatterbox-ai-chat",
    title: "ChatterBox AI Chat App",
    description: "AI-powered chat application with Flutter and Google Generative AI.",
    fullDescription: "A cross-platform AI chat application built with Flutter, leveraging Google Generative AI for intelligent conversations and BLoC for state management.",
    challenges: "Integrating AI models efficiently on mobile while maintaining performance. Managing complex state with BLoC.",
    outcome: "Published a chat application with 10,000+ downloads, featuring AI-powered responses and personalized user experience.",
    techStack: ["Flutter", "Dart", "Bloc", "Google Generative AI", "Local Notifications"],
    category: "mobile",
    githubUrl: "https://github.com/mustafa-sayed",
    liveUrl: undefined,
    metrics: ["AI-powered chat", "BLoC state management", "Push notifications"],
    completedAt: "2025-03",
  },
];

const EXPERIENCE = [
  {
    title: "Data Engineer Trainee",
    company: "Microsoft DEPI Scholarship",
    location: "Cairo, Egypt (Remote)",
    period: "Aug 2025 – Dec 2025",
    description: [
      "Completed a rigorous data engineering track co-sponsored by Microsoft Egypt and the Egyptian Ministry of Communications.",
      "Designed and deployed end-to-end pipelines using Azure Data Lake Gen2, Azure Data Factory, and Azure Synapse Analytics.",
      "Gained hands-on experience in SQL, Python, Data Warehousing, and Prompt Engineering for AI.",
      "Delivered a capstone project ingesting, transforming, and visualising large datasets in the Azure ecosystem.",
      "Earned Microsoft Azure Data Fundamentals (DP-900) and Data Engineer Associate certifications.",
    ],
    technologies: ["Azure Data Factory", "Azure Synapse Analytics", "Azure Data Lake Gen2", "Python", "SQL"],
    type: "internship" as const,
  },
  {
    title: "Google Data Analytics Professional Certificate",
    company: "Coursera — Google",
    location: "Online",
    period: "2023",
    description: [
      "Completed the 8-course Google Data Analytics Professional Certificate (240+ hours).",
      "Mastered the full analytics workflow: Ask, Prepare, Process, Analyse, Share, and Act.",
      "Gained hands-on experience with SQL, R (tidyverse, ggplot2), Tableau, and Google Sheets.",
      "Capstone: cleaned and analysed Cyclistic bike-share data with Tableau dashboards and stakeholder recommendations.",
    ],
    technologies: ["SQL", "R", "Tableau", "Google Sheets", "BigQuery"],
    type: "certification" as const,
  },
  {
    title: "Volunteer — Data & Technology Community",
    company: "GDSC Obour Institute · IEEE BUB SB",
    location: "Obour, Egypt",
    period: "2023 – 2024",
    description: [
      "Organised data science workshops and coding sessions for 100+ students at Obour Institute.",
      "Mentored peers in Python programming, SQL fundamentals, and data analysis techniques.",
      "Coordinated technical events in collaboration with GDSC and the IEEE student branch.",
      "Participant in NASA Space Apps Benha competition.",
    ],
    technologies: ["Python", "SQL", "Data Analysis"],
    type: "volunteer" as const,
  },
];

const CERTIFICATIONS = [
  {
    title: "Intermediate Python for Developers",
    issuer: "DataCamp",
    issuerLogo: "🎓",
    date: "Apr 2026",
    dateSort: "2026-04",
    category: "python" as const,
    credentialUrl: "https://www.datacamp.com",
  },
  {
    title: "Understanding Cloud Computing",
    issuer: "DataCamp",
    issuerLogo: "🎓",
    date: "Apr 2026",
    dateSort: "2026-04",
    category: "cloud" as const,
    credentialUrl: "https://www.datacamp.com",
  },
  {
    title: "Python for Data Engineering",
    issuer: "IBM",
    issuerLogo: "🔵",
    date: "Mar 2026",
    dateSort: "2026-03",
    category: "data-engineering" as const,
    credentialUrl: "https://www.coursera.org",
  },
  {
    title: "Python for Data Science, AI & Development",
    issuer: "IBM",
    issuerLogo: "🔵",
    date: "Mar 2026",
    dateSort: "2026-03",
    category: "ai" as const,
    credentialUrl: "https://www.coursera.org",
  },
  {
    title: "Microsoft Data Engineer Associate",
    issuer: "Microsoft",
    issuerLogo: "🪟",
    date: "Dec 2025",
    dateSort: "2025-12",
    category: "data-engineering" as const,
    credentialUrl: "https://microsoft.com",
  },
];

export type SeedProgress = {
  step: "hero" | "about" | "skills" | "projects" | "experience" | "certifications";
  status: "pending" | "running" | "done" | "error";
  count?: number;
  error?: string;
};

export async function seedFromStaticData(
  onProgress: (progress: SeedProgress[]) => void,
  supabase?: SupabaseClient,
): Promise<{ success: boolean; summary: Record<string, number>; errors: string[] }> {
  const db = supabase ?? getAdminSupabase();
  const errors: string[] = [];
  const summary: Record<string, number> = {};

  const steps: SeedProgress[] = [
    { step: "hero", status: "pending" },
    { step: "about", status: "pending" },
    { step: "skills", status: "pending" },
    { step: "projects", status: "pending" },
    { step: "experience", status: "pending" },
    { step: "certifications", status: "pending" },
  ];

  const updateProgress = (step: SeedProgress["step"], status: SeedProgress["status"], count?: number, error?: string) => {
    const idx = steps.findIndex((s) => s.step === step);
    if (idx >= 0) {
      steps[idx] = { step, status, count, error };
      onProgress([...steps]);
    }
  };

  try {
    updateProgress("hero", "running");
    try {
      await upsertHeroContent(db, {
        heading: HERO.heading,
        name: HERO.name,
        roles: HERO.roles,
        description: HERO.description,
        github_url: HERO.github,
        linkedin_url: HERO.linkedin,
        email: HERO.email,
      });
      summary.hero = 1;
      updateProgress("hero", "done", 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Hero: ${msg}`);
      updateProgress("hero", "error", undefined, msg);
    }

    updateProgress("about", "running");
    try {
      const existing = await fetchAboutContent(db);
      const education = [
        {
          degree: ABOUT_DATA.education.degree,
          institution: ABOUT_DATA.education.school,
          year: ABOUT_DATA.education.years,
        },
      ];
      const languages = ABOUT_DATA.languages.map((l) => ({
        name: l.lang,
        level: l.pct,
      }));
      const bio = `${ABOUT_DATA.bio1}\n\n${ABOUT_DATA.bio2}`;

      if (existing) {
        await upsertAboutContent(db, {
          bio,
          education,
          languages,
          interests: [],
        });
      } else {
        await upsertAboutContent(db, {
          bio,
          education,
          languages,
          interests: [],
        });
      }
      summary.about = 1;
      updateProgress("about", "done", 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`About: ${msg}`);
      updateProgress("about", "error", undefined, msg);
    }

    updateProgress("skills", "running");
    try {
      const existingSkills = await listSkills(db);
      const existingNames = new Set(existingSkills.map((s) => s.name.toLowerCase()));
      let skillCount = 0;

      for (const cat of SKILL_CATEGORIES) {
        for (const skill of cat.skills) {
          if (!existingNames.has(skill.name.toLowerCase())) {
            await createSkill(db, {
              name: skill.name,
              category: cat.key,
              proficiency: skill.proficiency,
              icon: skill.icon ?? null,
              sort_order: skillCount,
              is_visible: true,
            });
            skillCount++;
          }
        }
      }
      summary.skills = skillCount;
      updateProgress("skills", "done", skillCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Skills: ${msg}`);
      updateProgress("skills", "error", undefined, msg);
    }

    updateProgress("projects", "running");
    try {
      const existingProjects = await listProjects(db);
      const existingSlugs = new Set(existingProjects.map((p) => p.slug).filter(Boolean));
      let projectCount = 0;

      for (const p of PROJECTS) {
        if (!existingSlugs.has(p.slug)) {
          await createProject(db, {
            title: p.title,
            slug: p.slug,
            description: p.description,
            full_description: p.fullDescription ?? null,
            challenges: p.challenges ?? null,
            outcome: p.outcome ?? null,
            completed_at: p.completedAt ?? null,
            category: p.category,
            tech_stack: p.techStack,
            tags: [],
            featured: p.featured ?? false,
            github_url: p.githubUrl,
            live_url: p.liveUrl ?? null,
            metrics: p.metrics ?? [],
            sort_order: projectCount,
            is_published: true,
          });
          projectCount++;
        }
      }
      summary.projects = projectCount;
      updateProgress("projects", "done", projectCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Projects: ${msg}`);
      updateProgress("projects", "error", undefined, msg);
    }

    updateProgress("experience", "running");
    try {
      const existingExp = await listExperience(db);
      const existingTitles = new Set(existingExp.map((e) => `${e.title}|${e.company}`));
      let expCount = 0;

      for (const e of EXPERIENCE) {
        const key = `${e.title}|${e.company}`;
        if (!existingTitles.has(key)) {
          await createExperience(db, {
            title: e.title,
            company: e.company,
            location: e.location,
            period: e.period,
            description: e.description,
            technologies: e.technologies,
            type: e.type,
            sort_order: expCount,
            is_published: true,
          });
          expCount++;
        }
      }
      summary.experience = expCount;
      updateProgress("experience", "done", expCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Experience: ${msg}`);
      updateProgress("experience", "error", undefined, msg);
    }

    updateProgress("certifications", "running");
    try {
      const existingCerts = await listCertifications(db);
      const existingTitles = new Set(existingCerts.map((c) => c.title));
      let certCount = 0;

      for (const c of CERTIFICATIONS) {
        if (!existingTitles.has(c.title)) {
          await createCertificationRow(db, {
            title: c.title,
            issuer: c.issuer,
            date: c.date,
            date_sort: c.dateSort,
            category: c.category,
            issuer_logo: c.issuerLogo,
            credential_url: c.credentialUrl,
          });
          certCount++;
        }
      }
      summary.certifications = certCount;
      updateProgress("certifications", "done", certCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Certifications: ${msg}`);
      updateProgress("certifications", "error", undefined, msg);
    }

    return {
      success: errors.length === 0,
      summary,
      errors,
    };
  } catch (e) {
    return {
      success: false,
      summary,
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
}