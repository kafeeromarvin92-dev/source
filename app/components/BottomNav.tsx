"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
    { href: "/", label: "Play", icon: "⚽" },
    { href: "/matches", label: "Matches", icon: "🎮" },
    { href: "/results", label: "Results", icon: "🏁" },
    { href: "/leaderboard", label: "Ranks", icon: "🏆" },
    { href: "/wallet", label: "Coins", icon: "🪙" },
    { href: "/friends", label: "Friends", icon: "🫂" },
    { href: "/profile", label: "Me", icon: "👤" }
];
export default function BottomNav() {
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        fetch("/api/auth/me").then(async (response) => {
            if (!response.ok) return;
            const data = await response.json();
            setIsAdmin(Boolean(data.user?.isAdmin));
        });
    }, []);

    const items = isAdmin
        ? [...navItems, { href: "/admin", label: "Admin", icon: "🛠️" }]
        : navItems;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900 border-t border-navy-700">
            <div className="max-w-lg mx-auto flex justify-around px-1 py-2">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition ${isActive ? "bg-gold/10 text-gold" : "text-slate-400 hover:text-white"}`}
                        >
                            <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav >
    );
}