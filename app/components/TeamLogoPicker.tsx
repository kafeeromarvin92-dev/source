"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import LogoCropModal from "./LogoCropModal";
import TeamLogo from "./TeamLogo";

export default function TeamLogoPicker({
    value,
    onChange,
    disabled = false,
}: {
    value?: string | null;
    onChange: (avatar: string) => void;
    disabled?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const sourceRef = useRef("");
    const [source, setSource] = useState("");
    const [error, setError] = useState("");

    useEffect(() => () => {
        if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    }, []);

    function discardSource() {
        if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
        sourceRef.current = "";
        setSource("");
    }

    function chooseImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("Choose a JPG, PNG, or WebP image.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError("Your logo must be 5 MB or smaller.");
            return;
        }
        setError("");
        discardSource();
        const nextSource = URL.createObjectURL(file);
        sourceRef.current = nextSource;
        setSource(nextSource);
    }

    function closeCropper() {
        discardSource();
    }

    function useCrop(avatar: string) {
        onChange(avatar);
        discardSource();
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-4">
            <div className="flex items-center gap-3">
                <TeamLogo avatar={value} alt="Your team logo" size={56} />
                <div className="min-w-0 flex-1">
                    <p className="font-bold">Team logo</p>
                    <p className="mt-0.5 text-xs text-slate-400">JPG, PNG or WebP · up to 5 MB</p>
                </div>
                <label className={`cursor-pointer rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-center text-xs font-black text-gold transition hover:bg-gold/20 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
                    {value ? "Change" : "Upload Team Logo"}
                    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={chooseImage} className="sr-only" />
                </label>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
            {source && <LogoCropModal source={source} onCancel={closeCropper} onRetake={() => { discardSource(); inputRef.current?.click(); }} onUse={useCrop} />}
        </div>
    );
}
