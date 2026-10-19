-- SPEC 07: CAÍDA (Tetris) pasa de demo a juego real con puntuaciones.
update public.games
set ranked = true,
    max_score = 500000
where id = 'caida';
