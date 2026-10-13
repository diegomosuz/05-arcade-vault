import { HOME_STATS } from "@/lib/home";
import { Reveal } from "./reveal";

export function Stats() {
  return (
    <Reveal className="home-stats">
      <div className="stats-inner">
        {HOME_STATS.map((st, i) => (
          <div key={st.n} className="stat-block" style={{ transitionDelay: i * 90 + "ms" }}>
            <div className="stat-n neon-yellow">{st.n}</div>
            <div className="stat-u pixel">{st.u}</div>
            <div className="stat-s">{st.s}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
