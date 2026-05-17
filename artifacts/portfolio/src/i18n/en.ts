export interface TranslationKeys {
  nav: {
    home: string;
    about: string;
    skills: string;
    projects: string;
    experience: string;
    certifications: string;
    contact: string;
  };
  hero: {
    downloadCV: string;
    viewProjects: string;
    availableForWork: string;
  };
  about: {
    title: string;
    education: string;
    languages: string;
    interests: string;
    present: string;
  };
  skills: {
    title: string;
    levels: {
      beginner: string;
      intermediate: string;
      advanced: string;
      expert: string;
    };
  };
  projects: {
    title: string;
    all: string;
    viewLive: string;
    viewCode: string;
    viewProject: string;
    backToProjects: string;
    relatedProjects: string;
    techStack: string;
    challenges: string;
    outcome: string;
    completedAt: string;
  };
  experience: {
    title: string;
    present: string;
    years: string;
    months: string;
  };
  certifications: {
    title: string;
    all: string;
    viewCertificate: string;
    credentialId: string;
  };
  contact: {
    title: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    send: string;
    sending: string;
    successTitle: string;
    successMessage: string;
    errorMessage: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    noData: string;
    present: string;
    readMore: string;
    close: string;
  };
  language: {
    switch: string;
    current: string;
  };
  footer: {
    rights: string;
    madeWith: string;
  };
}

export const en: TranslationKeys = {
  nav: {
    home: "Home",
    about: "About",
    skills: "Skills",
    projects: "Projects",
    experience: "Experience",
    certifications: "Certifications",
    contact: "Contact",
  },
  hero: {
    downloadCV: "Download CV",
    viewProjects: "View Projects",
    availableForWork: "Available for work",
  },
  about: {
    title: "About Me",
    education: "Education",
    languages: "Languages",
    interests: "Interests & Hobbies",
    present: "Present",
  },
  skills: {
    title: "Skills & Expertise",
    levels: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      expert: "Expert",
    },
  },
  projects: {
    title: "My Projects",
    all: "All",
    viewLive: "View Live",
    viewCode: "View Code",
    viewProject: "View Project",
    backToProjects: "\u2190 Back to Projects",
    relatedProjects: "Related Projects",
    techStack: "Tech Stack",
    challenges: "Challenges",
    outcome: "Outcome",
    completedAt: "Completed",
  },
  experience: {
    title: "Work Experience",
    present: "Present",
    years: "yrs",
    months: "mos",
  },
  certifications: {
    title: "Certifications",
    all: "All",
    viewCertificate: "View Certificate",
    credentialId: "Credential ID",
  },
  contact: {
    title: "Get In Touch",
    name: "Your Name",
    email: "Your Email",
    subject: "Subject",
    message: "Message",
    send: "Send Message",
    sending: "Sending...",
    successTitle: "Message sent!",
    successMessage: "Thank you for reaching out. I'll get back to you soon.",
    errorMessage: "Failed to send message. Please try again.",
  },
  common: {
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Try Again",
    noData: "No data available",
    present: "Present",
    readMore: "Read More",
    close: "Close",
  },
  language: {
    switch: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
    current: "EN",
  },
  footer: {
    rights: "All rights reserved",
    madeWith: "Made with",
  },
};
