/**
 * Swagbucks Platform Handler
 * Survey platform with point-based rewards (SB)
 * 
 * URL: https://www.swagbucks.com
 * Reward Type: Swagbucks (SB) - 100 SB = $1
 * Min Payout: $3 (300 SB) for gift cards
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
  name: 'Swagbucks',
  url: 'https://www.swagbucks.com',
  type: 'survey',
  rewardType: 'points',
  rewardName: 'SB',
  rewardRate: 100, // 100 SB = $1
  minPayout: 3.00, // $3 minimum for gift cards
  loginRequired: true,
  captchaExpected: true,
  surveyProviders: ['Peanut Labs', 'Revenue Universe', 'AdGate Media', 'Swagbucks Surveys']
};

// CSS Selectors for Swagbucks
const SELECTORS = {
  // Login page
  loginForm: {
    email: '#loginForm input[name="emailAddress"], #sbEmail, input[type="email"]',
    password: '#loginForm input[name="password"], #sbPassword, input[type="password"]',
    submit: '#loginForm button[type="submit"], .loginButton, button.sb-submit',
    rememberMe: 'input[name="rememberMe"], #rememberMe',
    loginError: '.sb-form-error, .error-message, .login-error'
  },
  
  // Survey list page
  surveyList: {
    container: '.surveyList, #surveyList, .answer-surveys-list, .survey-container',
    item: '.surveyItem, .survey-item, .survey-card, [data-survey-id]',
    title: '.surveyTitle, .survey-title, h3, .survey-name',
    reward: '.surveyReward, .survey-reward, .sb-value, .points-value',
    duration: '.surveyDuration, .survey-duration, .time-estimate, .survey-time',
    rating: '.surveyRating, .survey-rating, .difficulty',
    startButton: '.startSurvey, .start-btn, a.btn-primary, button.survey-start',
    availability: '.survey-status, .availability'
  },
  
  // Survey page (inside survey)
  surveyPage: {
    question: '.question, .survey-question, .questionText, [role="heading"]',
    radioOption: 'input[type="radio"], .radio-option',
    checkboxOption: 'input[type="checkbox"], .checkbox-option',
    textInput: 'input[type="text"], textarea, .text-input',
    dropdown: 'select, .dropdown',
    nextButton: 'button[type="submit"], .next-btn, .continue-btn, input[type="submit"]',
    progressBar: '.progress, .survey-progress, .progress-bar',
    errorMessage: '.error, .validation-error, .survey-error'
  },
  
  // Common elements
  common: {
    modal: '.modal, .popup, [role="dialog"]',
    closeModal: '.modal-close, .close-btn, button[aria-label="Close"]',
    captcha: 'iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]',
    loading: '.loading, .spinner, .loader'
  },
  
  // Account/earnings
  account: {
    balance: '.sb-total, .current-balance, .accountBalance',
    earnings: '.earnings, .total-earned',
    profile: '.profile, .account-menu'
  }
};

/**
 * Login to Swagbucks account
 * @param {Page} page - Playwright page instance
 * @param {object} credentials - { email, password }
 * @returns {Promise<boolean>} Login success
 */
async function login(page, credentials) {
  try {
    logger.info('Swagbucks: Starting login flow');
    
    // Navigate to login page
    await page.goto('https://www.swagbucks.com/p/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for login form
    await page.waitForSelector(SELECTORS.loginForm.email, { timeout: 10000 });
    
    // Fill credentials
    await page.fill(SELECTORS.loginForm.email, credentials.email);
    await page.waitForTimeout(500); // Human-like delay
    await page.fill(SELECTORS.loginForm.password, credentials.password);
    await page.waitForTimeout(300);
    
    // Check "Remember Me" if available
    const rememberMe = await page.$(SELECTORS.loginForm.rememberMe);
    if (rememberMe) {
      await rememberMe.check();
    }
    
    // Submit login
    await page.click(SELECTORS.loginForm.submit);
    
    // Wait for navigation or error
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
    
    // Check for login error
    const loginError = await page.$(SELECTORS.loginForm.loginError);
    if (loginError) {
      const errorText = await loginError.textContent();
      logger.error(`Swagbucks: Login failed - ${errorText}`);
      return false;
    }
    
    // Verify login success (should be on dashboard or homepage)
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('swagbucks.com') && 
                       !currentUrl.includes('login') &&
                       !currentUrl.includes('register');
    
    if (isLoggedIn) {
      logger.info('Swagbucks: Login successful');
    } else {
      logger.warn(`Swagbucks: Uncertain login state, URL: ${currentUrl}`);
    }
    
    return isLoggedIn;
    
  } catch (error) {
    logger.error(`Swagbucks: Login error - ${error.message}`);
    return false;
  }
}

/**
 * Find available surveys on Swagbucks
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object[]>} Array of survey objects
 */
async function findSurveys(page) {
  try {
    logger.info('Swagbucks: Finding available surveys');
    
    // Navigate to surveys page
    await page.goto('https://www.swagbucks.com/surveys', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for survey list to load
    await page.waitForSelector(SELECTORS.surveyList.container, { timeout: 15000 });
    await page.waitForTimeout(2000); // Let all surveys load
    
    // Extract survey data
    const surveys = await page.$$eval(
      SELECTORS.surveyList.item,
      (items, selectors) => {
        return items.map((item, index) => {
          const titleEl = item.querySelector(selectors.title);
          const rewardEl = item.querySelector(selectors.reward);
          const durationEl = item.querySelector(selectors.duration);
          const ratingEl = item.querySelector(selectors.rating);
          
          // Parse reward (e.g., "50 SB" -> 50)
          const rewardText = rewardEl?.textContent?.trim() || '0';
          const rewardMatch = rewardText.match(/(\d+)/);
          const reward = rewardMatch ? parseInt(rewardMatch[1], 10) : 0;
          
          // Parse duration (e.g., "10 min" -> 10)
          const durationText = durationEl?.textContent?.trim() || '0';
          const durationMatch = durationText.match(/(\d+)/);
          const duration = durationMatch ? parseInt(durationMatch[1], 10) : 0;
          
          return {
            index,
            title: titleEl?.textContent?.trim() || `Survey ${index + 1}`,
            reward,
            rewardText,
            duration,
            durationText,
            rating: ratingEl?.textContent?.trim() || null,
            // Calculate efficiency (SB per minute)
            efficiency: duration > 0 ? (reward / duration).toFixed(2) : 0
          };
        });
      },
      {
        title: SELECTORS.surveyList.title,
        reward: SELECTORS.surveyList.reward,
        duration: SELECTORS.surveyList.duration,
        rating: SELECTORS.surveyList.rating
      }
    );
    
    // Filter out invalid surveys and sort by efficiency
    const validSurveys = surveys
      .filter(s => s.reward > 0)
      .sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency));
    
    logger.info(`Swagbucks: Found ${validSurveys.length} valid surveys`);
    return validSurveys;
    
  } catch (error) {
    logger.error(`Swagbucks: Find surveys error - ${error.message}`);
    return [];
  }
}

/**
 * Start a specific survey
 * @param {Page} page - Playwright page instance
 * @param {number} surveyIndex - Index of survey to start
 * @returns {Promise<boolean>} Success status
 */
async function startSurvey(page, surveyIndex) {
  try {
    logger.info(`Swagbucks: Starting survey at index ${surveyIndex}`);
    
    // Find all start buttons
    const startButtons = await page.$$(SELECTORS.surveyList.startButton);
    
    if (surveyIndex >= startButtons.length) {
      logger.error(`Swagbucks: Survey index ${surveyIndex} out of range`);
      return false;
    }
    
    // Click the start button
    await startButtons[surveyIndex].click();
    
    // Wait for survey to load (might open in new tab/popup)
    await page.waitForTimeout(3000);
    
    // Check if we're in a survey now
    const questionVisible = await page.$(SELECTORS.surveyPage.question);
    if (questionVisible) {
      logger.info('Swagbucks: Survey started successfully');
      return true;
    }
    
    // Survey might be loading still
    logger.info('Swagbucks: Waiting for survey content...');
    return true;
    
  } catch (error) {
    logger.error(`Swagbucks: Start survey error - ${error.message}`);
    return false;
  }
}

/**
 * Get current account balance
 * @param {Page} page - Playwright page instance
 * @returns {Promise<number>} Balance in SB
 */
async function getBalance(page) {
  try {
    const balanceEl = await page.$(SELECTORS.account.balance);
    if (!balanceEl) return 0;
    
    const balanceText = await balanceEl.textContent();
    const match = balanceText.match(/(\d+(?:,\d+)*)/);
    if (!match) return 0;
    
    return parseInt(match[1].replace(/,/g, ''), 10);
  } catch (error) {
    logger.error(`Swagbucks: Get balance error - ${error.message}`);
    return 0;
  }
}

/**
 * Check if currently logged in
 * @param {Page} page - Playwright page instance
 * @returns {Promise<boolean>}
 */
async function isLoggedIn(page) {
  try {
    // Check for account/profile elements that only show when logged in
    const profileEl = await page.$(SELECTORS.account.profile);
    const balanceEl = await page.$(SELECTORS.account.balance);
    return !!(profileEl || balanceEl);
  } catch (error) {
    return false;
  }
}

/**
 * Detect survey question type on current page
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object>} Question info
 */
async function detectQuestionType(page) {
  const types = {
    radio: await page.$$(SELECTORS.surveyPage.radioOption),
    checkbox: await page.$$(SELECTORS.surveyPage.checkboxOption),
    text: await page.$$(SELECTORS.surveyPage.textInput),
    dropdown: await page.$$(SELECTORS.surveyPage.dropdown)
  };
  
  let questionType = 'unknown';
  let options = 0;
  
  if (types.radio.length > 0) {
    questionType = 'single_choice';
    options = types.radio.length;
  } else if (types.checkbox.length > 0) {
    questionType = 'multiple_choice';
    options = types.checkbox.length;
  } else if (types.text.length > 0) {
    questionType = types.text.length > 1 ? 'multiple_text' : 'text';
    options = types.text.length;
  } else if (types.dropdown.length > 0) {
    questionType = 'dropdown';
    options = types.dropdown.length;
  }
  
  const questionEl = await page.$(SELECTORS.surveyPage.question);
  const questionText = questionEl ? await questionEl.textContent() : '';
  
  return {
    type: questionType,
    options,
    questionText: questionText.trim(),
    hasNext: !!(await page.$(SELECTORS.surveyPage.nextButton))
  };
}

module.exports = {
  PLATFORM_INFO,
  SELECTORS,
  login,
  findSurveys,
  startSurvey,
  getBalance,
  isLoggedIn,
  detectQuestionType
};
