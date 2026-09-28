-- À coller dans Supabase > SQL Editor > New query > Run
create table if not exists tirelires (
  id            bigint generated always as identity primary key,
  entreprise    text not null,
  ville         text,
  adresse       text,
  lat           double precision,
  lng           double precision,
  date_pose     date not null default current_date,
  dernier_vidage date,
  notes         text,
  statut        text not null default 'en_place'
                check (statut in ('a_poser', 'en_place', 'refus', 'retiree')),
  contact_nom   text,
  contact_tel   text,
  horaires      text,
  notion_id     text unique,
  created_at    timestamptz not null default now()
);

-- Réglages partagés : seuils de couleur en mois
create table if not exists parametres (
  id                int primary key default 1 check (id = 1),
  seuil_orange_mois numeric not null default 3,
  seuil_rouge_mois  numeric not null default 5
);
insert into parametres (id) values (1) on conflict (id) do nothing;

-- Personne ne peut lire ces tables directement depuis le navigateur :
-- seul le site (via la clé "service_role", côté serveur) y a accès.
alter table tirelires enable row level security;
alter table parametres enable row level security;
