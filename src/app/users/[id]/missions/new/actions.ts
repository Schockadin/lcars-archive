"use server";
import { redirect } from "next/navigation";
import matter from "gray-matter";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { missionSlugExists } from "@/lib/missions";
import { slugifyBase } from "@/lib/slug";
import { commitVaultFile, VaultFileExistsError } from "@/lib/githubVault";

export interface MissionVaultState {
  error?: string;
  success?: { commitUrl: string; path: string };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["active", "completed", "failed", "abandoned"];

// Analog zu createMissionLogVaultAction (mission-logs/new/actions.ts): reiner
// Vault-Commit, kein direkter DB-Write — die Mission landet nach dem nächsten
// Ingest im Archiv. Admin/GM-only, Rolle frisch aus der DB geprüft.
export async function createMissionVaultAction(
  _state: MissionVaultState,
  formData: FormData,
): Promise<MissionVaultState> {
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
  if (!VALID_STATUSES.includes(status)) {
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

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine Zusammenfassung schreiben." };

  if (await missionSlugExists(slug)) {
    return {
      error: "Dieser Slug ist bereits vergeben — bitte einen anderen wählen.",
    };
  }

  const fileContent = matter.stringify(bodyMarkdown, {
    type: "mission",
    slug,
    title,
    status,
    ...(startedAtRaw ? { started_at: startedAtRaw } : {}),
    ...(endedAtRaw ? { ended_at: endedAtRaw } : {}),
    ...(tags.length ? { tags } : {}),
    owner: user.slug,
  });

  const path = `Missionen/${slug}/index.md`;

  try {
    const { htmlUrl } = await commitVaultFile({
      path,
      content: fileContent,
      message: `Neue Mission: ${title} (via Web-App, ${user.name})`,
    });
    return { success: { commitUrl: htmlUrl, path } };
  } catch (err) {
    if (err instanceof VaultFileExistsError) {
      return {
        error:
          "Dieser Mission-Slug existiert im Vault bereits (evtl. steht ein Ingest noch aus) — bitte einen anderen wählen.",
      };
    }
    return {
      error:
        err instanceof Error
          ? `Commit ins Vault fehlgeschlagen: ${err.message}`
          : "Commit ins Vault fehlgeschlagen.",
    };
  }
}
