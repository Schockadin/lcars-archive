"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateNotificationSettingsAction,
  type NotificationSettingsState,
} from "./notificationActions";

const initialState: NotificationSettingsState = {};

// VAPID-Public-Key ist Base64url-kodiert, applicationServerKey braucht ein
// Uint8Array — Standard-Snippet aus der Web-Push-Doku.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type DeviceStatus = "checking" | "unsupported" | "subscribed" | "unsubscribed";

// Zwei unabhängige Teile: oben die Präferenzen (globale Schalter, per
// Formular gespeichert), unten die Geräte-Registrierung für Push (rein
// client-seitig, kein Page-Reload — verwaltet nur "dieses Gerät").
export default function NotificationSettingsForm({
  user,
}: {
  user: { emailEnabled: boolean; pushEnabled: boolean };
}) {
  const [state, formAction, pending] = useActionState(
    updateNotificationSettingsAction,
    initialState,
  );

  // Initialstatus immer "checking" (auf Server UND Client identisch — Node
  // hat seit v21 ein eigenes globales navigator-Objekt ohne serviceWorker,
  // ein synchroner Support-Check hier würde also einen Hydration-Mismatch
  // erzeugen). Die eigentliche, asynchrone Prüfung läuft ausschließlich im
  // Effect, in eine innere Funktion gekapselt (statt direkt im
  // Effect-Body), damit kein setState synchron beim Effect-Durchlauf
  // selbst passiert.
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("checking");
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [devicePending, setDevicePending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setDeviceStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setDeviceStatus(sub ? "subscribed" : "unsubscribed");
      } catch {
        if (!cancelled) setDeviceStatus("unsupported");
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enablePush() {
    setDeviceError(null);
    setDevicePending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDeviceError("Berechtigung wurde nicht erteilt.");
        return;
      }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setDeviceError("Push ist serverseitig noch nicht konfiguriert.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const json = subscription.toJSON();

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("subscribe failed");

      setDeviceStatus("subscribed");
    } catch {
      setDeviceError("Push konnte für dieses Gerät nicht aktiviert werden.");
    } finally {
      setDevicePending(false);
    }
  }

  async function disablePush() {
    setDeviceError(null);
    setDevicePending(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setDeviceStatus("unsubscribed");
    } catch {
      setDeviceError("Push konnte für dieses Gerät nicht deaktiviert werden.");
    } finally {
      setDevicePending(false);
    }
  }

  return (
    <div className="flex flex-col gap-[24px]">
      <form
        action={formAction}
        className="flex max-w-[420px] flex-col gap-[16px]"
      >
        <div className="flex items-center gap-[10px]">
          <input
            id="emailEnabled"
            name="emailEnabled"
            type="checkbox"
            defaultChecked={user.emailEnabled}
            className="lcars-checkbox"
          />
          <label htmlFor="emailEnabled" className="lcars-eyebrow">
            E-Mail-Benachrichtigungen
          </label>
        </div>

        <div className="flex items-center gap-[10px]">
          <input
            id="pushEnabled"
            name="pushEnabled"
            type="checkbox"
            defaultChecked={user.pushEnabled}
            className="lcars-checkbox"
          />
          <label htmlFor="pushEnabled" className="lcars-eyebrow">
            Push-Benachrichtigungen
          </label>
        </div>

        {state?.error && (
          <p className="text-lcars-red" role="alert">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="text-lcars-green" role="status">
            Gespeichert.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="lcars-switch self-end disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Speichern"}
        </button>
      </form>

      <div className="flex max-w-[420px] flex-col gap-[8px]">
        <p className="lcars-eyebrow">Push für dieses Gerät</p>

        {deviceStatus === "checking" && (
          <p className="text-lcars-text-dim">Prüfe Status…</p>
        )}
        {deviceStatus === "unsupported" && (
          <p className="text-lcars-text-dim">
            Push-Benachrichtigungen werden von diesem Browser nicht
            unterstützt.
          </p>
        )}
        {deviceStatus === "subscribed" && (
          <>
            <p className="text-lcars-green">
              Push ist für dieses Gerät aktiv.
            </p>
            <button
              type="button"
              disabled={devicePending}
              onClick={disablePush}
              className="lcars-switch self-start disabled:opacity-50"
            >
              Für dieses Gerät deaktivieren
            </button>
          </>
        )}
        {deviceStatus === "unsubscribed" && (
          <button
            type="button"
            disabled={devicePending}
            onClick={enablePush}
            className="lcars-switch self-start disabled:opacity-50"
          >
            Push für dieses Gerät aktivieren
          </button>
        )}

        {deviceError && (
          <p className="text-lcars-red" role="alert">
            {deviceError}
          </p>
        )}
      </div>
    </div>
  );
}
