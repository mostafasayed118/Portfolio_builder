import { describe, expect, it } from "vitest";
import { mapDbProject } from "./useProjects";

describe("mapDbProject", () => {
  it("carries the database row's real id instead of a derived index", () => {
    const project = mapDbProject(
      { id: "uuid-1234", slug: "my-pipeline", title: "My Pipeline", description: "desc" },
      3,
    );
    expect(project.id).toBe("uuid-1234");
  });

  it("falls back to a deterministic static id when a row has no id", () => {
    const project = mapDbProject({ title: "Legacy", description: "desc" }, 2);
    expect(project.id).toBe("static-2");
  });
});
