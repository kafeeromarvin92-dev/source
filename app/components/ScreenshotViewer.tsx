"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function ScreenshotViewer({ src, alt }: { src: string; alt: string }) {
    const [open, setOpen] = useState(false);
    const [unavailableSrc, setUnavailableSrc] = useState("");
    const unavailable = unavailableSrc === src;

    useEffect(() => {
        if (!open) return;
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [open]);

    if (unavailable) {
        return <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/10 bg-navy-950 p-4 text-center text-xs text-slate-500">Screenshot unavailable</div>;
    }

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} aria-label={`Zoom ${alt}`} className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-navy-950 text-left">
                <Image src={src} alt={alt} width={1280} height={720} unoptimized onError={() => setUnavailableSrc(src)} className="h-full w-full object-contain transition duration-200 group-hover:scale-[1.02]" />
                <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Tap to zoom</span>
            </button>
            {open && (
                <div role="presentation" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
                    <section role="dialog" aria-modal="true" aria-label="Screenshot viewer" className="relative w-full max-w-6xl">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-bold text-white">{alt}</p>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close screenshot viewer" className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">Close</button>
                        </div>
                        <div className="relative mx-auto flex max-h-[82dvh] aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black">
                            <Image src={src} alt={alt} width={1920} height={1080} unoptimized onError={() => setUnavailableSrc(src)} className="h-full w-full object-contain" />
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}
