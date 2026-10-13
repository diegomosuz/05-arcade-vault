import type { Metadata } from "next";
import { AboutDividerContent, AboutHero } from "@/components/about/about-hero";
import { ContactForm } from "@/components/about/contact-form";
import { Reveal } from "@/components/home/reveal";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
  description: "Conoce la misión de Arcade Vault y escríbenos: sugerencias, juegos que proponer o un saludo.",
};

export default function AcercaDe() {
  return (
    <div className="about fade-in">
      <AboutHero />

      <Reveal className="about-divider" aria-hidden>
        <AboutDividerContent />
      </Reveal>

      <Reveal className="about-contact">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar? Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip">
                <span className="tip-led"></span>RESPUESTA EN 24-48H
              </div>
              <div className="tip">
                <span className="tip-led y"></span>SUGERENCIAS BIENVENIDAS
              </div>
              <div className="tip">
                <span className="tip-led m"></span>SIN SPAM, JAMÁS
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </Reveal>
    </div>
  );
}
