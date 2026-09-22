"use client";

import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

type ImageSize = { width: number; height: number };
type Position = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ProfilePhotoCropper({
  file,
  uploading,
  onCancel,
  onConfirm,
}: {
  file: File;
  uploading: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ point: Position; position: Position } | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setSourceUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !uploading && !processing) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, processing, uploading]);

  const imageLayout = useMemo(() => {
    if (!imageSize) return null;
    const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
    const scale = baseScale * zoom;
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;
    return {
      scale,
      width,
      height,
      maxX: Math.max(0, (width - CROP_SIZE) / 2),
      maxY: Math.max(0, (height - CROP_SIZE) / 2),
    };
  }, [imageSize, zoom]);

  function constrain(next: Position): Position {
    if (!imageLayout) return next;
    return {
      x: clamp(next.x, -imageLayout.maxX, imageLayout.maxX),
      y: clamp(next.y, -imageLayout.maxY, imageLayout.maxY),
    };
  }

  function resetCrop() {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!imageLayout || uploading || processing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      point: { x: event.clientX, y: event.clientY },
      position,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    setPosition(constrain({
      x: start.position.x + event.clientX - start.point.x,
      y: start.position.y + event.clientY - start.point.y,
    }));
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
  }

  function changeZoom(nextZoom: number) {
    setZoom(nextZoom);
    setPosition((current) => {
      if (!imageSize) return current;
      const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
      const width = imageSize.width * baseScale * nextZoom;
      const height = imageSize.height * baseScale * nextZoom;
      return {
        x: clamp(current.x, -Math.max(0, (width - CROP_SIZE) / 2), Math.max(0, (width - CROP_SIZE) / 2)),
        y: clamp(current.y, -Math.max(0, (height - CROP_SIZE) / 2), Math.max(0, (height - CROP_SIZE) / 2)),
      };
    });
  }

  async function confirmCrop() {
    if (!imageRef.current || !imageSize || !imageLayout) return;
    try {
      setProcessing(true);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser cannot crop this image");

      const sourceX = (imageLayout.width / 2 - CROP_SIZE / 2 - position.x) / imageLayout.scale;
      const sourceY = (imageLayout.height / 2 - CROP_SIZE / 2 - position.y) / imageLayout.scale;
      const sourceSize = CROP_SIZE / imageLayout.scale;
      context.drawImage(imageRef.current, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Unable to create the cropped image")), "image/jpeg", 0.9);
      });
      await onConfirm(new File([blob], "profile-photo.jpg", { type: "image/jpeg" }));
    } finally {
      setProcessing(false);
    }
  }

  const busy = uploading || processing;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="profile-photo-crop-title">
      <section className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-photo-crop-title" className="text-lg font-bold text-slate-900">Crop profile photo</h2>
            <p className="mt-1 text-sm text-slate-500">Drag the image to reposition it, then adjust the zoom.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close crop photo dialog"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 flex justify-center">
          <div
            className="relative h-[280px] w-[280px] touch-none overflow-hidden rounded-full bg-slate-950 shadow-inner select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            {sourceUrl && (
              <img
                ref={imageRef}
                src={sourceUrl}
                alt="Crop preview"
                draggable={false}
                onLoad={(event) => {
                  setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
                  resetCrop();
                }}
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={imageLayout ? {
                  width: imageLayout.width,
                  height: imageLayout.height,
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                } : undefined}
              />
            )}
            {!imageLayout && <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zoom</span>
          <input aria-label="Zoom profile photo" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} disabled={!imageLayout || busy} className="h-2 flex-1 cursor-pointer accent-blue-600 disabled:cursor-not-allowed" />
          <button type="button" onClick={resetCrop} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button type="button" onClick={confirmCrop} disabled={!imageLayout || busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {uploading ? "Uploading…" : processing ? "Cropping…" : "Use photo"}
          </button>
        </div>
      </section>
    </div>
  );
}
