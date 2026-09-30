import "server-only";
import { Rest } from "ably";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import { REALTIME_REFRESH_CHANNEL, REALTIME_REFRESH_EVENT } from "./realtimeShared";

let ablyRest: Rest | null = null;

function getAblyRest(): Rest | null {
  const key = process.env.ABLY_API_KEY?.trim();
  if (!key) return null;
  if (!ablyRest) ablyRest = new Rest({ key });
  return ablyRest;
}

// The realtime channel carries only a generic invalidation signal. Page data
// continues to be loaded through the normal, permission-checked Next.js paths.
export async function publishContentChanged(): Promise<void> {
  const ably = getAblyRest();
  if (!ably) return;

  try {
    await ably.channels
      .get(REALTIME_REFRESH_CHANNEL)
      .publish(REALTIME_REFRESH_EVENT, {});
  } catch (error) {
    // A realtime outage must not turn a successful content write into an
    // apparent failure. Clients fall back to periodic refresh while offline.
    console.error("Realtime-Update konnte nicht gesendet werden.", error);
  }
}

export async function revalidatePathAndNotify(
  path: string,
  type?: "page" | "layout",
): Promise<void> {
  nextRevalidatePath(path, type);
  await publishContentChanged();
}
