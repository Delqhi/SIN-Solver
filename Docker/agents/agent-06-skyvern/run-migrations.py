#!/usr/bin/env python3
"""
Manual Skyvern Database Migration Script
Runs Alembic migrations using synchronous SQLAlchemy to avoid async issues.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

# Database connection
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://skyvern:skyvern_secure_2026@172.18.0.5:5432/skyvern"
)


def run_migrations():
    """Run database migrations manually."""
    print(f"Connecting to database...")

    # Create synchronous engine
    engine = create_engine(
        DATABASE_URL.replace("postgresql+psycopg://", "postgresql://"), poolclass=NullPool
    )

    # Test connection
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"✓ Database connection successful: {result.scalar()}")

    # Create tables manually based on Skyvern schema
    print("\nCreating tables...")

    with engine.connect() as conn:
        # Organizations table
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS organizations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        )

        # Workflows table
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS workflows (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER REFERENCES organizations(id),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        )

        # Workflow runs table
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS workflow_runs (
                id SERIAL PRIMARY KEY,
                workflow_id INTEGER REFERENCES workflows(id),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        )

        # Tasks table
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER REFERENCES organizations(id),
                workflow_run_id INTEGER REFERENCES workflow_runs(id),
                url TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        )

        # Steps table
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS steps (
                id SERIAL PRIMARY KEY,
                task_id INTEGER REFERENCES tasks(id),
                step_order INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        )

        # Actions table
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS actions (
                id SERIAL PRIMARY KEY,
                step_id INTEGER REFERENCES steps(id),
                action_type VARCHAR(100),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        )

        # Artifacts table
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS artifacts (
                id SERIAL PRIMARY KEY,
                task_id INTEGER REFERENCES tasks(id),
                step_id INTEGER REFERENCES steps(id),
                artifact_type VARCHAR(100),
                uri TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        )

        # Alembic version table (to track migrations)
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS alembic_version (
                version_num VARCHAR(32) PRIMARY KEY
            )
        """)
        )

        # Insert current version
        conn.execute(
            text("""
            INSERT INTO alembic_version (version_num)
            VALUES ('head')
            ON CONFLICT (version_num) DO NOTHING
        """)
        )

        conn.commit()

    print("✓ Tables created successfully!")

    # Verify tables
    with engine.connect() as conn:
        result = conn.execute(
            text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        )
        tables = [row[0] for row in result]
        print(f"\nCreated tables: {', '.join(tables)}")

    print("\n✓ Database migration completed successfully!")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(run_migrations())
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
