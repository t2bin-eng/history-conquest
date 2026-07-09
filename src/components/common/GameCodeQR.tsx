"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface GameCodeQRProps {
  code: string;
  size?: number;
}

/** 게임 참가 코드를 학생이 카메라로 스캔해 바로 /join으로 이동할 수 있는 QR코드. */
export function GameCodeQR({ code, size = 152 }: GameCodeQRProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!code || typeof window === "undefined") return;
    const joinUrl = `${window.location.origin}/join?code=${code}`;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      width: size,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, size]);

  if (!dataUrl) return null;

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg bg-white p-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="게임 참가 QR코드" width={size} height={size} />
      <p className="text-[10px] font-medium text-neutral-600">스캔해서 바로 참가</p>
    </div>
  );
}
