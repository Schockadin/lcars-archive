"use client";

import type { Realtime as AblyRealtime } from "ably";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  REALTIME_REFRESH_CHANNEL,
  REALTIME_REFRESH_EVENT,
} from "@/lib/realtimeShared";

interface RealtimeUpdatesContextValue {
  connected: boolean;
  subscribe: (listener: () => void) => () => void;
}

const RealtimeUpdatesContext = createContext<RealtimeUpdatesContextValue>({
  connected: false,
  subscribe: () => () => {},
});

const REALTIME_ENABLED = process.env.NEXT_PUBLIC_ABLY_ENABLED === "true";

export default function RealtimeUpdatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const listenersRef = useRef(new Set<() => void>());
  const pendingUpdateRef = useRef(false);
  const [connected, setConnected] = useState(false);

  const notify = useCallback(() => {
    if (listenersRef.current.size === 0) {
      router.refresh();
      return;
    }
    for (const listener of listenersRef.current) listener();
  }, [router]);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    if (!REALTIME_ENABLED) return;

    let active = true;
    let realtime: AblyRealtime | null = null;
    let unsubscribeChannel: (() => void) | null = null;
    let removeConnectionListener: (() => void) | null = null;
    let removeVisibilityListener: (() => void) | null = null;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    function flushUpdate() {
      if (document.hidden) {
        pendingUpdateRef.current = true;
        return;
      }

      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        refreshTimeout = null;
        pendingUpdateRef.current = false;
        notify();
      }, 150);
    }

    async function connect() {
      try {
        // Ably wird nur als eigener Chunk nach der Hydrierung geladen und nur,
        // wenn Realtime aktiviert ist. So steckt der Client nicht im
        // initialen gemeinsamen Bundle sämtlicher Routen.
        const { Realtime } = await import("ably");
        if (!active) return;

        const client = new Realtime({
          authUrl: "/api/realtime/token",
          authMethod: "GET",
          closeOnUnload: true,
        });
        realtime = client;
        const channel = client.channels.get(REALTIME_REFRESH_CHANNEL);
        let channelSubscribed = false;

        function onMessage() {
          if (!active) return;
          flushUpdate();
        }

        function onConnectionState(state: {
          current: string;
          previous: string;
        }) {
          if (!active) return;
          const isConnected =
            state.current === "connected" && channelSubscribed;
          setConnected(isConnected);
          if (isConnected) flushUpdate();
        }

        function onVisibilityChange() {
          if (!document.hidden && pendingUpdateRef.current) flushUpdate();
        }

        const onChannelError = (error: unknown) => {
          if (!active) return;
          console.error("Realtime-Kanal konnte nicht abonniert werden.", error);
          setConnected(false);
        };

        unsubscribeChannel = () =>
          channel.unsubscribe(REALTIME_REFRESH_EVENT, onMessage);
        removeConnectionListener = () => client.connection.off(onConnectionState);
        removeVisibilityListener = () =>
          document.removeEventListener("visibilitychange", onVisibilityChange);
        client.connection.on(onConnectionState);
        document.addEventListener("visibilitychange", onVisibilityChange);

        channel
          .subscribe(REALTIME_REFRESH_EVENT, onMessage)
          .then(() => {
            if (!active) return;
            channelSubscribed = true;
            const isConnected = client.connection.state === "connected";
            setConnected(isConnected);
            if (isConnected) flushUpdate();
          })
          .catch(onChannelError);
      } catch (error) {
        if (!active) return;
        console.error("Realtime konnte nicht geladen werden.", error);
        setConnected(false);
      }
    }

    void connect();

    return () => {
      active = false;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      unsubscribeChannel?.();
      removeConnectionListener?.();
      removeVisibilityListener?.();
      realtime?.close();
    };
  }, [notify]);

  return (
    <RealtimeUpdatesContext.Provider value={{ connected, subscribe }}>
      {children}
    </RealtimeUpdatesContext.Provider>
  );
}

export function useRealtimeUpdates(): RealtimeUpdatesContextValue {
  return useContext(RealtimeUpdatesContext);
}
