import Link from "next/link";
import { FAQS, PRICING_FEATURES } from "@/lib/home";
import { Reveal } from "./reveal";

export function Pricing() {
  return (
    <Reveal className="home-section">
      <div className="section-head">
        <div className="kicker pixel neon-green">{"// 04"}</div>
        <h2 className="section-title">PRECIOS</h2>
        <div className="section-rule"></div>
      </div>
      <div className="pricing-grid">
        <div className="price-card">
          <div className="pc-label pixel">PLAN ÚNICO</div>
          <div className="pc-name pixel">JUGADOR VAULT</div>
          <div className="pc-amount">
            <span className="pc-amount-n">$0</span>
            <span className="pc-amount-u">/ SIEMPRE</span>
          </div>
          <div className="pc-tag">SIN TRUCOS · SIN LETRA PEQUEÑA</div>
          <ul className="pc-list">
            {PRICING_FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Link href="/acceso" className="btn xl pulse" style={{ width: "100%" }}>EMPEZAR GRATIS →</Link>
          <div className="pc-foot">No pedimos tarjeta. Nunca lo haremos.</div>
          <div className="pc-stamp pixel">FREE<br />PLAY</div>
        </div>

        <div className="pricing-faq">
          {FAQS.map((f) => (
            <div key={f.q} className="faq-item">
              <div className="faq-q pixel">{f.q}</div>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
