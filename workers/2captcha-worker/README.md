# 2Captcha Worker - Steel Browser Automation

Steel Browser automation for 2Captcha.com login and automated CAPTCHA work assignment.

## Features

- ✅ **Stealth Mode**: Anti-detection browser automation with WebDriver override
- ✅ **Automatic Login**: Email/password authentication to 2Captcha.com
- ✅ **Start Work Navigation**: Automatic navigation to work assignment section
- ✅ **CAPTCHA Capture**: Screenshot capture of assigned CAPTCHAs
- ✅ **Headless Support**: Optional headless mode for server deployment

## Architecture

```
SteelBrowserAutomation
├── Browser Initialization (stealth mode)
├── Login Automation
│   ├── Navigate to login page
│   ├── Fill credentials
│   └── Submit form
├── Work Section Navigation
│   ├── Find "Start Work" button
│   └── Navigate to assignment page
└── CAPTCHA Handling
    ├── Wait for assignment
    └── Screenshot capture
```

## Installation

### Prerequisites
- Node.js 16+ (LTS recommended)
- npm or yarn
- Playwright dependencies (will auto-install)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your 2Captcha credentials
nano .env
```

### Environment Variables

```env
TWOCAPTCHA_EMAIL=your-email@example.com
TWOCAPTCHA_PASSWORD=your-password
HEADLESS=false
STEALTH_MODE=true
SCREENSHOT_DIR=./screenshots
NAVIGATION_TIMEOUT=30000
CAPTCHA_WAIT_TIMEOUT=60000
```

## Usage

### Run Browser Automation

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start

# Build TypeScript
npm run build
```

### Programmatic Usage

```typescript
import SteelBrowserAutomation from './src/browser';

const automation = new SteelBrowserAutomation({
  headless: false,
  stealth: true,
  viewport: { width: 1920, height: 1080 }
});

try {
  await automation.initialize();
  await automation.navigateToLogin();
  await automation.login();
  await automation.navigateToStartWork();
  const screenshot = await automation.waitForCaptchaAndScreenshot();
  console.log(`CAPTCHA screenshot: ${screenshot}`);
} finally {
  await automation.close();
}
```

## How It Works

### 1. Browser Initialization
- Launches Chromium with stealth mode enabled
- Overrides `navigator.webdriver` property
- Sets realistic user agent
- Disables detection-prone features

### 2. Login Process
- Navigates to https://2captcha.com
- Waits for login form to appear
- Fills email and password fields
- Clicks login button
- Waits for navigation to complete

### 3. Work Navigation
- Looks for "Start Work" button/link
- Falls back to multiple selector strategies
- Navigates to work assignment page
- Takes screenshot for verification

### 4. CAPTCHA Capture
- Waits for CAPTCHA image to load
- Polls multiple selectors (img[alt*="captcha"], .captcha-image, etc.)
- Takes full-page screenshot when CAPTCHA is detected
- Saves to `screenshots/session-{timestamp}/` directory

## File Structure

```
2captcha-worker/
├── src/
│   └── browser.ts          # Main automation class
├── package.json            # npm dependencies
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md              # This file
```

## Output

Screenshots are saved in the following structure:
```
screenshots/
└── session-{timestamp}/
    ├── 01-initial-page-{ts}.png
    ├── 02-login-form-{ts}.png
    ├── 03-form-filled-{ts}.png
    ├── 04-after-login-{ts}.png
    ├── 05-start-work-page-{ts}.png
    ├── 06-no-captcha-found-{ts}.png
    └── 07-captcha-assigned-{ts}.png
```

## Debugging

### Enable Headless Mode
Set `HEADLESS=true` in `.env` to run in browser visible mode for debugging.

### View Network Activity
Playwright logs can be enabled:
```bash
DEBUG=pw:api npm start
```

### Inspect Page Content
Automation logs CSS selectors and element matching attempts. Check console output for:
- Login form detection
- Button click attempts
- Navigation confirmations
- CAPTCHA detection status

## Troubleshooting

### Login Fails
1. Check credentials in `.env`
2. Verify 2Captcha account status
3. Check console output for selector mismatches
4. Try increasing `NAVIGATION_TIMEOUT`

### CAPTCHA Not Found
1. Browser may still be loading - check 05-start-work-page screenshot
2. Verify work is available on 2Captcha account
3. Check for pop-ups or authentication challenges
4. Increase `CAPTCHA_WAIT_TIMEOUT`

### Detection/Ban
1. Use stealth mode (enabled by default)
2. Add delays between actions (slowMo: 100ms)
3. Use residential proxy if needed
4. Check browser console for detection scripts

## Dependencies

- **playwright**: Browser automation framework
- **dotenv**: Environment variable management
- **typescript**: Type-safe JavaScript

## Development

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## Notes

- Browser is **NOT headless by default** for easy debugging and visual monitoring
- Stealth mode is **enabled by default** to avoid detection
- Screenshots are **always saved** for audit trail and debugging
- Credentials are **loaded from environment variables** (never hardcoded)

## License

This project is part of SIN-Solver ecosystem.

## Support

For issues or questions, check the SIN-Solver documentation or contact the development team.
