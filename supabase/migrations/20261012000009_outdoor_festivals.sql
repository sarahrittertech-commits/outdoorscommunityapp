-- Sarah, 12 October 2026: add outdoor music festivals to explore, because
-- they overlap with the board's activities (camping, paddling, riding,
-- hiking at the same weekend). A subcategory under Camping, for festivals
-- with camping or outdoor activities; plain concerts stay off the board.
insert into public.subcategories (category_id, slug, name, sort_order)
select c.id, 'outdoor-festivals', 'Outdoor & music festivals', 40
from public.categories c
where c.slug = 'camping'
on conflict do nothing;
