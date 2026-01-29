# Troubleshooting Antigravity (Delqhi-Platform)

## 🚑 MODEL ID ERRORS
- **Problem**: `models/gemini-3-flash not found`.
- **Cause**: Google API requires the `-preview` suffix.
- **Fix**: Map `id: "gemini-3-flash-preview"` in `opencode.json`.

## 🔒 AUTH LOOP
- **Symptom**: Localhost redirect fails.
- **Fix**: Copy redirect URL from browser and paste into terminal.

## 📉 RATE LIMITS
- **Symptom**: 429 Too Many Requests.
- **Solution**: Add additional Google accounts via `opencode auth login` to increase aggregate quota.
