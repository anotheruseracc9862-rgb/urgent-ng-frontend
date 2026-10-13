import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toaster, toast } from "sonner";
import { Button } from "@urgent/ui";
import { PrimitiveGallery } from "./primitive-gallery";

describe("component gallery", () => {
  it("renders the demo-referenced primitives and variants", () => {
    render(<PrimitiveGallery />);

    expect(screen.getByRole("heading", { name: "Component gallery" })).toBeInTheDocument();
    for (const section of [
      "Buttons and badges",
      "Cards, stats and alerts",
      "Fields and form controls",
      "Tabs and overlays",
      "Data display",
      "Progress, states and pagination",
      "Toast integration",
    ]) {
      expect(screen.getByRole("region", { name: section })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Saving" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Enable notifications" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Request ID: demo-request-123");
  }, 10_000);

  it("connects toast actions to the app-level Sonner integration", async () => {
    const user = userEvent.setup();
    const successToast = vi.spyOn(toast, "success");
    render(
      <>
        <Toaster />
        <Button onClick={() => toast.success("Your changes have been saved.")}>Save changes</Button>
      </>,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    expect(successToast).toHaveBeenCalledWith("Your changes have been saved.");
    successToast.mockRestore();
  });
});
