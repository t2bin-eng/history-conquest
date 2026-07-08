"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageDataUrl } from "@/lib/cropImage";

interface FlagUploaderProps {
  teamColor: string;
  flagImageUrl: string | null;
  onFlagConfirmed: (dataUrl: string) => void;
}

export function FlagUploader({ teamColor, flagImageUrl, onFlagConfirmed }: FlagUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    const dataUrl = await getCroppedImageDataUrl(rawImage, croppedAreaPixels);
    onFlagConfirmed(dataUrl);
    setRawImage(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-neutral-300">팀 깃발</span>

      {rawImage ? (
        <div className="flex flex-col gap-3">
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-neutral-800">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmCrop}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              깃발로 확정
            </button>
            <button
              type="button"
              onClick={() => setRawImage(null)}
              className="rounded-md bg-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-600"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <FlagPreview color={teamColor} imageUrl={flagImageUrl} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700"
          >
            {flagImageUrl ? "이미지 다시 선택" : "이미지 업로드"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
}

function FlagPreview({ color, imageUrl }: { color: string; imageUrl: string | null }) {
  return (
    <div className="relative flex h-24 w-20 items-start justify-center">
      <div
        className="absolute left-1/2 top-0 h-24 w-1.5 -translate-x-1/2 rounded-full bg-neutral-500"
        aria-hidden
      />
      <div
        className="relative mt-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border-2 border-neutral-600 shadow-md"
        style={{ backgroundColor: color }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="팀 깃발 미리보기" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-white/70">깃발</span>
        )}
      </div>
    </div>
  );
}
