-- Transaction-only fixture: the runner redirects the candidate function to these temp tables.
create temp table sos_lost (
  alert_slug text, status text default 'active', pet_name text default 'QA pet',
  pet_species text default 'dog', last_seen_city text default 'QA city',
  last_seen_at timestamptz default '2026-09-20T00:00:00Z',
  public_latitude double precision default 8, public_longitude double precision default -80,
  share_enabled boolean default true, public_location_visible boolean default true,
  expires_at timestamptz default now()+interval '1 day',
  public_geo_point extensions.geography(Point,4326) generated always as
    (extensions.st_setsrid(extensions.st_makepoint(public_longitude,public_latitude),4326)::extensions.geography) stored
) on commit drop;
create temp table sos_seen (
  report_slug text, status text default 'sighting_open', animal_species text default 'dog',
  city text default 'QA city', sighted_at timestamptz default '2026-09-20T00:00:00Z',
  public_latitude double precision default 8, public_longitude double precision default -80,
  share_enabled boolean default true, public_location_visible boolean default true,
  expires_at timestamptz default now()+interval '1 day',
  public_geo_point extensions.geography(Point,4326) generated always as
    (extensions.st_setsrid(extensions.st_makepoint(public_longitude,public_latitude),4326)::extensions.geography) stored
) on commit drop;
create index sos_lost_geo on sos_lost using gist(public_geo_point) where public_location_visible;
create index sos_seen_geo on sos_seen using gist(public_geo_point) where public_location_visible;
insert into sos_lost(alert_slug) values('a'),('b');
insert into sos_lost(alert_slug,public_latitude) values('outside',40);
insert into sos_lost(alert_slug,public_location_visible) values('private',false);
insert into sos_lost(alert_slug,share_enabled) values('unshared',false);
insert into sos_lost(alert_slug,status) values('flagged','flagged'),('recovered','found');
insert into sos_lost(alert_slug,expires_at) values('expired',now()-interval '1 day');
insert into sos_lost(alert_slug,public_longitude) values('east',179.5),('west',-179.5);
insert into sos_seen(report_slug,status) values('sheltered','sheltered_by_reporter'),('reunited','reunited');
create temp table sos_checks(name text, passed boolean) on commit drop;

do $tests$
declare n integer;
begin
  select count(*) into n from public.list_public_pet_sos_map_events(7,-81,10,-77);
  assert n=3, 'Active feed must exclude private, terminal, expired and outside events';
  insert into sos_checks values('Active/public/expiry/bounds filters',true);
  select count(*) into n from public.list_public_pet_sos_map_events(7,-81,10,-77,'found');
  assert n=2, 'Recovered filter differs from sheltered';
  insert into sos_checks values('Recovered distinct from sheltered',true);
  select count(*) into n from public.list_public_pet_sos_map_events(7,-81,10,-77,'seen');
  assert n=1, 'Seen category';
  insert into sos_checks values('Seen category',true);
  select count(*) into n from public.list_public_pet_sos_map_events(7,-81,10,-77,'all','cat');
  assert n=0, 'Species filter';
  insert into sos_checks values('Species filter',true);
  select count(*) into n from public.list_public_pet_sos_map_events(7,-81,10,-77,'all',null,'2027-01-01');
  assert n=0, 'Time filter';
  insert into sos_checks values('Time filter',true);
  select count(*) into n from public.list_public_pet_sos_map_events(7,179,10,-179);
  assert n=2, 'Antimeridian';
  insert into sos_checks values('Antimeridian',true);
  select count(*) into n from public.list_public_pet_sos_map_events(7,180,10,-179);
  assert n=1, '180 boundary normalization';
  insert into sos_checks values('Longitude endpoint normalization',true);
  select count(*) into n from public.list_public_pet_sos_map_events(7,-81,10,-77,'all',null,null,1);
  assert n=2, 'Bounded lookahead';
  insert into sos_checks values('One additional row signals pagination',true);
  select count(*) into n from public.list_public_pet_sos_map_events(7,-81,10,-77,'all',null,null,1,'2026-09-20T00:00:00Z','lost_pet','a');
  assert n=1, 'Keyset skips already returned events with equal timestamps';
  insert into sos_checks values('Stable equal-timestamp cursor',true);
  begin
    perform public.list_public_pet_sos_map_events(null,-81,10,-77);
    raise exception 'Expected missing bounds failure';
  exception when others then if sqlerrm <> 'PET_SOS_MAP_BOUNDS_INVALID' then raise; end if; end;
  insert into sos_checks values('Missing bounds rejected in backend',true);
  begin
    perform public.list_public_pet_sos_map_events(7,-81,10,'NaN'::double precision);
    raise exception 'Expected NaN failure';
  exception when others then if sqlerrm <> 'PET_SOS_MAP_BOUNDS_INVALID' then raise; end if; end;
  insert into sos_checks values('NaN rejected in backend',true);
  begin
    perform public.list_public_pet_sos_map_events(-90,-180,90,180);
    raise exception 'Expected global scan failure';
  exception when others then if sqlerrm <> 'PET_SOS_MAP_BOUNDS_INVALID' then raise; end if; end;
  insert into sos_checks values('Unbounded/global scan rejected',true);
  begin
    perform public.list_public_pet_sos_map_events(7,-81,10,-77,'all',null,null,201);
    raise exception 'Expected limit failure';
  exception when others then if sqlerrm <> 'PET_SOS_MAP_FILTER_INVALID' then raise; end if; end;
  insert into sos_checks values('Oversized result limit rejected',true);
  begin
    perform public.list_public_pet_sos_map_events(7,-81,10,-77,'all',null,null,100,now(),null,null);
    raise exception 'Expected partial cursor failure';
  exception when others then if sqlerrm <> 'PET_SOS_MAP_CURSOR_INVALID' then raise; end if; end;
  insert into sos_checks values('Partial cursor rejected',true);
end;
$tests$;

-- Uniform synthetic distribution: planner must choose the spatial index naturally.
insert into sos_lost(alert_slug,public_latitude,public_longitude)
select 'load-'||g, -75+(g%150), -170+(g%340) from generate_series(1,10000) g;
analyze sos_lost;
create temp table sos_plan(value json) on commit drop;
do $plan$
declare result json;
begin
  execute 'explain (analyze, buffers, format json) select alert_slug from pg_temp.sos_lost
    where public_location_visible and public_geo_point operator(extensions.&&)
    extensions.st_makeenvelope(-81,7,-77,10,4326)::extensions.geography'
    into result;
  insert into sos_plan values(result);
  assert result::text like '%sos_lost_geo%', 'Spatial index not used';
  insert into sos_checks values('GiST used with 10k synthetic rows (no forced planner)',true);
end;
$plan$;
