// Tipos do app. A UI depende só destes tipos, nunca do JSON cru da TMDB.

export type Movie = {
  id: number;
  title: string;
  year: number | null;
  rating: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genreIds: number[];
};

export type Genre = { id: number; name: string };

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
};

export type MovieDetails = Movie & {
  overview: string;
  runtimeMinutes: number | null;
  genres: Genre[];
  trailerYoutubeKey: string | null;
  cast: CastMember[];
  similar: Movie[];
};

export type WatchProvider = { id: number; name: string; logoUrl: string | null };

export type WatchProviders = {
  link: string | null;
  subscription: WatchProvider[];
  free: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
};

export type RailItem = { movie: Movie; badges: WatchProvider[] };
