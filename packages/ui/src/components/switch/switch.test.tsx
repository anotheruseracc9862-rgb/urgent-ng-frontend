import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("toggles with Space and respects its disabled state", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Switch aria-label="Availability" />
        <Switch aria-label="Locked setting" disabled />
      </>,
    );
    const toggle = screen.getByRole("switch", { name: "Availability" });
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard("[Space]");
    expect(toggle).toHaveAttribute("data-state", "checked");
    expect(screen.getByRole("switch", { name: "Locked setting" })).toBeDisabled();
  });
});
