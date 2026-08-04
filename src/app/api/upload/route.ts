import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/upload";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const POST = withErrorHandling(SCOPE, async (request: Request) => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logError(SCOPE, error, { reason: "invalid_form_data" });
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
  }

  const extension = file.name.split(".").pop() ?? "bin";
  const path = `${userData.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("uploads").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    logError(SCOPE, uploadError, { path, step: "upload" });
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("uploads").getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    path,
    url: publicUrlData.publicUrl,
    size: file.size,
  });
});
