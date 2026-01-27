# 🕵️‍♂️ GREY ZONE INTELLIGENCE 2026 - PART 3 (PROXIES & HUMAN FALLBACK)

## 7. 🌐 The "Clean IP" Protocol (Proxy Hygiene)
**Leak:** CAPTCHA providers use databases like **Scamalytics** and **IPQualityScore** to rate IPs in real-time.
**Technique:**
-   **Pre-Check:** Before a worker starts, it queries the current IP's fraud score.
-   **Threshold:** If Fraud Score > 30, the IP is discarded immediately ("Burned").
-   **Rotation:** Use "Sticky Sessions" (10-30 mins) for warming + solving, then rotate.
**Implementation:** `ProxyManager` with automated reputation checking.

## 8. 👥 "Parallel Human Racing" (The 99.99% Guarantee)
**Leak:** AI fails 1-5% of the time. Clients demanding 100% success need humans.
**Technique:** 
-   **Standard:** Send to 2captcha (wait 45s).
-   **Unlimited Mode:** Send the SAME image to **2captcha**, **Anti-Captcha**, and **DeathByCaptcha** SIMULTANEOUSLY.
-   **Winner:** The first human to solve gets paid. The others are cancelled (or paid as sunk cost).
-   **Result:** Latency drops from 45s to 15s (fastest human wins).
**Implementation:** `HumanFallback` service.

## 9. 🎨 "Picasso" Canvas Fingerprinting
**Leak:** Randomizing canvas pixel data completely (white noise) is easily detected as "Canvas Blockers".
**Technique:** 
-   **Consistent Noise:** The noise must be seeded by the session ID so it remains *consistent* across re-checks on the same page.
-   **Subtle Shifts:** Shift RGB values by only +/- 1-2 values (invisible to eye, unique hash).
**Implementation:** Updated `StealthEngine` canvas injection.
