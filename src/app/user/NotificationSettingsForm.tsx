"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateNotificationSettingsAction,
  type NotificationSettingsState,
} from "./notificationActions";
import {
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";

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

const ADMIN_CONTENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "character", label: "Charaktere" },
  { value: "mission", label: "Missionen" },
  { value: "mission_log", label: "Mission-Logs" },
  { value: "archive_entry", label: "Archiv-Einträge" },
];

// Zwei unabhängige Teile: oben die Präferenzen (globale Schalter, per
// Formular gespeichert), unten die Geräte-Registrierung für Push (rein
// client-seitig, kein Page-Reload — verwaltet nur "dieses Gerät"). isAdmin
// blendet die Checkbox-Liste "Über alle Inhalte benachrichtigt werden" ein
// (notify_content_types, siehe notificationActions.ts) — die Spalte
// existiert zwar für jede Rolle, ist aber nur für Admins sinnvoll (siehe
// notifyAdminContentSubscribers in lib/follows.ts).
export default function NotificationSettingsForm({
  user,
  isAdmin,
}: {
  user: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    notifyContentTypes: string[];
  };
  isAdmin: boolean;
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
        className="flex max-w-[var(--lcars-content-w)] flex-col gap-[16px]"
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

        {isAdmin && (
          <div className="flex flex-col gap-[8px]">
            <span className="lcars-eyebrow">
              Über alle Inhalte benachrichtigen
            </span>
            <p className="text-lcars-text-dim text-[13px]">
              Zusätzlich zu eigenen Abos: Mail/Push bei jedem Anlegen/
              Bearbeiten der ausgewählten Inhaltstypen durch beliebige User.
            </p>
            <div className="flex flex-col gap-[6px]">
              {ADMIN_CONTENT_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-[10px]">
                  <input
                    id={`notifyContentTypes-${option.value}`}
                    name="notifyContentTypes"
                    type="checkbox"
                    value={option.value}
                    defaultChecked={user.notifyContentTypes.includes(option.value)}
                    className="lcars-checkbox"
                  />
                  <label
                    htmlFor={`notifyContentTypes-${option.value}`}
                    className="lcars-eyebrow"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <FormError message={state?.error} />
        {state?.success && <FormSuccess>Gespeichert.</FormSuccess>}

        <SubmitButton
          pending={pending}
          pendingLabel="Speichern…"
          className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
        >
          Speichern
        </SubmitButton>
      </form>

      <div className="flex max-w-[var(--lcars-content-w)] flex-col gap-[8px]">
        <p className="lcars-eyebrow">
          Push <strong>nur</strong> für dieses Gerät
        </p>

        {deviceStatus === "checking" && (
          <p className="text-lcars-text-dim">Prüfe Status…</p>
        )}
        {deviceStatus === "unsupported" && (
          <p className="text-lcars-text-dim">
            Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
          </p>
        )}
        {deviceStatus === "subscribed" && (
          <>
            <p className="text-lcars-green">Push ist für dieses Gerät aktiv.</p>
            <button
              type="button"
              disabled={devicePending}
              onClick={disablePush}
              className="lcars-pill-btn self-start disabled:opacity-50 w-[100%]"
            >
              Push deaktivieren
            </button>
          </>
        )}
        {deviceStatus === "unsubscribed" && (
          <button
            type="button"
            disabled={devicePending}
            onClick={enablePush}
            className="lcars-pill-btn--outline self-start disabled:opacity-50 w-[100%]"
          >
            Push aktivieren
          </button>
        )}

        <FormError message={deviceError ?? undefined} />
      </div>
    </div>
  );
}
