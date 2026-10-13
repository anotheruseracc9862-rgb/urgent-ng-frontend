import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs", () => {
  it("moves focus and selection with arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="active">
        <TabsList aria-label="Errand status">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="complete">Complete</TabsTrigger>
        </TabsList>
        <TabsContent value="active">Active errands</TabsContent>
        <TabsContent value="complete">Completed errands</TabsContent>
      </Tabs>,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Complete" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Complete" })).toHaveAttribute("aria-selected", "true");
  });
});
