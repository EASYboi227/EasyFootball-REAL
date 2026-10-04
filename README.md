# EasyFootball Tournament Hub V3

## What changed
- Start Tournament locks the player list and generates fixtures.
- Knockout winners advance automatically; final crowns a champion.
- League finishes automatically and crowns the table leader.
- Groups and Groups + Knockout use group round-robin fixtures; hybrid qualifies the top 2 from each group into knockout.
- Results are submitted then confirmed by the admin.
- Public players cannot delete tournaments.
- Admin can delete owned tournaments.
- Dark/light mode works.

## Database
Run `schema_v3_migration.sql` once in the existing Supabase project. Do not rerun the original schema.
