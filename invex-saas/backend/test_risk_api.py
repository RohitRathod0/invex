"""Smoke test for the risk profiling endpoints."""
import httpx
import io
import sys

BASE = "http://localhost:8000/api/v1"
USER = "smoke-test-user-001"
PASS = True

def check(label, condition, detail=""):
    global PASS
    status = "OK " if condition else "FAIL"
    if not condition:
        PASS = False
    print(f"  [{status}] {label}{' — ' + str(detail) if detail else ''}")

print("\n── Risk Profiling API Smoke Tests ──────────────────────────────")

# 1. Health
r = httpx.get("http://localhost:8000/health", timeout=5)
check("Health endpoint", r.status_code == 200, r.json().get("status"))

# 2. needs_refresh — new user always needs refresh
r = httpx.get(f"{BASE}/risk/profile/{USER}/needs_refresh", timeout=5)
data = r.json()
check("needs_refresh (new user)", r.status_code == 200 and data.get("needs_refresh") == True, data)

# 3. get_profile — should not exist yet
r = httpx.get(f"{BASE}/risk/profile/{USER}", timeout=5)
data = r.json()
check("get_profile (not found)", r.status_code == 200 and data.get("exists") == False, data)

# 4. start_session
r = httpx.post(f"{BASE}/risk/session/start", json={"user_id": USER}, timeout=15)
data = r.json()
session_id = data.get("session_id", "")
first_q    = data.get("first_question", "")
check("start_session", r.status_code == 200 and bool(session_id), f"session={session_id[:8]}...")
check("first_question returned", bool(first_q), first_q[:70] + "..." if first_q else "MISSING")
check("skip=False (new user)", data.get("skip") == False)
check("6 dimensions initialised", len(data.get("dimension_scores", {})) == 6,
      list(data.get("dimension_scores", {}).keys()))

# 5. session status
if session_id:
    r = httpx.get(f"{BASE}/risk/session/{session_id}/status", timeout=5)
    data = r.json()
    check("session_status", r.status_code == 200, f"q_count={data.get('question_count')}")

# 6. Submit text answer (income_stability dimension)
if session_id:
    silent = bytes(200)
    files  = {"audio": ("a.webm", io.BytesIO(silent), "audio/webm")}
    form   = {"transcript_override": "I am a salaried software engineer, my income is very stable and predictable"}
    r = httpx.post(f"{BASE}/risk/session/{session_id}/answer",
                   files=files, data=form, timeout=30)
    data = r.json()
    check("submit_answer #1 (text mode)", r.status_code == 200, f"done={data.get('done')}")
    check("dimension_scores updated", any(v > 0 for v in data.get("dimension_scores", {}).values()),
          data.get("dimension_scores"))
    check("next_question returned", bool(data.get("next_question")) or data.get("done"),
          str(data.get("next_question", ""))[:70])

# 7. Submit second answer (loss tolerance)
if session_id:
    form2 = {"transcript_override": "I can tolerate maybe a 20 percent drop in my portfolio without panicking. I would hold and wait for recovery."}
    r = httpx.post(f"{BASE}/risk/session/{session_id}/answer",
                   files={"audio": ("a.webm", io.BytesIO(bytes(200)), "audio/webm")},
                   data=form2, timeout=30)
    data = r.json()
    check("submit_answer #2", r.status_code == 200, f"done={data.get('done')}")

# 8. Force finish — should create profile in DB
if session_id:
    r = httpx.post(f"{BASE}/risk/session/{session_id}/finish", timeout=15)
    data = r.json()
    check("force_finish", r.status_code == 200 and data.get("done") == True)
    ctx = data.get("user_context", {})
    check("user_context has risk_score", "risk_score" in ctx, ctx.get("risk_score"))
    check("user_context has risk_label", "risk_label" in ctx, ctx.get("risk_label"))
    check("user_context has horizon_years", "horizon_years" in ctx)
    check("user_context has loss_tolerance_pct", "loss_tolerance_pct" in ctx)

# 9. Profile is now stored — verify retrieval
r = httpx.get(f"{BASE}/risk/profile/{USER}", timeout=5)
data = r.json()
check("get_profile (after finish)", r.status_code == 200 and data.get("exists") == True,
      f"label={data.get('user_context', {}).get('risk_label')}")

# 10. needs_refresh now False (just created)
r = httpx.get(f"{BASE}/risk/profile/{USER}/needs_refresh", timeout=5)
data = r.json()
check("needs_refresh (fresh profile)", data.get("needs_refresh") == False,
      f"days_old={data.get('days_since_update')}")

# 11. Cache stats
r = httpx.get(f"{BASE}/risk/admin/cache-stats", timeout=5)
data = r.json()
check("cache_stats", r.status_code == 200, data)

print()
if PASS:
    print("✅  ALL TESTS PASSED")
else:
    print("❌  SOME TESTS FAILED — see above")
    sys.exit(1)
