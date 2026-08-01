# FOODIFY

A premium enterprise food marketplace platform built with Next.js, TypeScript, and Supabase.

## Environment variables

Set the following values in Vercel and your local environment:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPER_ADMIN_EMAIL (optional; defaults to `xengco09@gmail.com`) — the email
  that receives the `super_admin` role on sign-in.

## Deployment notes

- Connect the repository to Vercel
- Enable Supabase Auth OTP
- Apply the SQL schema from src/lib/supabase/schema.sql
- Configure storage bucket policies for uploads
