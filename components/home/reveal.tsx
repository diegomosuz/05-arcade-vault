"use client";

import { useEffect, useRef } from "react";

type RevealProps = {
  className?: string;
  children: React.ReactNode;
};

// Envuelve una sección y le añade `.in` al entrar en el viewport (una sola vez).
export function Reveal({ className = "", children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={`${className} reveal`.trim()}>
      {children}
    </section>
  );
}
