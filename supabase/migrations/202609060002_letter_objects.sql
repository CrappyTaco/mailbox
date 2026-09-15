-- Additive format upgrade. Legacy artwork and existing letter contents are preserved.
alter table public.letters drop constraint letters_artwork_shape;
alter table public.letters add constraint letters_artwork_shape check (
 artwork is null or (jsonb_typeof(artwork)='object' and artwork->>'version' in ('1','2')
 and jsonb_typeof(artwork->'strokes')='array' and octet_length(artwork::text)<=2100000)
);
