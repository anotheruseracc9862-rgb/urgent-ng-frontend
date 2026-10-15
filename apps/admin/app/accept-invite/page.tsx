import type { Metadata } from "next";
import { AcceptInviteForm } from "@/features/auth/accept-invite-form";
export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };
export default function AcceptInvitePage() { return <AcceptInviteForm />; }
