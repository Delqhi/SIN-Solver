# Room 16: Supabase Core Stack

## 🌟 Overview
**"The Power Engine"**
Supabase provides the "Firebase-like" experience on top of our `room-03-postgres-master`. It handles Authentication (GoTrue), Realtime subscriptions, Edge Functions, and the Storage API. It is the developer-facing powerhouse.

## 🏗️ Architecture (Simplified for Local)
We use a custom Supabase setup that connects to our existing `room-03` instead of spawning its own hidden Postgres.
*   **Core Services:** GoTrue (Auth), PostgREST (API), Realtime.
*   **Database:** `room-03-postgres-master`
*   **Sync:** Fully compatible with NocoDB (`room-21`).

## 🔌 Connection Details
*   **API URL:** `http://localhost:54321`
*   **Studio:** `http://localhost:54323`
*   **Internal Host:** `room-16-supabase-core`

## 📂 Directory Structure
```
room-16-supabase/
├── docker-compose.yml  # Service Definition
├── README.md           # This file
└── Docs/               # Documentation
```
