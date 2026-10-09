-- FR-GR-23: a group's own website, set by its owner and admins and shown on
-- the group page. Until now the only link was source_url, which belongs to an
-- unclaimed listing and disappeared from the page once the group was claimed.

alter table public.groups
  add column website text
    check (website ~ '^https?://[^\s]+$' and char_length(website) <= 500);

comment on column public.groups.website is
  'FR-GR-23: the group''s own website, shown on its page. Set by owner and admins.';

-- Owners and admins edit it under the existing update policy.
grant update (website) on public.groups to authenticated;

-- Groups listed from public information keep their link once claimed.
update public.groups set website = source_url where website is null and source_url is not null;
