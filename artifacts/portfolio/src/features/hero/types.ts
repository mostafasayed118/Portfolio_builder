export type HeroData = {
  heading: string;
  name: string;
  roles: string[];
  description: string;
  github: string;
  linkedin: string;
  email: string;
  available: boolean;
  cvFileName: string;
};

export type HeroCTAAction = (href: string) => void;
