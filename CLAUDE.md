# Opimus — Travel Vaccination App

## Project Overview

A travel vaccination assistant that helps users determine which vaccines they need based on their destination(s). Data is kept current via scheduled scraping of official government and health sources.

## Target Platforms

- Web (browser)
- iOS
- Android
- Cross-platform mobile

## Planned Architecture

- **Frontend**: Expo (React Native + Web) — single codebase for web, iOS, and Android
- **Backend**: Node.js + Express REST API
- **Database**: PostgreSQL (structured vaccination/advisory data)
- **Cache / Job Queue**: Redis + BullMQ (scheduled scraping jobs)
- **Scraper**: Playwright (handles JS-rendered pages on CDC, WHO, etc.)

## Data Sources (Scraped on a Schedule)

- CDC Travelers' Health: https://wwwnc.cdc.gov/travel/
- WHO International Travel and Health
- US State Department Travel Advisories
- Optionally: UK FCDO, Australian Smartraveller

## Core Features

1. User enters destination country(ies) and travel dates
2. App returns required, recommended, and routine vaccine recommendations
3. Travel advisory risk levels per destination
4. User profile to log vaccines already received
5. Data freshness indicators (last synced timestamp per source)
6. Push/email reminders for vaccination deadlines

## Data Model (High-Level)

- `countries` → `diseases` → `vaccine_recommendations` (required / recommended / routine)
- `travel_advisories` (risk level, notes, source, last_updated)
- `users` → `user_vaccines` (vaccines already received)

## Open Questions (to resolve before scaffolding)

- Primary audience: US travelers (CDC-centric) or international?
- User accounts vs. anonymous/session-based?
- Start with web only, then add mobile — or build all platforms from day one?

## Development Notes

- Always check data freshness/source timestamps when displaying recommendations
- Scraping jobs should be idempotent — safe to re-run without duplicating data
- Vaccination requirements can change rapidly; display last-updated dates prominently
