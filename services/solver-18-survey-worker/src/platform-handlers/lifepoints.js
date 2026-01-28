const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const PLATFORM_INFO = {
  name: 'LifePoints',
  url: 'https://www.lifepointspanel.com',
  type: 'survey',
  rewardType: 'points',
  rewardName: 'LifePoints',
  rewardRate: 550,
  minPayout: 5.00,
  loginRequired: true,
  captchaExpected: true
};

const SELECTORS = {
  loginForm: {
    email: 'input[name="email"], input[type="email"], #email',
    password: 'input[name="password"], input[type="password"], #password',
    submit: 'button[type="submit"], .login-btn, input[type="submit"]',
    loginError: '.error-message, .alert-error, .login-error'
  },
  surveyList: {
    container: '.survey-list, .available-surveys, #survey-container',
    item: '.survey-card, .survey-item, .survey',
    title: '.survey-title, h3, .title',
    reward: '.survey-points, .points, .reward-value',
    duration: '.survey-length, .duration, .time',
    startButton: 'a.start, button.take-survey, .start-btn'
  },
  surveyPage: {
    question: '.question, .survey-question',
    radioOption: 'input[type="radio"]',
    checkboxOption: 'input[type="checkbox"]',
    textInput: 'input[type="text"], textarea',
    nextButton: 'button[type="submit"], .next, .continue-btn'
  },
  dashboard: {
    balance: '.points-total, .balance, #points',
    pendingPoints: '.pending, .pending-points',
    redeemButton: '.redeem, button.redeem'
  }
};

async function login(page, credentials) {
  try {
    logger.info('LifePoints: Starting login flow');
    await page.goto('https://www.lifepointspanel.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector(SELECTORS.loginForm.email, { timeout: 10000 });
    await page.fill(SELECTORS.loginForm.email, credentials.email);
    await page.waitForTimeout(500);
    await page.fill(SELECTORS.loginForm.password, credentials.password);
    await page.waitForTimeout(300);
    await page.click(SELECTORS.loginForm.submit);
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
    
    const loginError = await page.$(SELECTORS.loginForm.loginError);
    if (loginError) {
      const errorText = await loginError.textContent();
      logger.error(`LifePoints: Login failed - ${errorText}`);
      return false;
    }
    
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('lifepointspanel.com') && !currentUrl.includes('login');
    if (isLoggedIn) logger.info('LifePoints: Login successful');
    return isLoggedIn;
  } catch (error) {
    logger.error(`LifePoints: Login error - ${error.message}`);
    return false;
  }
}

async function findSurveys(page) {
  try {
    logger.info('LifePoints: Finding available surveys');
    await page.goto('https://www.lifepointspanel.com/surveys', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    const hasSurveys = await page.$(SELECTORS.surveyList.item);
    if (!hasSurveys) {
      logger.info('LifePoints: No surveys currently available');
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
    logger.info(`LifePoints: Found ${sortedSurveys.length} available surveys`);
    return sortedSurveys;
  } catch (error) {
    logger.error(`LifePoints: Find surveys error - ${error.message}`);
    return [];
  }
}

async function startSurvey(page, surveyIndex) {
  try {
    logger.info(`LifePoints: Starting survey at index ${surveyIndex}`);
    const startButtons = await page.$$(SELECTORS.surveyList.startButton);
    
    if (surveyIndex >= startButtons.length) {
      logger.error(`LifePoints: Survey index ${surveyIndex} out of range`);
      return false;
    }
    
    await startButtons[surveyIndex].click();
    await page.waitForTimeout(2000);
    return true;
  } catch (error) {
    logger.error(`LifePoints: Start survey error - ${error.message}`);
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
    logger.error(`LifePoints: Get balance error - ${error.message}`);
    return 0;
  }
}

async function isLoggedIn(page) {
  try {
    const balanceEl = await page.$(SELECTORS.dashboard.balance);
    return !!balanceEl;
  } catch (error) {
    return false;
  }
}

module.exports = { PLATFORM_INFO, SELECTORS, login, findSurveys, startSurvey, getBalance, isLoggedIn };
