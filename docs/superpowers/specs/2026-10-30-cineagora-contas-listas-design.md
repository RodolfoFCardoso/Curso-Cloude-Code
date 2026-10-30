# CineAgora: contas e listas "Quero assistir" / "Já assisti"

Data: 2026-10-30
Status: aprovado em conversa, aguardando revisão da spec escrita

## Objetivo

Permitir que o usuário entre com e-mail e senha (Supabase) e marque filmes
como **Quero assistir** ou **Já assisti**, navegando por essas listas em abas
na home. As listas acompanham a conta em qualquer dispositivo.

Sucesso = uma pessoa cria conta, marca filmes na página do filme, vê as listas
nas abas da home, troca e recupera a senha, e nenhum usuário enxerga as listas
de outro.

## Decisões

| Tema | Decisão |
| --- | --- |
| "Minha lista" atual | Vira **Quero assistir**. Favoritos locais são migrados para a conta no primeiro login e a chave local é apagada |
| Sem login | Marcar exige conta. Clicar em um botão de status leva a `/entrar?voltar=...` |
| Estados | Exclusivos: cada filme tem um status só (nenhum, `want` ou `watched`) |
| Abas | **Descobrir \| Quero assistir \| Já assisti** abaixo do hero, estado em `?aba=` |
| Onde marcar | Só na página do filme |
| Arquitetura | `@supabase/ssr`, sessão em cookie renovada no `proxy.ts`; listas lidas e gravadas no cliente; segurança via RLS |
| Conta | Entrar, criar conta, sair, trocar senha (logado) e recuperar senha (por e-mail) |
| Preferências | Streamings e nota mínima continuam no localStorage |

## Fora do escopo

- Login social, troca de e-mail, exclusão de conta, perfil.
- Botões de status no card (hover/foco).
- Sincronizar preferências (streamings e nota) com a conta.
- SMTP próprio para produção (o SMTP padrão do Supabase serve só para desenvolvimento).
- Testes automatizados contra um Supabase real.

## Banco de dados

```sql
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
```

A chave `(user_id, movie_id)` garante a exclusividade dos estados. Marcar ou
trocar status = `upsert` (atualizando `updated_at`); desmarcar = `delete`.
O SQL fica versionado em `cineagora/supabase/schema.sql` e é aplicado à mão
pelo SQL Editor do painel.

## Camada de dados

Nova interface em `lib/store/types.ts`, substituindo `FavoritesStore`:

```ts
export type MovieStatus = 'want' | 'watched';

export type MovieListError = 'load' | 'save' | 'unauthenticated';

export interface MovieListStore {
  /** false até a primeira carga terminar. */
  isReady(): boolean;
  /** Mais recente primeiro; mesma referência enquanto não mudar. */
  list(status: MovieStatus): Movie[];
  statusOf(id: number): MovieStatus | null;
  /** null = desmarcar. Otimista: atualiza na hora, desfaz se o banco falhar. */
  setStatus(movie: Movie, status: MovieStatus | null): void;
  /** Último erro; null depois de uma operação bem-sucedida. */
  lastError(): MovieListError | null;
  reload(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
```

Adapters:

- `createMemoryMovieListStore()`: em memória, para testes.
- `createSupabaseMovieListStore(client, userId)`: carrega todas as linhas do
  usuário uma vez; grava com atualização otimista e rollback em caso de erro.
  Resposta 401 vira `lastError() === 'unauthenticated'`.

Suíte de contrato `runMovieListStoreContract` (em `lib/store/contract.ts`)
roda contra os dois adapters (o do Supabase com um client fake): começa vazio,
marcar/trocar/desmarcar, exclusividade, ordem mais recente primeiro,
referência estável, notify/unsubscribe, rollback quando a escrita falha.

**Migração dos favoritos** (`lib/store/migrate-favorites.ts`): na primeira
carga após o login, se existir a chave `cineagora:favorites` no localStorage,
os filmes vão como `want` via `upsert(..., { onConflict: 'user_id,movie_id',
ignoreDuplicates: true })` e a chave é apagada só depois do sucesso.

Removidos: `FavoritesStore`, `local-favorites.ts`, `runFavoritesStoreContract`,
`useFavorites`, `FavoritesRow` e `FavoriteButton`.

## Autenticação

Dependências: `@supabase/supabase-js`, `@supabase/ssr`.

Variáveis em `.env.local` (e documentadas em `.env.example`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Arquivos:

- `lib/supabase/env.ts`: lê as variáveis; erro claro se faltar alguma.
- `lib/supabase/server.ts`: `createServerClient` com `cookies()` (`server-only`).
- `lib/supabase/browser.ts`: `createBrowserClient`, singleton.
- `proxy.ts`: renova a sessão em toda request (exceto estáticos e imagens).
  Não bloqueia rota nenhuma.
- `lib/auth/safe-redirect.ts`: `safeRedirectPath(value, fallback)` aceita só
  caminho relativo começando com `/` (rejeita `//…`, `/\…`, URLs absolutas).
- `lib/auth/messages.ts`: `authErrorMessage(err)` traduz erros do Supabase;
  código desconhecido vira "Algo deu errado, tente de novo".
- `lib/auth/password.ts`: `validateNewPassword({ current?, next, confirm })`:
  mínimo de 6 caracteres, confirmação igual e, se `current` vier, diferente dela.

### Entrar e criar conta (`/entrar`)

Formulário único com alternância **Entrar | Criar conta** (e-mail + senha).
Server Actions em `app/entrar/actions.ts`: `signIn`, `signUp`, `signOut`, com
`useActionState` para mostrar erros. `?voltar=` passa por `safeRedirectPath`
(padrão `/`).

Confirmação de e-mail funciona ligada ou desligada no painel: ligada, o
cadastro mostra "Enviamos um link para seu e-mail"; desligada, entra direto.

### Rota de confirmação (`app/auth/confirm/route.ts`)

Recebe `token_hash`, `type` (`signup` ou `recovery`) e `next`. Faz `verifyOtp`.

- Sucesso: redireciona para `safeRedirectPath(next, '/')`. Com
  `type=recovery`, grava antes o cookie httpOnly `cineagora_recovery`
  (10 minutos, `sameSite=lax`, `secure` em produção).
- Falha (link expirado ou usado): `type=recovery` vai para
  `/entrar/recuperar?erro=link-expirado`; `signup` vai para
  `/entrar?erro=link-expirado`.

### Trocar senha (`/conta/senha`)

Página protegida: sem sessão, redireciona (checagem no servidor, na própria
página) para `/entrar?voltar=/conta/senha`. Campos: senha atual, nova senha,
confirmar. Server Action `changePassword`:

1. `validateNewPassword` com a senha atual.
2. Confere a senha atual com `signInWithPassword(email, atual)`.
3. `updateUser({ password })`; mostra "Senha alterada" e mantém a sessão.

### Recuperar senha

1. Link "Esqueci minha senha" em `/entrar` leva a `/entrar/recuperar` (campo de e-mail).
2. Server Action `requestPasswordReset` chama `resetPasswordForEmail(email)`.
   O destino final vem do modelo de e-mail (`next=/conta/nova-senha`, fixo).
   Resposta sempre neutra:
   "Se houver uma conta com esse e-mail, enviamos um link".
3. O link do e-mail passa por `/auth/confirm` (`type=recovery`), que cria a
   sessão, grava o cookie de recuperação e redireciona para `/conta/nova-senha`.
4. `/conta/nova-senha` exige sessão **e** cookie `cineagora_recovery`; sem o
   cookie, redireciona para `/conta/senha`. Campos: nova senha e confirmar.
5. Server Action `resetPassword`: `validateNewPassword`, `updateUser`, apaga o
   cookie e redireciona para `/?aviso=senha-redefinida` (a home mostra o aviso).

`/conta/senha` e `/conta/nova-senha` usam o mesmo `PasswordForm` com a prop
`requireCurrent`.

### Configuração no painel do Supabase (documentar no README)

- Authentication → Providers: Email habilitado; "Confirm email" a critério.
- Authentication → URL Configuration: Site URL `http://localhost:3000`;
  Redirect URLs `http://localhost:3000/**` (e a URL de produção quando houver).
- Authentication → Email Templates:
  - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/`
  - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/conta/nova-senha`
- SQL Editor: rodar `supabase/schema.sql`.

## Sessão na UI

- O layout chama `supabase.auth.getUser()` e passa `{ id, email } | null` para
  um `AuthProvider` (cliente). O layout já é `force-dynamic`; ler cookies não
  muda o cache da TMDB.
- `AuthProvider` cria o `MovieListStore` do Supabase quando há usuário (e
  roda a migração dos favoritos); sem usuário, não há store.
- `onAuthStateChange` cobre login e logout em outra aba (`router.refresh()` e
  recriação ou descarte do store).
- Hooks: `useUser()` e `useMovieList()`, que devolve
  `{ ready, error, list(status), statusOf(id), setStatus, reload }` via
  `useSyncExternalStore`.

## Interface

### Header: `components/UserMenu.tsx`

Deslogado: link **Entrar**. Logado: botão redondo de 40px com a inicial do
e-mail que abre um menu com o e-mail · **Trocar senha** · **Sair**. Fica ao
lado do `ProviderFilter`.

### Abas: `components/HomeTabs.tsx`

- **Descobrir | Quero assistir | Já assisti** abaixo do hero, com contagem
  no rótulo quando a pessoa está logada ("Quero assistir · 12").
- Estado em `?aba=` (`quero-assistir` | `ja-assisti`); ausente ou inválido = Descobrir.
- Troca com `router.replace(..., { scroll: false })`.
- `role="tablist"`/`tab`/`tabpanel`, setas do teclado alternam as abas.
- `app/page.tsx` continua carregando os trilhos no servidor e passa
  `RatingFilter` + trilhos como children do painel Descobrir, que fica só
  oculto (sem desmontar) nas outras abas.

### Listas: `components/MovieListPanel.tsx`

Estados: deslogado ("Entre para montar suas listas" + botão para
`/entrar?voltar=/?aba=...`), carregando (grid de skeletons), erro ("Não foi
possível carregar suas listas" + **Tentar de novo**), vazio (`EmptyState`:
"Nada aqui ainda. Abra um filme e marque Quero assistir."), com filmes (grid
de `MovieCard`: 2 colunas no celular, 4 no tablet, 6 no desktop; mais recente
primeiro). Os filtros de streaming e nota não se aplicam aqui.

### Página do filme: `components/MovieStatusButtons.tsx`

Substitui o `FavoriteButton`, no mesmo estilo de pílula. Dois botões com
`aria-pressed`: **+ Quero assistir** e **✓ Já assisti**. Clicar no ativo
desmarca; clicar no outro troca. Deslogado: o clique leva a
`/entrar?voltar=/filme/<id>`. Erro ao salvar: rollback e aviso
"Não foi possível salvar, tente de novo" (`role="status"`). Erro
`unauthenticated`: redireciona para entrar.

## Tratamento de erros

- Variáveis do Supabase ausentes: a home e a TMDB continuam funcionando; o
  header mostra "Login indisponível" no lugar de **Entrar**, e o erro vai
  para o log do servidor.
- Erros de auth: mensagens via `authErrorMessage`.
- Falhas do store: `console.error` com contexto, no padrão de `logTmdbError`.

## Testes

- Contrato `runMovieListStoreContract` nos dois adapters.
- Unitários: `validateNewPassword`, `authErrorMessage`, `safeRedirectPath`,
  migração dos favoritos (com e sem favoritos; não apaga a chave se o upsert falhar).
- Componentes: `HomeTabs`, `MovieListPanel` (todos os estados),
  `MovieStatusButtons`, `PasswordForm` (com e sem senha atual), `UserMenu`.
- Server Actions e `/auth/confirm` com o client do Supabase mockado, incluindo
  o cookie de recuperação e o link expirado.
- RLS: script de verificação manual no README (usuário A não lê nem grava
  linhas do usuário B).
- Verificação final: `npm run typecheck`, `npm run lint`, `npm test` e roteiro
  manual no navegador (cadastro, marcar, abas, trocar senha, recuperar senha,
  sair).
