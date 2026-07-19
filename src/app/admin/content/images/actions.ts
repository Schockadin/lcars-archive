"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { deleteContentImageAsAdmin } from "@/lib/contentImages";

// Admin-only Löschen aus der Bucket-Übersicht (/admin/content/images) — ohne
// Content-Scoping (siehe deleteContentImageAsAdmin), damit auch bereits
// verwaiste Bilder (Inhalt gelöscht/purged, siehe AdminContentImage-
// Kommentar in contentImages.ts) entfernt werden können.
export async function deleteContentImageAdminAction(id: number): Promise<{ error?: string }> {
  await requireAdmin();

  const deleted = await deleteContentImageAsAdmin(id);
  if (!deleted) return { error: "Bild nicht gefunden." };

  revalidatePath("/admin/content/images");
  return {};
}
