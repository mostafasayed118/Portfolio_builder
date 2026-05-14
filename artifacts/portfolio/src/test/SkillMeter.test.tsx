import { render, screen } from "@testing-library/react";
import SkillMeter from "@/components/SkillMeter";

describe("SkillMeter", () => {
  it("renders the label", () => {
    render(<SkillMeter label="Python" value={85} />);
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("renders the percentage value", () => {
    render(<SkillMeter label="Python" value={85} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });
});
