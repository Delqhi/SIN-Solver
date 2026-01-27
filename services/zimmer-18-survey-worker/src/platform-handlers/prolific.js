/**
 * Prolific Platform Handler
 * Academic research platform with cash rewards
 * 
 * URL: https://www.prolific.co
 * Reward Type: GBP (British Pounds) - paid to PayPal
 * Min Payout: £5.00
 * 
 * NOTE: Prolific is research-focused with high-quality studies
 * Higher pay rates but stricter participant requirements
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Platform metadata
const PLATFORM_INFO = {
  name: 'Prolific',
  url: 'https://www.prolific.co',
  type: 'research',
  rewardType: 'cash',
  rewardCurrency: 'GBP',
  minPayout: 5.00, // £5 minimum
  avgPayRate: 9.00, // £9/hour average
  loginRequired: true,
  captchaExpected: false,
  studyType: 'academic'
};

// CSS Selectors for Prolific
const SELECTORS = {
  // Login page
  loginForm: {
    email: 'input[name="email"], input[type="email"], #email',
    password: 'input[name="password"], input[type="password"], #password',
    submit: 'button[type="submit"], .login-button, button:has-text("Log in")',
    loginError: '.error-message, .alert-danger, [role="alert"]',
    twoFactor: 'input[name="code"], input[name="otp"]'
  },
  
  // Study list page
  studyList: {
    container: '.study-list, [data-testid="study-list"], .available-studies',
    item: '.study-card, [data-testid="study-card"], .study-item',
    title: '.study-title, [data-testid="study-title"], h3',
    reward: '.study-reward, [data-testid="reward"], .reward-amount',
    duration: '.study-duration, [data-testid="duration"], .time-estimate',
    places: '.study-places, [data-testid="places"], .places-remaining',
    startButton: 'button:has-text("Take part"), .start-study-btn, a.study-link',
    hourlyRate: '.hourly-rate, [data-testid="hourly-rate"]'
  },
  
  // Study page (inside study)
  studyPage: {
    externalLink: 'a[href*="qualtrics"], a[href*="surveymonkey"], a.external-study',
    completionCode: 'input[name="code"], .completion-code-input',
    submitCode: 'button:has-text("Submit"), button[type="submit"]',
    studyComplete: '.study-complete, .completion-message'
  },
  
  // Dashboard/Account
  dashboard: {
    balance: '.balance, [data-testid="balance"], .current-balance',
    pendingBalance: '.pending-balance, [data-testid="pending"]',
    withdrawButton: 'button:has-text("Withdraw"), .withdraw-btn',
    submissionsHistory: '.submissions, [data-testid="submissions"]'
  },
  
  // Common elements
  common: {
    modal: '[role="dialog"], .modal, .overlay',
    closeModal: 'button[aria-label="Close"], .close-btn',
    loading: '.loading, .spinner, [data-testid="loading"]',
    notification: '.notification, .toast, [role="status"]'
  }
};

/**
 * Login to Prolific account
 * @param {Page} page - Playwright page instance
 * @param {object} credentials - { email, password }
 * @returns {Promise<boolean>} Login success
 */
async function login(page, credentials) {
  try {
    logger.info('Prolific: Starting login flow');
    
    // Navigate to login page
    await page.goto('https://app.prolific.co/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for login form
    await page.waitForSelector(SELECTORS.loginForm.email, { timeout: 10000 });
    
    // Fill credentials with human-like delays
    await page.fill(SELECTORS.loginForm.email, credentials.email);
    await page.waitForTimeout(800);
    await page.fill(SELECTORS.loginForm.password, credentials.password);
    await page.waitForTimeout(500);
    
    // Submit login
    await page.click(SELECTORS.loginForm.submit);
    
    // Wait for navigation or 2FA prompt
    await page.waitForTimeout(3000);
    
    // Check for 2FA
    const twoFactorInput = await page.$(SELECTORS.loginForm.twoFactor);
    if (twoFactorInput) {
      logger.warn('Prolific: 2FA required - manual intervention needed');
      return false; // Requires manual 2FA entry
    }
    
    // Check for login error
    const loginError = await page.$(SELECTORS.loginForm.loginError);
    if (loginError) {
      const errorText = await loginError.textContent();
      logger.error(`Prolific: Login failed - ${errorText}`);
      return false;
    }
    
    // Verify login success
    await page.waitForURL(/app\.prolific\.co/, { timeout: 15000 }).catch(() => {});
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('app.prolific.co') && 
                       !currentUrl.includes('login');
    
    if (isLoggedIn) {
      logger.info('Prolific: Login successful');
    }
    
    return isLoggedIn;
    
  } catch (error) {
    logger.error(`Prolific: Login error - ${error.message}`);
    return false;
  }
}

/**
 * Find available studies on Prolific
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object[]>} Array of study objects
 */
async function findSurveys(page) {
  try {
    logger.info('Prolific: Finding available studies');
    
    // Navigate to studies page
    await page.goto('https://app.prolific.co/participant/studies', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for studies to load (Prolific is React-based, may need extra time)
    await page.waitForTimeout(3000);
    
    // Check for study list
    const hasStudies = await page.$(SELECTORS.studyList.item);
    if (!hasStudies) {
      logger.info('Prolific: No studies currently available');
      return [];
    }
    
    // Extract study data
    const studies = await page.$$eval(
      SELECTORS.studyList.item,
      (items, selectors) => {
        return items.map((item, index) => {
          const titleEl = item.querySelector(selectors.title);
          const rewardEl = item.querySelector(selectors.reward);
          const durationEl = item.querySelector(selectors.duration);
          const placesEl = item.querySelector(selectors.places);
          const hourlyRateEl = item.querySelector(selectors.hourlyRate);
          
          // Parse reward (e.g., "£1.50" -> 1.50)
          const rewardText = rewardEl?.textContent?.trim() || '0';
          const rewardMatch = rewardText.match(/([\d.]+)/);
          const reward = rewardMatch ? parseFloat(rewardMatch[1]) : 0;
          
          // Parse duration (e.g., "10 mins" -> 10)
          const durationText = durationEl?.textContent?.trim() || '0';
          const durationMatch = durationText.match(/(\d+)/);
          const duration = durationMatch ? parseInt(durationMatch[1], 10) : 0;
          
          // Parse places remaining
          const placesText = placesEl?.textContent?.trim() || '0';
          const placesMatch = placesText.match(/(\d+)/);
          const places = placesMatch ? parseInt(placesMatch[1], 10) : 0;
          
          // Parse hourly rate
          const hourlyText = hourlyRateEl?.textContent?.trim() || '';
          const hourlyMatch = hourlyText.match(/([\d.]+)/);
          const hourlyRate = hourlyMatch ? parseFloat(hourlyMatch[1]) : 0;
          
          return {
            index,
            title: titleEl?.textContent?.trim() || `Study ${index + 1}`,
            reward,
            rewardText,
            duration,
            durationText,
            places,
            hourlyRate,
            // Prolific studies usually show hourly rate directly
            efficiency: hourlyRate || (duration > 0 ? ((reward / duration) * 60).toFixed(2) : 0)
          };
        });
      },
      {
        title: SELECTORS.studyList.title,
        reward: SELECTORS.studyList.reward,
        duration: SELECTORS.studyList.duration,
        places: SELECTORS.studyList.places,
        hourlyRate: SELECTORS.studyList.hourlyRate
      }
    );
    
    // Sort by hourly rate (best paying first)
    const sortedStudies = studies.sort((a, b) => b.hourlyRate - a.hourlyRate);
    
    logger.info(`Prolific: Found ${sortedStudies.length} available studies`);
    return sortedStudies;
    
  } catch (error) {
    logger.error(`Prolific: Find studies error - ${error.message}`);
    return [];
  }
}

/**
 * Start a specific study
 * @param {Page} page - Playwright page instance
 * @param {number} studyIndex - Index of study to start
 * @returns {Promise<boolean>} Success status
 */
async function startSurvey(page, studyIndex) {
  try {
    logger.info(`Prolific: Starting study at index ${studyIndex}`);
    
    const startButtons = await page.$$(SELECTORS.studyList.startButton);
    
    if (studyIndex >= startButtons.length) {
      logger.error(`Prolific: Study index ${studyIndex} out of range`);
      return false;
    }
    
    // Click start button
    await startButtons[studyIndex].click();
    await page.waitForTimeout(2000);
    
    // Prolific often opens external study in new tab
    // Check for external link
    const externalLink = await page.$(SELECTORS.studyPage.externalLink);
    if (externalLink) {
      logger.info('Prolific: Study redirects to external platform');
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Prolific: Start study error - ${error.message}`);
    return false;
  }
}

/**
 * Get current account balance
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object>} Balance info { available, pending }
 */
async function getBalance(page) {
  try {
    // Navigate to dashboard if needed
    if (!page.url().includes('dashboard')) {
      await page.goto('https://app.prolific.co/participant/account', {
        waitUntil: 'domcontentloaded'
      });
    }
    
    const balanceEl = await page.$(SELECTORS.dashboard.balance);
    const pendingEl = await page.$(SELECTORS.dashboard.pendingBalance);
    
    const balanceText = balanceEl ? await balanceEl.textContent() : '£0';
    const pendingText = pendingEl ? await pendingEl.textContent() : '£0';
    
    const parseAmount = (text) => {
      const match = text.match(/([\d.]+)/);
      return match ? parseFloat(match[1]) : 0;
    };
    
    return {
      available: parseAmount(balanceText),
      pending: parseAmount(pendingText),
      currency: 'GBP'
    };
    
  } catch (error) {
    logger.error(`Prolific: Get balance error - ${error.message}`);
    return { available: 0, pending: 0, currency: 'GBP' };
  }
}

/**
 * Submit completion code after finishing external study
 * @param {Page} page - Playwright page instance
 * @param {string} code - Completion code from the study
 * @returns {Promise<boolean>} Success status
 */
async function submitCompletionCode(page, code) {
  try {
    logger.info(`Prolific: Submitting completion code`);
    
    const codeInput = await page.$(SELECTORS.studyPage.completionCode);
    if (!codeInput) {
      logger.error('Prolific: Completion code input not found');
      return false;
    }
    
    await codeInput.fill(code);
    await page.waitForTimeout(500);
    
    const submitBtn = await page.$(SELECTORS.studyPage.submitCode);
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      
      // Check for success message
      const success = await page.$(SELECTORS.studyPage.studyComplete);
      if (success) {
        logger.info('Prolific: Study submitted successfully');
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    logger.error(`Prolific: Submit code error - ${error.message}`);
    return false;
  }
}

/**
 * Check if currently logged in
 * @param {Page} page - Playwright page instance
 * @returns {Promise<boolean>}
 */
async function isLoggedIn(page) {
  try {
    const balanceEl = await page.$(SELECTORS.dashboard.balance);
    return !!balanceEl;
  } catch (error) {
    return false;
  }
}

module.exports = {
  PLATFORM_INFO,
  SELECTORS,
  login,
  findSurveys,
  startSurvey,
  getBalance,
  submitCompletionCode,
  isLoggedIn
};
