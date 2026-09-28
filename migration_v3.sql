-- Version 3 : statut de la tirelire + contact du commerçant.
-- À coller dans Supabase > SQL Editor > New query > Run (relançable sans risque).

-- Statut : à poser (repérée), en place, refus, retirée. Les tirelires existantes passent « en place ».
alter table tirelires add column if not exists statut text not null default 'en_place';
alter table tirelires drop constraint if exists tirelires_statut_check;
alter table tirelires add constraint tirelires_statut_check
  check (statut in ('a_poser', 'en_place', 'refus', 'retiree'));

-- Contact du commerçant
alter table tirelires add column if not exists contact_nom text;
alter table tirelires add column if not exists contact_tel text;
alter table tirelires add column if not exists horaires text;

select statut, count(*) from tirelires group by statut;
