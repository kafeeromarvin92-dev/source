"use client";

import Image from "next/image";
import { PointerEvent, useEffect, useRef, useState } from "react";

const frameSize = 256;
const outputSize = 512;

type LogoCropModalProps = {
    source: string;
    onCancel: () => void;
    onRetake: () => void;
    onUse: (avatar: string) => void;
};

function CropPreview({
    size,
    source,
    imageWidth,
    imageHeight,
    zoom,
    rotation,
    pan,
}: {
    size: number;
    source: string;
    imageWidth: number;
    imageHeight: number;
    zoom: number;
    rotation: number;
    pan: { x: number; y: number };
}) {
    const scale = size / Math.max(1, Math.min(imageWidth, imageHeight)) * zoom;
    const factor = size / frameSize;
    return (
        <span className="relative block shrink-0 overflow-hidden rounded-full border border-gold/70 bg-navy-900" style={{ width: size, height: size }}>
            {imageWidth > 0 && imageHeight > 0 && (
                <Image
                    src={source}
                    alt=""
                    aria-hidden="true"
                    width={Math.ceil(imageWidth * scale)}
                    height={Math.ceil(imageHeight * scale)}
                    unoptimized
                    draggable={false}
                    className="pointer-events-none absolute max-w-none select-none"
                    style={{
                        left: "50%",
                        top: "50%",
                        transform: `translate(-50%, -50%) translate(${pan.x * factor}px, ${pan.y * factor}px) rotate(${rotation}deg)`,
                    }}
                />
            )}
        </span>
    );
}

export default function LogoCropModal({ source, onCancel, onRetake, onUse }: LogoCropModalProps) {
    const imageRef = useRef<HTMLImageElement>(null);
    const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [error, setError] = useState("");

    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") onCancel();
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [onCancel]);

    function startDrag(event: PointerEvent<HTMLDivElement>) {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
    }

    function moveCrop(event: PointerEvent<HTMLDivElement>) {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const limit = frameSize * 0.62;
        setPan({
            x: Math.max(-limit, Math.min(limit, drag.originX + event.clientX - drag.startX)),
            y: Math.max(-limit, Math.min(limit, drag.originY + event.clientY - drag.startY)),
        });
    }

    function stopDrag(event: PointerEvent<HTMLDivElement>) {
        if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    }

    function useLogo() {
        const image = imageRef.current;
        if (!image || !dimensions.width || !dimensions.height) {
            setError("The selected image is still loading. Try again in a moment.");
            return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const context = canvas.getContext("2d");
        if (!context) {
            setError("Your browser could not prepare this logo. Try another image.");
            return;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.beginPath();
        context.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        context.clip();
        context.translate(outputSize / 2 + pan.x * outputSize / frameSize, outputSize / 2 + pan.y * outputSize / frameSize);
        context.rotate(rotation * Math.PI / 180);
        const scale = outputSize / Math.min(dimensions.width, dimensions.height) * zoom;
        context.scale(scale, scale);
        context.drawImage(image, -dimensions.width / 2, -dimensions.height / 2);

        let cropped: string;
        try {
            cropped = canvas.toDataURL("image/png");
            const base64 = cropped.slice(cropped.indexOf(",") + 1);
            const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
            if (Math.floor(base64.length * 3 / 4) - padding > 1_000_000) {
                cropped = canvas.toDataURL("image/webp", 0.88);
            }
        } catch {
            setError("Could not crop this image. Try choosing it again.");
            return;
        }

        const encoded = cropped.slice(cropped.indexOf(",") + 1);
        const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
        if (Math.floor(encoded.length * 3 / 4) - padding > 1_000_000) {
            setError("This logo is too detailed to upload. Try a simpler or smaller image.");
            return;
        }
        onUse(cropped);
    }

    const scale = frameSize / Math.max(1, Math.min(dimensions.width, dimensions.height)) * zoom;

    return (
        <div
            role="presentation"
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <section role="dialog" aria-modal="true" aria-labelledby="logo-crop-title" className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-white/10 bg-navy-800 p-5 shadow-2xl shadow-black/60 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Team identity</p>
                        <h2 id="logo-crop-title" className="mt-1 text-xl font-black">Crop your team logo</h2>
                        <p className="mt-1 text-sm text-slate-400">Crop so only your logo is in the circle.</p>
                    </div>
                    <button type="button" onClick={onCancel} aria-label="Close crop dialog" className="rounded-full border border-white/10 px-3 py-2 text-slate-300 transition hover:bg-white/10">✕</button>
                </div>

                <div
                    className="relative mx-auto mt-5 touch-none overflow-hidden rounded-full border-2 border-gold bg-navy-950 shadow-[0_0_36px_rgba(255,199,0,0.16)]"
                    style={{ width: frameSize, height: frameSize }}
                    onPointerDown={startDrag}
                    onPointerMove={moveCrop}
                    onPointerUp={stopDrag}
                    onPointerCancel={stopDrag}
                    aria-label="Drag the image to position the crop"
                >
                    {dimensions.width > 0 && dimensions.height > 0 && (
                        <Image
                            ref={imageRef}
                            src={source}
                            alt="Selected team logo crop"
                            width={Math.ceil(dimensions.width * scale)}
                            height={Math.ceil(dimensions.height * scale)}
                            unoptimized
                            draggable={false}
                            onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                            style={{
                                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
                            }}
                        />
                    )}
                    {dimensions.width === 0 && (
                        <Image
                            ref={imageRef}
                            src={source}
                            alt="Selected team logo crop"
                            width={256}
                            height={256}
                            unoptimized
                            onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                            className="hidden"
                        />
                    )}
                    <span className="pointer-events-none absolute inset-3 rounded-full border border-white/45" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Zoom <span className="ml-1 text-gold">{zoom.toFixed(1)}×</span>
                        <input aria-label="Zoom logo" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-3 w-full accent-gold" />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Rotate <span className="ml-1 text-gold">{rotation}°</span>
                        <input aria-label="Rotate logo" type="range" min="-180" max="180" step="1" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} className="mt-3 w-full accent-gold" />
                    </label>
                </div>

                <div className="mt-5 rounded-2xl border border-white/5 bg-navy-900/70 p-3">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Preview at every size</p>
                    <div className="flex items-end justify-around">
                        {[72, 48, 32].map((size, index) => (
                            <div key={size} className="flex flex-col items-center gap-2">
                                <CropPreview size={size} source={source} imageWidth={dimensions.width} imageHeight={dimensions.height} zoom={zoom} rotation={rotation} pan={pan} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{["Profile", "Match", "Ranks"][index]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</p>}

                <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={onRetake} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5">Retake</button>
                    <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5">Cancel</button>
                    <button type="button" onClick={useLogo} disabled={!dimensions.width} className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-black text-navy-950 transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50">Use this logo</button>
                </div>
            </section>
        </div>
    );
}
