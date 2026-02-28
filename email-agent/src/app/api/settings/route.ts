import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("gmail_app_password, user_profile")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json({
    hasAppPassword: !!user?.gmail_app_password,
    userProfile: user?.user_profile ?? "",
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appPassword, userProfile } = await request.json();

  if (!appPassword) {
    return NextResponse.json(
      { error: "App Password is required" },
      { status: 400 }
    );
  }

  const encryptedPassword = encrypt(appPassword);

  const updates: Record<string, string> = {
    gmail_app_password: encryptedPassword,
  };

  if (userProfile !== undefined) {
    updates.user_profile = userProfile;
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
