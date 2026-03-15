# Brooklyn Toddler Activities

Weekly weekend picks for toddler + parent outings near Brooklyn, sorted by estimated public-transit time from Central Ave & Menahan St.

## What this does

- Publishes each issue to GitHub Pages at `/toddler-activities-YYYY-MM-DD/`
- Uses the Saturday date for each weekend
- Generates a fresh issue every Thursday at 5:00pm America/New_York
- Sends the published link to David on Telegram after each run

## Local commands

```bash
npm run publish:week -- --date 2026-03-14
npm run publish:week
```

## Structure

- `data/activities.json` — curated recurring destinations
- `scripts/build-site.mjs` — static site generator
- `scripts/publish-week.mjs` — publishes one issue and updates index
- `docs/` — GitHub Pages output
- `.github/workflows/pages.yml` — Pages deploy

## Notes

Transit times are practical estimates for weekend daytime trips from Central Ave + Menahan St, used to sort picks. The list is intentionally curated and editable.
