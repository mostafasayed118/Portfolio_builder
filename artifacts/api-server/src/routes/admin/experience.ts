import { experienceSchema } from "@workspace/api-zod";
import { createCollectionRouter } from "../../lib/collection-router";

export default createCollectionRouter({
  table: "experience",
  entityName: "Experience",
  schema: experienceSchema,
  insertDefaults: (data) => ({ is_published: data.is_published ?? true }),
});
