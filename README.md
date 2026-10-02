# getup-gallery

Site público de fotos de **um evento** (GetUp 2026, sessões I a V) sobre o
core da galeria Poiema (`poiema-gallery`: Supabase + R2). É um app separado
do `galeria-web`, de propósito pequeno:

- **Visitante, sem login:** vê as fotos por sessão, abre em tela cheia e baixa
  a versão web (2048 px, WebP).
- **Admin, com login:** as mesmas telas, mais **Enviar fotos** e **excluir**
  em cada foto. Nada além disso.

## Identidade visual

Segue o Figma "POIEMA GALLERY": fundo escuro, laranja de destaque, galeria em
colunas com a proporção real de cada foto. As cores ficam num bloco só, no
topo de `app/globals.css`. O logotipo (`components/brand/Wordmark.tsx`) é
composto em tipografia; troque pelo SVG oficial quando tiver o arquivo.

## O que o core precisa ter antes

1. **Migration 0007** (arquivos e prompt em `docs/core/`) (`events.is_public` + funções `public_event`,
   `public_event_sessions`, `public_event_photos`, `public_photo`) aplicada.
   Sem ela a página abre vazia ("As fotos ainda estão a caminho").
2. **O evento criado e público:** rode `docs/seed-getup-2026.sql` no SQL Editor
   (troque a data antes). Cria o evento `getup-2026` e as cinco sessões.
3. **CORS do bucket** liberando `PUT`, `GET`, `HEAD` e o header `content-type`
   para a origem deste site (e `http://localhost:3000` no bucket de dev). Sem
   isso o envio de fotos morre no preflight.
4. Uma conta **admin ativa** (as mesmas do `galeria-web`).

## Rodar

```bash
cp .env.example .env.local   # preencha
npm install
npm run dev
```

Checagens: `npm run lint`, `npm test`, `npm run typecheck`, `npm run build`.

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | leitura pública e login |
| `SUPABASE_SERVICE_ROLE_KEY` | só para inserir em `jobs` (servidor) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | assinar leitura e envio |
| `EVENT_SLUG` | evento que o site mostra (padrão `getup-2026`) |
| `INDEX_FACES` | `true` enfileira indexação facial (padrão `false`) |
| `NEXT_PUBLIC_SITE_URL` | URL do site |

Deploy: Vercel, região `gru1` (`vercel.json`), com as variáveis acima.

## Como a visibilidade é decidida

Este app **não filtra foto nenhuma** (CONTRATO §1). Quem decide é o banco:

- Visitante lê só pelas funções `public_*`. Elas devolvem apenas foto de
  evento `is_public`, com `contains_minors = false`, não privada, publicada e
  não excluída. O papel `anon` continua sem ler tabela alguma.
- Admin lê as tabelas com o próprio JWT (RLS do core). Ele vê também as fotos
  que o público não vê; a tela marca essas com "Não pública".
- O bucket é privado. O servidor assina só linhas que o banco acabou de
  devolver: `thumb` e `web` para exibir (30 min), `web` com anexo para baixar
  (60 s). O original nunca é assinado.

**Foto com criança ou adolescente nunca aparece na página pública.** No envio
o admin responde "Sim" ou "Não" para o lote, sem valor padrão. "Sim" guarda a
foto, mas ela fica fora do site.

## Envio e exclusão

Mesmo fluxo do `galeria-web`: o navegador converte para WebP (original, web,
thumb), sem EXIF; o servidor gera o id e as chaves (CONTRATO §7) e assina o
`PUT`; a linha em `photos` só nasce depois que os três arquivos estão no R2,
inserida com o JWT do admin.

Excluir faz `DELETE` em `photos` com o JWT do admin (policy `delete photos`,
só admin) e enfileira `delete_objects` com as chaves da linha.

### Indexação facial

Com `INDEX_FACES=false` (padrão) as fotos entram como `skipped`: publicadas,
sem job `index_faces`. Motivo: quem vai a um evento aberto não assinou o
consentimento biométrico dos membros. Ligar é trocar a variável; as fotos já
enviadas não são reindexadas sozinhas.

## Diferenças para o galeria-web

- `lib/database.types.ts` foi editado à mão para a migration 0007. Regenere a
  partir do core depois que ela for aplicada.
- Sem husky/commitlint e sem as telas de membro (convite, busca, privacidade).
- `R2_ENDPOINT` (opcional) aponta para um S3 local em desenvolvimento.
