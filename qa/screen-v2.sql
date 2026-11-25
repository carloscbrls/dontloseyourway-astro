-- DLYW Chapel forum — two-tier crisis screen (v2, 2026-11-25, Carlos approved).
-- v1 refused storage for ANY listed crisis term. v2 keeps the hard stop for
-- method content and present/imminent intent (TIER 1, never stored), and lets
-- crisis vocabulary in past-tense / survivor / third-person / help-seeking
-- framing land as PENDING with screen_flag='crisis_terms' for the human
-- moderator (TIER 2). Nothing publishes without a person approving it.
-- The page (src/pages/chapel.astro) implements the identical lists + algorithm.

-- 1. Moderator flag column (additive).
alter table public.dlyw_chapel_posts
  add column if not exists screen_flag text;
alter table public.dlyw_chapel_posts
  drop constraint if exists dlyw_chapel_posts_screen_flag_check;
alter table public.dlyw_chapel_posts
  add constraint dlyw_chapel_posts_screen_flag_check
  check (screen_flag is null or screen_flag = 'crisis_terms');

-- 2. Normalizer — mirrors the page's normalize(): lowercase, strip accents,
--    non-alphanumerics become spaces, runs collapse, trimmed.
create or replace function public.dlyw_chapel_norm(t text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    translate(lower(coalesce(t, '')),
      'áéíóúüñàèìòùâêîôûäëïöç',
      'aeiouunaeiouaeiouaeioc'),
    '[^a-z0-9]+', ' ', 'g'));
$$;

-- 3. Two-tier screen trigger (SECURITY DEFINER, as v1).
create or replace function public.dlyw_chapel_screen()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  hay text := ' ' || public.dlyw_chapel_norm(coalesce(new.body, '') || ' ' || coalesce(new.signoff, '')) || ' ';
  term text;
  -- TIER 1a: method content — never stored, whatever the tense or framing.
  method_terms text[] := array[
    'overdose','overdosed','slit my wrists','cut my wrists','hang myself',
    'hanged myself','shoot myself','shot myself','jump off a','jump off the',
    'jumped off a','jumped off the',
    'sobredosis','ahorcarme','colgarme','dispararme','cortarme las venas'
  ];
  -- Crisis vocabulary (a match starts the tier classification).
  crisis_terms text[] := array[
    'kill myself','suicide','suicidal','end my life','end it all',
    'want to die','self harm','cut myself','hurt myself','no reason to live',
    'suicidio','suicida','matarme','quitarme la vida','acabar con mi vida',
    'acabar con todo','hacerme dano','no quiero vivir','quiero morir',
    'quiero morirme'
  ];
  -- TIER 1b: present desire / intent / plan / farewell signals. Any one of
  -- these with crisis vocabulary present = hard stop, even with past framing
  -- ("last year I wanted to die, and tonight I want to die again").
  present_strong text[] := array[
    'want to die','want to kill myself','want to end my life',
    'going to kill','going to end it','going to end my life',
    'about to kill','about to end','i have a plan','my plan is',
    'plan to kill','plan to end','goodbye forever','saying goodbye',
    'last message','cant go on','cant do this anymore',
    'dont want to be here anymore','thinking about suicide',
    'thoughts of suicide','feeling suicidal','feel suicidal','i am suicidal','im suicidal',
    'quiero morir','quiero morirme','no quiero vivir','quiero matarme',
    'quiero acabar con mi vida','quiero terminar con mi vida',
    'voy a matarme','voy a quitarme la vida','voy a acabar con mi vida',
    'tengo un plan','mi plan es','ultimo mensaje',
    'ya no puedo mas','no puedo mas','pensando en el suicidio',
    'pensando en suicidarme','me siento suicida'
  ];
  -- Bare imminence markers: hard stop ONLY when no past framing is present.
  present_time text[] := array[
    'tonight','right now','today','esta noche','ahora mismo','hoy'
  ];
  -- Past-tense crisis phrases (testimony forms of the crisis vocabulary).
  past_forms text[] := array[
    'wanted to die','tried to kill myself','tried to end my life','ended it all',
    'tried to die','used to want to die','used to cut myself',
    'used to hurt myself',
    'quise morir','quise quitarme la vida','intente matarme',
    'intente quitarme la vida','intente suicidarme','pensaba en morir',
    'pensaba en el suicidio','queria morir','queria morirme'
  ];
  -- Past-framing context markers.
  past_markers text[] := array[
    'last year','last month','last week','last night','years ago',
    'months ago','back then','at the time','when i was','used to',
    'el ano pasado','el mes pasado','la semana pasada','anoche',
    'hace anos','hace meses','hace un ano','en ese momento','cuando tenia'
  ];
  crisis_hit boolean := false;
  past_framing boolean := false;
begin
  -- Tier 1a: method content.
  foreach term in array method_terms loop
    if position(' ' || term || ' ' in hay) > 0 then
      raise exception 'screened: crisis content is never stored' using errcode = 'P0001';
    end if;
  end loop;

  -- Crisis vocabulary present? (Past-tense forms count as crisis vocabulary
  -- too — they are what gets a testimony post its moderator flag.)
  foreach term in array crisis_terms loop
    if position(' ' || term || ' ' in hay) > 0 then
      crisis_hit := true;
      exit;
    end if;
  end loop;
  if not crisis_hit then
    foreach term in array past_forms loop
      if position(' ' || term || ' ' in hay) > 0 then
        crisis_hit := true;
        exit;
      end if;
    end loop;
  end if;

  if crisis_hit then
    -- Tier 1b: present desire / intent / plan / farewell.
    foreach term in array present_strong loop
      if position(' ' || term || ' ' in hay) > 0 then
        raise exception 'screened: crisis content is never stored' using errcode = 'P0001';
      end if;
    end loop;
    -- Past framing?
    foreach term in array past_forms loop
      if position(' ' || term || ' ' in hay) > 0 then
        past_framing := true;
        exit;
      end if;
    end loop;
    if not past_framing then
      foreach term in array past_markers loop
        if position(' ' || term || ' ' in hay) > 0 then
          past_framing := true;
          exit;
        end if;
      end loop;
    end if;
    -- Tier 1c: bare imminence with no past framing.
    if not past_framing then
      foreach term in array present_time loop
        if position(' ' || term || ' ' in hay) > 0 then
          raise exception 'screened: crisis content is never stored' using errcode = 'P0001';
        end if;
      end loop;
    end if;
    -- Tier 2: testimony — stored pending, flagged for the moderator.
    new.screen_flag := 'crisis_terms';
  else
    new.screen_flag := null;
  end if;

  -- One level of replies only (unchanged from v1).
  if new.parent_id is not null and exists (
    select 1 from public.dlyw_chapel_posts p
    where p.id = new.parent_id and p.parent_id is not null
  ) then
    raise exception 'replies nest one level only';
  end if;
  return new;
end $function$;

-- 4. Moderation queue view: same columns, plus the flag (appended last so
--    CREATE OR REPLACE stays valid).
create or replace view public.dlyw_chapel_moderation_queue as
  select p.id, p.created_at, p.room, p.body, p.signoff, p.parent_id,
         parent.body as parent_body, parent.signoff as parent_signoff,
         p.screen_flag
  from public.dlyw_chapel_posts p
  left join public.dlyw_chapel_posts parent on parent.id = p.parent_id
  where p.status = 'pending'
  order by p.created_at;
