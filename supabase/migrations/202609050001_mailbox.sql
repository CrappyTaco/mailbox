-- Apply once through the Supabase CLI. No browser role has access.
create table public.letters (
 id uuid primary key default gen_random_uuid(),
 sender text not null check (sender in ('indi','auggie')),
 recipient text not null check (recipient in ('indi','auggie')),
 body text not null check (char_length(btrim(body)) between 1 and 20000),
 created_at timestamptz not null default now(),
 delivered_at timestamptz not null default now(),
 read_at timestamptz,
 reply_to uuid references public.letters(id),
 client_id uuid not null,
 check (sender <> recipient),
 unique(sender,client_id)
);
create index letters_chronology on public.letters(created_at desc, id);
create index letters_incoming on public.letters(recipient,delivered_at desc);
create index letters_unread on public.letters(recipient,created_at desc) where read_at is null;
create table public.mailbox_world (
 singleton boolean primary key default true check (singleton),
 latest_id uuid references public.letters(id),
 established_at timestamptz not null default now()
);
insert into public.mailbox_world(singleton) values (true);
create table public.auth_attempts (key text primary key, attempts integer not null, expires_at timestamptz not null);
alter table public.letters enable row level security;
alter table public.mailbox_world enable row level security;
alter table public.auth_attempts enable row level security;
revoke all on public.letters,public.mailbox_world,public.auth_attempts from public,anon,authenticated;

create function public.mailbox_snapshot(p_owner text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if p_owner not in ('indi','auggie') then raise exception 'invalid_owner'; end if;
 select jsonb_build_object(
  'latest', case when l.id is null then null else to_jsonb(l) - 'client_id' end,
  'last_incoming_at',(select max(delivered_at) from public.letters where recipient=p_owner),
  'established_at',w.established_at
 ) into result from public.mailbox_world w left join public.letters l on l.id=w.latest_id;
 return result;
end $$;

create function public.send_letter(p_owner text, p_body text, p_reply_to uuid, p_client_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare previous public.letters; existing public.letters; written public.letters; current_id uuid;
begin
 if p_owner not in ('indi','auggie') or p_owner is null then raise exception 'invalid_owner'; end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 20000 then raise exception 'invalid_body'; end if;
 -- This row lock serializes sends from both people, including simultaneous first letters.
 select latest_id into current_id from public.mailbox_world where singleton=true for update;
 select * into existing from public.letters where sender=p_owner and client_id=p_client_id;
 if found then
  if existing.body <> btrim(p_body) or existing.reply_to is distinct from p_reply_to then raise exception 'idempotency_conflict'; end if;
  return to_jsonb(existing)-'client_id';
 end if;
 if current_id is not null then
  select * into previous from public.letters where id=current_id;
  if previous.sender=p_owner then raise exception 'waiting_for_reply'; end if;
  if previous.read_at is null then raise exception 'open_letter_first'; end if;
 end if;
 if p_reply_to is distinct from current_id then raise exception 'conversation_changed'; end if;
 insert into public.letters(sender,recipient,body,reply_to,client_id)
 values(p_owner,case when p_owner='indi' then 'auggie' else 'indi' end,btrim(p_body),p_reply_to,p_client_id)
 returning * into written;
 update public.mailbox_world set latest_id=written.id where singleton=true;
 return to_jsonb(written)-'client_id';
end $$;

create function public.read_letter(p_owner text,p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare letter public.letters;
begin
 update public.letters set read_at=coalesce(read_at,now()) where id=p_id and recipient=p_owner returning * into letter;
 if not found then raise exception 'letter_not_found'; end if;
 return to_jsonb(letter)-'client_id';
end $$;

create function public.take_auth_attempt(p_key text,p_limit integer,p_window integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
 delete from public.auth_attempts where expires_at < now();
 insert into public.auth_attempts(key,attempts,expires_at) values(p_key,1,now()+make_interval(secs=>p_window))
 on conflict(key) do update set attempts=public.auth_attempts.attempts+1
 returning attempts into total;
 return total<=p_limit;
end $$;
revoke all on function public.mailbox_snapshot(text),public.send_letter(text,text,uuid,uuid),public.read_letter(text,uuid),public.take_auth_attempt(text,integer,integer) from public,anon,authenticated;
grant execute on function public.mailbox_snapshot(text),public.send_letter(text,text,uuid,uuid),public.read_letter(text,uuid),public.take_auth_attempt(text,integer,integer) to service_role;

