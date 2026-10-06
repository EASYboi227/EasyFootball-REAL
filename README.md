# EasyFootball Tournament Hub — Final

This is the final connected EasyFootball tournament site for the current Supabase project.

## Included
- Public tournament list + share link
- Admin email/password sign-in
- Create/delete tournaments
- Player limit enforced in the database
- Dark/light mode
- Knockout, League, Group Stage and Groups + Knockout formats
- Real knockout bracket: Quarter-Final → Semi-Final → Final
- Correct winner-to-next-match advancement (no random winner selection)
- Match-by-match 24-hour deadlines
- Admin can extend a match deadline by 24 hours
- Screenshot proof upload
- Admin can view, confirm or reject submitted results
- Confirmed knockout results automatically fill the exact next bracket slot
- Final winner automatically becomes Champion
- Public player view of fixtures/results

## Supabase setup
1. Open Supabase → SQL Editor.
2. Open `schema_FINAL.sql`.
3. Paste the whole file and click **Run**.
4. You do not need to save the query.
5. Do not run old migration files again.

## GitHub Pages
Upload/replace:
- `index.html`
- `style.css`
- `script.js`
- `config.js`

Keep the same `config.js` for the Supabase project already connected to the site.

## Test
Create a fresh 4-player Knockout tournament:
1. Start it.
2. You should immediately see Semi-Final 1, Semi-Final 2 and a waiting Final.
3. Confirm SF1: its winner fills one side of the Final.
4. Confirm SF2: its winner fills the other side and the Final gets a 24-hour deadline.
5. Confirm the Final: the tournament becomes COMPLETED and the winner is shown as Champion.

For 8 players the bracket is Quarter-Finals → Semi-Finals → Final.
