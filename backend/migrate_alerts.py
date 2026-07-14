"""
migrate_alerts.py
-----------------
One-shot migration: adds the 4 new columns required by the alert
audit/Redis/email extension.

Run ONCE from the backend/ directory:
    python migrate_alerts.py

Safe to re-run (skips columns that already exist).
"""

import shutil
import sqlite3
import sys
import os


DB_PATH = "invex.db"
BACKUP_PATH = "invex.db.bak"


def main():
    # ── 0. Sanity check ──────────────────────────────────────────────────────
    if not os.path.exists(DB_PATH):
        print(f"ERROR: {DB_PATH} not found. Run from the backend/ directory.")
        sys.exit(1)

    # ── 1. Backup before touching anything ──────────────────────────────────
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print(f"Backup written: {BACKUP_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    def column_exists(table: str, column: str) -> bool:
        cur.execute(f"PRAGMA table_info({table})")
        return any(row[1] == column for row in cur.fetchall())

    # ── 2. alerts table ──────────────────────────────────────────────────────
    if not column_exists("alerts", "status"):
        cur.execute("ALTER TABLE alerts ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
        print("Added: alerts.status")
    else:
        print("Skip:  alerts.status (already exists)")

    if not column_exists("alerts", "approaching_notified_at"):
        cur.execute("ALTER TABLE alerts ADD COLUMN approaching_notified_at DATETIME")
        print("Added: alerts.approaching_notified_at")
    else:
        print("Skip:  alerts.approaching_notified_at (already exists)")

    if not column_exists("alerts", "email_sent_at"):
        cur.execute("ALTER TABLE alerts ADD COLUMN email_sent_at DATETIME")
        print("Added: alerts.email_sent_at")
    else:
        print("Skip:  alerts.email_sent_at (already exists)")

    # ── 3. Backfill status for pre-existing rows ─────────────────────────────
    # Rows where triggered_at is set → triggered; otherwise leave as 'active'.
    # Rows where is_active=0 and triggered_at IS NULL were soft-dismissed before
    # this migration existed; mark them dismissed.
    cur.execute("""
        UPDATE alerts
        SET status = 'triggered'
        WHERE triggered_at IS NOT NULL AND status = 'active'
    """)
    cur.execute("""
        UPDATE alerts
        SET status = 'dismissed'
        WHERE is_active = 0 AND triggered_at IS NULL AND status = 'active'
    """)
    print("Backfilled: alerts.status from existing is_active / triggered_at")

    # ── 4. audit_logs table ──────────────────────────────────────────────────
    if not column_exists("audit_logs", "alert_id"):
        cur.execute("ALTER TABLE audit_logs ADD COLUMN alert_id TEXT")
        print("Added: audit_logs.alert_id")
    else:
        print("Skip:  audit_logs.alert_id (already exists)")

    conn.commit()
    conn.close()
    print("\nMigration complete.")


if __name__ == "__main__":
    main()
