# CineAgora

Catálogo de filmes com o que está disponível nos streamings do Brasil. Dados da
[TMDB](https://www.themoviedb.org/); disponibilidade via JustWatch.

## 1. Conseguir a chave da TMDB (grátis)

1. Crie uma conta em <https://www.themoviedb.org/signup> e confirme o e-mail.
2. Logado, abra <https://www.themoviedb.org/settings/api> e solicite uma chave do tipo
   **Developer**. Aceite os termos e preencha o formulário (uso pessoal/educacional; a URL
   do app pode ser `http://localhost:3000`).
3. Na mesma página, copie o **API Read Access Token** — o texto longo que começa com
   `eyJ...` (não a "API Key" curta).
4. Crie o arquivo `cineagora/.env.local` (ele fica fora do git) com:

   ```
   TMDB_API_KEY=eyJ...seu token...
   ```

Nunca commite nem compartilhe esse token.

## 2. Rodar

```bash
cd cineagora
npm install
npm run dev
```

Abra <http://localhost:3000>.

## Contas (Supabase)

Contas e listas ("Quero assistir" / "Já assisti") usam o [Supabase](https://supabase.com/).

1. Crie um projeto no Supabase e, em **Project Settings > API**, copie a URL e a chave publicável.
2. Adicione ao `cineagora/.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

3. No painel, abra o **SQL Editor** e rode o conteúdo de `supabase/schema.sql` (cria a tabela
   `movie_status` com RLS ativada).
4. Em **Authentication > URL Configuration**, defina a **Site URL** (em dev, `http://localhost:3000`)
   e inclua `http://localhost:3000/**` em **Redirect URLs**.
5. (Opcional — o plano gratuito só libera com SMTP próprio.) Com os modelos de e-mail padrão, o
   link de recuperação de senha volta com `?code=` e só funciona no mesmo navegador que pediu o
   e-mail. Para links que abrem em qualquer navegador, em **Authentication > Email Templates**
   troque o link dos dois modelos:
   - **Confirm signup**:

     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/
     ```

   - **Reset password**:

     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/conta/nova-senha
     ```

> **Limite de e-mails:** o SMTP padrão do Supabase envia poucos e-mails por hora. Quem passa do
> limite vê "Muitas tentativas. Aguarde alguns minutos." Para uso real, configure um SMTP próprio.

### Verificação de RLS

Confirma que um usuário não enxerga nem altera as linhas de outro. Crie dois usuários (A e B),
logado como A marque um filme e, no **SQL Editor**, rode:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid de B>"}';
select count(*) from public.movie_status;                       -- esperado: igual ao número de linhas marcadas por B; nunca inclui linhas de A
update public.movie_status set status = 'watched' where user_id = '<uuid de A>';  -- esperado: 0 linhas
delete from public.movie_status where user_id = '<uuid de A>';                     -- esperado: 0 linhas
insert into public.movie_status (user_id, movie_id, status, title) values ('<uuid de A>', 1, 'want', 'x');  -- esperado: erro de RLS
rollback;
```

Os UUIDs ficam em **Authentication > Users**. O `rollback` desfaz qualquer alteração feita pelo
teste. O `insert` fica por último porque, no Postgres, um erro aborta a transação e os comandos
seguintes falhariam.

### Roteiro manual

Checklist para validar o fluxo completo no navegador (`npm run dev`):

- [ ] **Pré-condição (antes de qualquer login):** preencher a chave antiga de favoritos no
      navegador. Pelo DevTools, em **Application > Local Storage**, adicione a chave
      `cineagora:favorites:v1` com o valor:

      ```json
      { "movies": [{ "id": 550, "title": "Clube da Luta" }] }
      ```

      Ou no console da página: `localStorage.setItem('cineagora:favorites:v1', JSON.stringify({ movies: [{ id: 550, title: 'Clube da Luta' }] }))`.

- [ ] Cadastrar uma conta nova e confirmar pelo e-mail.
- [ ] Resultado esperado: após o primeiro login, "Clube da Luta" aparece em "Quero assistir" e a
      chave `cineagora:favorites:v1` some do Local Storage.
- [ ] Marcar 2 filmes, um em cada status ("Quero assistir" e "Já assisti").
- [ ] Conferir as contagens em "Meu perfil" (/perfil) e o trilho "Quero assistir" na home.
- [ ] Logout em uma aba reflete na outra aberta.
- [ ] Trocar a senha pela página da conta.
- [ ] Recuperar a senha pelo e-mail e definir uma nova.
- [ ] Sair da conta.

Anote qualquer desvio do comportamento esperado.

## Comandos

| Comando          | O que faz                   |
| ---------------- | --------------------------- |
| `npm run dev`    | servidor de desenvolvimento |
| `npm test`       | testes (Vitest)             |
| `npm run lint`   | ESLint                      |
| `npm run format` | Prettier                    |
| `npm run build`  | build de produção           |

> **OneDrive:** a pasta `node_modules` dentro do OneDrive pode deixar a sincronização
> lenta. Se incomodar, pause a sincronização enquanto desenvolve.

Este produto usa a API da TMDB, mas não é endossado nem certificado pela TMDB.
