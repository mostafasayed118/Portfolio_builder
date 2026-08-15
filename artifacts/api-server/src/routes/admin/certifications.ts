import { certificationSchema } from "@workspace/api-zod";
import { createCollectionRouter } from "../../lib/collection-router";

export default createCollectionRouter({
  table: "certifications",
  entityName: "Certification",
  schema: certificationSchema,
  insertDefaults: (data) => ({ is_published: data.is_published ?? true }),
});
