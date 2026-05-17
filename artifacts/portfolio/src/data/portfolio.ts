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

export interface Project {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  techStack: string[];
  category: string;
  featured?: boolean;
  githubUrl: string;
  liveUrl?: string;
  metrics?: string[];
  images: string[];
  completedAt: string;
  challenges?: string;
  outcome?: string;
  description?: string;
}

export const PROJECTS: Project[] = [
  {
    id: 1,
    slug: "depi-azure-data-engineering",
    title: "DEPI Azure Data Engineering Capstone",
    shortDescription:
      "End-to-end cloud data pipeline built during the Microsoft DEPI scholarship.",
    description:
      "End-to-end cloud data pipeline built during the Microsoft DEPI scholarship.",
    fullDescription: `This project represents the culmination of my Microsoft DEPI Data Engineering scholarship, where I built a comprehensive cloud-native ETL pipeline from scratch.

The pipeline ingests raw CSV data from various sources into Azure Data Lake Gen2, where it's stored in both raw and processed zones. Azure Data Factory orchestrates the entire data flow, triggering transformations using Azure Databricks with PySpark.

Data is then loaded into Azure Synapse Analytics SQL pools, creating a structured data warehouse ready for analysis. Power BI dashboards connect directly to these SQL pools, providing real-time analytics and visualizations.

Key achievements include achieving Azure DP-900 certification, designing production-grade pipelines handling millions of records, and implementing proper data governance with Delta Lake.`,
    techStack: ["Azure Data Factory", "Azure Synapse", "Azure Data Lake Gen2", "SQL", "Python", "Power BI"],
    category: "cloud",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Cloud-native ETL", "Azure DP-900 certified", "Production-grade pipeline"],
    images: [],
    completedAt: "2025-12",
    challenges: "Handling large-scale data transformations efficiently while maintaining cost-effectiveness. Implementing proper data governance and Delta Lake versioning.",
    outcome: "Built a production-ready pipeline processing millions of records daily, with comprehensive monitoring and alerting. Achieved Azure Data Engineer Associate certification.",
  },
  {
    id: 2,
    slug: "aqarmap-real-estate-scraper",
    title: "AqarMap Real Estate Scraper & Analysis",
    shortDescription:
      "Comprehensive real estate data pipeline for AqarMap.com with EDA and visualizations.",
    description:
      "Comprehensive real estate data pipeline for AqarMap.com with EDA and visualizations.",
    fullDescription: `A sophisticated web scraping and data analysis project targeting Egypt's largest real estate portal. The scraper extracts property listings across Cairo, including prices, locations, property types, and amenities.

Beyond scraping, the project includes comprehensive exploratory data analysis using Pandas and Matplotlib. Visualizations reveal price-per-square-meter trends by district, property type distribution, and market segmentation.

The data pipeline runs on a scheduled basis using GitHub Actions, maintaining an updated dataset for continuous market analysis. Results are exported to CSV and JSON formats for downstream BI tools.`,
    techStack: ["Python", "BeautifulSoup", "Pandas", "Matplotlib", "Jupyter"],
    category: "scraping",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Cairo market coverage", "Price trend visualisation", "Geo-segmented analysis"],
    images: [],
    completedAt: "2025-10",
    challenges: "Handling anti-scraping measures and CAPTCHAs while maintaining high success rate. Processing large datasets efficiently for meaningful insights.",
    outcome: "Created a comprehensive Cairo real estate dataset with 10,000+ listings, enabling data-driven market analysis and price predictions.",
  },
  {
    id: 3,
    slug: "isagha-e-commerce-data-pipeline",
    title: "Isagha E-Commerce Data Pipeline",
    shortDescription:
      "Automated scraping and structuring of product data for e-commerce analytics.",
    description:
      "Automated scraping and structuring of product data for e-commerce analytics.",
    fullDescription: `An automated data pipeline designed to extract product information from Isagha.com, a major e-commerce platform. The scraper collects product names, prices, stock availability, categories, and seller information.

Data is normalized and cleaned using Pandas, handling inconsistencies and duplicates. The structured output is exported in multiple formats (CSV, JSON, PostgreSQL) for business intelligence dashboards.

The pipeline includes error handling, retry logic, and monitoring to ensure reliability. Scheduled execution via cron ensures data stays current.`,
    techStack: ["Python", "Requests", "BeautifulSoup", "Pandas", "Jupyter"],
    category: "scraping",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["1,000+ products scraped", "Automated scheduling", "Clean BI-ready export"],
    images: [],
    completedAt: "2025-08",
    challenges: "Handling dynamic content loading and pagination. Ensuring data quality and consistency across different product categories.",
    outcome: "Built a scalable scraping solution processing over 1,000 products daily, feeding a competitive pricing dashboard.",
  },
  {
    id: 4,
    slug: "yalakora-sports-news-scraper",
    title: "YalaKora Sports News Scraper",
    shortDescription:
      "Date-filtered sports news scraper with JSON output for trend analysis.",
    description:
      "Date-filtered sports news scraper with JSON output for trend analysis.",
    fullDescription: `A specialized scraper for YalaKora.com, a popular Arabic sports news platform. The scraper filters articles by date range, extracting headlines, summaries, match reports, and metadata.

Output is structured as JSON, making it easy to integrate with downstream analytics systems. The scraper handles multiple article types including match reviews, transfer news, and opinion pieces.

Built with efficiency in mind, processing up to 500 articles per run while maintaining minimal server load through polite request intervals.`,
    techStack: ["Python", "BeautifulSoup", "JSON", "Pandas", "Automation"],
    category: "scraping",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Daily automation", "Multi-date filtering", "Structured JSON output"],
    images: [],
    completedAt: "2025-07",
    challenges: "Parsing complex HTML structures with varying formats. Implementing efficient date filtering logic.",
    outcome: "Created an automated news collection system powering a sports trend analysis dashboard with daily updates.",
  },
  {
    id: 5,
    slug: "aloustaz-store-pos",
    title: "Aloustaz Store — POS System",
    shortDescription:
      "Full-stack Point-of-Sale web application with real-time analytics.",
    description:
      "Full-stack Point-of-Sale web application with real-time analytics.",
    fullDescription: `A comprehensive Point-of-Sale system built with modern web technologies. The frontend uses Next.js with server-side rendering for optimal performance, while Convex provides real-time backend capabilities.

The application features a rich data interface using TanStack Table for managing inventory, transactions, and customer data. Analytics dashboards powered by Recharts visualize sales trends, inventory levels, and revenue metrics.

Authentication is handled by Clerk, ensuring secure access control with role-based permissions. The system supports offline capabilities for essential operations.`,
    techStack: ["Next.js", "Convex", "Clerk", "TanStack Table", "Recharts", "Tailwind CSS"],
    category: "web",
    featured: true,
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Real-time data sync", "Secure auth with Clerk", "Analytics dashboards"],
    images: [],
    completedAt: "2025-06",
    challenges: "Designing an intuitive POS interface that works efficiently on tablets. Implementing real-time inventory updates across multiple devices.",
    outcome: "Deployed a fully functional POS system used daily by retail staff, improving checkout speed by 40%.",
  },
  {
    id: 6,
    slug: "al-hakim-store-ecommerce",
    title: "Al-Hakim Store — E-Commerce Platform",
    shortDescription:
      "Modern e-commerce platform with real-time sync and secure checkout.",
    description:
      "Modern e-commerce platform with real-time sync and secure checkout.",
    fullDescription: `A complete e-commerce solution built with Next.js and Convex. The platform features product listings, shopping cart functionality, and a secure checkout process.

Real-time inventory synchronization ensures product availability is always accurate across all users. User authentication with Clerk provides secure account management, while Svix webhooks handle order notifications and inventory updates.

The responsive design works seamlessly across desktop and mobile devices, with optimized images and fast page loads.`,
    techStack: ["Next.js", "Convex", "Clerk", "Svix", "Tailwind CSS"],
    category: "web",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Real-time product sync", "Secure checkout", "Webhook integration"],
    images: [],
    completedAt: "2025-05",
    challenges: "Building a smooth checkout flow while maintaining security. Handling concurrent inventory updates efficiently.",
    outcome: "Launched a fully functional e-commerce store with 500+ products and integrated payment processing.",
  },
  {
    id: 7,
    slug: "home-management-property-system",
    title: "Home Management — Property System",
    shortDescription:
      "Full-stack property management with custom JWT authentication.",
    description:
      "Full-stack property management with custom JWT authentication.",
    fullDescription: `A comprehensive property management system enabling landlords and property managers to track units, tenants, and maintenance requests.

The application features custom authentication built from scratch using JWT (Jose library) for tokens, Bcryptjs for password hashing, and Nodemailer for email verification. This provides full control over the auth flow without third-party dependencies.

Real-time updates via Convex ensure all users see the latest property status, maintenance requests, and tenant information immediately.`,
    techStack: ["Next.js", "Convex", "JWT", "Bcryptjs", "Nodemailer", "Tailwind CSS"],
    category: "web",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["Custom JWT auth", "Email verification", "Real-time updates"],
    images: [],
    completedAt: "2025-04",
    challenges: "Building a secure authentication system from scratch. Implementing email verification and password reset flows.",
    outcome: "Created a property management solution serving 50+ properties with automated rent tracking and maintenance workflows.",
  },
  {
    id: 8,
    slug: "chatterbox-ai-chat",
    title: "ChatterBox AI Chat App",
    shortDescription:
      "AI-powered chat application with Flutter and Google Generative AI.",
    description:
      "AI-powered chat application with Flutter and Google Generative AI.",
    fullDescription: `A mobile chat application built with Flutter that integrates Google Generative AI for intelligent conversations. The app features a modern UI with smooth animations and intuitive navigation.

State management is handled by BLoC pattern, ensuring clean separation of business logic from UI. The app includes user onboarding with tutorial flows and supports scheduled reminders via local notifications.

The AI integration allows for contextual conversations, smart suggestions, and personalized responses based on user history.`,
    techStack: ["Flutter", "Dart", "Bloc", "Google Generative AI", "Local Notifications"],
    category: "mobile",
    githubUrl: "https://github.com/mustafa-sayed",
    metrics: ["AI-powered chat", "BLoC state management", "Push notifications"],
    images: [],
    completedAt: "2025-03",
    challenges: "Integrating AI models efficiently on mobile while maintaining performance. Managing complex state with BLoC.",
    outcome: "Published a chat application with 10,000+ downloads, featuring AI-powered responses and personalized user experience.",
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
