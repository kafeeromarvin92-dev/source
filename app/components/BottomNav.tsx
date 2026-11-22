"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
    { href: "/", label: "Play", icon: "⚽" },
    { href: "/tournaments", label: "Tournaments", icon: "🏆" },
    { href: "/leaderboard", label: "Ranks", icon: "🏆" },
    { href: "/profile", label: "Me", icon: "👤" },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let mounted = true;
        void fetch("/api/auth/me").then(async (response) => {
            if (!response.ok) return null;
            return response.json().catch(() => null);
        }).then((data) => {
            if (mounted) setIsAdmin(data?.user?.isAdmin === true);
        }).catch(() => {
            if (mounted) setIsAdmin(false);
        });
        return () => { mounted = false; };
    }, []);

    const items = isAdmin ? [...navItems, { href: "/admin", label: "Admin", icon: "♜" }] : navItems;

    return (
        <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-navy-950/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-xl justify-around gap-1 px-2 py-2 sm:gap-2 sm:px-3">
                {items.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    const adminItem = item.label === "Admin";
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wide transition sm:text-[10px] ${active ? "bg-gold/10 text-gold" : adminItem ? "text-gold hover:bg-gold/10" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                        >
                            <span className="text-lg leading-none" aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
