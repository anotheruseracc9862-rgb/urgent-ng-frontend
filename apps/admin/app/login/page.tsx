import { LoginForm } from "@/features/auth/login-form";
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <LoginForm expired={params.expired === "1"} />;
}
