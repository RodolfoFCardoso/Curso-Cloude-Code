# CineAgora: contas e listas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login com e-mail e senha (Supabase), listas "Quero assistir" / "Já assisti" sincronizadas na conta, abas na home, trocar e recuperar senha.

**Architecture:** `@supabase/ssr` com sessão em cookie renovada no `proxy.ts`. O layout lê o usuário no servidor e entrega a um `AuthProvider` cliente, que cria um `MovieListStore` (adapter Supabase sobre uma tabela com RLS) consumido por hooks via `useSyncExternalStore`, no mesmo padrão do `PreferencesStore`. Formulários de conta são Server Actions com `useActionState`.

**Tech Stack:** Next.js 16.4 (App Router, `proxy.ts`), React 19.3, TypeScript, Tailwind 4, `@supabase/supabase-js`, `@supabase/ssr`, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-30-cineagora-contas-listas-design.md`

## Global Constraints

- Caminhos relativos a `cineagora/`, exceto `docs/`. Comandos rodam em `cineagora/`.
- **Antes da Task 1** a árvore precisa estar limpa: há alterações de UI não commitadas na branch `feat/cineagora-mvp`. Commitar (ou guardar) antes de começar.
- Next 16 tem breaking changes: ler o guia relevante em `node_modules/next/dist/docs/` antes de escrever código (proxy: `01-app/01-getting-started/16-proxy.md`; auth: `01-app/02-guides/authentication.md`). Middleware agora é `proxy.ts` com `export function proxy`.
- Env (já em `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Referenciar sempre por `process.env.NEXT_PUBLIC_...` literal (inlining no cliente). Nunca logar valores.
- Tabela `public.movie_status`, status `'want' | 'watched'`, PK `(user_id, movie_id)`, RLS `auth.uid() = user_id` nas 4 operações.
- Chave local dos favoritos a migrar: `cineagora:favorites:v1` (a spec diz `cineagora:favorites`; vale a chave real do código).
- Cookie de recuperação: `cineagora_recovery`, httpOnly, `sameSite: 'lax'`, `secure` em produção, `maxAge: 600`.
- Senha: mínimo 6 caracteres.
- Abas: `?aba=quero-assistir` | `?aba=ja-assisti`; ausente/inválido = Descobrir.
- Redirecionamentos (`voltar`, `next`) sempre via `safeRedirectPath`.
- Textos de UI em pt-BR, identificadores em inglês. Tokens visuais existentes (`veludo`, `tela`, `penumbra`, `projetor`, `poltrona`); botões de status no estilo pílula do atual `FavoriteButton`.
- **Desvio consciente 1:** a troca de aba usa `window.history.replaceState` (o Next 16 sincroniza com `useSearchParams`) em vez de `router.replace`, para não refazer o render do servidor; é o que a spec pede ("sem recarregar no servidor").
- **Desvio consciente 2:** o `HomeHero` também usa `FavoriteButton` hoje; ele passa a usar `MovieStatusButtons` (removê-lo seria regressão).
- **Desvio consciente 3:** o store expõe também `isReady()`, `lastError()` e `reload()` (já na spec) e o adapter Supabase recebe uma `MovieStatusTable` estreita em vez do client cru, para poder ser testado com um fake.

## Review Focus

1. **Cliques rápidos com rede lenta** (marcar "Quero assistir" e logo "Já assisti"; a primeira escrita falha depois da segunda): o rollback não pode desfazer o estado mais novo. Teste na Task 4.
2. **Open redirect** via `?voltar=` ou `next=` (`https://evil.com`, `//evil.com`, `/\evil.com`): sempre cai em `/`. Testes nas Tasks 2 e 7.
3. **Sessão expirada no meio do uso** (gravação devolve 401): a UI leva a `/entrar?voltar=<página atual>` em vez de mostrar "salvo". Teste na Task 6.
4. **Migração repetida** (duas abas, reload durante a migração, upsert falhando): sem duplicar nem sobrescrever status, e a chave local só some após sucesso. Teste na Task 4.
5. **Cadastro com e-mail já existente com confirmação ligada** (Supabase devolve usuário com `identities: []` sem erro): mostrar "Este e-mail já tem conta." Teste na Task 7.

---

## File Structure

```
cineagora/
  proxy.ts                               chama updateSession
  supabase/schema.sql                    tabela + RLS
  .env.example                           + variáveis do Supabase
  README.md                              + seção "Contas (Supabase)"
  lib/
    supabase/env.ts                      getSupabaseEnv / requireSupabaseEnv
    supabase/server.ts                   createSupabaseServerClient, getCurrentUser
    supabase/browser.ts                  getSupabaseBrowserClient
    supabase/proxy.ts                    updateSession(request)
    auth/types.ts                        AuthUser, AuthFormState
    auth/safe-redirect.ts                safeRedirectPath
    auth/messages.ts                     authErrorMessage
    auth/password.ts                     validateNewPassword
    auth/recovery.ts                     RECOVERY_COOKIE, recoveryCookieOptions
    auth/AuthProvider.tsx                AuthProvider, useAuth, useMovieList
    store/types.ts                       + MovieStatus, MovieListError, MovieListStore (− FavoritesStore)
    store/contract.ts                    + runMovieListStoreContract (− runFavoritesStoreContract)
    store/memory-movie-list.ts           createMemoryMovieListStore
    store/supabase-movie-list.ts         MovieStatusTable, movieStatusTable, createSupabaseMovieListStore, toRow, fromRow
    store/migrate-favorites.ts           migrateLocalFavorites
    store/PreferencesProvider.tsx        − favoritos
    home-tabs.ts                         HomeTab, parseTab, TAB_STATUS
  app/
    layout.tsx                           getCurrentUser → AuthProvider
    page.tsx                             HomeTabs + Notice
    entrar/page.tsx, entrar/actions.ts, entrar/recuperar/page.tsx
    auth/confirm/route.ts
    conta/actions.ts, conta/senha/page.tsx, conta/nova-senha/page.tsx
  components/
    AuthForm.tsx, RecoverForm.tsx, PasswordForm.tsx
    UserMenu.tsx, HomeTabs.tsx, MovieListPanel.tsx, MovieStatusButtons.tsx, Notice.tsx
  removidos: components/FavoriteButton(.test).tsx, components/FavoritesRow.tsx,
             lib/store/local-favorites(.test).ts
```

---

### Task 1: Infra do Supabase (deps, env, clients, proxy, schema)

**Files:**
- Create: `lib/supabase/env.ts`, `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/proxy.ts`, `proxy.ts`, `supabase/schema.sql`, `lib/auth/types.ts`
- Modify: `package.json`, `.env.example`, `README.md`
- Test: `lib/supabase/env.test.ts`

**Interfaces:**
- Produces:
  - `type SupabaseEnv = { url: string; key: string }`
  - `getSupabaseEnv(): SupabaseEnv | null` (null se faltar qualquer variável ou estiver vazia)
  - `requireSupabaseEnv(): SupabaseEnv` (lança `Error('Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')`)
  - `createSupabaseServerClient(): Promise<SupabaseClient>` (`server-only`; `cookies()` com `getAll`/`setAll`, `setAll` em try/catch porque Server Components não gravam cookie)
  - `getCurrentUser(): Promise<AuthUser | null>` (null se env ausente ou `getUser()` falhar)
  - `getSupabaseBrowserClient(): SupabaseClient` (singleton)
  - `updateSession(request: NextRequest): Promise<NextResponse>` (env ausente → `NextResponse.next()`)
  - `lib/auth/types.ts`: `type AuthUser = { id: string; email: string }`; `type AuthFormState = { status: 'idle' | 'error' | 'check-email' | 'sent' | 'success'; message?: string }`

- [ ] **Step 1: Instalar dependências**

Run: `npm install @supabase/supabase-js @supabase/ssr`
Expected: ambas em `dependencies`.

- [ ] **Step 2: Teste falhando de `env.ts`**

```ts
// lib/supabase/env.test.ts (usar vi.stubEnv / vi.unstubAllEnvs)
it('devolve url e key quando as duas existem', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk');
  expect(getSupabaseEnv()).toEqual({ url: 'https://x.supabase.co', key: 'pk' });
});
it.each([['', 'pk'], ['https://x.supabase.co', '']])('null se faltar (%s, %s)', (url, key) => { /* stub → toBeNull() */ });
it('requireSupabaseEnv lança mensagem clara sem vazar valores', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  expect(() => requireSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});
```

- [ ] **Step 3:** `npx vitest run lib/supabase/env.test.ts` → FAIL (módulo não existe).
- [ ] **Step 4: Implementar** `env.ts`, `server.ts`, `browser.ts`, `lib/supabase/proxy.ts` (padrão oficial do `@supabase/ssr`: `createServerClient` com cookies do request/response e `await supabase.auth.getUser()` para renovar) e `proxy.ts` na raiz exportando `proxy` e `config.matcher` = `['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']`. Criar `lib/auth/types.ts`.
- [ ] **Step 5:** `npx vitest run lib/supabase/env.test.ts` → PASS.
- [ ] **Step 6: `supabase/schema.sql`** com exatamente o SQL da seção "Banco de dados" da spec. Adicionar as duas variáveis (vazias) ao `.env.example`. No README, nova seção "Contas (Supabase)" com: variáveis, rodar `supabase/schema.sql` no SQL Editor.
- [ ] **Step 7: Passo manual do usuário:** rodar `supabase/schema.sql` no SQL Editor do projeto. Confirmar em Table Editor que `movie_status` existe com RLS "enabled".
- [ ] **Step 8:** `npm run typecheck && npm run lint` → sem erros. `npm run dev` e abrir `/` → home carrega igual a antes.
- [ ] **Step 9: Commit** `feat: infraestrutura do Supabase (clients, proxy, schema)`

---

### Task 2: Utilitários puros de auth

**Files:**
- Create: `lib/auth/safe-redirect.ts`, `lib/auth/messages.ts`, `lib/auth/password.ts`, `lib/auth/recovery.ts`
- Test: `lib/auth/safe-redirect.test.ts`, `lib/auth/messages.test.ts`, `lib/auth/password.test.ts`

**Interfaces:**
- Produces:
  - `safeRedirectPath(value: unknown, fallback?: string): string` (fallback padrão `'/'`)
  - `authErrorMessage(err: { code?: string } | null | undefined): string`
  - `validateNewPassword(input: { current?: string; next: string; confirm: string }): string | null` (mensagem de erro ou null)
  - `RECOVERY_COOKIE = 'cineagora_recovery'`; `recoveryCookieOptions(): { httpOnly: true; sameSite: 'lax'; secure: boolean; maxAge: 600; path: '/' }` (`secure` = `process.env.NODE_ENV === 'production'`)

- [ ] **Step 1: Testes falhando**

```ts
// safe-redirect
it.each([['/filme/12', '/filme/12'], ['/?aba=ja-assisti', '/?aba=ja-assisti'], ['/conta/nova-senha', '/conta/nova-senha']])('aceita %s', (v, out) => expect(safeRedirectPath(v)).toBe(out));
it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', 'filme/12', '', null, undefined, 42])('rejeita %s', (v) => expect(safeRedirectPath(v)).toBe('/'));
it('usa o fallback informado', () => expect(safeRedirectPath('//x', '/conta/senha')).toBe('/conta/senha'));

// messages
it.each([
  ['invalid_credentials', 'E-mail ou senha incorretos.'],
  ['user_already_exists', 'Este e-mail já tem conta.'],
  ['email_exists', 'Este e-mail já tem conta.'],
  ['email_not_confirmed', 'Confirme seu e-mail antes de entrar.'],
  ['weak_password', 'Senha fraca. Use letras, números e símbolos.'],
  ['same_password', 'A nova senha precisa ser diferente da atual.'],
  ['over_email_send_rate_limit', 'Muitas tentativas. Aguarde alguns minutos.'],
  ['over_request_rate_limit', 'Muitas tentativas. Aguarde alguns minutos.'],
  ['otp_expired', 'Link expirado, peça outro.'],
])('%s', (code, msg) => expect(authErrorMessage({ code })).toBe(msg));
it.each([{ code: 'xyz' }, {}, null, undefined])('desconhecido', (e) => expect(authErrorMessage(e)).toBe('Algo deu errado, tente de novo.'));

// password
expect(validateNewPassword({ next: '12345', confirm: '12345' })).toBe('A nova senha precisa ter pelo menos 6 caracteres.');
expect(validateNewPassword({ next: '123456', confirm: '1234567' })).toBe('As senhas não conferem.');
expect(validateNewPassword({ current: 'abcdef', next: 'abcdef', confirm: 'abcdef' })).toBe('A nova senha precisa ser diferente da atual.');
expect(validateNewPassword({ current: 'abcdef', next: 'novasenha', confirm: 'novasenha' })).toBeNull();
expect(validateNewPassword({ next: 'novasenha', confirm: 'novasenha' })).toBeNull();
```

- [ ] **Step 2:** `npx vitest run lib/auth` → FAIL.
- [ ] **Step 3: Implementar.** `safeRedirectPath`: string que começa com `/`, não com `//` nem `/\`; validar também com `new URL(value, 'http://x').origin === 'http://x'`.
- [ ] **Step 4:** `npx vitest run lib/auth` → PASS.
- [ ] **Step 5: Commit** `feat: utilitários de auth (redirect seguro, mensagens, senha)`

---

### Task 3: `MovieListStore` — interface, adapter de memória e contrato

**Files:**
- Modify: `lib/store/types.ts` (adicionar; `FavoritesStore` só sai na Task 6), `lib/store/contract.ts`
- Create: `lib/store/memory-movie-list.ts`
- Test: `lib/store/memory-movie-list.test.ts`

**Interfaces:**
- Produces:
  - `MovieStatus`, `MovieListError`, `MovieListStore` exatamente como na spec (seção "Camada de dados").
  - `createMemoryMovieListStore(initial?: Array<{ movie: Movie; status: MovieStatus }>): MovieListStore` — pronto na criação, `initial` já em ordem (mais recente primeiro), `reload()` resolve sem mudar nada.
  - `runMovieListStoreContract(name: string, makeStore: () => Promise<MovieListStore>)` — `makeStore` resolve com o store já pronto.
- Regra de notificação (vale para os dois adapters): cada `setStatus` que muda estado notifica uma vez; `setStatus` que não muda nada (mesmo status, ou `null` de filme sem status) não notifica.

- [ ] **Step 1: Contrato** em `contract.ts` (reusar o helper `movie(id)` existente):

```ts
it('pronto e vazio', async () => { const s = await makeStore(); expect(s.isReady()).toBe(true); expect(s.list('want')).toEqual([]); expect(s.lastError()).toBeNull(); });
it('marca, troca e desmarca com status exclusivo', async () => {
  const s = await makeStore();
  s.setStatus(movie(1), 'want');
  expect(s.statusOf(1)).toBe('want'); expect(s.list('want')).toEqual([movie(1)]);
  s.setStatus(movie(1), 'watched');
  expect(s.list('want')).toEqual([]); expect(s.list('watched')).toEqual([movie(1)]);
  s.setStatus(movie(1), null);
  expect(s.statusOf(1)).toBeNull(); expect(s.list('watched')).toEqual([]);
});
it('mais recente primeiro; remarcar move para o topo', async () => { /* want 1, want 2, watched 1, want 1 → list('want') ids [1, 2] */ });
it('notifica uma vez por mudança, nada sem mudança, e para após cancelar', async () => { /* want 1 → 1 chamada; want 1 de novo → ainda 1; null em 9 → ainda 1; unsubscribe; want 2 → ainda 1 */ });
it('mesma referência enquanto nada muda; nova após mudar', async () => { /* list('want') toBe list('want'); após setStatus em 'watched', list('want') continua a mesma ref */ });
```

- [ ] **Step 2:** `memory-movie-list.test.ts` chama `runMovieListStoreContract('memória', async () => createMemoryMovieListStore())`. `npx vitest run lib/store/memory-movie-list.test.ts` → FAIL.
- [ ] **Step 3: Implementar** os tipos e `createMemoryMovieListStore` (estado = array ordenado de `{ movie, status }`; listas por status em cache, recalculadas só quando o array muda).
- [ ] **Step 4:** `npx vitest run lib/store` → PASS (contratos antigos continuam passando).
- [ ] **Step 5: Commit** `feat: MovieListStore com adapter em memória e contrato`

---

### Task 4: Adapter Supabase e migração dos favoritos

**Files:**
- Create: `lib/store/supabase-movie-list.ts`, `lib/store/migrate-favorites.ts`
- Test: `lib/store/supabase-movie-list.test.ts`, `lib/store/migrate-favorites.test.ts`, `lib/store/fake-movie-status-table.ts` (helper de teste)

**Interfaces:**
- Consumes: `MovieListStore`, `runMovieListStoreContract` (Task 3).
- Produces:
  - `type MovieStatusRow = { movie_id: number; status: MovieStatus; title: string; year: number | null; rating: number | null; poster_url: string | null; backdrop_url: string | null; genre_ids: number[]; updated_at?: string }` (sem `user_id`; a tabela o injeta)
  - `type DbResult<T = null> = { data: T; error: { message: string; code?: string; status?: number } | null }`
  - `interface MovieStatusTable { selectAll(): Promise<DbResult<MovieStatusRow[] | null>>; upsert(rows: MovieStatusRow[], opts?: { ignoreDuplicates?: boolean }): Promise<DbResult>; remove(movieId: number): Promise<DbResult> }`
  - `movieStatusTable(client: SupabaseClient, userId: string): MovieStatusTable` — `selectAll` ordena por `updated_at desc`; `upsert` injeta `user_id` e `updated_at: new Date().toISOString()`, `onConflict: 'user_id,movie_id'`; `remove` filtra por `user_id` e `movie_id`. Repassa `status` HTTP da resposta no erro.
  - `toRow(movie: Movie, status: MovieStatus): MovieStatusRow`; `fromRow(row: MovieStatusRow): { movie: Movie; status: MovieStatus }`
  - `createSupabaseMovieListStore(table: MovieStatusTable): MovieListStore` — começa `isReady() === false` e já dispara `reload()`.
  - `migrateLocalFavorites(storage: Storage | null, table: MovieStatusTable): Promise<number>` — quantidade migrada; chave `cineagora:favorites:v1`; leitura tolerante (mover para cá `toMovie`/`readMovies` de `local-favorites.ts`); upsert com `ignoreDuplicates: true` e status `'want'`; apaga a chave só se o upsert der certo; sem favoritos não chama a tabela.
- Erros: falha em `selectAll` → `lastError() === 'load'` (e `isReady()` vira `true` com listas vazias); falha em escrita → rollback + `'save'`; `error.status === 401` ou `code === 'PGRST301'` → `'unauthenticated'`. Toda mudança de `lastError` notifica. Sucesso posterior limpa o erro.

- [ ] **Step 1: Fake** `createFakeMovieStatusTable(rows?: MovieStatusRow[])` com `failNext(error)` (próxima chamada devolve o erro) e `deferNext()` (próxima escrita só resolve quando o teste chamar `resolve()`/`reject(error)`), e `rows` inspecionável.
- [ ] **Step 2: Testes falhando**

```ts
runMovieListStoreContract('supabase (fake)', async () => { const s = createSupabaseMovieListStore(createFakeMovieStatusTable()); await s.reload(); return s; });

it('toRow/fromRow ida e volta', () => expect(fromRow(toRow(movie(1), 'want'))).toEqual({ movie: movie(1), status: 'want' }));
it('carrega linhas existentes na ordem do banco', async () => { /* fake com rows [2 watched, 1 want] → list('watched')[0].id 2, statusOf(1) 'want' */ });
it('falha ao carregar → ready com erro load; reload ok limpa', async () => { /* failNext → lastError 'load'; reload → null */ });
it('falha ao gravar desfaz e marca save', async () => {
  const t = createFakeMovieStatusTable(); const s = createSupabaseMovieListStore(t); await s.reload();
  t.failNext({ message: 'x' }); s.setStatus(movie(1), 'want');
  expect(s.statusOf(1)).toBe('want');            // otimista
  await vi.waitFor(() => expect(s.lastError()).toBe('save'));
  expect(s.statusOf(1)).toBeNull();              // rollback
});
it('401 vira unauthenticated', async () => { /* failNext({ message: 'jwt', status: 401 }) → 'unauthenticated' */ });
it('Review Focus 1: falha antiga não desfaz escolha mais nova', async () => {
  const t = createFakeMovieStatusTable(); const s = createSupabaseMovieListStore(t); await s.reload();
  const first = t.deferNext(); s.setStatus(movie(1), 'want');
  s.setStatus(movie(1), 'watched');               // segunda escrita resolve na hora
  first.reject({ message: 'timeout' });
  await vi.waitFor(() => expect(s.lastError()).toBe('save'));
  expect(s.statusOf(1)).toBe('watched');
});
// migrate-favorites (Storage em memória simples no teste)
it('migra como want, ignora duplicatas e apaga a chave', async () => { /* upsert chamado com ignoreDuplicates true, 2 linhas status want; retorna 2; getItem → null */ });
it('Review Focus 4: não apaga a chave se o upsert falhar e é idempotente', async () => { /* failNext → rejeita/retorna 0, chave continua; rodar de novo com linha já 'watched' no fake → continua 'watched' */ });
it('sem favoritos ou JSON corrompido não chama a tabela', async () => { /* storage vazio e '{' → upsert não chamado; retorna 0 */ });
```

Para o rollback por filme: guardar uma versão por `movie_id`; ao falhar, desfazer só se a versão daquele filme ainda for a da escrita que falhou.

- [ ] **Step 3:** `npx vitest run lib/store` → FAIL.
- [ ] **Step 4: Implementar** os dois módulos. Erros de escrita/carga vão para `console.error('[movie-list]', { op, code, message })`.
- [ ] **Step 5:** `npx vitest run lib/store` → PASS.
- [ ] **Step 6: Commit** `feat: adapter Supabase das listas e migração dos favoritos`

---

### Task 5: `AuthProvider`, hooks e layout

**Files:**
- Create: `lib/auth/AuthProvider.tsx`
- Modify: `app/layout.tsx`
- Test: `lib/auth/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: `getCurrentUser`, `getSupabaseEnv`, `getSupabaseBrowserClient` (Task 1); `createSupabaseMovieListStore`, `movieStatusTable`, `migrateLocalFavorites` (Task 4).
- Produces:
  - `<AuthProvider user={AuthUser | null} available={boolean} makeStore?={(user: AuthUser) => MovieListStore}>` — `makeStore` padrão: `createSupabaseMovieListStore(movieStatusTable(getSupabaseBrowserClient(), user.id))` e, em seguida, `migrateLocalFavorites(localStorage, table)`; se migrou > 0, `store.reload()`. Store recriado quando `user?.id` muda; sem usuário, nenhum store. Com `available`, assina `onAuthStateChange` e chama `router.refresh()` quando o id do usuário da sessão difere do `user` recebido.
  - `useAuth(): { user: AuthUser | null; available: boolean }`
  - `useMovieList(): { ready: boolean; error: MovieListError | null; list(status: MovieStatus): Movie[]; statusOf(id: number): MovieStatus | null; setStatus(movie: Movie, status: MovieStatus | null): void; reload(): Promise<void> }` — via `useSyncExternalStore` (um por campo: ready, error, lista want, lista watched). Snapshot do servidor e sem store: `ready: false`, listas `[]` constantes, `setStatus` no-op.
- Layout: `const [providers, user] = await Promise.all([loadProviders(), getCurrentUser()])`; `<AuthProvider user={user} available={getSupabaseEnv() !== null}>` dentro do `PreferencesProvider`, envolvendo Header/main/Footer. Se `getSupabaseEnv()` for null, `console.error` uma vez com a mensagem de `requireSupabaseEnv` (sem valores).

- [ ] **Step 1: Testes falhando** (mockar `next/navigation` e `@/lib/supabase/browser`; usar `makeStore` com `createMemoryMovieListStore`)

```tsx
it('sem usuário: user null, lista não pronta e vazia', () => { /* componente sonda renderiza useAuth/useMovieList */ });
it('com usuário: expõe o store e reage a setStatus', async () => { /* clicar "marcar" na sonda → statusOf(1) 'want', list('want') tem 1 */ });
it('troca de usuário recria o store', () => { /* rerender com outro user.id → makeStore chamado 2x, listas do novo store */ });
it('useMovieList fora do provider lança erro claro', () => { /* 'useMovieList precisa estar dentro de <AuthProvider>' */ });
```

- [ ] **Step 2:** `npx vitest run lib/auth/AuthProvider.test.tsx` → FAIL.
- [ ] **Step 3: Implementar** provider, hooks e mudança no layout.
- [ ] **Step 4:** `npx vitest run` → PASS (suíte inteira). `npm run typecheck` → ok.
- [ ] **Step 5: Commit** `feat: AuthProvider com sessão do servidor e hooks das listas`

---

### Task 6: Botões de status na página do filme e no hero (sai "Minha lista")

**Files:**
- Create: `components/MovieStatusButtons.tsx`
- Modify: `app/filme/[id]/page.tsx`, `app/filme/[id]/page.test.tsx`, `components/HomeHero.tsx`, `app/page.tsx` (remover `FavoritesRow`), `lib/store/PreferencesProvider.tsx` (remover favoritos e `useFavorites`), `lib/store/types.ts` (remover `FavoritesStore`), `lib/store/contract.ts` (remover `runFavoritesStoreContract`), `lib/store/PreferencesProvider.test.tsx` (se referenciar favoritos)
- Delete: `components/FavoriteButton.tsx`, `components/FavoriteButton.test.tsx`, `components/FavoritesRow.tsx`, `lib/store/local-favorites.ts`, `lib/store/local-favorites.test.ts`
- Test: `components/MovieStatusButtons.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useMovieList` (Task 5).
- Produces: `<MovieStatusButtons movie={Movie} />`.

Comportamento: `available === false` → não renderiza nada. Dois botões com `aria-pressed`, rótulos **"+ Quero assistir"** e **"✓ Já assisti"**. Clicar no ativo → `setStatus(movie, null)`; no outro → troca. Deslogado → `router.push('/entrar?voltar=' + encodeURIComponent(pathname))`. Logado e `!ready` → botões `disabled`. `error === 'save'` → `<p role="status">Não foi possível salvar, tente de novo.</p>`. `error === 'unauthenticated'` → `router.push` para entrar como acima.

- [ ] **Step 1: Testes falhando** (provider com `createMemoryMovieListStore` e um store stub para os erros; mock de `next/navigation` com `usePathname` = `/filme/12`)

```tsx
it('marca, troca e desmarca', async () => { /* clicar Quero assistir → aria-pressed true; Já assisti → want false, watched true; Já assisti de novo → ambos false */ });
it('deslogado vai para entrar com voltar', async () => { /* user null → push('/entrar?voltar=%2Ffilme%2F12') */ });
it('desabilitado enquanto carrega', () => { /* store com isReady false → ambos disabled */ });
it('mostra aviso quando salvar falha', () => { /* lastError 'save' → getByRole('status') com o texto */ });
it('Review Focus 3: sessão expirada leva para entrar', () => { /* lastError 'unauthenticated' → push('/entrar?voltar=%2Ffilme%2F12') */ });
it('some quando o login está indisponível', () => { /* available false → container vazio */ });
```

- [ ] **Step 2:** `npx vitest run components/MovieStatusButtons.test.tsx` → FAIL.
- [ ] **Step 3: Implementar** o componente e trocar `FavoriteButton` por `MovieStatusButtons` na página do filme e no `HomeHero`; remover `FavoritesRow` da home e todo o código de favoritos listado acima. Atualizar `page.test.tsx` do filme para envolver com `AuthProvider` (memória) em vez de `favoritesStore`.
- [ ] **Step 4:** `npx vitest run && npm run typecheck && npm run lint` → tudo verde; `grep -rn "Favorit" app components lib` só encontra `migrate-favorites`.
- [ ] **Step 5: Commit** `feat: botões Quero assistir / Já assisti substituem Minha lista`

---

### Task 7: Entrar, criar conta, sair e rota de confirmação

**Files:**
- Create: `app/entrar/page.tsx`, `app/entrar/actions.ts`, `components/AuthForm.tsx`, `app/auth/confirm/route.ts`
- Test: `app/entrar/actions.test.ts`, `components/AuthForm.test.tsx`, `app/auth/confirm/route.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `getCurrentUser` (Task 1); `safeRedirectPath`, `authErrorMessage`, `RECOVERY_COOKIE`, `recoveryCookieOptions` (Task 2); `AuthFormState`.
- Produces:
  - `signIn(prev: AuthFormState, formData: FormData): Promise<AuthFormState>` — campos `email`, `password`, `voltar`; sucesso → `redirect(safeRedirectPath(voltar))`.
  - `signUp(prev: AuthFormState, formData: FormData): Promise<AuthFormState>` — senha < 6 → erro 'A senha precisa ter pelo menos 6 caracteres.'; `data.user?.identities?.length === 0` → erro 'Este e-mail já tem conta.'; com `data.session` → redirect como `signIn`; sem sessão → `{ status: 'check-email', message: 'Enviamos um link para seu e-mail. Abra-o para ativar a conta.' }`.
  - `signOut(): Promise<void>` → `auth.signOut()` e `redirect('/')`.
  - `<AuthForm voltar={string} erro?={string} />` — alternância **Entrar | Criar conta** (dois `useActionState`), campos e-mail/senha com `autoComplete` (`email`, `current-password` / `new-password`), `<input type="hidden" name="voltar">`, link "Esqueci minha senha" para `/entrar/recuperar`, mensagens em `role="alert"`. `erro === 'link-expirado'` → 'Link expirado, peça outro.'
  - `app/entrar/page.tsx`: logado → `redirect(safeRedirectPath(voltar))`; senão renderiza `AuthForm` (layout no estilo `EmptyState`, título "Entre no CineAgora").
  - `GET /auth/confirm?token_hash&type&next`: `type` ∈ `signup | recovery` (outro → trata como falha). `verifyOtp({ type, token_hash })`. Sucesso: se `recovery`, `(await cookies()).set(RECOVERY_COOKIE, '1', recoveryCookieOptions())`; `redirect(safeRedirectPath(next))`. Falha: recovery → `/entrar/recuperar?erro=link-expirado`; senão → `/entrar?erro=link-expirado`.

- [ ] **Step 1: Testes falhando** (mock de `@/lib/supabase/server`, `next/navigation` (`redirect` lança um erro sentinela com a URL), `next/headers`)

```ts
it('signIn ok redireciona para voltar', /* voltar '/filme/12' → redirect('/filme/12') */);
it('Review Focus 2: signIn com voltar externo vai para /', /* 'https://evil.com' → redirect('/') */);
it('signIn com credenciais erradas', /* error {code:'invalid_credentials'} → { status:'error', message:'E-mail ou senha incorretos.' } */);
it('signUp sem sessão pede confirmação', /* data {user:{identities:[{}]}, session:null} → status 'check-email' */);
it('Review Focus 5: signUp com e-mail existente e confirmação ligada', /* data {user:{identities:[]}, session:null} → message 'Este e-mail já tem conta.' */);
it('signUp com sessão redireciona', /* session presente → redirect */);
it('signOut sai e volta para a home');
// route
it('recovery ok grava cookie e vai para next', /* verifyOtp ok → cookies.set('cineagora_recovery','1',{httpOnly:true,maxAge:600,...}); redirect('/conta/nova-senha') */);
it('signup ok não grava cookie de recuperação');
it('link expirado em recovery vai para recuperar com erro', /* → '/entrar/recuperar?erro=link-expirado' */);
it('next externo cai em /', /* next '//evil.com' → redirect('/') */);
it('type desconhecido é falha', /* type 'magiclink' → '/entrar?erro=link-expirado', verifyOtp não chamado */);
// AuthForm
it('alterna entre Entrar e Criar conta', /* botão do submit muda de rótulo */);
it('mostra aviso de link expirado');
```

- [ ] **Step 2:** `npx vitest run app/entrar app/auth components/AuthForm.test.tsx` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** testes → PASS; `npm run typecheck && npm run lint` → ok.
- [ ] **Step 5: Manual:** `npm run dev`, criar conta em `/entrar`, abrir um filme, marcar "Quero assistir", recarregar → continua marcado; conferir a linha no Table Editor do Supabase.
- [ ] **Step 6: Commit** `feat: entrar, criar conta e confirmação por e-mail`

---

### Task 8: Trocar senha e recuperar senha

**Files:**
- Create: `app/conta/actions.ts`, `app/conta/senha/page.tsx`, `app/conta/nova-senha/page.tsx`, `app/entrar/recuperar/page.tsx`, `components/PasswordForm.tsx`, `components/RecoverForm.tsx`, `components/Notice.tsx`
- Modify: `app/entrar/actions.ts` (+ `requestPasswordReset`), `app/page.tsx` (Notice), `README.md`
- Test: `app/conta/actions.test.ts`, `app/entrar/actions.test.ts` (+casos), `components/PasswordForm.test.tsx`, `components/Notice.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 2, 7.
- Produces:
  - `requestPasswordReset(prev: AuthFormState, formData: FormData): Promise<AuthFormState>` — e-mail vazio → erro 'Informe seu e-mail.'; caso contrário chama `resetPasswordForEmail(email)` e devolve sempre `{ status: 'sent', message: 'Se houver uma conta com esse e-mail, enviamos um link.' }`, exceto erro de rate limit, que vira `authErrorMessage`.
  - `changePassword(prev, formData)` — campos `current`, `next`, `confirm`. Sem usuário → `redirect('/entrar?voltar=/conta/senha')`. `validateNewPassword` → erro. `signInWithPassword({ email: user.email, password: current })` com erro → 'Senha atual incorreta.' Depois `updateUser({ password: next })` (erro → `authErrorMessage`). Sucesso → `{ status: 'success', message: 'Senha alterada.' }`.
  - `resetPassword(prev, formData)` — campos `next`, `confirm`. Sem usuário ou sem cookie `cineagora_recovery` → `redirect('/conta/senha')`. `validateNewPassword` sem `current`; `updateUser`; apaga o cookie; `redirect('/?aviso=senha-redefinida')`.
  - `<PasswordForm action={...} requireCurrent={boolean} />` — campos com `autoComplete` `current-password` / `new-password`; mensagens de erro em `role="alert"`, sucesso em `role="status"`.
  - `<RecoverForm erro?={string} />` — campo e-mail; `erro === 'link-expirado'` → 'Link expirado, peça outro.'
  - `<Notice />` (cliente) — lê `?aviso`; `senha-redefinida` → `role="status"` 'Senha redefinida.'; outros valores → nada.
  - Páginas: `/conta/senha` exige usuário (senão `redirect('/entrar?voltar=/conta/senha')`); `/conta/nova-senha` exige usuário **e** cookie (com usuário sem cookie → `/conta/senha`; sem usuário → `/entrar/recuperar`); `/entrar/recuperar` renderiza `RecoverForm` com `erro` da URL.

- [ ] **Step 1: Testes falhando**

```ts
it('requestPasswordReset responde neutro mesmo se o e-mail não existe');
it('requestPasswordReset vazio pede e-mail');
it('changePassword com senha atual errada', /* signInWithPassword erro → 'Senha atual incorreta.'; updateUser não chamado */);
it('changePassword valida antes de chamar o Supabase', /* next '123' → mensagem de 6 caracteres; nenhuma chamada */);
it('changePassword ok', /* → { status:'success', message:'Senha alterada.' } */);
it('resetPassword sem cookie volta para /conta/senha', /* updateUser não chamado */);
it('resetPassword ok apaga cookie e redireciona com aviso', /* cookies.delete('cineagora_recovery'); redirect('/?aviso=senha-redefinida') */);
it('PasswordForm sem requireCurrent não mostra senha atual');
it('Notice mostra só avisos conhecidos');
```

- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3: Implementar.** Adicionar o link "Trocar senha" ainda não (vem com o `UserMenu`, Task 9). Montar `<Notice />` no topo de `app/page.tsx`.
- [ ] **Step 4:** testes → PASS; typecheck e lint ok.
- [ ] **Step 5: README** (seção "Contas (Supabase)"): URL Configuration e os dois modelos de e-mail exatamente como na spec (`type=signup&next=/` e `type=recovery&next=/conta/nova-senha`), aviso do limite de e-mails do SMTP padrão. **Passo manual do usuário:** aplicar essas configurações no painel.
- [ ] **Step 6: Manual:** trocar senha logado; sair; "Esqueci minha senha" → e-mail → link → nova senha → home com "Senha redefinida."; reabrir o mesmo link → "Link expirado, peça outro."
- [ ] **Step 7: Commit** `feat: trocar e recuperar senha`

---

### Task 9: Menu do usuário no header

**Files:**
- Create: `components/UserMenu.tsx`
- Modify: `components/Header.tsx`
- Test: `components/UserMenu.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 5), `signOut` (Task 7).
- Produces: `<UserMenu />`.

Comportamento: `available === false` → texto `Login indisponível` (`text-penumbra text-sm`). Deslogado → link **Entrar** para `/entrar?voltar=<pathname atual>`. Logado → botão redondo `h-10 w-10` com a inicial maiúscula do e-mail, `aria-label="Conta de <email>"`, `aria-expanded`, `aria-haspopup="menu"`; o menu mostra o e-mail, link **Trocar senha** (`/conta/senha`) e `<form action={signOut}><button>Sair</button></form>`. Fecha com Escape (foco volta ao botão) e com clique fora. Posicionado depois do `ProviderFilter` no `Header`.

- [ ] **Step 1: Testes falhando**

```tsx
it('deslogado mostra Entrar com voltar', /* usePathname '/filme/3' → href '/entrar?voltar=%2Ffilme%2F3' */);
it('logado mostra inicial e abre menu', /* email 'rodolfo@x.com' → botão 'R'; click → 'Trocar senha' e 'Sair' visíveis */);
it('Escape fecha e devolve o foco');
it('indisponível mostra aviso');
```

- [ ] **Step 2:** → FAIL. **Step 3:** implementar. **Step 4:** testes, typecheck, lint → ok; conferir no celular (DevTools 375px) que o header não quebra.
- [ ] **Step 5: Commit** `feat: menu do usuário no header`

---

### Task 10: Abas da home e painéis das listas

**Files:**
- Create: `lib/home-tabs.ts`, `components/HomeTabs.tsx`, `components/MovieListPanel.tsx`
- Modify: `app/page.tsx`
- Test: `lib/home-tabs.test.ts`, `components/HomeTabs.test.tsx`, `components/MovieListPanel.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useMovieList` (Task 5); `MovieCard` (`fluid`), `EmptyState`.
- Produces:
  - `type HomeTab = 'descobrir' | 'quero-assistir' | 'ja-assisti'`; `parseTab(value: string | null): HomeTab`; `TAB_STATUS: Record<'quero-assistir' | 'ja-assisti', MovieStatus>` = `{ 'quero-assistir': 'want', 'ja-assisti': 'watched' }`.
  - `<HomeTabs>{descobrir}</HomeTabs>` — lê `useSearchParams().get('aba')`. Rótulos "Descobrir", "Quero assistir", "Já assisti"; logado e `ready`, os dois últimos ganham ` · <n>`. Clicar → `window.history.replaceState(null, '', url)` (Descobrir remove o parâmetro, preserva os demais). `role="tablist"`, cada aba `role="tab"` com `aria-selected`, `aria-controls`, `tabIndex` 0 só na ativa; ←/→ circulam e ativam, Home/End vão às pontas. Painel Descobrir sempre montado, com `hidden` quando inativo; painéis pessoais montados só quando ativos.
  - `<MovieListPanel status={MovieStatus} />` — estados e textos exatamente da spec: deslogado (`EmptyState` título 'Entre para montar suas listas', ação link "Entrar" para `/entrar?voltar=` + `encodeURIComponent('/?aba=<aba>')`), carregando (12 skeletons `aspect-[2/3]` com `data-testid="list-skeleton"`), erro `load` ('Não foi possível carregar suas listas' + botão **Tentar de novo** → `reload()`), vazio (`EmptyState` 'Nada aqui ainda.' / 'Abra um filme e marque Quero assistir.'), com filmes (`grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6`, `MovieCard fluid`, sem badges).
  - `app/page.tsx`: hero → `<Notice />` → `<HomeTabs>` com `RatingFilter` + `RailStatusProvider`/trilhos como children.

- [ ] **Step 1: Testes falhando**

```ts
it.each([[null, 'descobrir'], ['quero-assistir', 'quero-assistir'], ['ja-assisti', 'ja-assisti'], ['xyz', 'descobrir'], ['', 'descobrir']])('parseTab(%s)', ...);
```
```tsx
// HomeTabs (mock de useSearchParams controlável; espiar history.replaceState)
it('abre na aba da URL e mantém Descobrir montado porém oculto', /* ?aba=ja-assisti → tab 'Já assisti' aria-selected; children no DOM com hidden */);
it('clicar troca a URL sem perder outros parâmetros', /* ?aviso=x → clicar Quero assistir → replaceState(..., '/?aviso=x&aba=quero-assistir') */);
it('setas e Home/End navegam', /* foco em Descobrir, ArrowLeft → Já assisti; Home → Descobrir */);
it('mostra contagens só para logado e pronto', /* 'Quero assistir · 2' */);
// MovieListPanel
it('deslogado convida para entrar com voltar da aba', /* href '/entrar?voltar=%2F%3Faba%3Dquero-assistir' */);
it('carregando mostra skeletons');
it('erro de carga com tentar de novo chama reload');
it('vazio mostra a orientação');
it('lista os filmes do status, mais recente primeiro', /* want [2,1] → links /filme/2, /filme/1 em ordem; filme watched ausente */);
```

- [ ] **Step 2:** → FAIL. **Step 3:** implementar. **Step 4:** `npx vitest run && npm run typecheck && npm run lint` → verde.
- [ ] **Step 5: Manual:** trocar de aba não refaz requests da TMDB (aba Network), voltar/avançar do navegador funciona, scroll horizontal de um trilho se mantém ao ir e voltar para Descobrir.
- [ ] **Step 6: Commit** `feat: abas Descobrir / Quero assistir / Já assisti na home`

---

### Task 11: Verificação final e checagem de RLS

**Files:**
- Modify: `README.md` (script de verificação de RLS)

- [ ] **Step 1: README** — roteiro manual de RLS: criar usuários A e B; logado como A marcar um filme; no SQL Editor rodar
  ```sql
  begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<uuid de B>"}';
  select count(*) from public.movie_status;                       -- esperado: só as linhas de B
  update public.movie_status set status = 'watched' where user_id = '<uuid de A>';  -- esperado: 0 linhas
  rollback;
  ```
- [ ] **Step 2: Passo manual do usuário:** executar o roteiro e confirmar os resultados esperados.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm test && npm run build` → tudo verde (colar saída).
- [ ] **Step 4: Roteiro no navegador:** cadastro → marcar 2 filmes (um de cada status) → abas com contagens → favoritos antigos migrados (preparar `cineagora:favorites:v1` antes do primeiro login) → logout em outra aba reflete nesta → trocar senha → recuperar senha → sair. Anotar qualquer desvio.
- [ ] **Step 5: Commit** `docs: verificação de RLS e roteiro manual`
