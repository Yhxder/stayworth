# 🏨 StayWorth

> Make every Marriott stay worth more.

[![Status](https://img.shields.io/badge/status-prototype-6C63FF?style=for-the-badge)](#-project-board)
[![MVP](https://img.shields.io/badge/MVP-Marriott-1F2937?style=for-the-badge)](#-mvp-features)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20D1-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](#%EF%B8%8F-tech-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-Active-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#%EF%B8%8F-tech-stack)

StayWorth is a Marriott-focused decision tool for comparing cash rates, award
redemptions, and the true net cost of a paid stay. The first public version is
planned for summer 2026 as a portfolio project for internship and graduate
school applications.

## ✨ MVP Features

### Award Stay Finder

Enter a city, travel dates, and preferred Marriott brand tier—Luxury, Premium,
Select, Longer Stays, or Collections—to discover matching hotels. Select two to
four hotels to review cash prices, points required, and redemption value side
by side, then send one paid-stay snapshot into the rebate calculator.

### Points Rebate Calculator

Estimate the real cost of a paid stay using:

- Marriott membership tier
- Cash rate
- Base and elite bonus points
- Researched Marriott credit card selection for China, the U.S., and Canada
- Optional welcome or promotional points
- A custom cash value per 10,000 points

```text
Net stay cost = Cash price − (Points earned × User's point valuation)
```

A future daily reference will estimate the cash value of 10,000 Marriott points
from a transparent sample of representative cities and hotels.

The current prototype is organized into focused React components with explicit
loading, empty, error, and stale-data states. The search UI now reads hotel
snapshots from the Worker API instead of a frontend data array.

The two core journeys are covered by real-browser tests. Mobile and tablet
layouts, keyboard-only search and hotel selection, visible focus, and
field-specific accessible error messages are also checked automatically.
Empty results, recoverable API failures, and stale-price warnings are covered
as explicit browser flows rather than inferred from static page content.

The finite data layer now uses Cloudflare D1 with three relational tables:
`cities`, `hotels`, and `price_snapshots`. A Worker endpoint supports exact
city and date queries for Hong Kong and Shanghai. It returns an explicit empty
result when a date has no snapshot instead of substituting another date's rate.

## 🛠️ Tech Stack

| Layer | Planned tools |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, vinext/Vite |
| Styling | Tailwind CSS |
| Edge API | Cloudflare Workers — finite query endpoint active |
| Database | Cloudflare D1 — schema and APAC database active |
| Hosting | Cloudflare Workers — `workers.dev` preview active |
| Testing | Node.js test runner, Playwright |
| Delivery | GitHub Actions — lint, logic tests, and browser tests on every push |
| Development | VS Code, Git |

## 📊 Project Board

| Milestone | Status |
| --- | :---: |
| Define the Marriott-only MVP | ✅ |
| Initialize the repository and product README | ✅ |
| Design the low-fidelity user flows and interface | ✅ |
| Build the points rebate calculator | ✅ |
| Refactor the frontend into focused components | ✅ |
| Build the finite D1 data layer and Worker API | ✅ |
| Connect the hotel UI to the Worker API | ✅ |
| Build hotel search against the D1 snapshot API | ✅ |
| Add side-by-side hotel comparison | ✅ |
| Rank hotels by redemption value | ✅ |
| Research and validate a live-data strategy | ⬜ |
| Define the daily Marriott point-value methodology | ⬜ |
| Add automated tests and data-quality checks | ✅ |
| Add end-to-end tests for both core user flows | ✅ |
| Validate mobile, tablet, keyboard, and form accessibility | ✅ |
| Validate empty, API-error, and stale-data recovery flows | ✅ |
| Deploy the MVP to Cloudflare Workers | ✅ |
| Publish the MVP on a custom domain | ⬜ |

**Legend:** ✅ Complete · ⏳ In progress · ⬜ Planned

Search results are ranked inside the current result set. You can order them by
redemption value (cash value per 10,000 points, highest first), by cash price,
or by points required. Hotels with an identical primary metric share a rank, and
deterministic tie-breakers keep the same snapshot rendering the same order. The
interface states that the ranking covers only the snapshots returned for the
query and ignores taxes, availability, and member offers, so it never claims to
recommend a hotel.

## 🎯 Product Principles

- **Explainable:** show the calculation behind every recommendation.
- **Comparable:** normalize cash rates and point prices before ranking.
- **Personalized:** let users choose their own point valuation and earning setup.
- **Trustworthy:** identify data sources, update times, and important limitations.

## 🗺️ Current Scope

The summer MVP supports Marriott only. Other hotel loyalty programs may be added
after the calculation model, data pipeline, and user experience are validated.
Live availability and pricing require an authorized source. The current plan is
to validate Marriott's official Affiliate/Partnerize data feeds before adding
automated pre-tax rates, taxes and fees, total rates, and award availability.
Current Hong Kong and Shanghai fixture prices are deliberately limited to
specific dates and are not live rates.

The search form defaults to a stay one month in the future instead of a fixed
calendar date, so the first thing a new user sees is never a date that has
already passed. When a query has no snapshots, the empty state reports the
window the data does cover and offers a one-click search using those dates.

## 🗄️ Finite Data API

```text
GET /api/hotels?city=Hong%20Kong&checkIn=2026-08-15&checkOut=2026-08-16&tier=Premium
```

Successful records include currency, source, and update time. A valid query
without an exact snapshot returns `status: "empty"` and `message: "暂无数据"`.
Empty responses also carry `coverage` — the earliest stay window with snapshots
for that city, or `null` when the city itself has no data:

```json
{
  "status": "empty",
  "message": "暂无数据",
  "hotels": [],
  "coverage": { "checkIn": "2026-08-15", "checkOut": "2026-08-16" }
}
```

The frontend uses this endpoint for loading, success, empty, error, and stale
states. Selected paid-stay snapshots can prefill currency, total cash rate,
stay length, and brand in the points rebate calculator. Taxes and ineligible
spend are not inferred because the finite snapshots do not contain that split.

## 🔐 Data Sources, Privacy, and Independence

The prototype states its limits in the **数据来源、隐私与独立声明** section
rendered below the two modules:

- **Data sources and freshness.** Hong Kong and Shanghai prices are manually
  maintained snapshots, not live inventory. Every hotel card shows its source
  label and update date, and an uncovered city or date returns
  `status: "empty"` instead of substituting another date's rate. The interface
  also lists the reference dates for the Marriott brand earning rules, the
  credit-card rules, and the ECB reference exchange rates, each linked to its
  official source.
- **Privacy.** There is no sign-up, and no Marriott account, card, or booking
  details are collected. The prototype loads no analytics, advertising, or
  cross-site tracking scripts. Cash price, points, exchange-rate, and
  membership inputs are calculated in the browser and are not uploaded or
  stored on the server. If analytics are added later, that notice is updated
  first.
- **Independence.** StayWorth is an independent personal project and is not
  affiliated with, endorsed by, or sponsored by Marriott International.
  Marriott and Marriott Bonvoy names and marks belong to their respective
  owners. The tool produces estimates only and is not booking, redemption,
  tax, or financial advice.

Production dependencies currently report no known advisories. The remaining
advisory reports come from the local build and test toolchain (`vite`,
`esbuild`, `wrangler`, and their transitive packages), which would need
breaking major upgrades; they are tracked as separate follow-up work instead
of being forced through `npm audit fix --force`.

## 🧪 Local Prototype

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to use the low-fidelity prototype. Run `npm test`
to verify the calculation rules and server-rendered interface.

Every push to `main` and every pull request runs the same checks in GitHub
Actions (`.github/workflows/ci.yml`): lint, `npm test`, and `npm run test:e2e`.
Failure screenshots, traces, and the HTML report are uploaded as a workflow
artifact when the browser tests fail.

Install Playwright's browser once, then run the core flows plus responsive,
keyboard, focus, form-error, empty-result, API-failure, and stale-data checks
in a real Chromium browser. The command applies local D1 migrations and starts
the site automatically:

```bash
npx playwright install chromium
npm run test:e2e
```

Failure screenshots, traces, videos, and the HTML report are written to ignored
local test folders and are not committed to GitHub.

## ☁️ Cloudflare Deployment

The prototype deploys to Cloudflare Workers with the existing `stayworth-mvp`
D1 database. The Worker serves the vinext App Router build together with the
static assets, and reads hotel snapshots from D1:

```bash
npx wrangler login          # once per machine
npm run cf:deploy           # build, then deploy with wrangler.deploy.jsonc
```

Useful companions:

```bash
npm run cf:deploy:dry-run   # package and validate without deploying
npm run cf:migrate:remote   # apply D1 migrations to the remote database
npm run cf:rows             # count cities, hotels, and price snapshots remotely
```

`wrangler.deploy.jsonc` points `main` at the built Worker
(`dist/server/index.js`), serves `dist/client` as Workers static assets, and
binds `DB` to the production D1 database. It is separate from
`wrangler.local.jsonc` (local development) and `wrangler.jsonc` (remote D1
migrations), so the local and Sites flows keep working unchanged.

The deploy job in `.github/workflows/ci.yml` runs only on `main` and stays
dormant until the repository has a `CLOUDFLARE_API_TOKEN` secret with the
**Workers Scripts: Edit** and **D1: Edit** permissions. Without that secret the
job logs a notice and skips, while lint, logic tests, and browser tests still
run on every push and pull request.

The current preview address is public unless Cloudflare Access is configured in
front of the Worker.

---

StayWorth is an independent personal project and is not affiliated with,
endorsed by, or sponsored by Marriott International.
