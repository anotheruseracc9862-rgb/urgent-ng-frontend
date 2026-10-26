"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@urgent/ui";

/** Password field with a show/hide toggle. */
export function PasswordInput({ disabled, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return <span style={{ position: "relative", display: "block" }}>
    <Input {...props} type={visible ? "text" : "password"} disabled={disabled} style={{ paddingRight: 44 }} />
    <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} disabled={disabled}
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 44, display: "grid", placeItems: "center", background: "transparent", border: 0, cursor: "pointer", color: "inherit" }}>
      <Icon aria-hidden="true" size={18} />
    </button>
  </span>;
}
