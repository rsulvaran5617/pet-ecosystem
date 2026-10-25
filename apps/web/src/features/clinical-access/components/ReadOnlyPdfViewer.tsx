"use client";

import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import styles from "./PublicClinicalAccessPage.module.css";

export function ReadOnlyPdfViewer({ file, title }: { file: Blob; title: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [pageText, setPageText] = useState("");
  const [retry, setRetry] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    let task: PDFDocumentLoadingTask | undefined;
    setLoading(true); setError(""); setPdf(null); setPageNumber(1); setPageText("");
    void (async () => {
      try {
        // Load only in browser. All worker/font resources are served by this app.
        const engine = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!active) return;
        const assets = `/pdfjs/${engine.version}/`;
        engine.GlobalWorkerOptions.workerSrc = `${assets}pdf.worker.min.mjs`;
        task = engine.getDocument({ data: bytes, enableXfa: false, useSystemFonts: false,
          cMapUrl: `${assets}cmaps/`, cMapPacked: true,
          standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/`, iccUrl: `${assets}iccs/` });
        const document = await task.promise;
        if (active) setPdf(document);
      } catch {
        if (active) setError("No fue posible mostrar este PDF. Puede estar protegido con clave o tener un formato no compatible. Solicita al responsable una copia PDF legible.");
      } finally { if (active) setLoading(false); }
    })();
    return () => {
      active = false;
      void task?.destroy().catch(() => undefined);
    };
  }, [file, retry]);

  useEffect(() => {
    if (!pdf) return;
    let active = true;
    let task: RenderTask | undefined;
    setRendering(true); setError(""); setPageText("");
    void (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!active || !canvas) return;
        const original = page.getViewport({ scale: 1 });
        // Bound dimensions and pixel memory, including unusually large PDF pages.
        const scale = Math.min(1000 / original.width, 1600 / original.height) * zoom;
        const viewport = page.getViewport({ scale });
        const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (viewport.width * viewport.height)));
        canvas.width = Math.ceil(viewport.width * density);
        canvas.height = Math.ceil(viewport.height * density);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        task = page.render({ canvas, viewport, transform: [density, 0, 0, density, 0, 0] });
        await task.promise;
        if (!active) return;
        const text = await page.getTextContent().catch(() => null);
        if (active) setPageText(text?.items.map((item) => "str" in item ? item.str : "").join(" ") ?? "");
      } catch {
        if (active) setError("No fue posible mostrar esta pagina. Intenta volver a abrir el documento.");
      } finally { if (active) setRendering(false); }
    })();
    return () => { active = false; task?.cancel(); };
  }, [pdf, pageNumber, zoom]);

  return <div className={styles.pdfViewer} aria-label={`PDF de solo lectura: ${title}`}>
    {loading ? <p role="status">Preparando PDF...</p> : null}
    {error ? <div role="alert"><p>{error}</p><button type="button" className={styles.secondaryButton} onClick={() => setRetry((value) => value + 1)}>Reintentar vista</button></div> : null}
    {pdf ? <>
      <div className={styles.pdfControls}>
        <button type="button" className={styles.secondaryButton} disabled={rendering || pageNumber <= 1} onClick={() => setPageNumber((page) => page - 1)}>Pagina anterior</button>
        <span aria-live="polite">Pagina {pageNumber} de {pdf.numPages}</span>
        <button type="button" className={styles.secondaryButton} disabled={rendering || pageNumber >= pdf.numPages} onClick={() => setPageNumber((page) => page + 1)}>Pagina siguiente</button>
        <label>Ampliacion <select value={zoom} disabled={rendering} onChange={(event) => setZoom(Number(event.target.value))}>
          <option value={0.75}>75%</option><option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option>
        </select></label>
      </div>
      {rendering ? <p role="status">Mostrando pagina...</p> : null}
      <div className={styles.pdfCanvasViewport}>
        <canvas ref={canvasRef} hidden={rendering || !!error} aria-label={`${title}, pagina ${pageNumber}`} role="img" />
      </div>
      {pageText ? <details><summary>Texto de la pagina</summary><p className={styles.pdfText}>{pageText}</p></details> : null}
    </> : null}
  </div>;
}
