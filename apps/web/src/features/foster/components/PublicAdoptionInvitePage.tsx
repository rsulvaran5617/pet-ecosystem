"use client";

import type { AdoptionInviteContext } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserFosterApiClient } from "../../core/services/supabase-browser";

export function PublicAdoptionInvitePage({ token }: { token: string }) {
  const [context, setContext] = useState<AdoptionInviteContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getBrowserFosterApiClient()
      .resolveAdoptionInvite(token)
      .then((result) => {
        if (mounted) setContext(result);
      })
      .catch(() => {
        if (mounted) setErrorMessage("No fue posible validar esta invitacion.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const isAvailable = context?.status === "opened" || context?.status === "created" || context?.status === "sent";

  return (
    <main className="invite-page">
      <section className="invite-card">
        <span className="eyebrow">Adopcion responsable</span>
        {isLoading ? <><h1>Validando invitacion</h1><p>Espera un momento mientras verificamos el enlace.</p></> : null}
        {errorMessage ? <><h1>No pudimos abrir la invitacion</h1><p className="error" role="alert">{errorMessage}</p></> : null}
        {!isLoading && !errorMessage && isAvailable && context ? (
          <>
            <h1>La Familia Protectora quiere avanzar contigo</h1>
            <p><strong>{context.protectiveDisplayName}</strong> preselecciono tu interes por <strong>{context.petName}</strong>.</p>
            <div className="notice">
              El siguiente paso se completa en Pet Ecosystem con una cuenta Owner y un hogar familiar. Esta invitacion no garantiza la adopcion ni transfiere la custodia.
            </div>
            <div className="actions">
              {context.appDeepLink ? <a className="primary" href={context.appDeepLink}>Abrir Pet Ecosystem</a> : null}
              {context.listingSlug ? <a className="secondary" href={`/adopciones/${context.listingSlug}`}>Ver a {context.petName}</a> : null}
            </div>
            <small>Vigente hasta {context.expiresAt ? new Date(context.expiresAt).toLocaleString("es-PA") : "la fecha indicada por la protectora"}.</small>
          </>
        ) : null}
        {!isLoading && !errorMessage && context && !isAvailable ? (
          <>
            <h1>{context.status === "claimed" ? "Invitacion ya utilizada" : context.status === "expired" ? "Invitacion vencida" : "Invitacion no disponible"}</h1>
            <p>Contacta a la Familia Protectora para confirmar el siguiente paso o solicitar un enlace nuevo.</p>
            {context.listingSlug ? <a className="secondary" href={`/adopciones/${context.listingSlug}`}>Volver a la ficha de la mascota</a> : null}
          </>
        ) : null}
        {!isLoading && !errorMessage && !context ? <><h1>Invitacion no encontrada</h1><p>Verifica el enlace recibido.</p></> : null}
      </section>
      <style jsx>{`
        .invite-page { align-items: center; background: linear-gradient(180deg, #f8faf9, #e8f6f3); display: flex; min-height: 100vh; padding: 24px; }
        .invite-card { background: #fff; border: 1px solid rgba(15,118,110,.18); border-radius: 28px; box-shadow: 0 24px 60px rgba(15,23,42,.12); margin: auto; max-width: 680px; padding: 34px; width: 100%; }
        .eyebrow { color: #0f766e; font-size: 12px; font-weight: 900; text-transform: uppercase; }
        h1 { color: #0f172a; font-size: clamp(28px, 5vw, 44px); margin: 10px 0 16px; }
        p { color: #475569; font-size: 17px; line-height: 1.65; }
        .notice { background: #e7f7f4; border-radius: 16px; color: #164e63; line-height: 1.55; margin: 22px 0; padding: 16px; }
        .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 22px 0; }
        a { border-radius: 999px; font-weight: 900; padding: 12px 18px; text-decoration: none; }
        .primary { background: #0f8f86; color: #fff; }
        .secondary { border: 1px solid rgba(15,118,110,.28); color: #0f766e; }
        .error { background: #fff1f2; border-radius: 14px; color: #9f1239; padding: 14px; }
        small { color: #64748b; }
        @media (max-width: 640px) { .invite-page { padding: 12px; } .invite-card { border-radius: 20px; padding: 22px; } .actions a { text-align: center; width: 100%; } }
      `}</style>
    </main>
  );
}
