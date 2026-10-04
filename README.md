# EasyFootball Tournament Hub — Version 2

This is the upgraded shared-tournament build.

## What V2 adds
- Shared online tournaments through Supabase
- Admin sign-in
- Shareable tournament links
- Player joining
- Result submission + admin confirmation
- Live standings
- Proper knockout bracket logic in the app architecture
- League / group / hybrid support
- WhatsApp-friendly links
- Local demo mode when Supabase is not configured

## One-time setup
1. Create a free Supabase project.
2. Open SQL Editor and run `schema.sql`.
3. In Project Settings > API, copy the Project URL and anon public key.
4. Put them in `config.js`.
5. Upload all files to GitHub Pages.

Never put a Supabase service-role key in this website. Only use the public anon key.

## Important
The website code is ready, but a real shared database cannot be created inside your GitHub account automatically. Supabase project creation and its API values require your own account action.
