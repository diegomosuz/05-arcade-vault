-- SPEC games-jam/frogger/01-frogger-core: RANARIA (Frogger) pasa de demo a juego real con puntuaciones.
-- El spec lo llama `frogger`; en el catálogo ya existía como `ranaria` (convención en español).
-- max_score: la puntuación crece con cada nivel, así que se fija un tope de seguridad.
update public.games
set ranked = true,
    max_score = 100000,
    short = 'Cruza la carretera y el río sin convertirte en papilla.',
    long = 'Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.'
where id = 'ranaria';
