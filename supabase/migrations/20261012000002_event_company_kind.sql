-- UC-37, 12 October 2026: race and event companies (Bodies Race Company,
-- Rattler Racing, Epic Rides) run public events but are not guides, shops
-- or venues. They list as a fourth kind, shown as "event company".
alter table public.businesses drop constraint businesses_kind_check;
alter table public.businesses add constraint businesses_kind_check check (kind in ('guide', 'shop', 'venue', 'company'));
