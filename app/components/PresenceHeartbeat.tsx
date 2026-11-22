"use client";

import { useEffect } from "react";

export default function PresenceHeartbeat() {
    useEffect(() => {
        let active = true;

        const sendHeartbeat = () => {
            if (active && document.visibilityState === "visible") {
                void fetch("/api/presence/heartbeat", { method: "POST", cache: "no-store" });
            }
        };

        sendHeartbeat();
        const interval = window.setInterval(sendHeartbeat, 30_000);
        document.addEventListener("visibilitychange", sendHeartbeat);
        return () => {
            active = false;
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", sendHeartbeat);
        };
    }, []);

    return null;
}
