import Link from "next/link";
import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <Reveal className="home-final">
      <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
      <Link href="/biblioteca" className="btn xl pulse final-cta">INSERTAR MONEDA →</Link>
      <div className="final-tag">Gratis. Sin registro obligatorio. Empieza en segundos.</div>
    </Reveal>
  );
}
