"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useNearbyMapLocation(enabled: boolean) {
  const sequence = useRef(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("Usa tu ubicación para explorar unos 5 km a tu alrededor.");

  const locate = useCallback(() => {
    const request = ++sequence.current;
    if (!navigator.geolocation) {
      setMessage("Este navegador no ofrece ubicación. Puedes mover y ampliar el mapa manualmente.");
      return;
    }
    setLocating(true);
    setMessage("Buscando tu ubicación...");
    navigator.geolocation.getCurrentPosition((position) => {
      if (request !== sequence.current) return;
      setLocating(false);
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 85 || Math.abs(longitude) > 180) {
        setMessage("No pudimos situar tu ubicación en el mapa. Puedes navegar manualmente.");
        return;
      }
      setLocation({ latitude, longitude });
      setMessage(accuracy > 5_000
        ? "Tu ubicación es poco precisa. Ajustamos la vista a unos 5 km alrededor del punto estimado; puedes mover el mapa."
        : "Vista centrada cerca de ti, con unos 5 km a la redonda. Puedes mover y ampliar el mapa.");
    }, (error) => {
      if (request !== sequence.current) return;
      setLocating(false);
      setMessage(error.code === 1
        ? "No autorizaste la ubicación. Puedes habilitarla en el navegador o explorar el mapa manualmente."
        : "No pudimos obtener tu ubicación. Vuelve a intentarlo o explora el mapa manualmente.");
    }, { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const initialSequence = sequence.current;
    // Only reuse an existing grant; a new permission prompt requires the button.
    void navigator.permissions?.query({ name: "geolocation" }).then((permission) => {
      if (active && sequence.current === initialSequence && permission.state === "granted") locate();
    }).catch(() => { /* Browsers without this permission query keep the explicit button. */ });
    return () => { active = false; sequence.current += 1; };
  }, [enabled, locate]);

  return { location, locating, message, locate };
}
