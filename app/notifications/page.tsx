"use client";
import { useEffect, useState } from "react";

type Notice = { id: string; title: string; message: string; kind: string; readAt?: string | null; createdAt?: string };
export default function NotificationsPage() {
    const [items, setItems] = useState<Notice[]>([]); const [error, setError] = useState("");
    useEffect(() => { fetch("/api/notifications").then(async (response) => { const data = await response.json(); if (!response.ok) setError(data.error || "Could not load notifications."); else setItems(data.notifications); }).catch(() => setError("Could not load notifications.")); }, []);
    async function markRead(id: string) { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)); }
    return <div className="px-4 pt-5 space-y-5"><header><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-gold">Stay in the loop</p><h1 className="mt-1 text-3xl font-black">Notifications</h1></header>{error && <p className="text-sm text-red-300">{error}</p>}<section className="space-y-3">{items.map((item) => <button key={item.id} onClick={() => { void markRead(item.id); }} className={`w-full rounded-2xl border p-4 text-left transition ${item.readAt ? "border-navy-700 bg-navy-800/70" : "border-gold/30 bg-gold/10"}`}><div className="flex items-start justify-between gap-3"><p className="font-bold">{item.title}</p>{!item.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />}</div><p className="mt-1 text-sm text-slate-300">{item.message}</p>{item.createdAt && <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>}</button>)}{!error && items.length === 0 && <p className="rounded-2xl border border-dashed border-navy-600 p-5 text-center text-sm text-slate-400">You are all caught up.</p>}</section></div>;
}
