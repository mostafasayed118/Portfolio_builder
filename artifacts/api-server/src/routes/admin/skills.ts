import { skillSchema } from "@workspace/api-zod";
import { createCollectionRouter } from "../../lib/collection-router";

export default createCollectionRouter({
  table: "skills",
  entityName: "Skill",
  schema: skillSchema,
});
