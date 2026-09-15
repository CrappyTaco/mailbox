-- Preserve every legacy record; version 3 adds text ranges and page-local decoration indices.
alter table public.letters drop constraint letters_artwork_shape;
alter table public.letters add constraint letters_artwork_shape check (
 artwork is null or (jsonb_typeof(artwork)='object' and artwork->>'version' in ('1','2','3')
 and jsonb_typeof(artwork->'strokes')='array' and octet_length(artwork::text)<=2100000)
);
