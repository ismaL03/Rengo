-- Version 4 : repère les positions approximatives (placées automatiquement, à vérifier sur place).
-- À coller dans Supabase > SQL Editor > New query > Run (relançable sans risque).
alter table tirelires add column if not exists position_approx boolean not null default false;

select count(*) filter (where lat is null) as sans_position,
       count(*) filter (where position_approx) as approximatives
from tirelires;
