import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "../button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

describe("Drawer", () => {
  it("opens and closes with the keyboard and restores focus", async () => {
    const user = userEvent.setup();
    render(
      <Drawer>
        <DrawerTrigger asChild><Button>Open drawer</Button></DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Filter errands</DrawerTitle>
          <DrawerDescription>Choose filters.</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    );
    const trigger = screen.getByRole("button", { name: "Open drawer" });
    await user.tab();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Filter errands" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
