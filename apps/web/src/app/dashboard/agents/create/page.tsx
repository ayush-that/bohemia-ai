import { Metadata } from "next";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import PageContainer from "@/components/layout/page-container";
import { AgentForm } from "./components/agent-form";

export const metadata: Metadata = {
  title: "Create Voice Agent",
  description: "Create a new voice AI agent with custom configuration.",
};

export default function CreateAgentPage() {
  return (
    <PageContainer scrollable>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-start justify-between">
          <Heading
            title="Create Voice Agent"
            description="Configure a new voice AI agent with LiveKit integration."
          />
        </div>
        <Separator />
        <AgentForm />
      </div>
    </PageContainer>
  );
}
