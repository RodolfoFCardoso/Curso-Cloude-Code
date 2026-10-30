// Formato cru da TMDB — só os campos que o app usa. Tudo opcional: a TMDB omite campos com frequência.

export type RawMovie = {
  id: number;
  title?: string;
  release_date?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
};

export type RawMovieList = { page?: number; results?: RawMovie[] };

export type RawGenre = { id: number; name: string };
export type RawGenreList = { genres?: RawGenre[] };

export type RawVideo = {
  key: string;
  site?: string;
  type?: string;
  iso_639_1?: string;
  official?: boolean;
};

export type RawCastMember = {
  id: number;
  name?: string;
  character?: string | null;
  profile_path?: string | null;
  order?: number;
};

export type RawMovieDetails = RawMovie & {
  runtime?: number | null;
  overview?: string | null;
  genres?: RawGenre[];
  videos?: { results?: RawVideo[] };
  credits?: { cast?: RawCastMember[] };
  similar?: RawMovieList;
};
