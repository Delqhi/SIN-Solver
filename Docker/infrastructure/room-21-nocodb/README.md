# Room 21: NocoDB UI

## 🌟 Overview
**"The User's Lens"**
NocoDB turns our `room-03-postgres-master` into a smart spreadsheet. This is the primary No-Code interface for users to interact with the database without needing SQL knowledge. It connects directly to the same data source as Supabase (`room-16`).

## 🏗️ Architecture
*   **Core:** NocoDB (Latest)
*   **Role:** No-Code Database Interface
*   **Backend:** Connects to `room-03-postgres-master`
*   **Sync:** Changes here are instantly reflected in Supabase (and vice versa) because they share the same physical storage.

## 🔌 Connection Details
*   **URL:** `http://localhost:8080` (Mapped to 8090 externally)
*   **Internal Host:** `room-21-nocodb-ui`
*   **Database:** `postgresql://sin_admin:...@room-03-postgres-master:5432/sin_solver`

## 📂 Directory Structure
```
room-21-nocodb/
├── docker-compose.yml  # Service Definition
├── README.md           # This file
└── Docs/               # Documentation
```
