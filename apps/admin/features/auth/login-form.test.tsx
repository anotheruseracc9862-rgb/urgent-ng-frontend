// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { LoginForm } from "./login-form";
import { AcceptInviteForm } from "./accept-invite-form";

afterEach(cleanup);

describe("credential forms", () => {
  it("sign-in server markup posts natively and keeps the button off until hydration", () => {
    // Server markup is what a browser sees before JavaScript runs: a native submit must POST, never GET.
    const html = renderToString(<LoginForm />);
    expect(html).toMatch(/<form[^>]*method="post"/);
    expect(html).not.toMatch(/method="get"/i);
    expect(html).toMatch(/<button[^>]*disabled/);
  });

  it("the invitation form renders no password field until the token is read in the browser", () => {
    expect(renderToString(<AcceptInviteForm />)).not.toMatch(/<input/);
  });

  it("enables sign-in once hydrated", async () => {
    render(<LoginForm />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(false));
  });
});
