import type { Metadata } from "next";
import SignUpViewPage from "@/features/auth/components/sign-up-view";

export const metadata: Metadata = {
  title: "Bohemia AI | Sign Up",
  description: "Sign Up page for Bohemia AI.",
};

export default function Page() {
  return <SignUpViewPage />;
}
