import type { Metadata } from "next";
import SignInViewPage from "@/features/auth/components/sign-in-view";

export const metadata: Metadata = {
  title: "Bohemia AI | Sign In",
  description: "Sign In page for Bohemia AI.",
};

export default function Page() {
  return <SignInViewPage />;
}
