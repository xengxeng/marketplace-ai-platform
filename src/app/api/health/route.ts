import { NextResponse } from "next/server";

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return NextResponse.json({
    status: configured ? "configured" : "pending",
    configured,
    message: configured
      ? "Supabase environment variables are present."
      : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable backend integration.",
  });
}
