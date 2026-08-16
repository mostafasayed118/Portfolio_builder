import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderAdmin } from "./helpers";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import { SHORTCUTS_OPENED_EVENT } from "@/components/ShortcutsDialog";

describe("ShortcutsHelp — global ? shortcut from any page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("opens the shortcuts dialog via the ? key", async () => {
    renderAdmin(<ShortcutsHelp />);

    fireEvent.keyDown(document, { key: "?" });

    const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(dialog).getByText("Select all on page")).toBeInTheDocument();
    expect(within(dialog).getByText("Archive selected")).toBeInTheDocument();
    expect(within(dialog).getByText("Restore selected (Archived)")).toBeInTheDocument();
    // The Gmail-style keys group documents R (reply) and X (select).
    expect(within(dialog).getByText("Gmail-style keys")).toBeInTheDocument();
    expect(within(dialog).getByText("Reply to selected")).toBeInTheDocument();
    expect(within(dialog).getByText("Select message")).toBeInTheDocument();
    expect(within(dialog).getByText("Open search")).toBeInTheDocument();
    expect(within(dialog).getByText("Open keyboard shortcuts")).toBeInTheDocument();
  });

  it("opens the shortcuts dialog via Shift+/ (US-layout ?)", async () => {
    renderAdmin(<ShortcutsHelp />);

    fireEvent.keyDown(document, { key: "/", shiftKey: true });

    expect(
      await screen.findByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeInTheDocument();
  });

  it("dispatches the shortcuts-opened event so the sidebar hint dismisses itself", async () => {
    const onOpen = vi.fn();
    window.addEventListener(SHORTCUTS_OPENED_EVENT, onOpen);

    renderAdmin(<ShortcutsHelp />);
    fireEvent.keyDown(document, { key: "?" });
    await screen.findByRole("dialog", { name: "Keyboard shortcuts" });

    expect(onOpen).toHaveBeenCalledTimes(1);
    window.removeEventListener(SHORTCUTS_OPENED_EVENT, onOpen);
  });

  it("shows the first-visit tip inside the dialog once, then never again", async () => {
    const first = renderAdmin(<ShortcutsHelp />);

    fireEvent.keyDown(document, { key: "?" });
    const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    // The one-time tip explaining E/U/Ctrl+A appears on the first open.
    expect(within(dialog).getByRole("status")).toHaveTextContent(/archives the selected messages/i);

    // Closing persists the dismissal.
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
    });
    expect(localStorage.getItem("messages-shortcuts-tip-dismissed")).toBe("1");
    first.unmount();

    // A fresh mount: the dialog still opens, but the tip never returns.
    renderAdmin(<ShortcutsHelp />);
    fireEvent.keyDown(document, { key: "?" });
    const again = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(again).queryByRole("status")).not.toBeInTheDocument();
  });

  it("never stacks on an existing dialog — ? is ignored while one is open", () => {
    // Simulate a dialog opened by a page component the shell can't see
    // (cleanup confirm, reply, …) — the guard detects it from the DOM.
    const blocker = document.createElement("div");
    blocker.setAttribute("role", "alertdialog");
    document.body.appendChild(blocker);

    renderAdmin(<ShortcutsHelp />);
    fireEvent.keyDown(document, { key: "?" });

    expect(
      screen.queryByRole("dialog", { name: "Keyboard shortcuts" }),
    ).not.toBeInTheDocument();

    // Remove the fixture BEFORE React unmounts so the guard query never sees
    // a stale dialog and cleanup stays clean.
    blocker.remove();
  });
});
