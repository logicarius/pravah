# PRAVAH

Infrastructure projects rarely run into trouble overnight. A pending approval holds up a milestone, progress slows, and the delay starts adding to the cost. PRAVAH puts those signals in one place so an officer can understand what changed and decide where to act.

This is a working MVP with synthetic projects from across India. It runs entirely in the browser, with no API keys, accounts or backend services.

## What you can do

- **Predict:** compare schedules with completed projects and inspect possible delay and cost exposure.
- **Trace:** follow the warning timeline, blocked milestones and dependencies.
- **Act:** review intervention timing, recovery requirements and affected community groups.
- **Keep a record:** save and print an officer brief, record a decision and add a follow-up.

The overview includes 720 synthetic projects across 36 states and union territories and eight sectors. Two review dates let you inspect how the picture changes over time.

## Run it locally

Install Node.js 22 or newer, open a terminal in this folder, then run:

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Open [localhost:5173](http://127.0.0.1:5173). Keep the terminal open while using the app. Start with National Overview, open a project, and work through Predict, Trace and Act. From there, create a brief and save a decision.

## Where your notes go

Briefs, decisions and follow-ups stay in your browser's local storage. Refreshing keeps them; clearing site data removes them. They are not shared with other people or devices.

Use **Export backup** to keep a copy. If downloads are blocked, expand **Backup text alternative**, copy the text and save it in a file. Paste it back later to restore your records. Restore preserves existing history and handles conflicting records.

The local app and the deployed website have separate storage. To move your local records to the live site, export them locally and restore them on the live site.

## Checks and production build

```sh
npm test
npm run build
npm run preview
```

Tests cover data integrity, review-date cutoffs, forecast rules, missing evidence, dependency cycles and backup merging. The production build goes into `dist/`.

## Deploy for free

For a public repository, GitHub Pages keeps the source and hosting in one place:

1. Push this folder as the repository root, including `.github/workflows/deploy.yml`.
2. Open the repository's **Settings > Pages**.
3. Set the publishing source to **GitHub Actions**.
4. Open **Actions > Deploy PRAVAH** and run the workflow, or push a change to `main`.
5. Open the URL shown in the successful deployment job.

The workflow installs dependencies, runs tests, builds the app and publishes `dist/`. Failed tests stop deployment. No deployment token or paid domain is needed. GitHub Pages is free for public repositories on GitHub Free: [GitHub's documentation](https://docs.github.com/en/pages/getting-started-with-github-pages).

For private source code, use Cloudflare Pages instead. Connect the repository, select `main`, set the build command to `npm run build`, output directory to `dist`, and use the free `pages.dev` address. This app only serves static files: [Cloudflare pricing](https://developers.cloudflare.com/pages/functions/pricing/).

## Project layout

```text
src/engines/        Forecast and assessment rules
src/data/          Bundled synthetic dataset
src/               Screens, components and browser storage
scripts/           Deterministic dataset generator
tests/            Regression tests
public/            Static assets
```

Built with React, TypeScript, Vite, Recharts and Lucide icons. Run `npm run seed` to regenerate the demonstration dataset.

## Scope

The data is invented and the forecasts are rule-based demonstrations, not validated predictions about real projects. Comparisons use evidence available at the chosen review date. Missing or inconsistent evidence is labelled; very slow progress uses an explicit historical fallback.

The national map shows illustrative project locations rather than administrative boundaries. Community groups are synthetic. PRAVAH supports an officer's review; it does not make the final decision.

