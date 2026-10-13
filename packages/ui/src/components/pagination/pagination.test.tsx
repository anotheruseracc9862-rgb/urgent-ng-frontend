import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

describe("Pagination", () => {
  it("supports keyboard activation and disables the previous action at the start", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <Pagination aria-label="Pages">
        <PaginationContent>
          <PaginationItem><PaginationPrevious disabled /></PaginationItem>
          <PaginationItem><PaginationNext onClick={onNext} /></PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByRole("button", { name: "Go to previous page" })).toBeDisabled();
    await user.tab();
    expect(screen.getByRole("button", { name: "Go to next page" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onNext).toHaveBeenCalledOnce();
  });
});
