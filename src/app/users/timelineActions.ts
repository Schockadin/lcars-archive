"use server";
import { requireAdmin } from "@/lib/dal";
import {
  regenerateTimeline,
  type RegenerateTimelineResult,
} from "@/lib/timeline";
import { revalidateTimeline } from "@/lib/revalidate";

export interface RegenerateTimelineActionResult {
  result?: RegenerateTimelineResult;
  error?: string;
}

export async function regenerateTimelineAction(): Promise<RegenerateTimelineActionResult> {
  await requireAdmin();

  try {
    const result = await regenerateTimeline();
    revalidateTimeline();
    return { result };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Regenerierung fehlgeschlagen: ${err.message}`
          : "Regenerierung fehlgeschlagen.",
    };
  }
}
