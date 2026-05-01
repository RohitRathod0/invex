"""
migrate_risk_profile.py

Adds the missing columns to the `risk_profiles` and `risk_profile_history`
tables in the SQLite database without destroying existing data.

Run once from the backend directory:
    python migrate_risk_profile.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "invex.db")

# Columns to add to risk_profiles:  (column_name, column_type, default_value_or_None)
RISK_PROFILE_COLUMNS = [
    ("horizon_years",         "INTEGER",  None),
    ("loss_tolerance_pct",    "REAL",     None),
    ("income_stability",      "TEXT",     None),
    ("dependents",            "INTEGER",  None),
    ("liabilities",           "TEXT",     None),
    ("excluded_sectors",      "TEXT",     None),
    ("preferred_sectors",     "TEXT",     None),
    ("emergency_fund_months", "REAL",     None),
    ("dimension_scores",      "TEXT",     None),
    ("interview_transcript",  "TEXT",     None),
    ("profile_version",       "INTEGER",  "1"),
    ("last_updated",          "DATETIME", None),
]

# Columns to add to risk_profile_history (create table if not exists)
RISK_PROFILE_HISTORY_DDL = """
CREATE TABLE IF NOT EXISTS risk_profile_history (
    id               TEXT PRIMARY KEY,
    user_id          TEXT,
    profile_version  INTEGER,
    risk_score       REAL,
    risk_label       TEXT,
    dimension_scores TEXT,
    user_context     TEXT,
    created_at       DATETIME
);
"""


def get_existing_columns(cursor, table_name):
    cursor.execute(f"PRAGMA table_info({table_name});")
    return {row[1] for row in cursor.fetchall()}


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # ── 1. Add missing columns to risk_profiles ──────────────────────────────
    existing = get_existing_columns(cur, "risk_profiles")
    print(f"Existing risk_profiles columns: {existing}")

    added = []
    for col_name, col_type, default in RISK_PROFILE_COLUMNS:
        if col_name not in existing:
            if default is not None:
                sql = f"ALTER TABLE risk_profiles ADD COLUMN {col_name} {col_type} DEFAULT {default};"
            else:
                sql = f"ALTER TABLE risk_profiles ADD COLUMN {col_name} {col_type};"
            cur.execute(sql)
            added.append(col_name)
            print(f"  [+] Added column: {col_name} ({col_type})")
        else:
            print(f"  [=] Column already exists: {col_name}")

    # ── 2. Create risk_profile_history if not present ────────────────────────
    cur.execute(RISK_PROFILE_HISTORY_DDL)
    print("[+] risk_profile_history table ensured.")

    conn.commit()
    conn.close()

    if added:
        print(f"\n✅ Migration complete. Added {len(added)} column(s): {', '.join(added)}")
    else:
        print("\n✅ No migration needed — all columns already present.")


if __name__ == "__main__":
    migrate()
