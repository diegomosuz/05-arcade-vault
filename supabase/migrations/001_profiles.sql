-- SPEC 05: perfiles públicos con username único, creados por trigger al registrarse.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Z0-9_]{3,10}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lectura pública. Sin políticas de insert/update/delete: el cliente no escribe.
create policy "profiles_select_public"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- El username llega en options.data.username de signUp (raw_user_meta_data).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, upper(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

-- Solo el trigger invoca la función.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
