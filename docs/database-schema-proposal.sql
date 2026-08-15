-- Review-only schema proposal for MVP 2.
-- Validate this on a dedicated development database before generating a migration.

create extension if not exists postgis with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.organizations (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> ''),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id bigint not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.projects (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  description text,
  municipality_name text,
  timezone text not null default 'Asia/Tokyo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.trees (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  project_id bigint not null,
  external_tree_id text not null check (btrim(external_tree_id) <> ''),
  location extensions.geography(point, 4326) not null,
  species_original text,
  japanese_name text,
  scientific_name text,
  i_tree_species_code text,
  land_use text,
  status text not null default 'active' check (btrim(status) <> ''),
  custom_values jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_values) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (project_id, external_tree_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade
);

create table public.tree_surveys (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  tree_id bigint not null,
  surveyed_at date not null,
  dbh_cm numeric(8, 2) check (dbh_cm > 0),
  dbh_measurement_height_m numeric(6, 2) check (dbh_measurement_height_m > 0),
  total_height_m numeric(7, 2) check (total_height_m > 0),
  crown_base_height_m numeric(7, 2) check (crown_base_height_m >= 0),
  crown_width_ns_m numeric(7, 2) check (crown_width_ns_m >= 0),
  crown_width_ew_m numeric(7, 2) check (crown_width_ew_m >= 0),
  crown_missing_pct numeric(5, 2) check (crown_missing_pct between 0 and 100),
  dieback_pct numeric(5, 2) check (dieback_pct between 0 and 100),
  crown_light_exposure smallint check (crown_light_exposure between 0 and 5),
  health_condition text not null default 'unknown'
    check (health_condition in ('good', 'fair', 'poor', 'critical', 'dead', 'unknown')),
  notes text,
  custom_values jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_values) = 'object'),
  surveyed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tree_id, organization_id)
    references public.trees(id, organization_id) on delete cascade
);

create table public.custom_field_definitions (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  project_id bigint not null,
  scope text not null check (scope in ('tree', 'survey')),
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (btrim(label) <> ''),
  field_type text not null check (field_type in ('text', 'number', 'boolean', 'date', 'select')),
  unit text,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  is_required boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, scope, field_key),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade
);

create index organizations_created_by_idx on public.organizations (created_by);
create index organization_members_user_id_idx on public.organization_members (user_id);
create index projects_organization_id_idx on public.projects (organization_id);
create index trees_organization_id_idx on public.trees (organization_id);
create index trees_project_status_idx on public.trees (project_id, status);
create index trees_project_organization_idx on public.trees (project_id, organization_id);
create index trees_location_idx on public.trees using gist (location);
create index tree_surveys_organization_id_idx on public.tree_surveys (organization_id);
create index tree_surveys_tree_latest_idx on public.tree_surveys (tree_id, surveyed_at desc, id desc);
create index tree_surveys_tree_organization_idx on public.tree_surveys (tree_id, organization_id);
create index tree_surveys_surveyed_by_idx on public.tree_surveys (surveyed_by);
create index custom_fields_organization_id_idx on public.custom_field_definitions (organization_id);
create index custom_fields_project_scope_active_idx
  on public.custom_field_definitions (project_id, scope, is_active);
create index custom_fields_project_organization_idx
  on public.custom_field_definitions (project_id, organization_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();
create trigger projects_set_updated_at
before update on public.projects
for each row execute function private.set_updated_at();
create trigger trees_set_updated_at
before update on public.trees
for each row execute function private.set_updated_at();
create trigger tree_surveys_set_updated_at
before update on public.tree_surveys
for each row execute function private.set_updated_at();
create trigger custom_fields_set_updated_at
before update on public.custom_field_definitions
for each row execute function private.set_updated_at();

create or replace function private.is_organization_member(target_organization_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = target_organization_id
        and membership.user_id = (select auth.uid())
    );
$$;

create or replace function private.is_organization_owner(target_organization_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.organizations organization
      where organization.id = target_organization_id
        and organization.created_by = (select auth.uid())
    );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.is_organization_member(bigint) from public, anon;
revoke all on function private.is_organization_owner(bigint) from public, anon;
grant execute on function private.is_organization_member(bigint) to authenticated;
grant execute on function private.is_organization_owner(bigint) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.trees enable row level security;
alter table public.tree_surveys enable row level security;
alter table public.custom_field_definitions enable row level security;

create policy organizations_select on public.organizations
for select to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_organization_member(id))
);
create policy organizations_insert on public.organizations
for insert to authenticated
with check (created_by = (select auth.uid()));
create policy organizations_update on public.organizations
for update to authenticated
using ((select private.is_organization_owner(id)))
with check (created_by = (select auth.uid()));
create policy organizations_delete on public.organizations
for delete to authenticated
using ((select private.is_organization_owner(id)));

create policy organization_members_select on public.organization_members
for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy organization_members_insert on public.organization_members
for insert to authenticated
with check ((select private.is_organization_owner(organization_id)));
create policy organization_members_update on public.organization_members
for update to authenticated
using ((select private.is_organization_owner(organization_id)))
with check ((select private.is_organization_owner(organization_id)));
create policy organization_members_delete on public.organization_members
for delete to authenticated
using ((select private.is_organization_owner(organization_id)));

create policy projects_select on public.projects
for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy projects_insert on public.projects
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));
create policy projects_update on public.projects
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));
create policy projects_delete on public.projects
for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create policy trees_select on public.trees
for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy trees_insert on public.trees
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));
create policy trees_update on public.trees
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));
create policy trees_delete on public.trees
for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create policy tree_surveys_select on public.tree_surveys
for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy tree_surveys_insert on public.tree_surveys
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));
create policy tree_surveys_update on public.tree_surveys
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));
create policy tree_surveys_delete on public.tree_surveys
for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create policy custom_fields_select on public.custom_field_definitions
for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy custom_fields_insert on public.custom_field_definitions
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));
create policy custom_fields_update on public.custom_field_definitions
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));
create policy custom_fields_delete on public.custom_field_definitions
for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create view public.tree_inventory
with (security_invoker = true)
as
select
  tree.id,
  tree.organization_id,
  tree.project_id,
  tree.external_tree_id,
  extensions.st_y(tree.location::extensions.geometry) as latitude,
  extensions.st_x(tree.location::extensions.geometry) as longitude,
  tree.species_original,
  tree.japanese_name,
  tree.scientific_name,
  tree.i_tree_species_code,
  tree.land_use,
  tree.status,
  tree.custom_values as tree_custom_values,
  latest_survey.id as latest_survey_id,
  latest_survey.surveyed_at,
  latest_survey.dbh_cm,
  latest_survey.dbh_measurement_height_m,
  latest_survey.total_height_m,
  latest_survey.crown_base_height_m,
  latest_survey.crown_width_ns_m,
  latest_survey.crown_width_ew_m,
  latest_survey.crown_missing_pct,
  latest_survey.dieback_pct,
  latest_survey.crown_light_exposure,
  latest_survey.health_condition,
  latest_survey.notes,
  latest_survey.custom_values as survey_custom_values
from public.trees tree
left join lateral (
  select survey.*
  from public.tree_surveys survey
  where survey.tree_id = tree.id
  order by survey.surveyed_at desc, survey.id desc
  limit 1
) latest_survey on true;

revoke all on public.organizations from anon;
revoke all on public.organization_members from anon;
revoke all on public.projects from anon;
revoke all on public.trees from anon;
revoke all on public.tree_surveys from anon;
revoke all on public.custom_field_definitions from anon;
revoke all on public.tree_inventory from anon;

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.trees to authenticated;
grant select, insert, update, delete on public.tree_surveys to authenticated;
grant select, insert, update, delete on public.custom_field_definitions to authenticated;
grant select on public.tree_inventory to authenticated;
grant usage, select on sequence public.organizations_id_seq to authenticated;
grant usage, select on sequence public.projects_id_seq to authenticated;
grant usage, select on sequence public.trees_id_seq to authenticated;
grant usage, select on sequence public.tree_surveys_id_seq to authenticated;
grant usage, select on sequence public.custom_field_definitions_id_seq to authenticated;
