-- SPEC 08: BLOQUE BUSTER (Arkanoid) pasa de demo a juego real con puntuaciones.
update public.games
set ranked = true,
    max_score = 2080
where id = 'bloque-buster';
