"use client";

import { useState } from "react";

type FlexWinButtonProps = {
    opponentName: string;
    winnerScore: number;
    opponentScore: number;
};

function centeredText(context: CanvasRenderingContext2D, text: string, y: number, maxWidth: number, fontSize: number, color: string) {
    context.textAlign = "center";
    context.fillStyle = color;
    context.font = `800 ${fontSize}px system-ui, sans-serif`;
    while (context.measureText(text).width > maxWidth && fontSize > 32) {
        fontSize -= 2;
        context.font = `800 ${fontSize}px system-ui, sans-serif`;
    }
    context.fillText(text, 540, y);
}

function createFlexImage(opponentName: string, winnerScore: number, opponentScore: number, rank: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the flex image.");

    const background = context.createLinearGradient(0, 0, 1080, 1080);
    background.addColorStop(0, "#07111f");
    background.addColorStop(1, "#163a54");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#f4c95d";
    context.lineWidth = 5;
    context.strokeRect(48, 48, 984, 984);

    centeredText(context, "NOBLE GAMERS DLS", 210, 900, 54, "#f4c95d");
    centeredText(context, "I BEAT", 420, 900, 104, "#ffffff");
    centeredText(context, `@${opponentName}`, 555, 900, 76, "#ffffff");
    centeredText(context, `${winnerScore}-${opponentScore} 🔥`, 700, 900, 112, "#f4c95d");
    centeredText(context, `LEADERBOARD #${rank}`, 880, 900, 52, "#cbd5e1");
    return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Could not export the flex image."));
        }, "image/png");
    });
}

export default function FlexWinButton({ opponentName, winnerScore, opponentScore }: FlexWinButtonProps) {
    const [sharing, setSharing] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function flexWin() {
        setSharing(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/leaderboard");
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not get your leaderboard position.");
            if (typeof data.myPosition !== "number") throw new Error("Play a verified match to get a leaderboard position first.");

            const blob = await canvasToBlob(createFlexImage(opponentName, winnerScore, opponentScore, data.myPosition));
            const file = new File([blob], "noble-gamers-flex-win.png", { type: "image/png" });
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: "Noble Gamers DLS win",
                    text: `I BEAT @${opponentName} ${winnerScore}-${opponentScore} 🔥 · Noble Gamers DLS · Leaderboard #${data.myPosition}`,
                    files: [file],
                });
                setMessage("Flex image shared.");
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = file.name;
                document.body.append(link);
                link.click();
                link.remove();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                setMessage("Flex image downloaded. Share it on WhatsApp.");
            }
        } catch (shareError) {
            setError(shareError instanceof Error ? shareError.message : "Could not share the flex image.");
        } finally {
            setSharing(false);
        }
    }

    return (
        <div className="space-y-2">
            <button onClick={() => { void flexWin(); }} disabled={sharing} className="w-full bg-green-500 text-navy-950 font-bold py-3 rounded-xl disabled:opacity-60">
                {sharing ? "Creating flex image..." : "Flex Win on WhatsApp"}
            </button>
            {message && <p className="text-sm text-green-300 text-center">{message}</p>}
            {error && <p className="text-sm text-red-300 text-center">{error}</p>}
        </div>
    );
}
