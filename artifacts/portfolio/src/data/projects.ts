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
