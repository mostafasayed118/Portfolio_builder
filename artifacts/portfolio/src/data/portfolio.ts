export const HERO = {
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

export const ABOUT = {
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

export const SKILLS = [
  { label: "Web Scraping", value: 95 },
  { label: "Python", value: 90 },
  { label: "SQL", value: 85 },
  { label: "ETL Pipelines", value: 80 },
  { label: "C++", value: 72 },
  { label: "Azure Cloud", value: 72 },
];

export type SkillLevel = "Expert" | "Advanced" | "Intermediate" | "Familiar";

export interface Skill {
  name: string;
  proficiency: number;
  level: SkillLevel;
  icon?: string;
}

export interface SkillCategory {
  key: string;
  label: string;
  color: string;
  skills: Skill[];
}

function level(p: number): SkillLevel {
  if (p >= 90) return "Expert";
  if (p >= 75) return "Advanced";
  if (p >= 60) return "Intermediate";
  return "Familiar";
}
function s(name: string, proficiency: number, icon?: string): Skill {
  return { name, proficiency, level: level(proficiency), icon };
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    key: "languages",
    label: "Languages",
    color: "blue",
    skills: [
      s("Python", 95, "🐍"),
      s("SQL", 87, "🗄️"),
      s("JavaScript", 82, "🟨"),
      s("TypeScript", 80, "🔷"),
      s("HTML / CSS", 85, "🌐"),
      s("Dart", 73, "🎯"),
      s("C++", 68, "⚙️"),
      s("Bash Script", 65, "🖥️"),
    ],
  },
  {
    key: "frameworks",
    label: "Frameworks",
    color: "cyan",
    skills: [
      s("BeautifulSoup", 93, "🍵"),
      s("Pandas", 90, "🐼"),
      s("Next.js", 83, "▲"),
      s("React", 80, "⚛️"),
      s("Flutter", 80, "💙"),
      s("Tailwind CSS", 85, "🎨"),
      s("BLoC / Cubit", 76, "🧱"),
      s("Shadcn/UI", 72, "🪟"),
    ],
  },
  {
    key: "cloud",
    label: "Cloud",
    color: "indigo",
    skills: [
      s("Microsoft Azure", 80, "☁️"),
      s("Azure Data Factory", 78, "🏭"),
      s("Azure Synapse Analytics", 75, "🔬"),
      s("Azure Data Lake Gen2", 75, "🏔️"),
      s("Cloud Computing", 70, "🌤️"),
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    color: "violet",
    skills: [
      s("Data Engineering", 86, "🛠️"),
      s("ETL Pipelines", 83, "🔄"),
      s("Data Analysis", 82, "📊"),
      s("Jupyter Notebooks", 80, "📒"),
      s("Power BI", 73, "📈"),
      s("Tableau", 70, "📉"),
      s("Prompt Engineering", 68, "🤖"),
    ],
  },
  {
    key: "tools",
    label: "Tools",
    color: "emerald",
    skills: [
      s("Git & GitHub", 88, "🐙"),
      s("REST APIs", 86, "🔌"),
      s("OOP", 85, "🧩"),
      s("Clean Architecture", 78, "🏛️"),
      s("Convex", 80, "⚡"),
      s("Clerk Auth", 73, "🔐"),
      s("JWT / Jose", 68, "🪙"),
      s("Microsoft Office", 80, "📋"),
    ],
  },
];

export const PROJECTS = [
  {
    id: 1,
    title: "DEPI Azure Data Engineering Capstone",
    description:
      "End-to-end cloud data pipeline built during the Microsoft DEPI scholarship. Ingests raw CSV data into Azure Data Lake Gen2, orchestrates transformation via Azure Data Factory, and exposes analytics-ready tables through Azure Synapse Analytics and Power BI dashboards.",
    techStack: ["Azure Data Factory", "Azure Synapse", "Azure Data Lake Gen2", "SQL", "Python", "Power BI"],
    category: "cloud",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Cloud-native ETL", "Azure DP-900 certified", "Production-grade pipeline"],
  },
  {
    id: 2,
    title: "AqarMap Real Estate Scraper & Analysis",
    description:
      "Comprehensive real estate data pipeline for AqarMap.com. Extracts property listings, prices, locations, and features across Cairo. Includes exploratory data analysis with Matplotlib charts revealing price-per-m² trends by district and property type.",
    techStack: ["Python", "BeautifulSoup", "Pandas", "Matplotlib", "Jupyter"],
    category: "scraping",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Cairo market coverage", "Price trend visualisation", "Geo-segmented analysis"],
  },
  {
    id: 3,
    title: "Isagha E-Commerce Data Pipeline",
    description:
      "Automated scraping and structuring of product listings, prices, and stock availability from Isagha.com. Data is normalised and exported as structured datasets ready for business intelligence and competitive pricing dashboards.",
    techStack: ["Python", "Requests", "BeautifulSoup", "Pandas", "Jupyter"],
    category: "scraping",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["1,000+ products scraped", "Automated scheduling", "Clean BI-ready export"],
  },
  {
    id: 4,
    title: "YalaKora Sports News Scraper",
    description:
      "Date-filtered scraper for YalaKora.com that collects sports news headlines, match summaries, and article metadata. Outputs structured JSON datasets for downstream trend analysis.",
    techStack: ["Python", "BeautifulSoup", "JSON", "Pandas", "Automation"],
    category: "scraping",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Daily automation", "Multi-date filtering", "Structured JSON output"],
  },
  {
    id: 5,
    title: "Aloustaz Store — POS System",
    description:
      "Full-stack Point-of-Sale web application built with Next.js and Convex for real-time backend. Features a data-rich UI with TanStack Table for complex data grids and Recharts for analytics dashboards. Clerk authentication for secure access.",
    techStack: ["Next.js", "Convex", "Clerk", "TanStack Table", "Recharts", "Tailwind CSS"],
    category: "web",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Real-time data sync", "Secure auth with Clerk", "Analytics dashboards"],
  },
  {
    id: 6,
    title: "Al-Hakim Store — E-Commerce Platform",
    description:
      "Modern e-commerce platform built with Next.js and Tailwind CSS. Integrates Convex for real-time serverless database operations. Implements secure user authentication with Clerk and Svix for webhook synchronisation.",
    techStack: ["Next.js", "Convex", "Clerk", "Svix", "Tailwind CSS"],
    category: "web",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Real-time product sync", "Secure checkout", "Webhook integration"],
  },
  {
    id: 7,
    title: "Home Management — Property System",
    description:
      "Full-stack Property Management system with Next.js and Convex for real-time data handling. Custom authentication flow from scratch using JWT (Jose), Bcryptjs for password hashing, and Nodemailer for email verification.",
    techStack: ["Next.js", "Convex", "JWT", "Bcryptjs", "Nodemailer", "Tailwind CSS"],
    category: "web",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Custom JWT auth", "Email verification", "Real-time updates"],
  },
  {
    id: 8,
    title: "ChatterBox AI Chat App",
    description:
      "AI chat application built with Flutter and Bloc state management, integrating Google Generative AI. Includes onboarding flow and scheduled reminders via local notifications.",
    techStack: ["Flutter", "Dart", "Bloc", "Google Generative AI", "Local Notifications"],
    category: "mobile",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["AI-powered chat", "BLoC state management", "Push notifications"],
  },
];

export const EXPERIENCE = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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

export const CONTACT = {
  email: "mustafasayed20002@gmail.com",
  phone: "+20 115 458 0512",
  location: "Cairo, Egypt",
  github: "https://github.com/mustafa-sayed",
  linkedin: "https://www.linkedin.com/in/mustafa-sayed",
};

export interface Certificate {
  id: number;
  title: string;
  issuer: string;
  issuerLogo: string;
  date: string;
  dateSort: string;
  category: "python" | "data-engineering" | "cloud" | "database" | "ai";
  credentialUrl: string;
}

export const CERTIFICATIONS: Certificate[] = [
  {
    id: 1,
    title: "Intermediate Python for Developers",
    issuer: "DataCamp",
    issuerLogo: "🎓",
    date: "Apr 2026",
    dateSort: "2026-04",
    category: "python",
    credentialUrl: "https://www.datacamp.com",
  },
  {
    id: 2,
    title: "Introduction to Python for Developers",
    issuer: "DataCamp",
    issuerLogo: "🎓",
    date: "Apr 2026",
    dateSort: "2026-04",
    category: "python",
    credentialUrl: "https://www.datacamp.com",
  },
  {
    id: 3,
    title: "Understanding Cloud Computing",
    issuer: "DataCamp",
    issuerLogo: "🎓",
    date: "Apr 2026",
    dateSort: "2026-04",
    category: "cloud",
    credentialUrl: "https://www.datacamp.com",
  },
  {
    id: 4,
    title: "Python for Data Engineering",
    issuer: "IBM",
    issuerLogo: "🔵",
    date: "Mar 2026",
    dateSort: "2026-03",
    category: "data-engineering",
    credentialUrl: "https://www.coursera.org",
  },
  {
    id: 5,
    title: "Python for Data Science, AI & Development",
    issuer: "IBM",
    issuerLogo: "🔵",
    date: "Mar 2026",
    dateSort: "2026-03",
    category: "ai",
    credentialUrl: "https://www.coursera.org",
  },
  {
    id: 6,
    title: "Introduction to Data Engineering",
    issuer: "IBM",
    issuerLogo: "🔵",
    date: "Dec 2025",
    dateSort: "2025-12",
    category: "data-engineering",
    credentialUrl: "https://www.coursera.org",
  },
  {
    id: 7,
    title: "AI & Data Science — Microsoft Data Engineer",
    issuer: "Microsoft DEPI",
    issuerLogo: "🪟",
    date: "Dec 2025",
    dateSort: "2025-12",
    category: "ai",
    credentialUrl: "https://microsoft.com",
  },
  {
    id: 8,
    title: "Microsoft Data Engineer Associate",
    issuer: "Microsoft",
    issuerLogo: "🪟",
    date: "Dec 2025",
    dateSort: "2025-12",
    category: "data-engineering",
    credentialUrl: "https://microsoft.com",
  },
  {
    id: 9,
    title: "Python Basics",
    issuer: "HackerRank",
    issuerLogo: "💻",
    date: "Sep 2025",
    dateSort: "2025-09",
    category: "python",
    credentialUrl: "https://www.hackerrank.com",
  },
  {
    id: 10,
    title: "Database Fundamentals",
    issuer: "Maharatech",
    issuerLogo: "🗄️",
    date: "Sep 2025",
    dateSort: "2025-09",
    category: "database",
    credentialUrl: "https://maharatech.gov.eg",
  },
  {
    id: 11,
    title: "Introduction to SQL (Basic)",
    issuer: "HackerRank",
    issuerLogo: "💻",
    date: "Apr 2025",
    dateSort: "2025-04",
    category: "database",
    credentialUrl: "https://www.hackerrank.com",
  },
];

export const STATS = [
  { label: "Projects", value: 8, suffix: "+" },
  { label: "Year Experience", value: 1, suffix: "" },
  { label: "Skills Mastered", value: 35, suffix: "+" },
  { label: "Certifications", value: 11, suffix: "" },
];
