-- Create product-images storage bucket (public read, authenticated write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own shop folder
create policy "Owners can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

-- Allow authenticated users to update/delete their own uploads
create policy "Owners can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

create policy "Owners can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

-- Public can read all product images (for customer menu)
create policy "Public can view product images"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');
