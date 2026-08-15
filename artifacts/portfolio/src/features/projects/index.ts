export { default as ProjectsSection } from "./components/ProjectsSection";
export { default as ProjectCard } from "./components/ProjectCard";
export { default as ProjectGallery, GalleryEmpty, GalleryPlaceholder } from "./components/ProjectGallery";
export { useProjects, mapDbProject, mapDbProjectDetail, PROJECTS } from "./hooks/useProjects";
export type { Project, ImageVariant } from "./types";
