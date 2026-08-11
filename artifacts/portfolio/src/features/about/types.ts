export interface AboutData {
  bio1: string;
  bio2: string;
  location: string;
  yearsOfExperience: number;
  education: { degree: string; school: string; grade: string; years: string };
  languages: { lang: string; level: string; pct: number }[];
}
