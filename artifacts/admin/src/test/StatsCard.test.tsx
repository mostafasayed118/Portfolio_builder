import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageSquare } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";

describe("StatsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders label and value", () => {
    render(
      <StatsCard
        label="Unread Messages"
        value={5}
        icon={MessageSquare}
        color="text-blue-500"
      />,
    );

    expect(screen.getByText("Unread Messages")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders string value", () => {
    render(
      <StatsCard
        label="Status"
        value="Live"
        icon={MessageSquare}
        color="text-green-500"
      />,
    );

    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders the icon with the given color class", () => {
    const { container } = render(
      <StatsCard
        label="Projects"
        value={12}
        icon={MessageSquare}
        color="text-violet-500"
      />,
    );

    const icon = container.querySelector(".text-violet-500");
    expect(icon).toBeInTheDocument();
  });

  it("renders zero value correctly", () => {
    render(
      <StatsCard
        label="Errors"
        value={0}
        icon={MessageSquare}
        color="text-red-500"
      />,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
