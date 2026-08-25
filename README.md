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
by side.

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
loading, empty, error, and stale-data states. Hotel snapshots already carry a
source, currency, and update time so the UI is ready for a future API.

## 🛠️ Tech Stack

| Layer | Planned tools |
| --- | --- |
| Frontend | React, TypeScript, vinext/Vite |
| Styling | Tailwind CSS |
| Edge API | Cloudflare Workers |
| Database | Cloudflare D1 |
| Hosting | Cloudflare Pages |
| Testing | Vitest, Playwright |
| Delivery | GitHub Actions, Cloudflare |
| Development | VS Code, Git |

## 📊 Project Board

| Milestone | Status |
| --- | :---: |
| Define the Marriott-only MVP | ✅ |
| Initialize the repository and product README | ✅ |
| Design the low-fidelity user flows and interface | ✅ |
| Build the points rebate calculator | ✅ |
| Refactor the frontend into focused components | ✅ |
| Build hotel search and value ranking | ⏳ |
| Add side-by-side hotel comparison | ✅ |
| Research and validate a live-data strategy | ⬜ |
| Define the daily Marriott point-value methodology | ⬜ |
| Add automated tests and data-quality checks | ✅ |
| Deploy the summer MVP to Cloudflare | ⬜ |

**Legend:** ✅ Complete · ⏳ In progress · ⬜ Planned

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

## 🧪 Local Prototype

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to use the low-fidelity prototype. Run `npm test`
to verify the calculation rules and server-rendered interface.

---

StayWorth is an independent personal project and is not affiliated with,
endorsed by, or sponsored by Marriott International.
