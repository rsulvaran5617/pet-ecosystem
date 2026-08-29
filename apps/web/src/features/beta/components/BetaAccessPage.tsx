import Image from "next/image";
import Link from "next/link";
import {
  buildBetaRouteHref,
  getBetaPlatformConfigs,
  type BetaPlatform,
  type BetaTrackingParams
} from "../lib/beta-access";
import styles from "./BetaAccessPage.module.css";

const unavailableLabels: Record<BetaPlatform, string> = {
  android: "Android",
  ios: "iPhone",
  web: "Web"
};

interface BetaAccessPageProps {
  trackingParams: BetaTrackingParams;
  unavailablePlatform?: BetaPlatform;
}

export function BetaAccessPage({ trackingParams, unavailablePlatform }: BetaAccessPageProps) {
  const platforms = getBetaPlatformConfigs();
  const supportEmail = process.env.NEXT_PUBLIC_BETA_SUPPORT_EMAIL?.trim();

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <Image
            alt="Pet Ecosystem"
            className={styles.logo}
            height={62}
            priority
            src="/brand/pet-ecosystem-logo-horizontal.png"
            width={240}
          />
          <span className={styles.betaBadge}>Beta privada</span>
        </header>

        <section className={styles.intro} aria-labelledby="beta-title">
          <p className={styles.kicker}>Acceso para participantes invitados</p>
          <h1 id="beta-title">Prueba la beta de Pet Ecosystem</h1>
          <p className={styles.subtitle}>Tu mascota, su salud y sus servicios en un solo lugar.</p>
          <p className={styles.explanation}>
            Estás participando en una prueba controlada. Elige el dispositivo o la versión que
            deseas usar para comenzar.
          </p>
        </section>

        {unavailablePlatform ? (
          <div className={styles.notice} role="status">
            El acceso para {unavailableLabels[unavailablePlatform]} aún no está disponible. Puedes
            elegir otra plataforma.
          </div>
        ) : null}

        <section className={styles.options} aria-label="Opciones para probar Pet Ecosystem">
          {platforms.map((option) => (
            <article className={styles.optionCard} key={option.platform}>
              <div className={`${styles.platformMark} ${styles[option.platform]}`} aria-hidden="true">
                {option.platform === "android" ? "A" : option.platform === "ios" ? "i" : "W"}
              </div>
              <div className={styles.optionCopy}>
                <p className={styles.optionEyebrow}>{option.eyebrow}</p>
                <h2>{option.label}</h2>
                <p>{option.description}</p>
              </div>
              {option.url ? (
                <Link
                  className={styles.primaryAction}
                  href={buildBetaRouteHref(option.platform, trackingParams)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {option.platform === "web" ? "Entrar ahora" : "Continuar"}
                  <span aria-hidden="true">&#8599;</span>
                </Link>
              ) : (
                <span aria-disabled="true" className={styles.disabledAction}>Próximamente</span>
              )}
            </article>
          ))}
        </section>

        <section className={styles.trySection} aria-labelledby="try-title">
          <div>
            <p className={styles.kicker}>Una experiencia en construcción</p>
            <h2 id="try-title">Qué puedes probar</h2>
          </div>
          <ul>
            <li>Registrar tus mascotas.</li>
            <li>Organizar información importante.</li>
            <li>Acceder a recordatorios y servicios.</li>
            <li>Ayudarnos a mejorar con tus comentarios.</li>
          </ul>
        </section>

        <aside className={styles.betaNote}>
          <strong>Ten en cuenta</strong>
          <span>Esta es una versión beta. Algunas funciones pueden cambiar durante el proceso de prueba.</span>
        </aside>

        <footer className={styles.footer}>
          <div>
            <strong>¿Tuviste problemas para instalar?</strong>
            <p>Estamos disponibles para ayudarte durante la prueba.</p>
          </div>
          {supportEmail ? (
            <a className={styles.supportAction} href={`mailto:${supportEmail}`}>Contactar soporte</a>
          ) : (
            <span className={styles.supportPending}>Soporte próximamente</span>
          )}
        </footer>
      </section>
    </main>
  );
}
