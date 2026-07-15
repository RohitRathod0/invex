import subprocess
import time
from fastapi.testclient import TestClient
from main import app

def run(cmd): return subprocess.check_output(cmd, shell=True, text=True).strip()

run('docker exec invex-redis redis-cli FLUSHALL')

print('\\n--- Step 2 & 5: Check Initial Redis Keys ---')
print('Keys before:', run('docker exec invex-redis redis-cli KEYS *'))

with TestClient(app) as client:
    print('\\n--- Triggering app (Cache Miss expected) ---')
    start = time.time()
    r = client.get('/api/v1/market/tickers')
    print(f'First call took {time.time()-start:.4f}s. Status: {r.status_code}')

    print('\\n--- Check Redis Keys and TTL ---')
    keys = run('docker exec invex-redis redis-cli KEYS *')
    print(f'Keys after:\\n{keys}')
    if keys:
        first_key = keys.split('\\n')[0].strip()
        if first_key:
            print(f'TTL for {first_key}:', run(f'docker exec invex-redis redis-cli TTL "{first_key}"'))

    print('\\n--- Step 6: Trigger Same Request (Cache Hit expected) ---')
    start = time.time()
    r = client.get('/api/v1/market/tickers')
    print(f'Second call took {time.time()-start:.4f}s. Status: {r.status_code}')

    print('\\n--- Step 7: Test Fallback (Stop Redis) ---')
    run('docker stop invex-redis')
    start = time.time()
    r = client.get('/api/v1/market/tickers')
    print(f'Fallback call took {time.time()-start:.4f}s. Status: {r.status_code}')

print('\\n--- Bringing Redis back ---')
run('docker start invex-redis')
