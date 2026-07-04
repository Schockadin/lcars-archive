import "server-only";
import sql from "@/lib/db";
import {
  sendPushToUser as sendPushToUserCore,
  type PushPayload,
  type SendPushResult,
} from "./pushCore";

export type { PushPayload, SendPushResult };

// Kapselt das sql-Argument von pushCore.ts, damit App-Aufrufer (z.B.
// src/app/actions/dialogues.ts) kein sql durchreichen müssen — exakt das
// gleiche Muster wie mail.ts für mailCore.ts.
export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
): Promise<SendPushResult> {
  return sendPushToUserCore(sql, userId, payload);
}
