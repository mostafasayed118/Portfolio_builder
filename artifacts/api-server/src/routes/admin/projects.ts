import { projectSchema } from "@workspace/api-zod";
import { createCollectionRouter } from "../../lib/collection-router";

export default createCollectionRouter({
  table: "projects",
  entityName: "Project",
  schema: projectSchema,
  insertDefaults: (data) => ({ is_published: data.is_published ?? true }),
});
