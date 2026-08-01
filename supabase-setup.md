# Supabase setup

1. Create a Supabase project.
2. In Project Settings → API, copy:
   - Project URL
   - anon public key
   - service role key
3. Add these environment variables to Vercel and your local environment:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPER_ADMIN_EMAIL (optional; defaults to `xengco09@gmail.com`). The email
     that should receive the `super_admin` role on first sign-in.
4. In Authentication → Providers, enable Email OTP.
5. In SQL Editor, run the contents of src/lib/supabase/schema.sql.
6. In Storage, create a bucket for marketplace assets and set policies for public reads if needed.

# Google Drive storage

Google Drive is not a native Supabase storage backend. For this project, use one of these options:

- Supabase Storage bucket for app uploads and assets
- Google Drive API integration for file syncing if you need Drive specifically

If you want Drive-specific storage, I can add a server route that uploads files to Google Drive using the Google Drive API next.
