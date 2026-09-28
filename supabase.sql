-- À coller dans Supabase > SQL Editor > New query > Run
create table if not exists tirelires (
  id            bigint generated always as identity primary key,
  entreprise    text not null,
  ville         text,
  adresse       text,
  lat           double precision not null,
  lng           double precision not null,
  date_pose     date not null default current_date,
  dernier_vidage date,
  notes         text,
  created_at    timestamptz not null default now()
);

-- Personne ne peut lire la table directement depuis le navigateur :
-- seul le site (via la clé "service_role", côté serveur) y a accès.
alter table tirelires enable row level security;
