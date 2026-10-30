# CineAgora — Catálogo de filmes nos streamings (Design)

- **Data:** 2026-10-29
- **Status:** Aprovado (spec revisada em 2026-10-30)
- **Autor:** Rodolfo + Claude (brainstorming)
- **Nome do produto:** CineAgora (placeholder, sujeito a mudança)

---

## 1. Visão e propósito

CineAgora é um **catálogo de filmes para descoberta agregada**: um lugar
só onde a pessoa vê o que está disponível nos vários streamings e decide o
que assistir, sem precisar pular de app em app.

**Problema que resolve:** hoje, para saber o que assistir, a pessoa abre
Netflix, Prime, Max, etc., um por um. O CineAgora junta tudo numa
experiência de navegação visual e permite filtrar pelos serviços que a
pessoa de fato assina.

**O diferencial (coração do produto):** o filtro "Meus streamings" — *me
mostre só o que eu já posso assistir com o que eu pago*.

### Fonte de dados

API da **TMDB** (https://developer.themoviedb.org/docs/getting-started). A
disponibilidade "onde assistir" vem da TMDB via JustWatch, é **por
região** e atualizada periodicamente. **Não é "tempo real" literal** — é a
fonte mais completa disponível, e o app comunica isso com honestidade na
UI ("atualizado periodicamente").

### Decisões de produto já tomadas

| Tema | Decisão |
|---|---|
| Plataforma | Web primeiro (desktop + mobile via navegador) |
| Região | Brasil apenas (`region=BR`, `language=pt-BR`) |
| Tipos de disponibilidade | Todos: assinatura, grátis, alugar, comprar (cada um rotulado; preço quando a TMDB fornecer) |
| Descoberta | Home com trilhos horizontais estilo Netflix |
| Conteúdo | Filmes (séries ficam fora do escopo por ora) |
| Personalização | Filtro "Meus streamings", sem login no MVP; favoritos e login vêm depois |

---

## 2. Escopo

### MVP (primeira entrega)

1. **Home com trilhos:** "Em alta", "Populares", "Lançamentos" e **um
   trilho por gênero** (todos os ~19 gêneros oficiais da TMDB).
2. **Página de detalhe do filme:** backdrop, pôster, título, ano, nota,
   duração, gêneros, sinopse; bloco **"Onde assistir no Brasil"** em
   destaque (agrupado por tipo); trailer; elenco principal; filmes
   parecidos.
3. **Filtro "Meus streamings":** a pessoa marca os serviços que assina; os
   trilhos passam a mostrar só filmes disponíveis neles. Salvo no
   navegador (localStorage).
4. **Busca simples** por título.

### Fast-follow (logo após o MVP)

5. **Favoritos locais** (localStorage), usando a camada de dados já
   preparada.

### Futuro (fora do escopo desta spec)

- Banco de dados + login/conta → favoritos e preferências sincronizados
  entre dispositivos (a camada de dados isolada existe justamente para
  tornar isso uma troca de adapter, sem reescrita da UI).
- Possíveis: página de "explorar" com filtros avançados (gênero/ano/nota),
  séries de TV, múltiplas regiões.

### Explicitamente fora do MVP (YAGNI)

- Login / contas de usuário.
- Página de filtros avançados dedicada.
- Séries de TV.
- Testes end-to-end (E2E) com navegador.
- Múltiplos países.

---

## 3. Arquitetura

### Abordagem escolhida

**Next.js (App Router) + TypeScript**, com Server Components e uma camada
de serviço no servidor que fala com a TMDB. O navegador nunca acessa a
TMDB diretamente nem conhece a chave.

Motivos: protege a chave; páginas rápidas e cacheáveis; bons previews ao
compartilhar link; e a "camada de dados isolada" (preferências/favoritos)
nasce de forma natural, deixando o caminho pronto para banco + login.

### Camadas

```
Navegador (UI — React Server + Client Components)
   │  componentes: trilhos, cards, detalhe, filtros
   ▼
Camada de dados do app  (preferências e favoritos)
   │  interface única; adapter localStorage agora, adapter banco depois
   ▼
Backend do Next (server)
   │  • Serviço TMDB: fala com a API, esconde a chave, faz cache
   │  • Mapeadores: traduzem o JSON cru da TMDB para os tipos do app
   ▼
API da TMDB (externa)
```

### Fronteiras-chave (o que torna o sistema evoluível e testável)

1. **A UI depende só dos tipos do app**, nunca do formato cru da TMDB. Se
   a TMDB mudar um campo, conserta-se no mapeador, num lugar só.
2. **Preferências/favoritos passam por uma interface**, não direto pelo
   localStorage. Trocar para banco = novo adapter, UI intacta.

### Estrutura de pastas

```
app/                 páginas e rotas
  page.tsx           home (trilhos)
  filme/[id]/        página de detalhe
  busca/             resultados de busca
  api/               route handlers quando o client precisar buscar dados
lib/
  tmdb/              serviço TMDB + mapeadores + tipos
  store/             camada de dados (interface + adapter localStorage)
components/          UI reutilizável (MovieCard, Row, ProviderBadge, ...)
```

### Unidades e responsabilidades

- **Serviço TMDB** (`lib/tmdb/`, server): único ponto que conhece a TMDB.
  Guarda a chave, aplica cache, trata erros. Funções:
  `getTrending()`, `getPopular()`, `getNowPlaying()`, `getByGenre(id)`,
  `getGenres()`, `getMovieDetails(id)`, `getWatchProviders(id)`,
  `searchMovies(q)`.
- **Mapeadores/Tipos** (`lib/tmdb/`): convertem JSON da TMDB para tipos
  enxutos do app (`Movie`, `MovieDetails`, `WatchProvider`, `Genre`,
  etc.).
- **UI** (`components/`, `app/`): recebe tipos do app, renderiza.
- **Camada de dados** (`lib/store/`): interfaces `PreferencesStore` e
  `FavoritesStore` + adapter localStorage.

---

## 4. Telas e componentes

### Telas (MVP)

**Home (`/`)** — descoberta por trilhos
- Cabeçalho: logo, busca, botão "Meus streamings" (abre o filtro).
- Trilhos horizontais: "Em alta", "Populares", "Lançamentos" e um por
  gênero (todos os gêneros oficiais da TMDB).
- Com filtro ativo, os trilhos mostram só filmes nos serviços marcados;
  trilho que ficar 100% vazio é ocultado.

**Detalhe (`/filme/[id]`)**
- Backdrop + pôster, título, ano, nota, duração, gêneros, sinopse.
- Bloco **"Onde assistir no Brasil"** em destaque, agrupado:
  **Assinatura · Grátis · Alugar · Comprar**, cada serviço com logo e, no
  alugar/comprar, o preço quando a TMDB fornecer.
- Trailer (se houver), elenco principal, filmes parecidos.

**Busca (`/busca?q=...`)**
- Grade de pôsteres; clique abre o detalhe.

### Componentes reutilizáveis

- `MovieCard` — pôster + título + nota + selos de serviço.
- `Row` — trilho horizontal rolável de `MovieCard`s, com título.
- `ProviderBadge` — logo de um serviço (mini no card, maior no detalhe).
- `ProviderFilter` — painel "Meus streamings" (checkboxes), salvo via
  camada de dados; global no cabeçalho.
- `SearchBar` — busca no cabeçalho.
- `Loading` (esqueletos de pôster) e `EmptyState`.

### Observação sobre o filtro por serviço

A TMDB entrega disponibilidade **por filme**, não "todos os filmes do
serviço X". O filtro, portanto, pega as listas (trending/popular/gênero),
consulta disponibilidade e **esconde** o que não está nos serviços
marcados. Atende bem à descoberta; não é um "catálogo infinito do serviço
X". Ver otimização na seção 5.

---

## 5. Fluxo de dados e integração com a TMDB

### Proteção da chave

Todo acesso passa pelo Serviço TMDB no servidor. A chave vive em
`TMDB_API_KEY` (variável de ambiente, fora do versionamento). O navegador
pede ao backend do Next, que chama a TMDB.

### Endpoints usados (MVP)

| Função do app | Endpoint TMDB | Uso |
|---|---|---|
| `getTrending()` | `/trending/movie/week` | trilho "Em alta" |
| `getPopular()` | `/movie/popular` | trilho "Populares" |
| `getNowPlaying()` | `/movie/now_playing` | "Lançamentos" |
| `getByGenre(id)` | `/discover/movie?with_genres=` | trilho por gênero |
| `getGenres()` | `/genre/movie/list` | lista oficial de gêneros |
| `getMovieDetails(id)` | `/movie/{id}?append_to_response=videos,credits,similar` | detalhe (sinopse, trailer, elenco, parecidos em 1 chamada) |
| `getWatchProviders(id)` | `/movie/{id}/watch/providers` | "Onde assistir" (BR) |
| `searchMovies(q)` | `/search/movie` | busca |

Todas as chamadas com `language=pt-BR` e `region=BR` / `watch_region=BR`
conforme o endpoint.

### Cache

O servidor guarda respostas em cache (cache nativo de `fetch` /
revalidação do Next):
- Trilhos (trending/popular/gênero): revalidam a cada poucas horas.
- Detalhe e "onde assistir": revalidam ~1x por dia.
- Lista de gêneros: cache longo (muda raramente).

Objetivo: velocidade + respeitar o limite de requisições da TMDB.

### Filtro "Meus streamings" — mecânica real

1. Busca a lista do trilho.
2. Verifica provedores no BR para esses filmes.
3. Esconde os que não estão em nenhum serviço marcado.
4. Renderiza o trilho filtrado, cada card com selo(s) do(s) serviço(s).

**Otimização:** para trilhos baseados em `/discover/movie`, usar
`with_watch_providers` + `watch_region=BR` para pedir já filtrado na
origem, reduzindo chamadas. Para trending/popular (que não aceitam esse
parâmetro), aplicar os passos 2–3.

### Preferências e favoritos

Passam pela camada de dados isolada. Hoje: adapter localStorage (serviços
marcados; favoritos no fast-follow). Futuro: adapter de banco, UI
inalterada.

---

## 6. Tratamento de erros e estados

Princípio: **o app nunca mostra tela branca ou erro cru; toda falha degrada
com elegância.**

### Erros da TMDB (servidor)

- **Rede / fora do ar / timeout** → erro controlado + estado amigável com
  botão de recarregar. Nunca o erro técnico ao usuário.
- **Rate limit (429)** → cache reduz muito; se ocorrer, servir cache
  (mesmo antigo); sem cache, "tente novamente em instantes".
- **Filme não encontrado (404)** → "Filme não encontrado" + voltar à home.
- **Chave inválida/ausente** → falha clara nos logs (dev); usuário vê
  estado genérico de indisponibilidade.

### Estados de UI

- **Carregando** → esqueletos (layout estável, sem "pulo").
- **Vazio por filtro** → mensagem + atalho para ajustar o filtro; trilho
  100% vazio fica oculto.
- **Busca sem resultados** → mensagem com sugestão de outro termo.
- **"Onde assistir" sem dados** → "Sem informação de onde assistir no
  Brasil no momento" (honesto, sem inventar).
- **Sem imagem** → placeholder com o título.

### Degradação independente

Cada trilho busca seus dados de forma independente: se "Populares" falhar,
os demais ainda aparecem. Um trilho com problema não derruba a home.

### Logs (dev)

Erros do servidor vão para os logs com contexto (endpoint, id do filme).
Nenhum segredo (chave) nos logs.

---

## 7. Testes e qualidade

TDD nas partes de lógica (teste antes do código).

1. **Mapeadores (prioridade alta)** — unidade, com fixtures de respostas
   reais da TMDB: filme completo → `Movie` correto; campos faltando caem em
   defaults; `watch/providers` BR agrupado corretamente.
2. **Lógica do filtro "Meus streamings"** — unidade: serviços marcados
   filtram certo; nenhum marcado mostra tudo; filme sem provedores some com
   filtro ativo.
3. **Serviço TMDB** — com rede mockada: monta URL certa (pt-BR, BR,
   gênero); 429/500/timeout viram erro controlado; chave nunca vaza no
   retorno.
4. **Camada de dados** — unidade, testada contra a interface (mesmos testes
   valerão para o adapter de banco).
5. **Componentes de UI** — leves e certeiros: `MovieCard` mostra nota e
   selos; `EmptyState` aparece em lista vazia; esqueleto no carregamento.
   Sem testes de pixel/estilo.

**Fora do MVP:** E2E com navegador (porta aberta para depois).

**Qualidade geral:** TypeScript estrito; linter + formatador desde o
início para código consistente.

---

## 8. Riscos e questões em aberto

- **Limite de requisições da TMDB:** mitigado por cache; monitorar se os
  muitos trilhos de gênero + checagem de provedores exigem mais
  otimização (ex.: menos gêneros "acima da dobra", carregar o resto sob
  demanda).
- **"Onde assistir" incompleto:** nem todo filme tem disponibilidade
  listada no BR; a UI comunica isso honestamente.
- **Chave/registro na TMDB:** é necessária uma conta e chave de API da
  TMDB (a definir na implementação).
- **Logos de serviços:** a TMDB fornece os logos dos provedores; validar
  termos de uso de imagens na implementação.

---

## 9. Próximo passo

Após revisão e aprovação desta spec: invocar a skill **writing-plans**
para gerar o plano de implementação detalhado.
