"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

type PosterFormat = "print" | "social";

type PetAlertPublicPosterProps = {
  alertUrl: string;
  city: string;
  description: string;
  lastSeenLabel: string;
  petName: string;
  photoUrl: string | null;
  reference: string | null;
  statusLabel: string;
};

const palette = {
  accent: "#c2410c",
  accentSoft: "#fff0e6",
  ink: "#17211f",
  muted: "#5f6f6c",
  paper: "#fffdf9",
  teal: "#146c63",
  white: "#ffffff"
};

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No fue posible preparar la imagen."));
    image.src = source;
  });
}

async function loadRemoteImage(source: string) {
  const response = await fetch(source);
  if (!response.ok) throw new Error("No fue posible descargar la fotografia.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No fue posible generar el cartel.")), "image/png");
  });
}

export function PetAlertPublicPoster({
  alertUrl,
  city,
  description,
  lastSeenLabel,
  petName,
  photoUrl,
  reference,
  statusLabel
}: PetAlertPublicPosterProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState<PosterFormat | "share" | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(alertUrl, { color: { dark: palette.ink, light: palette.white }, errorCorrectionLevel: "M", margin: 1, width: 420 })
      .then((result) => { if (active) setQrDataUrl(result); })
      .catch(() => { if (active) setMessage("No fue posible preparar el codigo QR."); });
    return () => { active = false; };
  }, [alertUrl]);

  async function createPoster(format: PosterFormat) {
    if (!qrDataUrl) throw new Error("El codigo QR aun se esta preparando.");
    const social = format === "social";
    const width = social ? 1080 : 1240;
    const height = social ? 1920 : 1754;
    const margin = social ? 72 : 82;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Este navegador no puede generar el cartel.");

    context.fillStyle = palette.paper;
    context.fillRect(0, 0, width, height);
    context.fillStyle = palette.teal;
    roundedRect(context, margin, margin, width - margin * 2, 178, 30);
    context.fillStyle = palette.white;
    context.font = "900 34px Arial";
    context.fillText("PET ALERT", margin + 38, margin + 62);
    context.font = "700 24px Arial";
    context.fillText("Ayudanos a llevarla de regreso a casa", margin + 38, margin + 112);

    const imageTop = margin + 214;
    const imageHeight = social ? 690 : 610;
    context.fillStyle = "#ffedd5";
    roundedRect(context, margin, imageTop, width - margin * 2, imageHeight, 28);
    if (photoUrl) {
      try {
        const photo = await loadRemoteImage(photoUrl);
        drawContainedImage(context, photo, margin + 18, imageTop + 18, width - margin * 2 - 36, imageHeight - 36);
      } catch {
        context.fillStyle = palette.accent;
        context.font = "900 160px Arial";
        context.textAlign = "center";
        context.fillText(petName.slice(0, 1).toUpperCase(), width / 2, imageTop + imageHeight / 2 + 55);
        context.textAlign = "left";
      }
    }

    const contentTop = imageTop + imageHeight + 46;
    context.fillStyle = palette.accentSoft;
    roundedRect(context, margin, contentTop, 255, 58, 29);
    context.fillStyle = palette.accent;
    context.font = "900 22px Arial";
    context.fillText(statusLabel.toUpperCase(), margin + 24, contentTop + 37);
    context.fillStyle = palette.ink;
    context.font = "900 66px Arial";
    context.fillText(petName, margin, contentTop + 142);
    context.fillStyle = palette.ink;
    context.font = "800 31px Arial";
    context.fillText(city, margin, contentTop + 198);
    context.fillStyle = palette.muted;
    context.font = "500 25px Arial";
    let textBottom = drawWrappedText(context, description, margin, contentTop + 250, width - margin * 2 - 330, 35, social ? 4 : 3);
    context.font = "700 23px Arial";
    textBottom += 16;
    context.fillText(`Ultimo avistamiento: ${lastSeenLabel}`, margin, textBottom);
    if (reference) context.fillText(`Referencia aproximada: ${reference}`, margin, textBottom + 38);

    const qrSize = social ? 285 : 270;
    const qr = await loadImage(qrDataUrl);
    const qrX = width - margin - qrSize;
    const qrY = contentTop + 82;
    context.fillStyle = palette.white;
    roundedRect(context, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 22);
    context.drawImage(qr, qrX, qrY, qrSize, qrSize);
    context.fillStyle = palette.teal;
    context.font = "900 19px Arial";
    context.textAlign = "center";
    context.fillText("ESCANEA PARA INFORMAR", qrX + qrSize / 2, qrY + qrSize + 45);
    context.textAlign = "left";

    context.fillStyle = palette.teal;
    context.fillRect(margin, height - margin - 92, width - margin * 2, 3);
    context.fillStyle = palette.muted;
    context.font = "600 20px Arial";
    context.fillText("No publiques domicilios ni datos personales. Comparte una zona aproximada.", margin, height - margin - 48);
    return canvasToBlob(canvas);
  }

  function download(blob: Blob, suffix: string) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `pet-alert-${petName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}.png`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  async function downloadPoster(format: PosterFormat) {
    setWorking(format);
    setMessage(null);
    try {
      download(await createPoster(format), format === "print" ? "cartel" : "redes");
      setMessage("Cartel preparado correctamente.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "No fue posible preparar el cartel.");
    } finally {
      setWorking(null);
    }
  }

  async function sharePoster() {
    setWorking("share");
    setMessage(null);
    try {
      const blob = await createPoster("social");
      const file = new File([blob], `pet-alert-${petName}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `Ayudanos a encontrar a ${petName}.`, title: `PET ALERT: ${petName}` });
        setMessage("Cartel compartido.");
      } else {
        download(blob, "redes");
        setMessage("Tu navegador no comparte archivos directamente; descargamos el cartel.");
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "No fue posible compartir el cartel.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className="poster" aria-labelledby="pet-alert-poster-title">
      <div className="posterCopy">
        <span>COMPARTE LA ALERTA</span>
        <h2 id="pet-alert-poster-title">Un QR, informacion siempre actualizada</h2>
        <p>Al escanearlo se abre esta ficha publica. El mismo codigo mostrara si la mascota fue encontrada o la alerta fue cerrada.</p>
        <div className="posterActions">
          <button disabled={!qrDataUrl || working !== null} onClick={() => void sharePoster()} type="button">{working === "share" ? "Preparando..." : "Compartir cartel"}</button>
          <button disabled={!qrDataUrl || working !== null} onClick={() => void downloadPoster("print")} type="button">{working === "print" ? "Preparando..." : "Descargar para imprimir"}</button>
          <button disabled={!qrDataUrl || working !== null} onClick={() => void downloadPoster("social")} type="button">{working === "social" ? "Preparando..." : "Descargar para redes"}</button>
        </div>
        {message ? <p aria-live="polite" className="posterMessage">{message}</p> : null}
      </div>
      <div className="qrFrame">
        {qrDataUrl ? <img alt={`Codigo QR de la alerta de ${petName}`} src={qrDataUrl} /> : <span>Preparando QR...</span>}
        <strong>Escanea para ver o informar</strong>
      </div>
      <style jsx>{`
        .poster{align-items:center;background:#edf7f4;border:1px solid #b9ddd7;border-radius:22px;display:grid;gap:22px;grid-template-columns:minmax(0,1fr) 190px;padding:22px}.posterCopy{display:grid;gap:8px}.posterCopy>span{color:#146c63;font-size:11px;font-weight:900}.poster h2{color:#17211f;font-size:21px;margin:0}.poster p{color:#5f6f6c;line-height:1.5;margin:0}.posterActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.posterActions button{background:#fff;border:1px solid #94c9c1;border-radius:999px;color:#116e65;cursor:pointer;font:800 13px inherit;min-height:42px;padding:0 14px}.posterActions button:first-child{background:#146c63;color:#fff}.posterActions button:disabled{cursor:wait;opacity:.58}.posterMessage{font-size:13px;font-weight:700}.qrFrame{align-items:center;background:#fff;border-radius:16px;display:grid;gap:6px;padding:12px;text-align:center}.qrFrame img{height:auto;width:100%}.qrFrame span{color:#5f6f6c;padding:55px 8px}.qrFrame strong{color:#146c63;font-size:11px}@media(max-width:650px){.poster{grid-template-columns:1fr}.qrFrame{margin:auto;max-width:190px}.posterActions button{width:100%}}
      `}</style>
    </section>
  );
}
