# FOODIFY

A premium enterprise food marketplace platform built with Next.js, TypeScript, and Supabase.

## Environment variables

Set the following values in Vercel and your local environment:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPER_ADMIN_EMAIL — the email that receives the `super_admin` role on
  sign-in. There is no default: if it is unset, no account is auto-promoted.

## Deployment notes

- Connect the repository to Vercel
- Enable Supabase Auth OTP
- Apply the SQL schema from src/lib/supabase/schema.sql
- Configure storage bucket policies for uploads
