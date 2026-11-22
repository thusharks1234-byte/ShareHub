# ShareHub listing image bucket

Milestone 4 read-only inspection confirmed that the configured ShareHub project does not currently contain a `listing-images` bucket. No supported Storage bucket management operation is available through the connected Supabase tools, so this remains the only manual Storage setup step before photo uploads can succeed.

The connected Supabase integration in this workspace has no Storage bucket management operation. The core migration creates the `storage.objects` ownership policies but intentionally does not write to Supabase's internal `storage.buckets` table.

In the ShareHub Supabase project, use **Storage → New bucket** (or an authorized Storage Management API) to create:

- Bucket ID: `listing-images`
- Public bucket: enabled, for public listing photographs
- Maximum file size: 5 MB (`5242880` bytes)
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

Public buckets expose file downloads to anyone with the URL. Upload only photographs intended for public listing pages. Storage RLS still restricts upload, replacement, and deletion to the authenticated owner of the associated listing.

Use paths in this form: `user-id/listing-id/unique-image-name.webp`. The database migration limits each listing to five image metadata rows through unique display slots `0`–`4`. The Storage insert policy also requires a matching metadata row, so the client must reserve a slot in `listing_images` before uploading; if upload fails, remove the reserved row. For replacement, upload to a new unique path, update the metadata row, then delete the old object.

After bucket creation, confirm its public setting, size limit, and MIME allowlist in the Storage dashboard. Do not add service-role keys to Vite environment variables.
