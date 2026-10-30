create table public.movie_status (
  user_id      uuid not null references auth.users on delete cascade,
  movie_id     int  not null,
  status       text not null check (status in ('want', 'watched')),
  -- snapshot para montar o card sem chamar a TMDB
  title        text not null,
  year         int,
  rating       real,
  poster_url   text,
  backdrop_url text,
  genre_ids    int[] not null default '{}',
  updated_at   timestamptz not null default now(),
  primary key (user_id, movie_id)
);

alter table public.movie_status enable row level security;

create policy "dono lê"     on public.movie_status for select using (auth.uid() = user_id);
create policy "dono insere" on public.movie_status for insert with check (auth.uid() = user_id);
create policy "dono altera" on public.movie_status for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono apaga"  on public.movie_status for delete using (auth.uid() = user_id);
