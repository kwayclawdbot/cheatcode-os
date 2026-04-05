-- Semantic search function for content (used by Kai Chat + content search)
create or replace function match_content(
    query_embedding vector(1536),
    match_threshold float default 0.3,
    match_count int default 10
)
returns table (
    id uuid,
    title text,
    content_type text,
    external_url text,
    thumbnail_url text,
    duration_seconds int,
    quick_take text,
    key_insights jsonb,
    topics text[],
    themes text[],
    skill_level text,
    published_at timestamptz,
    curated_at timestamptz,
    creator_name text,
    creator_slug text,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        c.id,
        c.title,
        c.content_type,
        c.external_url,
        c.thumbnail_url,
        c.duration_seconds,
        c.quick_take,
        c.key_insights,
        c.topics,
        c.themes,
        c.skill_level,
        c.published_at,
        c.curated_at,
        cr.name as creator_name,
        cr.slug as creator_slug,
        1 - (c.embedding <=> query_embedding) as similarity
    from content c
    left join creators cr on c.creator_id = cr.id
    where c.is_published = true
      and c.embedding is not null
      and 1 - (c.embedding <=> query_embedding) > match_threshold
    order by c.embedding <=> query_embedding
    limit match_count;
end;
$$;
