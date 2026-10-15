-- SPEC 06: catálogo de juegos, puntuaciones y vistas de ranking.
-- Lectura pública; no hay políticas de escritura (solo el servidor escribe, con la clave secreta).

create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  position smallint not null,
  ranked boolean not null default false,
  max_score integer not null default 1000000 check (max_score > 0)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_user_idx on public.scores (user_id);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"
  on public.games for select to anon, authenticated using (true);

create policy "scores_select_public"
  on public.scores for select to anon, authenticated using (true);

-- Mejor marca y número de partidas por juego.
create view public.game_stats
with (security_invoker = true) as
select
  game_id,
  max(score)::integer as best_score,
  count(*)::integer as plays
from public.scores
group by game_id;

-- Mejor marca por jugador y juego, con posición (empates: gana la marca más antigua).
create view public.leaderboard
with (security_invoker = true) as
with best as (
  select distinct on (s.game_id, s.user_id)
    s.game_id,
    s.user_id,
    s.score as best_score,
    s.created_at as achieved_at
  from public.scores s
  order by s.game_id, s.user_id, s.score desc, s.created_at asc
)
select
  b.game_id,
  b.user_id,
  p.username,
  b.best_score,
  b.achieved_at,
  (row_number() over (
    partition by b.game_id
    order by b.best_score desc, b.achieved_at asc
  ))::integer as rank
from best b
join public.profiles p on p.id = b.user_id;

-- Siembra: los 8 juegos de lib/games.ts. Solo «rocas» es un juego real y acepta puntuaciones.
insert into public.games (id, title, short, long, cat, cover, color, position, ranked) values
  ('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.',
   'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
   'ARCADE', 'cover-bricks', 'cyan', 1, false),
  ('caida', 'CAÍDA', 'Encaja las piezas antes de que el techo te aplaste.',
   'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
   'PUZZLE', 'cover-tetro', 'magenta', 2, false),
  ('serpentina', 'SERPENTINA', 'Crece sin morder tu propia cola.',
   'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
   'ARCADE', 'cover-snake', 'green', 3, false),
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.',
   'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
   'ARCADE', 'cover-glot', 'yellow', 4, false),
  ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.',
   'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
   'SHOOTER', 'cover-invaders', 'green', 5, false),
  ('rocas', 'ROCAS', 'Pulveriza asteroides en gravedad cero.',
   'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Recoge el power-up «3x» para disparar en triple durante unos segundos.',
   'SHOOTER', 'cover-rocas', 'yellow', 6, true),
  ('ranaria', 'RANARIA', 'Cruza la autopista de pixeles.',
   'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
   'ARCADE', 'cover-rana', 'green', 7, false),
  ('duelo-pixel', 'DUELO PIXEL', 'Dos paletas. Una pelota. Reflejos máximos.',
   'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
   'VERSUS', 'cover-duelo', 'cyan', 8, false);
