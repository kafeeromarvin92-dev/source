"use client";

import Image from "next/image";
import { useState } from "react";

const fallbackLogo = "/noble-gamers-logo.jpg";

function usableImageSource(avatar?: string | null) {
    if (!avatar) return fallbackLogo;
    if (avatar.startsWith("/") || avatar.startsWith("data:image/") || /^https?:\/\//i.test(avatar)) return avatar;
    return fallbackLogo;
}

export default function TeamLogo({
    avatar,
    alt = "Team logo",
    size = 48,
    className = "",
}: {
    avatar?: string | null;
    alt?: string;
    size?: number;
    className?: string;
}) {
    const [failedSource, setFailedSource] = useState("");
    const intendedSource = usableImageSource(avatar);
    const source = failedSource === intendedSource ? fallbackLogo : intendedSource;
    const isFallback = source === fallbackLogo;

    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gold p-[2px] shadow-[0_0_18px_rgba(255,199,0,0.16)] ${className}`}
            style={{ width: size, height: size }}
        >
            <Image
                src={source}
                alt={alt}
                width={size}
                height={size}
                unoptimized
                onError={() => setFailedSource(intendedSource)}
                className={`h-full w-full rounded-full border border-navy-950 ${isFallback ? "bg-fuchsia-500 object-contain" : "object-cover"}`}
            />
        </span>
    );
}
