import { NextResponse } from "next/server";
import { apiError, unexpectedError } from "@/lib/api/responses";
import { guardFailed, requireUser } from "@/lib/api/guards";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(request: Request) {
  try {
    const guard = await requireUser();

    if (guardFailed(guard)) {
      return guard.response;
    }

    const { supabase, user } = guard;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("No file uploaded", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError(`Unsupported file type: ${file.type}`, 400);
    }

    if (file.size > MAX_BYTES) {
      return apiError("File exceeds 5MB limit", 400);
    }

    const extension = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("uploads").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return apiError(uploadError.message, 500);
    }

    const { data: publicUrlData } = supabase.storage.from("uploads").getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      path,
      url: publicUrlData.publicUrl,
      size: file.size,
    });
  } catch (error) {
    return unexpectedError(error, "Upload failed");
  }
}
