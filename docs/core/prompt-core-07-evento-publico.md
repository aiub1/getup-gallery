# Prompt core 07 — Evento público (GetUp 2026)

> Colar no Claude Code, no repositório **`poiema-gallery`** (core), com `develop` atualizado.
> Antes de colar, veja **Antes de começar (João)** e **Depois do merge (João)** no fim.

---

Mudança no core para o site público do GetUp 2026 (`getup-gallery`, app separado do
`galeria-web`): um evento marcado como público pode ter as fotos **vistas e baixadas sem
login**. Antes de começar, releia `CLAUDE.md` §1, §3, §5.1 e §8, `docs/CONTRATO.md` §1, §4 e
§8, `docs/ARQUITETURA.md` §5 e §10, `docs/adr/0002-migration-conventions.md` e
`supabase/tests/010_schema_guards.sql`.

Isto muda uma frase central do projeto ("sistema fechado"). Se algo abaixo contrariar uma
regra que você encontrar e que eu não tenha citado, **pare e pergunte**.

## O que foi decidido

- `events` ganha `is_public boolean not null default false`. **Só admin** liga ou desliga
  (trigger; a policy `update events` deixa o criador editar a própria linha).
- O papel **`anon` continua sem privilégio em tabela alguma**. O guarda de
  `010_schema_guards.sql` não muda e tem de continuar verde. A leitura pública passa só por
  quatro funções `security definer` com `execute` para `anon`:
  `public_event(slug)`, `public_event_sessions(slug)`,
  `public_event_photos(slug, session_id, limit, offset)` e `public_photo(id)`.
- Regra pública, definida uma vez em `public_photos_of(event_id)` (interna, sem grant):
  evento `is_public` e não excluído; foto não excluída, `status <> 'pending_review'`,
  **`contains_minors is false`** (nulo ou verdadeiro nunca é público) e `not is_private`.
- As funções devolvem só `id`, `session_id`, `thumb_key`, `web_key`, dimensões e `taken_at`.
  Nunca `storage_key`, `uploaded_by`, `status` ou as flags.
- Nenhuma policy existente muda. `read photos`, `read events` e `read sessions` ficam como
  estão.

## Parte 1 — Migration (0007)

Crie com `npx supabase migration new public_events` (o timestamp é o da CLI) e use
**exatamente** este conteúdo. Ele já foi aplicado sobre as seis migrations atuais num
Postgres 16 local e passou no teste da Parte 2.

```sql
-- 0007 — Evento público (docs/adr/0014-public-events.md, docs/CONTRATO.md §9)
--
-- Primeira leitura sem login do sistema: um evento marcado `is_public` pode
-- ter as fotos vistas e baixadas por qualquer pessoa (ex.: GetUp 2026).
--
-- O papel `anon` CONTINUA sem privilégio em tabela alguma (CLAUDE.md §1,
-- guarda em tests/010_schema_guards.sql). A leitura pública passa só por
-- quatro funções `security definer`, que devolvem colunas escolhidas a dedo e
-- aplicam a regra de visibilidade aqui, no banco — a web segue sem decidir
-- quem vê o quê (CONTRATO §1).
--
-- Regra pública, num lugar só (`public_photos_of`):
--   evento is_public e não excluído
--   foto não excluída, status <> 'pending_review'
--   contains_minors = false  (nulo ou true NUNCA é público — CLAUDE.md §3)
--   is_private = false
--
-- Ordem (docs/adr/0002): coluna → trigger → funções → grants/revokes.

-- ---------------------------------------------------------------
-- events.is_public
-- ---------------------------------------------------------------
alter table events add column is_public boolean not null default false;

-- Só admin liga ou desliga. A policy "update events" deixa o criador do
-- evento (um uploader) editar a própria linha; sem este trigger ele poderia
-- abrir um evento ao público sozinho.
-- Security invoker de propósito, como enforce_profile_privileged_columns:
-- dentro de security definer, current_user seria o dono da função.
create or replace function enforce_event_public_flag()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if current_user in ('postgres','supabase_admin','service_role') then
    return new;
  end if;
  if is_admin() then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.is_public)
     or (tg_op = 'UPDATE' and new.is_public is distinct from old.is_public) then
    raise exception 'is_public de evento so muda por admin'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_events_public_flag
  before insert or update on events
  for each row execute function enforce_event_public_flag();

-- ---------------------------------------------------------------
-- Regra de visibilidade pública — única definição, uso interno.
-- Security invoker e sem grant a anon/authenticated: só roda de dentro das
-- funções security definer abaixo.
-- ---------------------------------------------------------------
create or replace function public_photos_of(p_event_id uuid)
returns setof photos language sql stable
set search_path = public, pg_temp as $$
  select p.*
    from photos p
    join events e on e.id = p.event_id
   where e.id = p_event_id
     and e.is_public
     and e.deleted_at is null
     and p.deleted_at is null
     and p.status <> 'pending_review'
     and p.contains_minors is false
     and not p.is_private;
$$;

-- ---------------------------------------------------------------
-- Funções públicas (anon). Colunas devolvidas: só o necessário para a
-- página. Nunca storage_key (original), uploaded_by, status ou flags.
-- ---------------------------------------------------------------
create or replace function public_event(p_slug text)
returns table (
  id          uuid,
  name        text,
  slug        text,
  description text,
  event_date  date,
  cover_key   text,
  photo_count bigint
) language sql stable
security definer set search_path = public, pg_temp as $$
  select e.id, e.name, e.slug, e.description, e.event_date, e.cover_key,
         (select count(*) from public_photos_of(e.id))
    from events e
   where e.slug = p_slug and e.is_public and e.deleted_at is null;
$$;

create or replace function public_event_sessions(p_slug text)
returns table (
  id          uuid,
  name        text,
  "position"  int,
  photo_count bigint
) language sql stable
security definer set search_path = public, pg_temp as $$
  select s.id, s.name, s.position,
         (select count(*) from public_photos_of(e.id) p where p.session_id = s.id)
    from events e
    join sessions s on s.event_id = e.id
   where e.slug = p_slug and e.is_public and e.deleted_at is null
   order by s.position, s.created_at;
$$;

-- Mesma ordem da galeria da web: cronológica, sem taken_at no fim,
-- desempate por created_at e id. p_limit é limitado a 100 por chamada.
create or replace function public_event_photos(
  p_slug       text,
  p_session_id uuid default null,
  p_limit      int  default 48,
  p_offset     int  default 0
)
returns table (
  id         uuid,
  session_id uuid,
  thumb_key  text,
  web_key    text,
  width      int,
  height     int,
  taken_at   timestamptz
) language sql stable
security definer set search_path = public, pg_temp as $$
  select p.id, p.session_id, p.thumb_key, p.web_key, p.width, p.height, p.taken_at
    from events e
    cross join lateral public_photos_of(e.id) p
   where e.slug = p_slug
     and (p_session_id is null or p.session_id = p_session_id)
   order by p.taken_at asc nulls last, p.created_at asc, p.id asc
   limit least(greatest(coalesce(p_limit, 48), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Uma foto pública pelo id (download). Devolve vazio para qualquer foto
-- que não passe na regra pública — a web não distingue "não existe" de
-- "não é pública".
create or replace function public_photo(p_id uuid)
returns table (
  id           uuid,
  web_key      text,
  thumb_key    text,
  event_slug   text,
  session_name text
) language sql stable
security definer set search_path = public, pg_temp as $$
  select p.id, p.web_key, p.thumb_key, e.slug, s.name
    from photos ph
    join events e on e.id = ph.event_id
    cross join lateral public_photos_of(e.id) p
    left join sessions s on s.id = p.session_id
   where ph.id = p_id and p.id = ph.id;
$$;

-- ---------------------------------------------------------------
-- Grants. O Supabase concede execute a anon/authenticated por default
-- privileges em toda função nova de public; por isso os revokes citam os
-- papéis pelo nome, não só `public`.
-- ---------------------------------------------------------------
revoke execute on function enforce_event_public_flag() from public, anon, authenticated;
revoke execute on function public_photos_of(uuid)      from public, anon, authenticated;

revoke execute on function public_event(text)                        from public;
revoke execute on function public_event_sessions(text)               from public;
revoke execute on function public_event_photos(text, uuid, int, int) from public;
revoke execute on function public_photo(uuid)                        from public;

grant execute on function public_event(text)                        to anon, authenticated, service_role;
grant execute on function public_event_sessions(text)               to anon, authenticated, service_role;
grant execute on function public_event_photos(text, uuid, int, int) to anon, authenticated, service_role;
grant execute on function public_photo(uuid)                        to anon, authenticated, service_role;
```

## Parte 2 — Teste pgTAP

Crie `supabase/tests/07_public_events.sql` com este conteúdo (22 asserções). Não altere nem
remova nenhum teste existente.

```sql
-- pgTAP — Evento público (migration 0007, docs/adr/0014).
-- O que precisa continuar verdade: anon só enxerga, pelas funções public_*,
-- foto de evento is_public que seja sem menores (respondido), não privada,
-- publicada e não excluída. E anon segue sem ler tabela nenhuma.

begin;

create extension if not exists pgtap;

select plan(22);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-00000000a001', 'authenticated', 'authenticated', 'test-public-admin@poiema.test', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-00000000a002', 'authenticated', 'authenticated', 'test-public-uploader@poiema.test', crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now());

update public.profiles set full_name = 'Admin Público',    role = 'admin',    is_active = true where id = 'a7000000-0000-0000-0000-00000000a001';
update public.profiles set full_name = 'Uploader Público', role = 'uploader', is_active = true where id = 'a7000000-0000-0000-0000-00000000a002';

insert into public.events (id, name, slug, event_date, created_by, is_public) values
  ('b7000000-0000-0000-0000-00000000b001', 'Aberto',   'aberto',   current_date, 'a7000000-0000-0000-0000-00000000a001', true),
  ('b7000000-0000-0000-0000-00000000b002', 'Fechado',  'fechado',  current_date, 'a7000000-0000-0000-0000-00000000a001', false),
  ('b7000000-0000-0000-0000-00000000b003', 'Excluído', 'excluido', current_date, 'a7000000-0000-0000-0000-00000000a001', true),
  ('b7000000-0000-0000-0000-00000000b004', 'Do uploader', 'do-uploader', current_date, 'a7000000-0000-0000-0000-00000000a002', false);
update public.events set deleted_at = now() where id = 'b7000000-0000-0000-0000-00000000b003';

insert into public.sessions (id, event_id, name, position, created_by) values
  ('c7000000-0000-0000-0000-00000000c001', 'b7000000-0000-0000-0000-00000000b001', 'Sessão I',  0, 'a7000000-0000-0000-0000-00000000a001'),
  ('c7000000-0000-0000-0000-00000000c002', 'b7000000-0000-0000-0000-00000000b001', 'Sessão II', 1, 'a7000000-0000-0000-0000-00000000a001');

insert into public.photos (id, event_id, session_id, uploaded_by, storage_key, web_key, thumb_key, contains_minors, is_private, status) values
  -- evento aberto
  ('d7000000-0000-0000-0000-00000000d001', 'b7000000-0000-0000-0000-00000000b001', 'c7000000-0000-0000-0000-00000000c001', 'a7000000-0000-0000-0000-00000000a001', 'o1', 'w1', 't1', false, false, 'skipped'),        -- pública
  ('d7000000-0000-0000-0000-00000000d002', 'b7000000-0000-0000-0000-00000000b001', 'c7000000-0000-0000-0000-00000000c002', 'a7000000-0000-0000-0000-00000000a001', 'o2', 'w2', 't2', false, false, 'indexed'),        -- pública
  ('d7000000-0000-0000-0000-00000000d003', 'b7000000-0000-0000-0000-00000000b001', 'c7000000-0000-0000-0000-00000000c001', 'a7000000-0000-0000-0000-00000000a001', 'o3', 'w3', 't3', true,  false, 'skipped'),        -- menores
  ('d7000000-0000-0000-0000-00000000d004', 'b7000000-0000-0000-0000-00000000b001', 'c7000000-0000-0000-0000-00000000c001', 'a7000000-0000-0000-0000-00000000a001', 'o4', 'w4', 't4', null,  false, 'pending_review'), -- não respondida
  ('d7000000-0000-0000-0000-00000000d005', 'b7000000-0000-0000-0000-00000000b001', 'c7000000-0000-0000-0000-00000000c001', 'a7000000-0000-0000-0000-00000000a001', 'o5', 'w5', 't5', false, true,  'indexed'),        -- privada
  ('d7000000-0000-0000-0000-00000000d006', 'b7000000-0000-0000-0000-00000000b001', 'c7000000-0000-0000-0000-00000000c001', 'a7000000-0000-0000-0000-00000000a001', 'o6', 'w6', 't6', false, false, 'pending_review'), -- em revisão
  ('d7000000-0000-0000-0000-00000000d007', 'b7000000-0000-0000-0000-00000000b001', 'c7000000-0000-0000-0000-00000000c001', 'a7000000-0000-0000-0000-00000000a001', 'o7', 'w7', 't7', false, false, 'indexed'),        -- excluída (abaixo)
  ('d7000000-0000-0000-0000-00000000d008', 'b7000000-0000-0000-0000-00000000b001', 'c7000000-0000-0000-0000-00000000c001', 'a7000000-0000-0000-0000-00000000a001', 'o8', 'w8', 't8', null,  false, 'indexed'),        -- nulo com status publicado
  -- evento fechado e evento excluído: fotos que seriam públicas
  ('d7000000-0000-0000-0000-00000000d009', 'b7000000-0000-0000-0000-00000000b002', null, 'a7000000-0000-0000-0000-00000000a001', 'o9', 'w9', 't9', false, false, 'indexed'),
  ('d7000000-0000-0000-0000-00000000d010', 'b7000000-0000-0000-0000-00000000b003', null, 'a7000000-0000-0000-0000-00000000a001', 'o10', 'w10', 't10', false, false, 'indexed');
update public.photos set deleted_at = now() where id = 'd7000000-0000-0000-0000-00000000d007';

-- ---------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok(
  $$ select 1 from public.photos $$, '42501', null,
  'anon continua sem ler a tabela photos'
);
select throws_ok(
  $$ select 1 from public.events $$, '42501', null,
  'anon continua sem ler a tabela events'
);
select throws_ok(
  $$ select 1 from public.sessions $$, '42501', null,
  'anon continua sem ler a tabela sessions'
);
select throws_ok(
  $$ select 1 from public.public_photos_of('b7000000-0000-0000-0000-00000000b001') $$, '42501', null,
  'anon não executa a função interna public_photos_of'
);

select is((select count(*)::int from public.public_event('aberto')), 1, 'anon lê evento público');
select is((select count(*)::int from public.public_event('fechado')), 0, 'anon não lê evento não público');
select is((select count(*)::int from public.public_event('excluido')), 0, 'anon não lê evento público excluído');
select is((select photo_count::int from public.public_event('aberto')), 2, 'contagem do evento só conta fotos públicas');

select results_eq(
  $$ select id from public.public_event_photos('aberto') order by id $$,
  $$ values ('d7000000-0000-0000-0000-00000000d001'::uuid), ('d7000000-0000-0000-0000-00000000d002'::uuid) $$,
  'anon vê só fotos sem menores, não privadas, publicadas e não excluídas'
);
select is(
  (select count(*)::int from public.public_event_photos('aberto') where id = 'd7000000-0000-0000-0000-00000000d003'),
  0, 'foto com contains_minors = true nunca é pública'
);
select is(
  (select count(*)::int from public.public_event_photos('aberto') where id = 'd7000000-0000-0000-0000-00000000d008'),
  0, 'foto com contains_minors nulo nunca é pública, mesmo com status publicado'
);
select is((select count(*)::int from public.public_event_photos('fechado')), 0, 'anon não lista fotos de evento não público');
select is((select count(*)::int from public.public_event_photos('excluido')), 0, 'anon não lista fotos de evento excluído');
select is(
  (select count(*)::int from public.public_event_photos('aberto', 'c7000000-0000-0000-0000-00000000c002')),
  1, 'filtro por sessão'
);
select is((select count(*)::int from public.public_event_photos('aberto', null, 100000, 0)), 2, 'p_limit acima do teto não quebra');

select results_eq(
  $$ select name, photo_count::int from public.public_event_sessions('aberto') $$,
  $$ values ('Sessão I', 1), ('Sessão II', 1) $$,
  'sessões em ordem, com contagem só das fotos públicas'
);

select is((select web_key from public.public_photo('d7000000-0000-0000-0000-00000000d001')), 'w1', 'public_photo devolve foto pública');
select is((select count(*)::int from public.public_photo('d7000000-0000-0000-0000-00000000d003')), 0, 'public_photo não devolve foto com menores');
select is((select count(*)::int from public.public_photo('d7000000-0000-0000-0000-00000000d009')), 0, 'public_photo não devolve foto de evento fechado');

-- ---------------------------------------------------------------
-- is_public só muda por admin
-- ---------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-00000000a002","role":"authenticated"}';

select throws_ok(
  $$ update public.events set is_public = true where id = 'b7000000-0000-0000-0000-00000000b004' $$,
  '42501', null,
  'uploader não abre o próprio evento ao público'
);
select throws_ok(
  $$ insert into public.events (name, slug, event_date, created_by, is_public)
     values ('Novo', 'novo-publico', current_date, 'a7000000-0000-0000-0000-00000000a002', true) $$,
  '42501', null,
  'uploader não cria evento já público'
);

set local request.jwt.claims to '{"sub":"a7000000-0000-0000-0000-00000000a001","role":"authenticated"}';
select lives_ok(
  $$ update public.events set is_public = true where id = 'b7000000-0000-0000-0000-00000000b002' $$,
  'admin abre evento ao público'
);

select * from finish();
rollback;
```

Rode `npx supabase db reset && npx supabase test db`. Os arquivos `00` a `06` e o `010`
têm de continuar passando sem edição. Se o `010_schema_guards.sql` acusar privilégio de
`anon` em tabela, a migration está errada: **não** relaxe o guarda.

Confira também, à mão, no stack local:

- com a `anon key`, `POST /rest/v1/rpc/public_event_photos` devolve só as fotos públicas de
  um evento público, e `GET /rest/v1/photos` continua negado;
- `select has_function_privilege('anon', 'public.public_photos_of(uuid)', 'execute')`
  devolve `false`. O Supabase concede `execute` a `anon` por default privileges em função
  nova, por isso os `revoke` da migration citam `anon` e `authenticated` pelo nome. Se der
  `true`, pare e me avise.

## Parte 3 — Documentação (mesmo PR)

1. **`docs/adr/0014-public-events.md`** (formato dos ADRs existentes). Contexto: primeira
   leitura sem login. Decisão: os cinco pontos de "O que foi decidido". Alternativas
   descartadas e por quê: (a) policies de `select` para `anon` nas tabelas, que exigiriam
   grant de tabela a `anon` e derrubariam o guarda; (b) a web ler com `service_role` e
   filtrar, que faria a web decidir visibilidade (CONTRATO §1). Consequências: o site
   público não mostra foto com menores, mesmo de evento público; `public_*` passam a ser
   superfície pública e qualquer coluna nova nelas pede revisão; indexação facial em evento
   público (ver CONTRATO §9 abaixo).
2. **`docs/adr/0002-migration-conventions.md`**: linha `0007` na tabela de ordinais.
3. **`docs/CONTRATO.md`**: versão **1.2**, nota "Mudanças da 1.1 para a 1.2", e a seção nova
   abaixo como **§9, depois das invariantes** (assim nenhuma referência a "§8" precisa
   mudar, nem aqui nem nos dois fronts).

   ```markdown
   ## 9. Evento público

   Um evento com `events.is_public = true` pode ser lido sem login. Só `admin` muda
   `is_public`.

   - O papel `anon` não lê tabela nenhuma. A leitura pública usa apenas as funções
     `public_event`, `public_event_sessions`, `public_event_photos` e `public_photo`.
   - A regra pública vive no core: evento público e não excluído; foto não excluída,
     publicada, **`contains_minors = false`** e não privada. Foto com menores nunca é
     pública.
   - A web pública só assina, no R2, chaves de linhas que essas funções devolveram, e só as
     variantes `web` e `thumb`. O original nunca é entregue ao visitante.
   - Envio e exclusão continuam exigindo login e seguem os §4, §7 e as invariantes.
   - Indexação facial: o site de um evento público pode publicar foto sem menores **sem**
     enfileirar `index_faces` (linha inserida com `status = 'skipped'`). Visitante de evento
     aberto não assinou o consentimento biométrico.
   ```

   Acrescente às invariantes do §8 uma décima: **"Foto com `contains_minors` verdadeiro ou nulo nunca é
   devolvida por função pública."**
4. **`CLAUDE.md` §1** e **`docs/ARQUITETURA.md`** (§1, §5 e o comentário "Sistema fechado"
   de §5.2): onde hoje diz que `anon` não tem acesso a nada, passe a dizer que `anon` não
   tem privilégio em **tabela** alguma e que existe uma única exceção de leitura, as funções
   `public_*` de evento público (ADR 0014). Em §5 da ARQUITETURA, documente as funções e o
   trigger. Em `CLAUDE.md` §8, some os cenários novos à lista de obrigatórios: "anon não lê
   foto com menores de evento público" e "uploader não torna evento público".
5. **`docs/ESTADO.md`**: registre a migration 0007 como escrita e **ainda não aplicada no
   remoto**.

O `CONTRATO.md` tem de ficar idêntico no `galeria-web`. Não mexa no outro repositório
daqui: deixe um `TODO(web)` no PR.

## Fora do escopo

Qualquer mudança em policy existente, em `search_faces`, no worker ou no serviço facial.
CORS do bucket (é outro PR, ver abaixo). Criar o evento GetUp no remoto (é passo manual).
Aplicar a migration no remoto (ADR 0013: workflow manual, com dry-run).

## Entrega

Branch `feat/public-events` a partir de `develop`; commits com escopo conforme o
`commitlint` do repo (`feat(db)`, `test(db)`, `docs(...)`); PR para `develop` com título em
Conventional Commits. No fim, me diga: a saída do `supabase test db`; o resultado das duas
conferências manuais da Parte 2; e qualquer trecho de `CLAUDE.md`/`ARQUITETURA.md` que ainda afirme "anon sem acesso" e você
tenha deixado de propósito.

---

## Antes de começar (João)

- Confirme que `develop` do core está igual ao `master` (hoje estão).
- Decisão já embutida neste prompt, para você vetar se discordar: **foto com criança ou
  adolescente não aparece no site público**, mesmo no GetUp. Se o GetUp tiver muito
  adolescente nas fotos, isso esvazia a galeria; mudar exige rever a regra número um e a
  LGPD, não só a migration.

## Depois do merge (João)

1. Aplicar a migration no remoto pelo workflow manual, com dry-run antes (ADR 0013).
2. Rodar no SQL Editor do Supabase, **trocando a data do evento**:

   ```sql
   -- Cria o evento GetUp 2026, já público, com as sessões I a V.
   -- Rodar UMA vez no SQL Editor do Supabase (como postgres), DEPOIS da
   -- migration 0007 do core (events.is_public). Pode rodar de novo sem duplicar.
   --
   -- ⚠️ Antes de rodar: troque a data do evento na linha marcada.
   
   with admin as (
     select id from public.profiles
      where role = 'admin' and is_active
      order by created_at
      limit 1
   ),
   ev as (
     insert into public.events (name, slug, event_date, created_by, is_public)
     select 'GetUp 2026', 'getup-2026',
            date '2026-01-01',          -- ⚠️ TROCAR pela data real do evento
            admin.id, true
       from admin
     on conflict (slug) do update set is_public = true
     returning id, created_by
   )
   insert into public.sessions (event_id, name, position, created_by)
   select ev.id, s.name, s.position, ev.created_by
     from ev,
          (values ('Sessão I', 0), ('Sessão II', 1), ('Sessão III', 2), ('Sessão IV', 3), ('Sessão V', 4))
            as s(name, position)
   on conflict (event_id, lower(btrim(name))) do nothing;
   
   -- Conferência: deve devolver o evento e as cinco sessões, em ordem.
   select * from public.public_event('getup-2026');
   select name, position from public.public_event_sessions('getup-2026');
   ```

3. **CORS do bucket `poiema-gallery`** (OpenTofu, PR separado no core): acrescentar a
   origem do site do GetUp em `AllowedOrigins`, com `PUT`, `GET`, `HEAD` e o header
   `content-type`. Sem isso o envio de fotos pelo site falha no preflight. É a mesma regra
   de `docs/r2-cors.md` do `galeria-web`.
4. Regenerar os tipos (`supabase gen types`) e copiar para `galeria-web` e `getup-gallery`
   (`lib/database.types.ts`; no `getup-gallery` o arquivo foi editado à mão para a 0007).
5. Copiar o `CONTRATO.md` 1.2 para o `galeria-web`.
