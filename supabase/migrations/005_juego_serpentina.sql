-- SPEC 09: SERPENTINA (Snake) pasa de demo a juego real con puntuaciones.
update public.games
set ranked = true,
    max_score = 2970
where id = 'serpentina';
