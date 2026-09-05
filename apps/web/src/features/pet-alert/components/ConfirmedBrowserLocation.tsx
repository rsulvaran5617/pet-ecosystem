"use client";

import { useState } from "react";

export type ConfirmedBrowserLocationValue = {
  accuracyMeters: number | null;
  capturedAt: string;
  latitude: number;
  longitude: number;
  source: "device";
};

export function ConfirmedBrowserLocation({
  onChange
}: {
  onChange: (location: ConfirmedBrowserLocationValue | null) => void;
}) {
  const [candidate, setCandidate] = useState<ConfirmedBrowserLocationValue | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function capture() {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage("Este navegador no permite obtener la ubicacion. Puedes continuar con la zona escrita.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCandidate({
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          capturedAt: new Date(position.timestamp).toISOString(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "device"
        });
        setConfirmed(false);
        onChange(null);
        setLocating(false);
      },
      () => {
        setMessage("No pudimos obtener la ubicacion. Puedes continuar con la zona escrita.");
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 12_000 }
    );
  }

  function confirm() {
    if (!candidate) return;
    onChange(candidate);
    setCandidate(null);
    setConfirmed(true);
  }

  function discard() {
    setCandidate(null);
    setConfirmed(false);
    onChange(null);
  }

  return (
    <section className="location">
      <strong>Ubicacion opcional</strong>
      <p>Usala solo si estas en el lugar del avistamiento. El punto publico se desplazara para proteger la privacidad.</p>
      {message ? <span className="message">{message}</span> : null}
      {candidate ? (
        <>
          <span>Ubicacion obtenida{candidate.accuracyMeters ? ` con precision aproximada de ${Math.round(candidate.accuracyMeters)} m` : ""}. Confirma que corresponde al lugar del evento.</span>
          <div><button onClick={confirm} type="button">Confirmar lugar</button><button className="secondary" onClick={discard} type="button">Descartar</button></div>
        </>
      ) : confirmed ? (
        <><span className="confirmed">Lugar confirmado. Nunca publicaremos este punto exacto.</span><button className="secondary compact" onClick={capture} type="button">Cambiar ubicacion</button></>
      ) : (
        <button className="secondary compact" disabled={locating} onClick={capture} type="button">{locating ? "Obteniendo ubicacion..." : "Usar ubicacion del dispositivo"}</button>
      )}
      <style jsx>{`
        .location{background:#f5fbfa;border:1px solid #b9dcd6;border-radius:12px;display:grid;gap:9px;padding:13px}
        p,.message,.location>span{color:#53645f;font-size:12px;line-height:1.5;margin:0}
        .confirmed{color:#08766b!important;font-weight:800}.location>div{display:flex;flex-wrap:wrap;gap:8px}
        button{background:#0f8d80;border:1px solid #0f8d80;border-radius:999px;color:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:900;min-height:42px;padding:0 15px;width:max-content;max-width:100%}
        button.secondary{background:#fff;color:#0b746a}.compact{justify-self:start}button:disabled{cursor:not-allowed;opacity:.55}
      `}</style>
    </section>
  );
}
