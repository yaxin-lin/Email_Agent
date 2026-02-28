import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { AgentTrace } from "@/components/AgentTrace";
import { EmailQueue } from "@/components/EmailQueue";
import { RunAgentButton } from "@/components/RunAgentButton";
import { Mail, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalTime } from "@/components/LocalTime";
import type { ProcessedEmail } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;

  const { data: user } = await supabase
    .from("users")
    .select("gmail_app_password")
    .eq("id", userId)
    .single();

  if (!user?.gmail_app_password) {
    redirect("/settings");
  }

  const { data: latestBriefing } = await supabase
    .from("briefings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let emails: ProcessedEmail[] = [];

  if (latestBriefing) {
    const { data } = await supabase
      .from("processed_emails")
      .select("*")
      .eq("user_id", userId)
      .eq("batch_id", latestBriefing.batch_id)
      .order("received_at", { ascending: false });
    emails = (data ?? []) as ProcessedEmail[];
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">InboxPilot</h1>
          </div>
          <div className="flex items-center gap-3">
            <RunAgentButton />
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="gap-1">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="ghost" size="sm" className="gap-1">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            Good morning, {session.user.name?.split(" ")[0] ?? "there"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {latestBriefing
              ? <>Last processed: <LocalTime date={latestBriefing.created_at} /></>
              : "No emails processed yet. Click \"Process Inbox Now\" to get started."}
          </p>
        </div>

        {latestBriefing?.trace && (
          <AgentTrace trace={latestBriefing.trace} />
        )}

        <EmailQueue initialEmails={emails} />
      </main>
    </div>
  );
}
