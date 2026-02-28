import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { data: user } = await supabase
    .from("users")
    .select("gmail_app_password, user_profile")
    .eq("id", session.user.id)
    .single();

  const isFirstTime = !user?.gmail_app_password;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">InboxPilot</h1>
          </div>
          {!isFirstTime && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {isFirstTime ? (
          <div>
            <h2 className="text-2xl font-bold">Get Started</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Connect your Gmail so InboxPilot can read and respond to your
              emails. Follow the steps below.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold">Settings</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Update your Gmail connection or profile. Signed in as{" "}
              <span className="font-medium text-foreground">
                {session.user.email}
              </span>
            </p>
          </div>
        )}

        <SettingsForm
          isFirstTime={isFirstTime}
          hasExistingPassword={!isFirstTime}
          initialProfile={user?.user_profile ?? ""}
        />
      </main>
    </div>
  );
}
