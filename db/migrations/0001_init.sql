-- Document Intelligence — initial schema
-- The {{EMBEDDING_DIMENSIONS}} token is substituted by scripts/migrate.mjs from
-- the EMBEDDING_DIMENSIONS env var so the vector column always matches the
-- configured embeddings model.

create extension if not exists vector;
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- One row per uploaded PDF.
create table documents (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  page_count   integer     not null default 0,
  byte_size    integer     not null default 0,
  status       text        not null default 'processing'
                 check (status in ('processing', 'ready', 'error')),
  error        text,
  created_at   timestamptz not null default now()
);

-- Raw PDF bytes, kept out of the main table. Served back to the browser so
-- react-pdf can render the real pages. No object storage / disk required.
create table document_files (
  document_id  uuid primary key references documents (id) on delete cascade,
  data         bytea not null
);

-- Extracted plain text, one row per page. Page numbers are 1-indexed.
create table pages (
  document_id  uuid    not null references documents (id) on delete cascade,
  page         integer not null,
  content      text    not null,
  primary key (document_id, page)
);

-- Overlapping text chunks with their embedding and source metadata.
create table chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid    not null references documents (id) on delete cascade,
  page          integer not null,
  chunk_index   integer not null,
  content       text    not null,
  embedding     vector({{EMBEDDING_DIMENSIONS}}) not null,
  created_at    timestamptz not null default now()
);

create index chunks_document_id_idx on chunks (document_id);

-- Approximate-nearest-neighbour index for cosine similarity.
create index chunks_embedding_idx
  on chunks
  using hnsw (embedding vector_cosine_ops);

-- Top-k similarity search, optionally scoped to a set of documents.
create or replace function match_chunks (
  query_embedding      vector({{EMBEDDING_DIMENSIONS}}),
  match_count          integer,
  filter_document_ids  uuid[] default null
)
returns table (
  chunk_id       uuid,
  document_id    uuid,
  document_name  text,
  page           integer,
  chunk_index    integer,
  content        text,
  similarity     double precision
)
language sql stable
as $$
  select
    c.id            as chunk_id,
    c.document_id,
    d.name          as document_name,
    c.page,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where d.status = 'ready'
    and (filter_document_ids is null or c.document_id = any (filter_document_ids))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
