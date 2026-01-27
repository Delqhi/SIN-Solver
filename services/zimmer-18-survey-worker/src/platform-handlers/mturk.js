/**
 * Amazon Mechanical Turk (MTurk) Platform Handler
 * Crowdsourcing marketplace for HITs (Human Intelligence Tasks)
 * 
 * URL: https://worker.mturk.com
 * Reward Type: USD - transferred to Amazon Payments
 * Min Payout: $1.00
 * 
 * NOTE: MTurk has various task types (surveys, data labeling, transcription, etc.)
 * Qualification requirements may restrict access to certain HITs
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
  name: 'Amazon Mechanical Turk',
  shortName: 'MTurk',
  url: 'https://worker.mturk.com',
  type: 'crowdsourcing',
  rewardType: 'cash',
  rewardCurrency: 'USD',
  minPayout: 1.00,
  loginRequired: true,
  captchaExpected: true,
  requiresAmazonAccount: true,
  taskTypes: ['survey', 'data_labeling', 'transcription', 'categorization', 'sentiment']
};

// CSS Selectors for MTurk
const SELECTORS = {
  // Login page (Amazon sign-in)
  loginForm: {
    email: 'input[name="email"], #ap_email',
    password: 'input[name="password"], #ap_password',
    submit: '#signInSubmit, input[type="submit"]',
    loginError: '.a-alert-content, #auth-error-message-box',
    captcha: '#auth-captcha-image, .captcha-image',
    captchaInput: '#auth-captcha-guess'
  },
  
  // HIT list page
  hitList: {
    container: '#hit-results, .hit-container, .results-table',
    item: '.hit-row, .result-row, tr[data-hit-id]',
    title: '.hit-title, .requester-name, td.title-wrapper',
    requester: '.requester-name, .requester-link',
    reward: '.hit-reward, .reward-amount, td.reward-column',
    duration: '.hit-time, .allotted-time',
    available: '.hits-available, .available-count',
    acceptButton: 'a.accept-btn, button[data-action="accept"]',
    qualifications: '.qualifications, .qualification-list'
  },
  
  // HIT work page
  hitPage: {
    iframe: 'iframe#hitFrame, iframe.hit-frame',
    submitButton: '#submitButton, input[type="submit"][name="submitHit"]',
    returnButton: 'a[href*="return"], button[data-action="return"]',
    timer: '.timer, .time-remaining',
    instructionBlock: '.instructions, .hit-instructions'
  },
  
  // Dashboard
  dashboard: {
    balance: '.balance-amount, #balance-value',
    pendingEarnings: '.pending-earnings, .pending-amount',
    approvalRate: '.approval-rate, .stat-approval',
    totalEarnings: '.total-earnings, .lifetime-earnings',
    hitsCompleted: '.hits-completed, .completed-count',
    qualifications: '.qualifications-list, #qualifications'
  },
  
  // Filters
  filters: {
    sortBy: 'select[name="sortBy"], #sort-select',
    minReward: 'input[name="minReward"], #min-reward',
    searchBox: 'input[name="searchText"], #searchBox',
    applyFilter: 'button[type="submit"], .search-btn'
  },
  
  // Common elements
  common: {
    modal: '.modal, .popup-modal',
    closeModal: '.modal-close, button[data-dismiss]',
    loading: '.loading-indicator, .spinner',
    pagination: '.pagination, .page-nav',
    nextPage: 'a.next-page, button[aria-label="Next"]'
  }
};

/**
 * Login to MTurk (via Amazon)
 * @param {Page} page - Playwright page instance
 * @param {object} credentials - { email, password }
 * @returns {Promise<boolean>} Login success
 */
async function login(page, credentials) {
  try {
    logger.info('MTurk: Starting login flow (Amazon sign-in)');
    
    // Navigate to MTurk worker portal
    await page.goto('https://worker.mturk.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for Amazon login form
    await page.waitForSelector(SELECTORS.loginForm.email, { timeout: 10000 });
    
    // Fill email
    await page.fill(SELECTORS.loginForm.email, credentials.email);
    await page.waitForTimeout(500);
    
    // Sometimes Amazon has two-step email -> password flow
    const continueBtn = await page.$('#continue');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(1500);
    }
    
    // Fill password
    await page.waitForSelector(SELECTORS.loginForm.password, { timeout: 5000 });
    await page.fill(SELECTORS.loginForm.password, credentials.password);
    await page.waitForTimeout(300);
    
    // Check for CAPTCHA
    const captchaImage = await page.$(SELECTORS.loginForm.captcha);
    if (captchaImage) {
      logger.warn('MTurk: CAPTCHA detected on login - requires solving');
      // Will need to solve captcha via our captcha bridge
      return false;
    }
    
    // Submit login
    await page.click(SELECTORS.loginForm.submit);
    
    // Wait for navigation
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
    
    // Check for login error
    const loginError = await page.$(SELECTORS.loginForm.loginError);
    if (loginError) {
      const errorText = await loginError.textContent();
      logger.error(`MTurk: Login failed - ${errorText}`);
      return false;
    }
    
    // Verify login success
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('worker.mturk.com') && 
                       !currentUrl.includes('signin');
    
    if (isLoggedIn) {
      logger.info('MTurk: Login successful');
    }
    
    return isLoggedIn;
    
  } catch (error) {
    logger.error(`MTurk: Login error - ${error.message}`);
    return false;
  }
}

/**
 * Find available HITs on MTurk
 * @param {Page} page - Playwright page instance
 * @param {object} options - { minReward, searchText, sortBy }
 * @returns {Promise<object[]>} Array of HIT objects
 */
async function findSurveys(page, options = {}) {
  try {
    logger.info('MTurk: Finding available HITs');
    
    // Navigate to HITs page
    let url = 'https://worker.mturk.com/?filters%5Bqualified%5D=true&sort=reward_desc';
    
    if (options.minReward) {
      url += `&filters%5Bmin_reward%5D=${options.minReward}`;
    }
    if (options.searchText) {
      url += `&filters%5Bsearch_term%5D=${encodeURIComponent(options.searchText)}`;
    }
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for HIT list
    await page.waitForSelector(SELECTORS.hitList.container, { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Extract HIT data
    const hits = await page.$$eval(
      SELECTORS.hitList.item,
      (items, selectors) => {
        return items.map((item, index) => {
          const titleEl = item.querySelector(selectors.title);
          const requesterEl = item.querySelector(selectors.requester);
          const rewardEl = item.querySelector(selectors.reward);
          const durationEl = item.querySelector(selectors.duration);
          const availableEl = item.querySelector(selectors.available);
          
          // Parse reward (e.g., "$0.50" -> 0.50)
          const rewardText = rewardEl?.textContent?.trim() || '$0';
          const rewardMatch = rewardText.match(/([\d.]+)/);
          const reward = rewardMatch ? parseFloat(rewardMatch[1]) : 0;
          
          // Parse duration (e.g., "30 minutes" -> 30)
          const durationText = durationEl?.textContent?.trim() || '0';
          const durationMatch = durationText.match(/(\d+)/);
          const duration = durationMatch ? parseInt(durationMatch[1], 10) : 0;
          
          // Parse available count
          const availableText = availableEl?.textContent?.trim() || '0';
          const availableMatch = availableText.match(/(\d+)/);
          const available = availableMatch ? parseInt(availableMatch[1], 10) : 1;
          
          return {
            index,
            title: titleEl?.textContent?.trim() || `HIT ${index + 1}`,
            requester: requesterEl?.textContent?.trim() || 'Unknown',
            reward,
            rewardText,
            duration,
            durationText,
            available,
            // Calculate hourly rate
            hourlyRate: duration > 0 ? ((reward / duration) * 60).toFixed(2) : 0
          };
        });
      },
      {
        title: SELECTORS.hitList.title,
        requester: SELECTORS.hitList.requester,
        reward: SELECTORS.hitList.reward,
        duration: SELECTORS.hitList.duration,
        available: SELECTORS.hitList.available
      }
    );
    
    // Sort by hourly rate
    const sortedHits = hits.sort((a, b) => parseFloat(b.hourlyRate) - parseFloat(a.hourlyRate));
    
    logger.info(`MTurk: Found ${sortedHits.length} available HITs`);
    return sortedHits;
    
  } catch (error) {
    logger.error(`MTurk: Find HITs error - ${error.message}`);
    return [];
  }
}

/**
 * Accept a specific HIT
 * @param {Page} page - Playwright page instance
 * @param {number} hitIndex - Index of HIT to accept
 * @returns {Promise<boolean>} Success status
 */
async function startSurvey(page, hitIndex) {
  try {
    logger.info(`MTurk: Accepting HIT at index ${hitIndex}`);
    
    const acceptButtons = await page.$$(SELECTORS.hitList.acceptButton);
    
    if (hitIndex >= acceptButtons.length) {
      logger.error(`MTurk: HIT index ${hitIndex} out of range`);
      return false;
    }
    
    // Click accept button
    await acceptButtons[hitIndex].click();
    await page.waitForTimeout(2000);
    
    // Check if HIT loaded in iframe
    const hitIframe = await page.$(SELECTORS.hitPage.iframe);
    if (hitIframe) {
      logger.info('MTurk: HIT accepted and loaded');
      return true;
    }
    
    return true;
    
  } catch (error) {
    logger.error(`MTurk: Accept HIT error - ${error.message}`);
    return false;
  }
}

/**
 * Get current account balance and stats
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object>} Account info
 */
async function getBalance(page) {
  try {
    // Navigate to dashboard
    await page.goto('https://worker.mturk.com/dashboard', {
      waitUntil: 'domcontentloaded'
    });
    
    await page.waitForTimeout(2000);
    
    const balanceEl = await page.$(SELECTORS.dashboard.balance);
    const pendingEl = await page.$(SELECTORS.dashboard.pendingEarnings);
    const approvalEl = await page.$(SELECTORS.dashboard.approvalRate);
    const completedEl = await page.$(SELECTORS.dashboard.hitsCompleted);
    
    const parseAmount = (text) => {
      const match = text?.match(/([\d.]+)/);
      return match ? parseFloat(match[1]) : 0;
    };
    
    const parsePercent = (text) => {
      const match = text?.match(/([\d.]+)/);
      return match ? parseFloat(match[1]) : 0;
    };
    
    return {
      available: parseAmount(balanceEl ? await balanceEl.textContent() : '0'),
      pending: parseAmount(pendingEl ? await pendingEl.textContent() : '0'),
      approvalRate: parsePercent(approvalEl ? await approvalEl.textContent() : '0'),
      hitsCompleted: parseInt((completedEl ? await completedEl.textContent() : '0').replace(/\D/g, ''), 10) || 0,
      currency: 'USD'
    };
    
  } catch (error) {
    logger.error(`MTurk: Get balance error - ${error.message}`);
    return { available: 0, pending: 0, approvalRate: 0, hitsCompleted: 0, currency: 'USD' };
  }
}

/**
 * Return (abandon) a HIT
 * @param {Page} page - Playwright page instance
 * @returns {Promise<boolean>} Success status
 */
async function returnHit(page) {
  try {
    const returnBtn = await page.$(SELECTORS.hitPage.returnButton);
    if (returnBtn) {
      await returnBtn.click();
      await page.waitForTimeout(1000);
      logger.info('MTurk: HIT returned');
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`MTurk: Return HIT error - ${error.message}`);
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

/**
 * Get HIT iframe content for processing
 * @param {Page} page - Playwright page instance
 * @returns {Promise<Frame|null>} The HIT iframe frame
 */
async function getHitFrame(page) {
  try {
    const iframe = await page.$(SELECTORS.hitPage.iframe);
    if (!iframe) return null;
    
    const frame = await iframe.contentFrame();
    return frame;
  } catch (error) {
    logger.error(`MTurk: Get HIT frame error - ${error.message}`);
    return null;
  }
}

module.exports = {
  PLATFORM_INFO,
  SELECTORS,
  login,
  findSurveys,
  startSurvey,
  getBalance,
  returnHit,
  isLoggedIn,
  getHitFrame
};
