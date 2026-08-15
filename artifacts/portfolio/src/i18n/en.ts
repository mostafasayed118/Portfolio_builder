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
    fallbackRole: string;
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
      native: string;
      fluent: string;
      basic: string;
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
    galleryEmptyTitle: string;
    galleryEmptyHint: string;
  };
  experience: {
    title: string;
    present: string;
    years: string;
    months: string;
    types: {
      internship: string;
      certification: string;
      volunteer: string;
    };
  };
  certifications: {
    title: string;
    all: string;
    viewCertificate: string;
    credentialId: string;
    categories: {
      python: string;
      "data-engineering": string;
      cloud: string;
      database: string;
      ai: string;
      other: string;
    };
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
    chatOnWhatsApp: string;
    whatsappPrefill: string;
    labels: {
      email: string;
      phone: string;
      location: string;
      github: string;
      linkedin: string;
      whatsapp: string;
    };
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    noData: string;
    present: string;
    readMore: string;
    close: string;
    welcomeTitle: string;
    welcomeDescription: string;
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
    fallbackRole: "Data Engineer",
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
      native: "Native",
      fluent: "Fluent",
      basic: "Basic",
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
    galleryEmptyTitle: "No screenshots yet",
    galleryEmptyHint: "Gallery images added from the admin dashboard's Project Editor will appear here.",
  },
  experience: {
    title: "Work Experience",
    present: "Present",
    years: "yrs",
    months: "mos",
    types: {
      internship: "Internship",
      certification: "Certification",
      volunteer: "Volunteer",
    },
  },
  certifications: {
    title: "Certifications",
    all: "All",
    viewCertificate: "View Certificate",
    credentialId: "Credential ID",
    categories: {
      python: "Python",
      "data-engineering": "Data Engineering",
      cloud: "Cloud",
      database: "Database",
      ai: "AI & Data Science",
      other: "Other",
    },
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
    chatOnWhatsApp: "Chat on WhatsApp",
    whatsappPrefill: "Hi Mustafa! I found your portfolio and I'd like to get in touch.",
    labels: {
      email: "Email",
      phone: "Phone",
      location: "Location",
      github: "GitHub",
      linkedin: "LinkedIn",
      whatsapp: "WhatsApp",
    },
  },
  common: {
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Try Again",
    noData: "No data available",
    present: "Present",
    readMore: "Read More",
    close: "Close",
    welcomeTitle: "Welcome to my portfolio!",
    welcomeDescription: "Explore my projects, skills, and experience. Feel free to reach out!",
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
