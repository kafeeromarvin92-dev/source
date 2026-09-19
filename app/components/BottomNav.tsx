"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/", label: "lobby" },
    { href: "/matches", label: "matches" },
    { href: "/results", label: "Results" },
    { href: "/leaderboard", label: "Ranks" },
    { href: "/wallet", label: "wallet" },
    { href: "/profile", label: "Profile " }
];
export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900 border-t border-navy-700">
            <div className="max-w-lg mx-auto flex justify-around py-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`text-sm font-medium ${isActive ? "text-gold" : "text-slate-400"
                                }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav >
    );
}