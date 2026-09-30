"use client";

import { Realtime } from "ably";
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

    const realtime = new Realtime({
      authUrl: "/api/realtime/token",
      authMethod: "GET",
      closeOnUnload: true,
    });
    const channel = realtime.channels.get(REALTIME_REFRESH_CHANNEL);
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    let channelSubscribed = false;

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

    function onMessage() {
      flushUpdate();
    }

    function onConnectionState(state: { current: string; previous: string }) {
      const isConnected =
        state.current === "connected" && channelSubscribed;
      setConnected(isConnected);
      if (isConnected) flushUpdate();
    }

    function onVisibilityChange() {
      if (!document.hidden && pendingUpdateRef.current) flushUpdate();
    }

    const onChannelError = (error: unknown) => {
      console.error("Realtime-Kanal konnte nicht abonniert werden.", error);
      setConnected(false);
    };

    channel
      .subscribe(REALTIME_REFRESH_EVENT, onMessage)
      .then(() => {
        channelSubscribed = true;
        const isConnected = realtime.connection.state === "connected";
        setConnected(isConnected);
        if (isConnected) flushUpdate();
      })
      .catch(onChannelError);
    realtime.connection.on(onConnectionState);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      channel.unsubscribe(REALTIME_REFRESH_EVENT, onMessage);
      realtime.connection.off(onConnectionState);
      realtime.close();
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
