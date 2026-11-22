import time
import os
from playwright.sync_api import sync_playwright

SNAPSHOT_DIR = os.path.abspath("chatgpt_reviews/snapshots")
os.makedirs(SNAPSHOT_DIR, exist_ok=True)

def capture_snapshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/usr/bin/google-chrome",
            headless=False,
            args=["--start-maximized", "--no-sandbox"]
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Landing
        print("Navigating to http://localhost:3000/ ...")
        page.goto("http://localhost:3000/", wait_until="domcontentloaded")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(SNAPSHOT_DIR, "01_landing.png"), full_page=True)
        print("Saved 01_landing.png")

        # 2. Login
        print("Navigating to http://localhost:3000/login ...")
        page.goto("http://localhost:3000/login", wait_until="domcontentloaded")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(SNAPSHOT_DIR, "02_login.png"), full_page=True)
        print("Saved 02_login.png")

        # 3. Runway Dashboard
        print("Navigating to http://localhost:3000/app ...")
        page.goto("http://localhost:3000/app", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        page.screenshot(path=os.path.join(SNAPSHOT_DIR, "03_runway_dashboard.png"), full_page=True)
        print("Saved 03_runway_dashboard.png")

        # 4. Tabs in /app
        tabs = [
            ("04_projects.png", "Projects & Milestones"),
            ("05_invoices.png", "Debtor Radar & Nudges"),
            ("06_payables.png", "Vendor Payables"),
            ("07_settings.png", "Studio Settings"),
        ]

        for filename, tab_text in tabs:
            print(f"Switching to tab: {tab_text}")
            try:
                btn = page.locator(f"button:has-text('{tab_text}')").first
                btn.click()
                page.wait_for_timeout(2000)
                page.screenshot(path=os.path.join(SNAPSHOT_DIR, filename), full_page=True)
                print(f"Saved {filename}")
            except Exception as e:
                print(f"Error on tab {tab_text}: {e}")

        # 5. Client Portal
        print("Navigating to http://localhost:3000/p/demo ...")
        page.goto("http://localhost:3000/p/demo", wait_until="domcontentloaded")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(SNAPSHOT_DIR, "08_client_portal.png"), full_page=True)
        print("Saved 08_client_portal.png")

        browser.close()
        print("All snapshots completed successfully!")

if __name__ == "__main__":
    capture_snapshots()
