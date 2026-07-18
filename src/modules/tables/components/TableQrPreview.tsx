import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BRAND } from '@/constants';

type Props = {
  url: string;
  size?: number;
  className?: string;
};

/** Live scannable QR for a menu URL */
export function TableQrPreview({ url, size = 160, className }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size * 2,
      color: { dark: BRAND.navy, light: '#FFFFFF' },
    }).then((src) => {
      if (!cancelled) setDataUrl(src);
    });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!url) return null;

  return dataUrl ? (
    <img
      src={dataUrl}
      alt="Table menu QR code"
      width={size}
      height={size}
      className={className}
    />
  ) : (
    <div
      className={className}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
