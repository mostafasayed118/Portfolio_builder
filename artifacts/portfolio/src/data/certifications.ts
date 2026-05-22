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
