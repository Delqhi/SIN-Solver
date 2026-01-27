const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const PLATFORM_INFO = {
  name: 'Toluna',
  url: 'https://www.toluna.com',
  type: 'survey',
  rewardType: 'points',
  rewardName: 'Toluna Points',
  rewardRate: 3000,
  minPayout: 10.00,
  loginRequired: true,
  captchaExpected: true
};

const SELECTORS = {
  loginForm: {
    email: 'input[name="email"], input[type="email"], #email, input[placeholder*="email"]',
    password: 'input[name="password"], input[type="password"], #password',
    submit: 'button[type="submit"], .login-btn, button:has-text("Log in")',
    loginError: '.error-message, .alert-danger, .login-error'
  },
  surveyList: {
    container: '.survey-list, .available-surveys, #surveys',
    item: '.survey-card, .survey-item, [data-survey-id]',
    title: '.survey-title, h3, .survey-name',
    reward: '.survey-points, .points-value, .reward',
    duration: '.survey-time, .duration, .time-estimate',
    startButton: 'a.start-survey, button.take-survey, .survey-link'
  },
  surveyPage: {
    question: '.question, .survey-question, [role="heading"]',
    radioOption: 'input[type="radio"]',
    checkboxOption: 'input[type="checkbox"]',
    textInput: 'input[type="text"], textarea',
    nextButton: 'button[type="submit"], .next-btn, .continue'
  },
  dashboard: {
    balance: '.points-balance, .total-points, #balance',
    pendingPoints: '.pending-points, .pending',
    profile: '.profile-menu, .user-menu'
  }
};

async function login(page, credentials) {
  try {
    logger.info('Toluna: Starting login flow');
    await page.goto('https://www.toluna.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector(SELECTORS.loginForm.email, { timeout: 10000 });
    await page.fill(SELECTORS.loginForm.email, credentials.email);
    await page.waitForTimeout(600);
    await page.fill(SELECTORS.loginForm.password, credentials.password);
    await page.waitForTimeout(400);
    await page.click(SELECTORS.loginForm.submit);
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
    
    const loginError = await page.$(SELECTORS.loginForm.loginError);
    if (loginError) {
      const errorText = await loginError.textContent();
      logger.error(`Toluna: Login failed - ${errorText}`);
      return false;
    }
    
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('toluna.com') && !currentUrl.includes('login');
    if (isLoggedIn) logger.info('Toluna: Login successful');
    return isLoggedIn;
  } catch (error) {
    logger.error(`Toluna: Login error - ${error.message}`);
    return false;
  }
}

async function findSurveys(page) {
  try {
    logger.info('Toluna: Finding available surveys');
    await page.goto('https://www.toluna.com/surveys', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    const hasSurveys = await page.$(SELECTORS.surveyList.item);
    if (!hasSurveys) {
      logger.info('Toluna: No surveys currently available');
      return [];
    }
    
    const surveys = await page.$$eval(
      SELECTORS.surveyList.item,
      (items, selectors) => {
        return items.map((item, index) => {
          const titleEl = item.querySelector(selectors.title);
          const rewardEl = item.querySelector(selectors.reward);
          const durationEl = item.querySelector(selectors.duration);
          
          const rewardText = rewardEl?.textContent?.trim() || '0';
          const rewardMatch = rewardText.match(/(\d+)/);
          const reward = rewardMatch ? parseInt(rewardMatch[1], 10) : 0;
          
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
            efficiency: duration > 0 ? (reward / duration).toFixed(2) : 0
          };
        });
      },
      { title: SELECTORS.surveyList.title, reward: SELECTORS.surveyList.reward, duration: SELECTORS.surveyList.duration }
    );
    
    const sortedSurveys = surveys.filter(s => s.reward > 0).sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency));
    logger.info(`Toluna: Found ${sortedSurveys.length} available surveys`);
    return sortedSurveys;
  } catch (error) {
    logger.error(`Toluna: Find surveys error - ${error.message}`);
    return [];
  }
}

async function startSurvey(page, surveyIndex) {
  try {
    logger.info(`Toluna: Starting survey at index ${surveyIndex}`);
    const startButtons = await page.$$(SELECTORS.surveyList.startButton);
    
    if (surveyIndex >= startButtons.length) {
      logger.error(`Toluna: Survey index ${surveyIndex} out of range`);
      return false;
    }
    
    await startButtons[surveyIndex].click();
    await page.waitForTimeout(2000);
    return true;
  } catch (error) {
    logger.error(`Toluna: Start survey error - ${error.message}`);
    return false;
  }
}

async function getBalance(page) {
  try {
    const balanceEl = await page.$(SELECTORS.dashboard.balance);
    const balanceText = balanceEl ? await balanceEl.textContent() : '0';
    const match = balanceText.match(/(\d+(?:,\d+)*)/);
    return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
  } catch (error) {
    logger.error(`Toluna: Get balance error - ${error.message}`);
    return 0;
  }
}

async function isLoggedIn(page) {
  try {
    const profileEl = await page.$(SELECTORS.dashboard.profile);
    return !!profileEl;
  } catch (error) {
    return false;
  }
}

module.exports = { PLATFORM_INFO, SELECTORS, login, findSurveys, startSurvey, getBalance, isLoggedIn };
