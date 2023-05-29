# Developing

## Integrations

- [Supabase](https://supabase.io) for database, authentication and vector search
- [Hugging Face](https://huggingface.co) for embeddings. Even though we are using pre-generated embeddings, we are using the [Transformers](https://huggingface.co/transformers/) library to load them.
- [OpenAI](https://openai.com) for LLM models

## Initialization

1. Create new Supabase project at [https://app.supabase.io](https://app.supabase.io)
2. Create a new table called `posts` with the following schema:

```sql
-- Adapted from https://supabase.com/blog/openai-embeddings-postgres-vector
-- Enable the pgvector extension to work with embedding vectors
create extension vector;

-- Create a table to store your documents
create table documents (
  id bigserial primary key,
  content text, -- corresponds to Document.pageContent
  metadata jsonb, -- corresponds to Document.metadata
  embedding vector(384) -- We are using all-MiniLM-L6-v2 which generated embeddings in 384 dimensions https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
);

-- Create a function to search for documents
create function match_documents (
  query_embedding vector(384),
  match_count int,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```
