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

// Technology icon mapping
const SKILL_ICONS: Record<string, string> = {
  // Languages
  "Python": "🐍",
  "SQL": "🗃️",
  "JavaScript": "⚡",
  "TypeScript": "🔷",
  "HTML / CSS": "🌐",
  "Dart": "🎯",
  "C++": "⚙️",
  "Bash Script": "🖥️",
  // Frameworks
  "BeautifulSoup": "🍲",
  "Pandas": "🐼",
  "Next.js": "▲",
  "React": "⚛️",
  "Flutter": "💙",
  "Tailwind CSS": "🎨",
  "BLoC / Cubit": "🧊",
  "Shadcn/UI": "🧩",
  // Cloud
  "Microsoft Azure": "☁️",
  "Azure Data Factory": "🏭",
  "Azure Synapse Analytics": "🏛️",
  "Azure Data Lake Gen2": "🌊",
  "Cloud Computing": "🌍",
  // Analytics
  "Data Engineering": "🔧",
  "ETL Pipelines": "🔄",
  "Data Analysis": "📈",
  "Jupyter Notebooks": "📓",
  "Power BI": "📊",
  "Tableau": "📉",
  "Prompt Engineering": "🤖",
  // Tools
  "Git & GitHub": "🔀",
  "REST APIs": "🔌",
  "OOP": "🧱",
  "Clean Architecture": "🏗️",
  "Convex": "🔺",
  "Clerk Auth": "🔐",
  "JWT / Jose": "🎫",
  "Microsoft Office": "📎",
};

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    key: "languages",
    label: "Languages",
    color: "blue",
    skills: [
      s("Python", 95, SKILL_ICONS["Python"]),
      s("SQL", 87, SKILL_ICONS["SQL"]),
      s("HTML / CSS", 85, SKILL_ICONS["HTML / CSS"]),
      s("JavaScript", 82, SKILL_ICONS["JavaScript"]),
      s("TypeScript", 80, SKILL_ICONS["TypeScript"]),
      s("Dart", 73, SKILL_ICONS["Dart"]),
      s("C++", 68, SKILL_ICONS["C++"]),
      s("Bash Script", 65, SKILL_ICONS["Bash Script"]),
    ],
  },
  {
    key: "frameworks",
    label: "Frameworks",
    color: "cyan",
    skills: [
      s("BeautifulSoup", 93, SKILL_ICONS["BeautifulSoup"]),
      s("Pandas", 90, SKILL_ICONS["Pandas"]),
      s("Tailwind CSS", 85, SKILL_ICONS["Tailwind CSS"]),
      s("Next.js", 83, SKILL_ICONS["Next.js"]),
      s("React", 80, SKILL_ICONS["React"]),
      s("Flutter", 80, SKILL_ICONS["Flutter"]),
      s("BLoC / Cubit", 76, SKILL_ICONS["BLoC / Cubit"]),
      s("Shadcn/UI", 72, SKILL_ICONS["Shadcn/UI"]),
    ],
  },
  {
    key: "cloud",
    label: "Cloud",
    color: "indigo",
    skills: [
      s("Microsoft Azure", 80, SKILL_ICONS["Microsoft Azure"]),
      s("Azure Data Factory", 78, SKILL_ICONS["Azure Data Factory"]),
      s("Azure Synapse Analytics", 75, SKILL_ICONS["Azure Synapse Analytics"]),
      s("Azure Data Lake Gen2", 75, SKILL_ICONS["Azure Data Lake Gen2"]),
      s("Cloud Computing", 70, SKILL_ICONS["Cloud Computing"]),
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    color: "violet",
    skills: [
      s("Data Engineering", 86, SKILL_ICONS["Data Engineering"]),
      s("ETL Pipelines", 83, SKILL_ICONS["ETL Pipelines"]),
      s("Data Analysis", 82, SKILL_ICONS["Data Analysis"]),
      s("Jupyter Notebooks", 80, SKILL_ICONS["Jupyter Notebooks"]),
      s("Power BI", 73, SKILL_ICONS["Power BI"]),
      s("Tableau", 70, SKILL_ICONS["Tableau"]),
      s("Prompt Engineering", 68, SKILL_ICONS["Prompt Engineering"]),
    ],
  },
  {
    key: "tools",
    label: "Tools",
    color: "emerald",
    skills: [
      s("Git & GitHub", 88, SKILL_ICONS["Git & GitHub"]),
      s("REST APIs", 86, SKILL_ICONS["REST APIs"]),
      s("OOP", 85, SKILL_ICONS["OOP"]),
      s("Convex", 80, SKILL_ICONS["Convex"]),
      s("Microsoft Office", 80, SKILL_ICONS["Microsoft Office"]),
      s("Clean Architecture", 78, SKILL_ICONS["Clean Architecture"]),
      s("Clerk Auth", 73, SKILL_ICONS["Clerk Auth"]),
      s("JWT / Jose", 68, SKILL_ICONS["JWT / Jose"]),
    ],
  },
];
