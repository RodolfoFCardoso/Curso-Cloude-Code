# CineAgora MVP — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o MVP web do CineAgora: home com trilhos, detalhe com "Onde assistir no Brasil", filtro "Meus streamings" (localStorage) e busca. Favoritos locais entram como fast-follow (Task 14).

**Architecture:** App Next.js (App Router) + TypeScript na subpasta `cineagora/`. Todo acesso à TMDB passa por `lib/tmdb/` no servidor (token só no servidor, cache via `fetch` com `next.revalidate`). Mapeadores convertem o JSON cru em tipos do app (`lib/tmdb/types.ts`). A UI só conhece esses tipos. Preferências passam pela interface `PreferencesStore` (adapter localStorage). O filtro roda no servidor via route handler `/api/rail/[key]`, chamado pelos trilhos no cliente quando há serviços marcados.

**Tech Stack:** Next.js (create-next-app@latest, App Router, `src/` desligado), React, TypeScript estrito, Tailwind CSS, ESLint + Prettier, Vitest + Testing Library + jsdom, `p-limit`. npm. Node 26 (já instalado).

**Spec:** `docs/superpowers/specs/2026-10-29-cineagora-catalogo-filmes-design.md`

## Global Constraints

- Projeto em `cineagora/` (a raiz do repo tem espaços/maiúsculas no nome e já guarda `docs/`). Todos os caminhos abaixo são relativos a `cineagora/`, exceto `docs/`.
- Região/idioma fixos: `language=pt-BR`; `region=BR` em popular/now_playing/search; `watch_region=BR` em discover e na lista de provedores.
- Segredo: env `TMDB_API_KEY` = o **"API Read Access Token" (v4)** da TMDB, enviado **só** no header `Authorization: Bearer …`. Nunca em URL, log, resposta de API ou mensagem de erro. `.env.local` fora do git; `.env.example` versionado.
- Cache (segundos): trilhos e busca `10800` (3h); detalhe e watch providers `86400` (1 dia); gêneros e lista de provedores `604800` (7 dias).
- Imagens: `https://image.tmdb.org/t/p/{size}{path}`. Pôster `w342`, backdrop `w1280`, foto do elenco `w185`, logo de provedor `w92`.
- O que conta para "Meus streamings": provedor marcado presente em **assinatura (flatrate), grátis (free) ou com anúncios (ads)**. Alugar/comprar não contam.
- Nenhum selecionado = sem filtro (mostra tudo).
- Chave do localStorage: `cineagora:prefs:v1` (preferências) e `cineagora:favorites:v1` (favoritos).
- Textos de UI em pt-BR. Identificadores de código em inglês.
- Atribuição obrigatória no rodapé: "Este produto usa a API da TMDB, mas não é endossado nem certificado pela TMDB." e "Dados de onde assistir: JustWatch." (termos de uso da TMDB).
- **Desvio consciente da spec:** o endpoint `watch/providers` da TMDB **não retorna preços**. Não exibimos preço. Cada bloco "Onde assistir" linka para a página `link` da TMDB/JustWatch, que tem os preços.
- **Adição à spec:** `getAvailableProviders()` (`/watch/providers/movie`) alimenta o painel "Meus streamings". A tabela de endpoints da spec não o lista, mas o filtro precisa dele.
- Fora do escopo: login, séries, outras regiões, E2E, página de filtros avançados.

## Review Focus

1. **Falha de provedores de um filme dentro de um trilho filtrado.** Se `getWatchProviders` falhar para 1 filme, esse filme é excluído e o resto do trilho aparece (o trilho não quebra). Teste na Task 6.
2. **localStorage corrompido ou indisponível** (JSON inválido, valor não-array, `setItem` lançando no modo privado). O app deve tratar como "nenhum selecionado" e seguir em memória. Teste na Task 7.
3. **Troca rápida de filtro enquanto um trilho carrega.** A resposta antiga não pode sobrescrever a nova: AbortController por requisição. Teste na Task 11.
4. **IDs inválidos vindos de URL** (`/filme/abc`, `/api/rail/genre-xyz`, `?providers=8,abc,,`). Devem dar 404 ou ignorar o lixo, nunca 500. Testes nas Tasks 9 e 12.
5. **Busca com termo vazio, só espaços ou caracteres especiais** (`&`, `#`, acentos). Termo vazio não chama a TMDB; os demais vão codificados. Testes nas Tasks 5 e 13.

---

## File Structure

```
cineagora/
  .env.example                       TMDB_API_KEY=
  next.config.ts                     images.remotePatterns image.tmdb.org
  vitest.config.ts / vitest.setup.ts
  README.md                          como obter a chave e rodar
  lib/
    tmdb/
      types.ts                       tipos do app (Movie, MovieDetails, ...)
      raw.ts                         tipos do JSON cru da TMDB (só os campos usados)
      images.ts                      imageUrl(path, size)
      mappers.ts                     mapMovie, mapMovieList, mapGenres, mapMovieDetails
      providers-mapper.ts            mapWatchProviders, mapProviderList
      errors.ts                      TmdbError, logTmdbError
      client.ts                      tmdbFetch (auth, timeout, limite, erros)
      service.ts                     getTrending ... searchMovies, getAvailableProviders
      __fixtures__/*.json            respostas da TMDB (recortadas)
    filter.ts                        matchesProviders, matchingProviders, filterRail
    rails.ts                         RailKey, parseRailKey, fetchRailItems, loadHomeRails
    format.ts                        formatRating, formatRuntime, formatYear
    store/
      types.ts                       PreferencesStore, FavoritesStore
      local-preferences.ts           createLocalPreferencesStore
      local-favorites.ts             createLocalFavoritesStore (Task 14)
      contract.ts                    suites de contrato reutilizáveis
      PreferencesProvider.tsx        contexto React + usePreferences
  app/
    layout.tsx                       Header + PreferencesProvider + Footer
    page.tsx / loading.tsx / error.tsx   home
    filme/[id]/page.tsx, not-found.tsx
    busca/page.tsx
    api/rail/[key]/route.ts
  components/
    MovieCard.tsx  ProviderBadge.tsx  Row.tsx  RailSkeleton.tsx  EmptyState.tsx
    Header.tsx  SearchBar.tsx  ProviderFilter.tsx  Footer.tsx
    FilterableRow.tsx  RailStatus.tsx  WhereToWatch.tsx  FavoriteButton.tsx  FavoritesRow.tsx
```

Os testes ficam ao lado do código: `*.test.ts(x)`.

---

### Task 1: Scaffold do projeto, ferramentas de teste e README da chave

**Files:**
- Create: `cineagora/` (via create-next-app), `vitest.config.ts`, `vitest.setup.ts`, `.prettierrc`, `.env.example`, `README.md`, `lib/smoke.test.ts`
- Modify: `next.config.ts`, `package.json` (scripts), `.gitignore` (confirmar `.env*.local`)

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run lint`, `npm run build`, `npm run format`; o alias `@/` aponta para `cineagora/`.

- [ ] **Step 1:** Na raiz do repo, rodar `npx create-next-app@latest cineagora --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes`. Esperado: a pasta `cineagora/` criada. Se o comando criar um `.git` próprio em `cineagora/`, apague-o, porque o repo já é a raiz.
- [ ] **Step 2:** `cd cineagora && npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-tsconfig-paths prettier eslint-config-prettier && npm i p-limit`.
- [ ] **Step 3:** Criar o `vitest.config.ts` com os plugins `react()` e `tsconfigPaths()`, `test.environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']` e `globals: true`. No `vitest.setup.ts`: `import '@testing-library/jest-dom/vitest'`. Scripts no package.json: `"test": "vitest run"`, `"test:watch": "vitest"`, `"format": "prettier --write ."`. Prettier: `{ "singleQuote": true, "semi": true }`. Adicionar `prettier` ao `extends` do ESLint.
- [ ] **Step 4:** Conferir `"strict": true` no `tsconfig.json`. No `next.config.ts`: `images.remotePatterns = [{ protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' }]`.
- [ ] **Step 5:** Escrever `lib/smoke.test.ts` com `expect(1 + 1).toBe(2)`. Rodar `npm test`. Esperado: 1 passed.
- [ ] **Step 6:** `.env.example` com `TMDB_API_KEY=`. O `README.md` explica: (1) criar conta em themoviedb.org; (2) Settings → API → solicitar chave "Developer"; (3) copiar o **API Read Access Token** (texto longo começando com `eyJ`); (4) criar `cineagora/.env.local` com `TMDB_API_KEY=<token>`; (5) `npm run dev` → http://localhost:3000. Também avisa que o `node_modules` dentro do OneDrive pode deixar a sincronização lenta.
- [ ] **Step 7:** `npm run lint && npm run build`. Esperado: ambos sem erro.
- [ ] **Step 8:** Commit: `git add cineagora && git commit -m "chore: scaffold Next.js + Vitest do CineAgora"`. Antes, confira que `.env.local` não está staged.

---

### Task 2: Tipos do app e mapeadores de filme/gênero/detalhe

**Files:**
- Create: `lib/tmdb/types.ts`, `lib/tmdb/raw.ts`, `lib/tmdb/images.ts`, `lib/tmdb/mappers.ts`, `lib/tmdb/__fixtures__/movie-list.json`, `lib/tmdb/__fixtures__/movie-details.json`, `lib/tmdb/__fixtures__/genres.json`
- Test: `lib/tmdb/mappers.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Movie = { id: number; title: string; year: number | null; rating: number | null;
    posterUrl: string | null; backdropUrl: string | null; genreIds: number[] };
  export type Genre = { id: number; name: string };
  export type CastMember = { id: number; name: string; character: string; profileUrl: string | null };
  export type MovieDetails = Movie & { overview: string; runtimeMinutes: number | null; genres: Genre[];
    trailerYoutubeKey: string | null; cast: CastMember[]; similar: Movie[] };
  export type WatchProvider = { id: number; name: string; logoUrl: string | null };
  export type WatchProviders = { link: string | null; subscription: WatchProvider[];
    free: WatchProvider[]; rent: WatchProvider[]; buy: WatchProvider[] };
  export type RailItem = { movie: Movie; badges: WatchProvider[] };
  ```
- Produces: `imageUrl(path: string | null | undefined, size: 'w92'|'w185'|'w342'|'w1280'): string | null`; `mapMovie(raw: RawMovie): Movie`; `mapMovieList(raw: RawMovieList): Movie[]`; `mapGenres(raw: RawGenreList): Genre[]`; `mapMovieDetails(raw: RawMovieDetails): MovieDetails`.

- [ ] **Step 1:** Criar as fixtures recortadas no formato da TMDB. `movie-list.json`: `{ page: 1, results: [...] }` com 3 filmes: um completo (id 550, "Clube da Luta", `release_date` "1999-10-15", `vote_average` 8.438, `vote_count` 30000, pôster e backdrop); um com `release_date: ""`, `poster_path: null` e `vote_count: 0`; e um sem `genre_ids`. `movie-details.json`: id 550, `runtime` 139, `overview`, 2 gêneros, `videos.results` com um Teaser YouTube en, um Trailer YouTube en (key "en-key") e um Trailer YouTube pt (key "pt-key"), `credits.cast` com 12 pessoas fora de ordem (campo `order`) e `similar.results` com 15 filmes. `genres.json`: `{ genres: [{id:28,name:"Ação"},{id:35,name:"Comédia"}] }`. Na Task 15 elas são trocadas por respostas reais.
- [ ] **Step 2: Testes que falham** (`mappers.test.ts`):
  - `mapMovie` completo → `{ id: 550, title: 'Clube da Luta', year: 1999, rating: 8.4, posterUrl: 'https://image.tmdb.org/t/p/w342/<path>', backdropUrl: '.../w1280/<path>', genreIds: [...] }`. A nota é arredondada para 1 casa.
  - `release_date: ""` → `year: null`; `poster_path: null` → `posterUrl: null`; `vote_count: 0` → `rating: null`; sem `genre_ids` → `genreIds: []`.
  - `mapMovieDetails`: `trailerYoutubeKey === 'pt-key'` (prefere Trailer YouTube pt; sem pt, o primeiro Trailer YouTube; sem Trailer → `null`, mesmo havendo Teaser); `cast` tem 10 itens ordenados por `order`; `similar.length === 12`; `runtimeMinutes: 139`; `runtime: 0` ou ausente → `null`; `overview: ""` → `overview: ''` (a UI decide o texto).
  - `mapGenres` → `[{id:28,name:'Ação'},{id:35,name:'Comédia'}]`.
- [ ] **Step 3:** Rodar `npm test -- lib/tmdb/mappers`. Esperado: FAIL (módulos inexistentes).
- [ ] **Step 4:** Implementar `raw.ts` (só os campos usados, tudo opcional ou nullable como a TMDB manda), `images.ts` e `mappers.ts`. Mapeadores são funções puras, sem I/O.
- [ ] **Step 5:** Rodar `npm test -- lib/tmdb/mappers`. Esperado: PASS.
- [ ] **Step 6:** Commit: `feat: tipos do app e mapeadores de filmes da TMDB`.

---

### Task 3: Mapeadores de provedores (onde assistir e lista do BR)

**Files:**
- Create: `lib/tmdb/providers-mapper.ts`, `lib/tmdb/__fixtures__/watch-providers.json`, `lib/tmdb/__fixtures__/provider-list.json`
- Modify: `lib/tmdb/raw.ts`
- Test: `lib/tmdb/providers-mapper.test.ts`

**Interfaces:**
- Consumes: `WatchProvider`, `WatchProviders`, `imageUrl` (Task 2).
- Produces: `mapWatchProviders(raw: RawWatchProviders, region = 'BR'): WatchProviders`; `mapProviderList(raw: RawProviderList, region = 'BR'): WatchProvider[]`; `EMPTY_PROVIDERS: WatchProviders` (todos os arrays vazios, `link: null`).

- [ ] **Step 1:** Fixtures. `watch-providers.json`: `results.BR` com `link`, `flatrate` [Netflix 8 (`display_priority` 2), Max 1899 (1)], `free` [Pluto 300], `ads` [Pluto 300, Tubi 73], `rent` [Apple 2], `buy` [Apple 2, Google 3]; e um `results.US` diferente. `provider-list.json`: `results` com 3 provedores, `display_priorities: { BR: n }`, em ordem embaralhada; um deles sem a chave BR (usa `display_priority`).
- [ ] **Step 2: Testes que falham:**
  - `subscription` = `[Max, Netflix]` (ordenado por `display_priority` asc), com `logoUrl` em `w92`.
  - `free` = `free` ∪ `ads` sem duplicar: `[Pluto, Tubi]` (Pluto aparece uma vez).
  - `rent` = `[Apple]`, `buy` = `[Apple, Google]`, `link` = o link do BR.
  - Resposta sem `results.BR` → igual a `EMPTY_PROVIDERS`. Os dados do US nunca vazam.
  - `mapProviderList` ordena por `display_priorities.BR ?? display_priority`.
- [ ] **Step 3:** Rodar e ver FAIL. **Step 4:** Implementar. **Step 5:** Rodar e ver PASS.
- [ ] **Step 6:** Commit: `feat: mapeadores de onde assistir (BR)`.

---

### Task 4: Cliente HTTP da TMDB (auth, timeout, limite, erros)

**Files:**
- Create: `lib/tmdb/errors.ts`, `lib/tmdb/client.ts`
- Test: `lib/tmdb/client.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type TmdbErrorKind = 'network' | 'timeout' | 'rate_limit' | 'not_found' | 'auth' | 'server';
  export class TmdbError extends Error { kind: TmdbErrorKind; status?: number; path: string }
  export function logTmdbError(err: unknown, context: Record<string, string | number>): void;
  export function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined>,
    revalidateSeconds: number): Promise<T>;
  export const TMDB_BASE = 'https://api.themoviedb.org/3';
  ```

- [ ] **Step 1: Testes que falham** (com `vi.stubGlobal('fetch', vi.fn())` e `vi.stubEnv('TMDB_API_KEY', 'secret-token')`):
  - Monta `https://api.themoviedb.org/3/movie/popular?language=pt-BR&region=BR`: adiciona `language=pt-BR` sempre e omite params `undefined`. Header `Authorization: Bearer secret-token`. Opção `next: { revalidate: 10800 }`. A URL não contém `secret-token`.
  - Status 404 → `TmdbError` kind `not_found`; 429 → `rate_limit`; 401 → `auth`; 500 → `server`; `fetch` rejeita com TypeError → `network`; timeout (`AbortSignal.timeout(8000)`; no teste, rejeitar com `DOMException('…','TimeoutError')`) → `timeout`.
  - Env ausente → `TmdbError` kind `auth` e mensagem `'TMDB_API_KEY ausente'`, sem chamar `fetch`.
  - Para todo erro: `err.message` e `JSON.stringify(err)` não contêm `secret-token`.
  - `logTmdbError` chama `console.error` com `path`/contexto e nunca com o token.
- [ ] **Step 2:** Rodar e ver FAIL.
- [ ] **Step 3:** Implementar. Envolver as chamadas em `pLimit(8)` (módulo-level) para não estourar o rate limit quando os ~22 trilhos carregam juntos. Primeira linha de `client.ts`: `import 'server-only'` (instalar `server-only`). No teste, mockar com `vi.mock('server-only', () => ({}))`.
- [ ] **Step 4:** Rodar e ver PASS.
- [ ] **Step 5:** Commit: `feat: cliente da TMDB com erros controlados`.

Nota: em erro de revalidação (inclusive 429), o cache do `fetch` do Next mantém a versão antiga. Isso cobre o requisito "servir cache mesmo antigo" da spec sem código extra.

---

### Task 5: Serviço TMDB (funções de domínio)

**Files:**
- Create: `lib/tmdb/service.ts`
- Test: `lib/tmdb/service.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch` (Task 4); mapeadores (Tasks 2–3).
- Produces:
  ```ts
  getTrending(): Promise<Movie[]>            // /trending/movie/week, 10800
  getPopular(): Promise<Movie[]>             // /movie/popular, region=BR, 10800
  getNowPlaying(): Promise<Movie[]>          // /movie/now_playing, region=BR, 10800
  getByGenre(genreId: number, providerIds?: number[]): Promise<Movie[]>  // /discover/movie, 10800
  getGenres(): Promise<Genre[]>              // /genre/movie/list, 604800
  getMovieDetails(id: number): Promise<MovieDetails>  // 86400
  getWatchProviders(id: number): Promise<WatchProviders>  // /movie/{id}/watch/providers, 86400
  searchMovies(query: string): Promise<Movie[]>        // /search/movie, 10800
  getAvailableProviders(): Promise<WatchProvider[]>    // /watch/providers/movie, watch_region=BR, 604800
  ```

- [ ] **Step 1: Testes que falham** (mockar `./client` com `vi.mock`, verificar `path`/`params`/`revalidate` e devolver fixtures):
  - `getByGenre(28)` → params `{ with_genres: 28, sort_by: 'popularity.desc', include_adult: 'false' }`, sem params de provedor.
  - `getByGenre(28, [8, 1899])` → adiciona `with_watch_providers: '8|1899'`, `watch_region: 'BR'`, `with_watch_monetization_types: 'flatrate|free|ads'`.
  - `getMovieDetails(550)` → `append_to_response: 'videos,credits,similar'`, `include_video_language: 'pt,en'`.
  - `searchMovies('  ')` → `[]` sem chamar o client. `searchMovies('Amélie & #1')` → params `query: 'Amélie & #1'` (termo aparado), `include_adult: 'false'`, `region: 'BR'`. Em outro teste, sobre o client real com fetch mockado, conferir que a URL final contém `query=Am%C3%A9lie+%26+%231`.
  - Cada função usa o `revalidate` da tabela acima.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar `service.ts` (com `import 'server-only'`). **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: serviço TMDB`.

---

### Task 6: Lógica do filtro "Meus streamings"

**Files:**
- Create: `lib/filter.ts`
- Test: `lib/filter.test.ts`

**Interfaces:**
- Consumes: `Movie`, `WatchProviders`, `WatchProvider`, `RailItem` (Task 2).
- Produces:
  ```ts
  matchingProviders(p: WatchProviders, selected: number[]): WatchProvider[] // subscription ∪ free, dedupe, ordem preservada
  matchesProviders(p: WatchProviders, selected: number[]): boolean           // selected vazio → true
  filterRail(movies: Movie[], selected: number[],
    getProviders: (movieId: number) => Promise<WatchProviders>): Promise<RailItem[]>
  ```

- [ ] **Step 1: Testes que falham:**
  - `selected=[]` → `filterRail` devolve todos com `badges: []` e **não** chama `getProviders`.
  - `selected=[8]`: o filme com Netflix em `subscription` fica (badge Netflix); o filme só com Netflix em `rent` sai; o filme com `EMPTY_PROVIDERS` sai; o filme com 8 em `free` fica.
  - `selected=[8,1899]` e filme com ambos → `badges` com os 2, sem duplicatas.
  - A ordem original dos filmes é preservada.
  - **Review Focus 1:** `getProviders` rejeita para 1 filme → esse filme sai e os demais permanecem; `filterRail` resolve normalmente.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (com `Promise.allSettled`). **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: lógica do filtro Meus streamings`.

---

### Task 7: Camada de preferências (interface, adapter localStorage, contexto React)

**Files:**
- Create: `lib/store/types.ts`, `lib/store/local-preferences.ts`, `lib/store/contract.ts`, `lib/store/PreferencesProvider.tsx`
- Test: `lib/store/local-preferences.test.ts`, `lib/store/PreferencesProvider.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface PreferencesStore {
    getSelectedProviders(): number[];          // mesma referência enquanto não mudar (useSyncExternalStore)
    setSelectedProviders(ids: number[]): void; // normaliza: inteiros únicos, ordenados asc
    subscribe(listener: () => void): () => void;
  }
  createLocalPreferencesStore(storage?: Storage | null, key = 'cineagora:prefs:v1'): PreferencesStore
  runPreferencesStoreContract(name: string, makeStore: () => PreferencesStore): void  // em contract.ts
  // PreferencesProvider.tsx ('use client')
  <PreferencesProvider store?: PreferencesStore>{children}</PreferencesProvider>
  usePreferences(): { selected: number[] | null; setSelected(ids: number[]): void }  // null = ainda não hidratou
  ```
  Formato salvo: `{"selectedProviders":[8,1899]}`.

- [ ] **Step 1: Testes que falham.** `runPreferencesStoreContract` (escrito para valer também para um futuro adapter de banco): começa `[]`; set → get devolve normalizado (`[1899, 8, 8]` → `[8, 1899]`); listener chamado no set; unsubscribe para de notificar; duas leituras sem mudança retornam a mesma referência (`toBe`). Rodar a suíte contra `createLocalPreferencesStore(window.localStorage)`.
  - Específicos do localStorage: persiste em `cineagora:prefs:v1`; uma nova instância lê o valor salvo.
  - **Review Focus 2:** valor `'{oops'`, `'{"selectedProviders":"x"}'` ou `'[1,2]'` → `[]` sem lançar. `storage` cujo `setItem` lança → `set` não lança e o valor fica em memória. `storage = null` → funciona em memória.
  - Provider: no SSR (`renderToString`), `selected === null`; no cliente, depois de montar, `selected` reflete o store; `setSelected` re-renderiza os consumidores.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. O Provider cria o store padrão no cliente com `typeof window !== 'undefined' ? window.localStorage : null` e usa `useSyncExternalStore(subscribe, getSelectedProviders, () => null)`. **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: camada de preferências com adapter localStorage`.

---

### Task 8: Componentes base de UI e formatadores

**Files:**
- Create: `lib/format.ts`, `components/ProviderBadge.tsx`, `components/MovieCard.tsx`, `components/Row.tsx`, `components/RailSkeleton.tsx`, `components/EmptyState.tsx`
- Test: `lib/format.test.ts`, `components/MovieCard.test.tsx`, `components/Row.test.tsx`, `components/EmptyState.test.tsx`

**Interfaces:**
- Consumes: `Movie`, `WatchProvider`, `RailItem` (Task 2).
- Produces:
  ```ts
  formatRating(r: number | null): string | null   // 7.5 → '7,5'; 8 → '8,0'; null → null
  formatRuntime(min: number | null): string | null // 139 → '2h 19min'; 45 → '45min'; 120 → '2h'; null → null
  <ProviderBadge provider={WatchProvider} size?: 'sm' | 'lg' />   // img com alt=nome; sem logo → sigla em texto
  <MovieCard movie={Movie} badges?: WatchProvider[] />             // link para /filme/{id}
  <Row title: string; items: RailItem[] />                          // trilho horizontal rolável, <section aria-label={title}>
  <RailSkeleton title?: string; count = 8 />                        // aria-busy="true", count placeholders
  <EmptyState title: string; message?: string; action?: ReactNode />
  ```

- [ ] **Step 1: Testes que falham:**
  - Os formatadores com os exemplos acima.
  - `MovieCard`: mostra o título e "★ 8,4"; link `href="/filme/550"`; com `badges` [Netflix] → `getByAltText('Netflix')`; `posterUrl: null` → placeholder com o título visível (`data-testid="poster-placeholder"`); `rating: null` → sem "★".
  - `Row` com 3 itens → 3 links; o título vira o heading do trilho.
  - `RailSkeleton count={5}` → 5 elementos `data-testid="skeleton-card"`.
  - `EmptyState` renderiza título, mensagem e a ação.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar com Tailwind (fundo escuro, cards 2:3, rolagem horizontal com `overflow-x-auto snap-x`; nos testes, a `next/image` pode ser mockada para `<img>`). **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: componentes base de UI`.

---

### Task 9: Trilhos no servidor e route handler `/api/rail/[key]`

**Files:**
- Create: `lib/rails.ts`, `app/api/rail/[key]/route.ts`
- Test: `lib/rails.test.ts`, `app/api/rail/[key]/route.test.ts`

**Interfaces:**
- Consumes: serviço (Task 5), `filterRail` (Task 6), `logTmdbError` (Task 4).
- Produces:
  ```ts
  export type RailKey = 'trending' | 'popular' | 'now_playing' | `genre-${number}`;
  export type HomeRail = { key: RailKey; title: string; movies: Movie[] };
  parseRailKey(s: string): RailKey | null
  parseProviderIds(s: string | null): number[]           // '8,abc,,1899' → [8,1899]; inteiros > 0; únicos
  fetchRailMovies(key: RailKey, providerIds?: number[]): Promise<Movie[]>
  fetchRailItems(key: RailKey, providerIds: number[]): Promise<RailItem[]>  // fetchRailMovies + filterRail(getWatchProviders)
  loadHomeRails(): Promise<HomeRail[]>  // ordem: Em alta, Populares, Lançamentos, gêneros na ordem da TMDB
  export class HomeUnavailableError extends Error {}
  // route: GET /api/rail/{key}?providers=8,1899 → 200 { items: RailItem[] } | 404 { error: 'not_found' } | 502 { error: 'unavailable' }
  ```
  Títulos fixos: `trending` → "Em alta", `popular` → "Populares", `now_playing` → "Lançamentos". Gênero → `genre.name`.

- [ ] **Step 1: Testes que falham** (com o serviço mockado):
  - `parseRailKey`: `'trending'` ok; `'genre-28'` ok; `'genre-xyz'`, `'genre-'`, `'genre-0'` e `'foo'` → `null`. `parseProviderIds('8,abc,,1899,8')` → `[8,1899]`; `null` → `[]`.
  - `fetchRailMovies('genre-28', [8])` chama `getByGenre(28, [8])`; `fetchRailMovies('trending', [8])` chama `getTrending()`.
  - `loadHomeRails`: com `getPopular` rejeitando → devolve os outros trilhos, sem "Populares", e chama `logTmdbError`. Com `getGenres` rejeitando → só os 3 fixos. Com tudo rejeitando → lança `HomeUnavailableError`. Trilho com 0 filmes é omitido.
  - Route: chave inválida → 404; `fetchRailItems` lança → 502 com o corpo `{ error: 'unavailable' }` (sem detalhes do erro); sucesso → 200 com `items`. Cabeçalho `Cache-Control: public, s-maxage=10800, stale-while-revalidate=86400`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. Na route, o Next 15+ entrega `params` como Promise: `const { key } = await params`. **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: trilhos e API de trilho filtrado`.

---

### Task 10: Layout, cabeçalho, busca no header, painel "Meus streamings" e rodapé

**Files:**
- Create: `components/Header.tsx`, `components/SearchBar.tsx`, `components/ProviderFilter.tsx`, `components/Footer.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`
- Test: `components/ProviderFilter.test.tsx`, `components/SearchBar.test.tsx`

**Interfaces:**
- Consumes: `usePreferences`, `PreferencesProvider` (Task 7); `getAvailableProviders` (Task 5); `ProviderBadge` (Task 8).
- Produces:
  ```ts
  <Header providers: WatchProvider[] | null />          // null = falhou ao carregar a lista
  <SearchBar defaultValue?: string />                   // <form action="/busca" method="get" role="search">, input name="q"
  <ProviderFilter providers: WatchProvider[] | null />  // 'use client'; botão "Meus streamings (N)" abre o painel
  <Footer />                                            // textos de atribuição de Global Constraints
  export const OPEN_PROVIDER_FILTER_EVENT = 'cineagora:open-provider-filter'  // em ProviderFilter.tsx; o painel abre ao receber
  ```

- [ ] **Step 1: Testes que falham:**
  - `ProviderFilter` (com `PreferencesProvider` + store em memória): abre o painel ao clicar em "Meus streamings"; marcar "Netflix" → o store vira `[8]` e o botão mostra "Meus streamings (1)"; o botão "Limpar" → `[]`; uma busca dentro do painel filtra a lista por nome (sem diferenciar maiúsculas ou acentos: "max" acha "Max"); `providers={null}` → mensagem "Não foi possível carregar os serviços agora." e nenhuma checkbox.
  - `SearchBar`: o input tem `name="q"` e o form tem `action="/busca"`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. O painel é um `<dialog>` ou painel lateral com checkboxes em lista rolável, ordenadas como chegam (prioridade BR). `layout.tsx` (server): `lang="pt-BR"`, busca `getAvailableProviders()` em try/catch (falha → `null` + `logTmdbError`) e envolve tudo com `PreferencesProvider`. Metadata: title "CineAgora". **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: cabeçalho com busca e filtro Meus streamings`.

---

### Task 11: Home com trilhos filtráveis

**Files:**
- Create: `components/FilterableRow.tsx`, `components/RailStatus.tsx`, `app/loading.tsx`, `app/error.tsx`
- Modify: `app/page.tsx`
- Test: `components/FilterableRow.test.tsx`, `components/RailStatus.test.tsx`

**Interfaces:**
- Consumes: `loadHomeRails`, `HomeRail` (Task 9); `Row`, `RailSkeleton`, `EmptyState` (Task 8); `usePreferences` (Task 7).
- Produces:
  ```ts
  // RailStatus.tsx ('use client')
  export type RailState = 'loading' | 'shown' | 'empty' | 'error';
  <RailStatusProvider total: number>{children}</RailStatusProvider>
  useReportRailStatus(key: string, state: RailState): void
  <FilteredEmptyNotice />  // filtro ativo e todos os `total` em 'empty' | 'error' → EmptyState
  // FilterableRow.tsx ('use client')
  <FilterableRow railKey: RailKey; title: string; initialMovies: Movie[] />
  ```

- [ ] **Step 1: Testes que falham** (com `fetch` mockado e `PreferencesProvider` com store em memória):
  - `selected` vazio → renderiza os `initialMovies` sem chamar `fetch`.
  - `selected=[8]` → mostra o `RailSkeleton` e chama `fetch('/api/rail/popular?providers=8', { signal })`; a resposta com 2 itens → 2 cards com badge.
  - A resposta com `items: []` → o trilho não renderiza nada e reporta `'empty'`. HTTP 502 → não renderiza e reporta `'error'`.
  - **Review Focus 3:** trocar de `[8]` para `[1899]` antes da 1ª resposta → a 1ª requisição recebe abort e a tela mostra só o resultado de `[1899]`, mesmo que a 1ª resposta chegue depois.
  - `FilteredEmptyNotice`: com `total=2` e ambos `'empty'` → mostra "Nenhum filme dos seus streamings nestes trilhos" e o botão "Ajustar meus streamings" (dispara `window.dispatchEvent(new Event(OPEN_PROVIDER_FILTER_EVENT))`; o `ProviderFilter` escuta esse evento e abre o painel). Com 1 `'shown'` → não mostra.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. `app/page.tsx` (server): `const rails = await loadHomeRails()` e depois renderiza `RailStatusProvider total={rails.length}`, uma `FilterableRow` por trilho e `FilteredEmptyNotice`. `app/loading.tsx` → 4 `RailSkeleton`. `app/error.tsx` ('use client') → `EmptyState` "Não foi possível carregar os filmes agora." com o botão "Tentar novamente" (`reset()`). `HomeUnavailableError` cai nele. **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: home com trilhos e filtro por streaming`.

---

### Task 12: Página de detalhe `/filme/[id]`

**Files:**
- Create: `app/filme/[id]/page.tsx`, `app/filme/[id]/not-found.tsx`, `components/WhereToWatch.tsx`
- Test: `components/WhereToWatch.test.tsx`, `app/filme/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `getMovieDetails`, `getWatchProviders` (Task 5); `TmdbError` (Task 4); `ProviderBadge`, `Row`, `EmptyState` (Task 8); `formatRating`, `formatRuntime` (Task 8).
- Produces: `<WhereToWatch providers: WatchProviders />`; `parseMovieId(s: string): number | null` em `lib/rails.ts` (arquivos `page.tsx` não podem exportar nomes extras).

- [ ] **Step 1: Testes que falham:**
  - `WhereToWatch`: os grupos aparecem na ordem **Assinatura · Grátis · Alugar · Comprar**, só os não vazios, cada um com os logos (alt = nome); com `link` → "Ver preços e opções no JustWatch" apontando para o link (`target="_blank" rel="noopener noreferrer"`); `EMPTY_PROVIDERS` → "Sem informação de onde assistir no Brasil no momento." Título do bloco: "Onde assistir no Brasil".
  - `parseMovieId`: `'550'` → 550; `'abc'`, `'0'`, `'-3'`, `'1.5'` → `null`.
  - Página (renderizando o server component com `await Page({ params: Promise.resolve({ id }) })` e o serviço mockado): **Review Focus 4:** id `'abc'` → chama `notFound()` (mock de `next/navigation`) sem chamar o serviço; `getMovieDetails` lança `TmdbError` `not_found` → `notFound()`; `getWatchProviders` lança → a página renderiza mesmo assim, com `EMPTY_PROVIDERS`; `overview: ''` → "Sinopse não disponível."
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. Buscar detalhe e provedores em paralelo. Layout: backdrop no topo, pôster, título, ano, ★ nota, duração, gêneros, sinopse, `WhereToWatch` em destaque logo abaixo da sinopse, trailer (`<iframe src="https://www.youtube-nocookie.com/embed/{key}">` só se houver key), elenco (10, com foto ou placeholder) e um `Row` "Filmes parecidos" (sem badges; omitido se vazio). `generateMetadata` com título e sinopse para o preview do link. `not-found.tsx` → "Filme não encontrado" + link "Voltar para o início". Outros `TmdbError` sobem para o `error.tsx` mais próximo. **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: página de detalhe com onde assistir`.

---

### Task 13: Página de busca `/busca`

**Files:**
- Create: `app/busca/page.tsx`
- Test: `app/busca/page.test.tsx`

**Interfaces:**
- Consumes: `searchMovies` (Task 5); `MovieCard`, `EmptyState` (Task 8); `SearchBar` (Task 10).
- Produces: a rota `/busca?q=…` (Next 15+: `searchParams` é Promise).

- [ ] **Step 1: Testes que falham** (com o serviço mockado):
  - **Review Focus 5:** `q` ausente ou `'   '` → "Digite o nome de um filme para buscar." e `searchMovies` não é chamado.
  - `q='matrix'` com 3 resultados → grade com 3 `MovieCard`.
  - `q='xyzqwe'` sem resultados → `Nenhum filme encontrado para "xyzqwe". Tente outro termo.`
  - `searchMovies` lança → "A busca está indisponível agora. Tente novamente em instantes." (sem erro cru).
  - `q` como array (`?q=a&q=b`) → usa o primeiro.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (grade responsiva de pôsteres; o `SearchBar` da página vem preenchido com `q`). **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: busca por título`.

---

### Task 14 (fast-follow): Favoritos locais

**Files:**
- Create: `lib/store/local-favorites.ts`, `components/FavoriteButton.tsx`, `components/FavoritesRow.tsx`
- Modify: `lib/store/types.ts`, `lib/store/contract.ts`, `lib/store/PreferencesProvider.tsx` (expor também os favoritos), `app/filme/[id]/page.tsx`, `app/page.tsx`
- Test: `lib/store/local-favorites.test.ts`, `components/FavoriteButton.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface FavoritesStore {
    list(): Movie[];                // mais recente primeiro; referência estável sem mudança
    has(id: number): boolean;
    toggle(movie: Movie): void;
    subscribe(listener: () => void): () => void;
  }
  createLocalFavoritesStore(storage?: Storage | null, key = 'cineagora:favorites:v1'): FavoritesStore
  runFavoritesStoreContract(name: string, makeStore: () => FavoritesStore): void
  useFavorites(): { favorites: Movie[] | null; isFavorite(id: number): boolean; toggle(movie: Movie): void }
  <FavoriteButton movie: Movie />   // aria-pressed; "Adicionar à minha lista" / "Remover da minha lista"
  <FavoritesRow />                  // trilho "Minha lista" no topo da home; oculto se vazio ou não hidratado
  ```
  Guarda o snapshot de `Movie`, para o trilho não precisar chamar a TMDB.

- [ ] **Step 1: Testes que falham:** o contrato (toggle adiciona e depois remove; `has`; ordem mais-recente-primeiro; sem duplicatas; listener; referência estável); a mesma robustez da Task 7 (JSON corrompido → `[]`; `setItem` lançando → segue em memória); `FavoriteButton` alterna `aria-pressed` e o texto.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. Na página de detalhe, montar `FavoriteButton` com o `MovieDetails` reduzido a `Movie`; na home, `FavoritesRow` antes dos trilhos (não entra no `RailStatusProvider`). **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat: favoritos locais`.

---

### Task 15: Verificação com a TMDB real

Precisa da chave (README da Task 1). Não escreve funcionalidade nova.

- [ ] **Step 1:** Com `cineagora/.env.local` preenchido, rodar `npm run dev`.
- [ ] **Step 2:** Trocar as fixtures das Tasks 2–3 por respostas reais (recortadas) com um script descartável fora do repo (no scratchpad): `curl -H "Authorization: Bearer $TMDB_API_KEY" "https://api.themoviedb.org/3/movie/550?language=pt-BR&append_to_response=videos,credits,similar&include_video_language=pt,en"` (idem para lista, gêneros e watch providers do filme 550). Rodar `npm test`. Esperado: tudo PASS. Se algum teste falhar, ajuste o mapeador, não o teste, a menos que a premissa do formato estivesse errada.
- [ ] **Step 3:** Checklist manual no navegador (desktop e janela estreita de celular):
  - A home mostra "Em alta", "Populares", "Lançamentos" e trilhos de gênero com pôsteres.
  - Marcar Netflix em "Meus streamings" → os trilhos recarregam, só aparecem filmes com o selo Netflix, os trilhos vazios somem e, recarregando a página, o filtro continua.
  - Abrir um filme → o "Onde assistir no Brasil" bate com o que aparece em themoviedb.org no mesmo filme; o trailer toca; elenco e parecidos aparecem.
  - `/filme/abc` e `/filme/999999999` → "Filme não encontrado".
  - Busca "Cidade de Deus" → resultados; busca "zzzzqqq" → mensagem de sem resultados.
  - Remover temporariamente o `TMDB_API_KEY` → a home mostra o estado amigável, sem stack trace; o terminal registra o erro sem o token.
  - O rodapé mostra a atribuição da TMDB e da JustWatch.
- [ ] **Step 4:** `npm run lint && npm test && npm run build`. Esperado: tudo verde.
- [ ] **Step 5:** Commit: `test: fixtures reais da TMDB`.
