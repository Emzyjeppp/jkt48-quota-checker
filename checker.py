"""JKT48 Exclusive & Bonus Quota Checker.

Memeriksa ketersediaan kuota sesi Meet & Greet / 2-Shot / Bonus JKT48.
"""

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    from curl_cffi import requests
    HAS_CURL_CFFI = True
except ImportError:
    import requests
    HAS_CURL_CFFI = False

CONFIG_FILE = Path("config.json")


def load_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "event_code": "EX24AE",
        "cookie": "",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "interval_seconds": 5,
    }


def save_config(cfg: dict) -> None:
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)


def fetch_quota(event_code: str, cookie: str, user_agent: str) -> dict | None:
    url = f"https://jkt48.com/api/v1/exclusives/{event_code}/bonus?lang=id"
    headers = {
        "User-Agent": user_agent,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
        "Referer": f"https://jkt48.com/exclusive/{event_code}",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    }
    if cookie:
        headers["Cookie"] = cookie

    try:
        if HAS_CURL_CFFI:
            resp = requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
        else:
            resp = requests.get(url, headers=headers, timeout=10)

        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 304:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 304 Data belum berubah.")
            return None
        if resp.status_code == 403:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 403 Forbidden. Masukkan Cookie browser ke config.json.")
            return None

        print(f"[{datetime.now().strftime('%H:%M:%S')}] HTTP {resp.status_code}")
        return None
    except Exception as err:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Error: {err}")
        return None


def display_quota(data: dict, member_filter: str | None = None, available_only: bool = False) -> None:
    sessions = data.get("data", [])
    if not sessions:
        print("Tidak ada data sesi ditemukan.")
        return

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*75}")
    print(f" JKT48 QUOTA REPORT — {now}")
    print(f"{'='*75}")

    total_available_slots = 0

    for session in sessions:
        date = session.get("date", "-")
        label = session.get("label", "Sesi")
        start = session.get("start_time", "")[:5]
        end = session.get("end_time", "")[:5]
        members = session.get("session_members", [])

        # Filter members if needed
        filtered_members = []
        for m in members:
            name = m.get("member_name", "")
            quota = m.get("available_quota", 0)
            if member_filter and member_filter.lower() not in name.lower():
                continue
            if available_only and quota <= 0:
                continue
            filtered_members.append(m)

        if not filtered_members:
            continue

        print(f"\n[{date}] {label} ({start} - {end})")
        print(f"{'-'*75}")
        print(f"{'Jalur':<9} | {'Nama Member':<26} | {'Kuota':<7} | {'Harga':<10} | {'Status'}")
        print(f"{'-'*75}")

        for m in filtered_members:
            jalur = m.get("label", "-")
            name = m.get("member_name", "-")
            quota = m.get("available_quota", 0)
            price = f"Rp{m.get('price', 0):,}"
            status = "TERSEDIA" if quota > 0 else "HABIS"

            if quota > 0:
                total_available_slots += 1

            status_str = f"\033[92m{status} ({quota})\033[0m" if quota > 0 else f"\033[90m{status}\033[0m"
            print(f"{jalur:<9} | {name:<26} | {quota:<7} | {price:<10} | {status_str}")

    print(f"\nTotal slot tersedia: {total_available_slots}")
    if total_available_slots > 0:
        print("\a", end="")  # System beep alert


def main():
    parser = argparse.ArgumentParser(description="JKT48 Quota Monitor")
    parser.add_argument("--code", type=str, help="Kode event (default: EX24AE)")
    parser.add_argument("--member", type=str, help="Filter nama member (contoh: Christy, Freya)")
    parser.add_argument("--available", action="store_true", help="Hanya tampilkan yang masih ada kuota")
    parser.add_argument("--watch", action="store_true", help="Monitor berkala")
    parser.add_argument("--interval", type=int, default=5, help="Interval loop (detik)")
    args = parser.parse_args()

    cfg = load_config()
    if args.code:
        cfg["event_code"] = args.code
    if args.interval:
        cfg["interval_seconds"] = args.interval
    save_config(cfg)

    while True:
        data = fetch_quota(cfg["event_code"], cfg.get("cookie", ""), cfg.get("user_agent", ""))
        if data:
            display_quota(data, member_filter=args.member, available_only=args.available)

        if not args.watch:
            break
        time.sleep(cfg["interval_seconds"])


if __name__ == "__main__":
    main()
