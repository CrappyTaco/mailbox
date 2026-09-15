-- Additive upgrade: existing letters and their read timestamps remain intact.
alter table public.letters add column artwork jsonb;
alter table public.letters add constraint letters_artwork_shape check (
 artwork is null or (jsonb_typeof(artwork)='object' and artwork->>'version'='1'
 and jsonb_typeof(artwork->'strokes')='array' and octet_length(artwork::text)<=300000)
);

create or replace function public.mailbox_snapshot(p_owner text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if p_owner not in ('indi','auggie') or p_owner is null then raise exception 'invalid_owner'; end if;
 select jsonb_build_object(
  'latest', case when l.id is null then null else to_jsonb(l)-'client_id' end,
  'received', (select to_jsonb(r)-'client_id' from public.letters r where r.recipient=p_owner order by r.created_at desc,r.id desc limit 1),
  'last_incoming_at',(select max(delivered_at) from public.letters where recipient=p_owner),
  'established_at',w.established_at
 ) into result from public.mailbox_world w left join public.letters l on l.id=w.latest_id;
 return result;
end $$;

create function public.send_letter(p_owner text, p_body text, p_reply_to uuid, p_client_id uuid, p_artwork jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare previous public.letters; existing public.letters; written public.letters; current_id uuid;
begin
 if p_owner not in ('indi','auggie') or p_owner is null then raise exception 'invalid_owner'; end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 20000 then raise exception 'invalid_body'; end if;
 select latest_id into current_id from public.mailbox_world where singleton=true for update;
 select * into existing from public.letters where sender=p_owner and client_id=p_client_id;
 if found then
  if existing.body <> btrim(p_body) or existing.reply_to is distinct from p_reply_to or existing.artwork is distinct from p_artwork then raise exception 'idempotency_conflict'; end if;
  return to_jsonb(existing)-'client_id';
 end if;
 if current_id is not null then
  select * into previous from public.letters where id=current_id;
  if previous.sender=p_owner then raise exception 'waiting_for_reply'; end if;
  if previous.read_at is null then raise exception 'open_letter_first'; end if;
 end if;
 if p_reply_to is distinct from current_id then raise exception 'conversation_changed'; end if;
 insert into public.letters(sender,recipient,body,reply_to,client_id,artwork)
 values(p_owner,case when p_owner='indi' then 'auggie' else 'indi' end,btrim(p_body),p_reply_to,p_client_id,p_artwork)
 returning * into written;
 update public.mailbox_world set latest_id=written.id where singleton=true;
 return to_jsonb(written)-'client_id';
end $$;

-- Retain the previous RPC signature for existing clients and saved plain-text letters.
create or replace function public.send_letter(p_owner text, p_body text, p_reply_to uuid, p_client_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
 select public.send_letter(p_owner,p_body,p_reply_to,p_client_id,null::jsonb);
$$;
revoke all on function public.send_letter(text,text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.send_letter(text,text,uuid,uuid,jsonb) to service_role;
