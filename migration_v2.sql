-- Version 2 : réglages partagés (seuils de couleur).
-- À coller dans Supabase > SQL Editor > New query > Run (une seule fois, relançable sans risque).
create table if not exists parametres (
  id                int primary key default 1 check (id = 1),
  seuil_orange_mois numeric not null default 3,
  seuil_rouge_mois  numeric not null default 5
);
insert into parametres (id) values (1) on conflict (id) do nothing;
alter table parametres enable row level security;

select * from parametres;
