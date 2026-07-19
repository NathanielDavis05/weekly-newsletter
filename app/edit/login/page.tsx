import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editor sign in",
  robots: { index: false, follow: false },
};

export default async function EditorLoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const { return_to } = await searchParams;
  const returnTo = return_to && return_to.startsWith("/") && !return_to.startsWith("//") ? return_to : "/edit";
  return <LoginForm returnTo={returnTo} />;
}
