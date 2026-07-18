import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { APP_NAME, APP_TAGLINE, BRAND } from '@/constants';
import type { Table } from '@/types';
import { Download, Printer, X } from 'lucide-react';

type Props = {
  open: boolean;
  table: Table | null;
  menuUrl: string;
  onClose: () => void;
};

export function TableQrPrintModal({ open, table, menuUrl, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fileName = useMemo(() => {
    const label = (table?.tableNumber || 'table').replace(/[^\w.-]+/g, '-');
    return `CafePilots-${label}-QR.png`;
  }, [table?.tableNumber]);

  useEffect(() => {
    if (!open || !menuUrl) {
      setDataUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    void QRCode.toDataURL(menuUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: { dark: BRAND.navy, light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Could not generate QR code');
      });
    return () => {
      cancelled = true;
    };
  }, [open, menuUrl]);

  if (!open || !table) return null;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const handlePrint = () => {
    if (!printRef.current || !dataUrl) return;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
    if (!w) return;
    const safeUrl = menuUrl.replace(/</g, '&lt;');
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${APP_NAME} · ${table.tableNumber} QR</title>
  <style>
    @page { size: A6; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: ${BRAND.navy};
      background: #fff;
    }
    .card {
      width: 100%;
      max-width: 360px;
      margin: 0 auto;
      text-align: center;
      border: 2px solid ${BRAND.navy};
      padding: 28px 24px 22px;
    }
    .brand {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin: 0 0 4px;
    }
    .tag {
      font-family: system-ui, sans-serif;
      font-size: 11px;
      color: #64748b;
      margin: 0 0 18px;
    }
    .qr {
      width: 220px;
      height: 220px;
      margin: 0 auto 16px;
      display: block;
    }
    .table {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 6px;
    }
    .hint {
      font-family: system-ui, sans-serif;
      font-size: 12px;
      color: #475569;
      margin: 0 0 14px;
    }
    .link {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 9px;
      word-break: break-all;
      color: #64748b;
      line-height: 1.4;
    }
    .accent {
      height: 4px;
      width: 64px;
      background: ${BRAND.orange};
      margin: 0 auto 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">${APP_NAME}</p>
    <p class="tag">${APP_TAGLINE}</p>
    <div class="accent"></div>
    <img class="qr" src="${dataUrl}" alt="QR code for ${table.tableNumber}" />
    <p class="table">${table.tableNumber}</p>
    <p class="hint">Scan to view the menu &amp; order</p>
    <p class="link">${safeUrl}</p>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 200);
    };
  </script>
</body>
</html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-[#0D1B2A]/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-qr-print-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F3F3F8]">
          <div>
            <h2 id="table-qr-print-title" className="text-lg font-bold text-[#0D1B2A]">
              Print table QR
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Export a scannable code for {table.tableNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            ref={printRef}
            className="rounded-2xl border-2 border-[#0D1B2A] bg-white px-6 py-7 text-center"
          >
            <div className="flex justify-center mb-2">
              <CafePilotsLogo size={40} withWordmark withDivider />
            </div>
            <div className="mx-auto mb-4 h-1 w-16 rounded-full" style={{ backgroundColor: BRAND.orange }} />
            {error ? (
              <p className="text-sm text-red-600 py-10">{error}</p>
            ) : dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR code for ${table.tableNumber}`}
                className="mx-auto w-52 h-52"
              />
            ) : (
              <div className="mx-auto w-52 h-52 animate-pulse bg-slate-100 rounded-xl" />
            )}
            <p className="mt-4 text-2xl font-bold" style={{ color: BRAND.navy }}>
              {table.tableNumber}
            </p>
            <p className="text-sm text-slate-500 mt-1">Scan to view the menu & order</p>
            <p className="mt-3 text-[10px] font-mono text-slate-400 break-all leading-relaxed">
              {menuUrl}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 rounded-xl font-bold"
              disabled={!dataUrl}
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download PNG
            </Button>
            <Button
              type="button"
              className="flex-1 h-11 rounded-xl font-bold text-white"
              style={{ backgroundColor: BRAND.orange }}
              disabled={!dataUrl}
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
