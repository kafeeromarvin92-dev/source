"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/", label: "Play", icon: "⚽" },
    { href: "/matches", label: "Matches", icon: "🎮" },
    { href: "/leaderboard", label: "Ranks", icon: "🏆" },
    { href: "/profile", label: "Me", icon: "👤" },
];

export default function BottomNav() {
    const pathname = usePathname();
    return <nav aria-label="Primary navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-navy-700 bg-navy-900"><div className="mx-auto flex max-w-lg justify-around px-2 py-2">{navItems.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition ${active ? "bg-gold/10 text-gold" : "text-slate-400 hover:text-white"}`}><span className="text-base leading-none" aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>; })}</div></nav>;
}
