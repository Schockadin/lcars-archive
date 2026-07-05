"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { missionSlugExists, createMission } from "@/lib/missions";
import { slugifyBase } from "@/lib/slug";
import { revalidateMission } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";

export interface MissionFormState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["active", "completed", "failed", "abandoned"] as const;

// DB ist Source of Truth (siehe scripts/vaultExport bzw. src/lib/vaultExport.ts
// für den Weg zurück in den Vault) — die Mission landet direkt in der
// Datenbank, kein Vault-Commit mehr an dieser Stelle. Admin/GM-only, Rolle
// frisch aus der DB geprüft.
export async function createMissionAction(
  _state: MissionFormState,
  formData: FormData,
): Promise<MissionFormState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const user = await getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "gm" && user.role !== "admin") {
    redirect(`/users/${session.userId}`);
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugifyBase(slugInput || title);

  const status = String(formData.get("status") ?? "active");
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: "Ungültiger Status." };
  }

  const startedAtRaw = String(formData.get("startedAt") ?? "").trim();
  if (startedAtRaw && !DATE_RE.test(startedAtRaw)) {
    return { error: "Ungültiges Startdatum." };
  }
  const endedAtRaw = String(formData.get("endedAt") ?? "").trim();
  if (endedAtRaw && !DATE_RE.test(endedAtRaw)) {
    return { error: "Ungültiges Enddatum." };
  }

  const tags = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine Zusammenfassung schreiben." };

  if (await missionSlugExists(slug)) {
    return {
      error: "Dieser Slug ist bereits vergeben — bitte einen anderen wählen.",
    };
  }

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — kein
  // Selbst-Ausschluss nötig, die neue Mission existiert noch nicht in der
  // DB und kann deshalb nicht als eigenes Autolinking-Ziel erscheinen.
  let bodyHtml: string | undefined;
  if (formData.get("autoLink") === "on") {
    const linked = await autoLinkMarkdown(bodyMarkdown);
    bodyMarkdown = linked.sourceMd;
    bodyHtml = linked.html;
  }

  const result = await createMission({
    slug,
    title,
    status: status as (typeof VALID_STATUSES)[number],
    startedAt: startedAtRaw || null,
    endedAt: endedAtRaw || null,
    tags,
    bodyMarkdown,
    bodyHtml,
    ownerUserId: user.id,
  });

  revalidateMission(result.slug);
  redirect(`/users/${session.userId}/content`);
}
