import { HighlightIcon, type HighlightKind } from "./highlight-icon";

const HIGHLIGHTS: { icon: HighlightKind; text: string; color: "magenta" | "cyan" | "green" }[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { icon: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export function AboutHero() {
  return (
    <section className="about-hero">
      <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
      <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
      <p className="about-mission">
        ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar los
        arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar y sin
        costo.
      </p>

      <div className="highlight-row">
        {HIGHLIGHTS.map((h, i) => (
          <div key={h.icon} className={"highlight " + h.color} style={{ transitionDelay: i * 80 + "ms" }}>
            <HighlightIcon kind={h.icon} />
            <div className="hl-text pixel">{h.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Contenido del divisor: la ruta lo envuelve en `<Reveal className="about-divider" aria-hidden>`.
export function AboutDividerContent() {
  return (
    <>
      <div className="div-bar"></div>
      <div className="div-pixels">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
        ))}
      </div>
      <div className="div-bar"></div>
    </>
  );
}
