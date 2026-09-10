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

  it("renders the meter at the supplied percentage", () => {
    render(<SkillMeter label="Python" value={85} />);
    const meter = screen.getByTestId("skill-python").querySelector("div.h-full");
    expect(meter).toHaveStyle({ width: "85%" });
  });
});
