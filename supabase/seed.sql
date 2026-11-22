insert into public.categories (name, slug, description, icon) values
  ('Electronics & Gadgets', 'electronics-gadgets', 'Cameras, audio, and everyday tech.', 'laptop'),
  ('Tools & Equipment', 'tools-equipment', 'Useful tools for home and hands-on projects.', 'wrench'),
  ('Books & Study Materials', 'books-study-materials', 'Books and supplies for learning.', 'book-open'),
  ('Sports & Fitness', 'sports-fitness', 'Gear for movement, training, and play.', 'dumbbell'),
  ('Outdoor & Camping', 'outdoor-camping', 'Equipment for weekends outside.', 'tent-tree'),
  ('Home & Kitchen', 'home-kitchen', 'Practical essentials for home and cooking.', 'house'),
  ('Events & Party Equipment', 'events-party-equipment', 'Items for gatherings and celebrations.', 'party-popper'),
  ('Other Items', 'other-items', 'More useful things shared locally.', 'boxes')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon;
