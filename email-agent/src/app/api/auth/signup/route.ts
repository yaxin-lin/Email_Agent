import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);

  const { error } = await supabase.from("users").insert({
    email,
    name: name || email.split("@")[0],
    password_hash: passwordHash,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
