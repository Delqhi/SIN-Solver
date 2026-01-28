const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const PLATFORM_INFO = {
  name: 'YouGov',
  url: 'https://today.yougov.com',
  type: 'survey',
  rewardType: 'points',
  rewardName: 'YouGov Points',
  rewardRate: 100,
  minPayout: 50.00,
  loginRequired: true,
  captchaExpected: false,
  surveyProviders: ['YouGov Surveys', 'Opinion Polls', 'Research Studies']
};

const SELECTORS = {
  loginForm: {
    email: 'input[name="email"], input[type="email"], #email',
    password: 'input[name="password"], input[type="password"], #password',
    submit: 'button[type="submit"], .login-btn',
    loginError: '.error-message, .alert-danger'
  },
  surveyList: {
    container: '.survey-list, .available-surveys, #surveys',
    item: '.survey-item, .survey-card, [data-survey-id]',
    title: '.survey-title, h3, .title',
    reward: '.survey-points, .points-value, .reward',
    duration: '.survey-duration, .time-estimate',
    startButton: '.start-survey, .take-survey, a.btn-primary'
  },
  surveyPage: {
    question: '.question, .survey-question, [role="heading"]',
    radioOption: 'input[type="radio"], .radio-option',
    checkboxOption: 'input[type="checkbox"], .checkbox-option',
    textInput: 'input[type="text"], textarea',
    nextButton: 'button[type="submit"], .next-btn, .continue',
    progressBar: '.progress, .survey-progress'
  },
  account: {
    balance: '.points-balance, .total-points, .user-points',
    profile: '.profile, .user-menu, .account-menu'
  }
};

async function login(page, credentials) {
  try {
    logger.info('YouGov: Starting login flow');
    await page.goto('https://today.yougov.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector(SELECTORS.loginForm.email, { timeout: 10000 });
    await page.fill(SELECTORS.loginForm.email, credentials.email);
    await page.waitForTimeout(randomDelay(300, 600));
    await page.fill(SELECTORS.loginForm.password, credentials.password);
    await page.waitForTimeout(randomDelay(200, 400));
    await page.click(SELECTORS.loginForm.submit);
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
    const loginError = await page.$(SELECTORS.loginForm.loginError);
    if (loginError) { logger.error('YouGov: Login failed'); return false; }
    const isLoggedIn = !page.url().includes('login');
    if (isLoggedIn) logger.info('YouGov: Login successful');
    return isLoggedIn;
  } catch (error) {
    logger.error('YouGov: Login error - ' + error.message);
    return false;
  }
}

async function findSurveys(page) {
  try {
    logger.info('YouGov: Finding available surveys');
    await page.goto('https://today.yougov.com/surveys', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector(SELECTORS.surveyList.container, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const surveys = await page.$$eval(SELECTORS.surveyList.item, (items, selectors) => {
      return items.map((item, index) => {
        const titleEl = item.querySelector(selectors.title);
        const rewardEl = item.querySelector(selectors.reward);
        const durationEl = item.querySelector(selectors.duration);
        const rewardText = rewardEl?.textContent?.trim() || '0';
        const rewardMatch = rewardText.match(/[\d,]+/);
        const reward = rewardMatch ? parseInt(rewardMatch[0].replace(/,/g, ''), 10) : 0;
        const durationText = durationEl?.textContent?.trim() || '0';
        const durationMatch = durationText.match(/(\d+)/);
        const duration = durationMatch ? parseInt(durationMatch[1], 10) : 0;
        return { index, title: titleEl?.textContent?.trim() || 'Survey ' + (index + 1), reward, rewardText, duration, efficiency: duration > 0 ? (reward / duration).toFixed(1) : 0 };
      });
    }, { title: SELECTORS.surveyList.title, reward: SELECTORS.surveyList.reward, duration: SELECTORS.surveyList.duration });
    const validSurveys = surveys.filter(s => s.reward > 0).sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency));
    logger.info('YouGov: Found ' + validSurveys.length + ' valid surveys');
    return validSurveys;
  } catch (error) {
    logger.error('YouGov: Find surveys error - ' + error.message);
    return [];
  }
}

async function startSurvey(page, surveyIndex) {
  try {
    logger.info('YouGov: Starting survey at index ' + surveyIndex);
    const startButtons = await page.$$(SELECTORS.surveyList.startButton);
    if (surveyIndex >= startButtons.length) return false;
    await startButtons[surveyIndex].click();
    await page.waitForTimeout(3000);
    return true;
  } catch (error) {
    logger.error('YouGov: Start survey error - ' + error.message);
    return false;
  }
}

async function getBalance(page) {
  try {
    const balanceEl = await page.$(SELECTORS.account.balance);
    if (!balanceEl) return 0;
    const balanceText = await balanceEl.textContent();
    const match = balanceText.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, ''), 10) : 0;
  } catch (error) { return 0; }
}

async function isLoggedIn(page) {
  try {
    const profileEl = await page.$(SELECTORS.account.profile);
    const balanceEl = await page.$(SELECTORS.account.balance);
    return !!(profileEl || balanceEl);
  } catch (error) { return false; }
}

async function detectQuestionType(page) {
  const types = { radio: await page.$$(SELECTORS.surveyPage.radioOption), checkbox: await page.$$(SELECTORS.surveyPage.checkboxOption), text: await page.$$(SELECTORS.surveyPage.textInput) };
  let questionType = 'unknown', options = 0;
  if (types.radio.length > 0) { questionType = 'single_choice'; options = types.radio.length; }
  else if (types.checkbox.length > 0) { questionType = 'multiple_choice'; options = types.checkbox.length; }
  else if (types.text.length > 0) { questionType = 'text'; options = types.text.length; }
  const questionEl = await page.$(SELECTORS.surveyPage.question);
  const questionText = questionEl ? await questionEl.textContent() : '';
  return { type: questionType, options, questionText: questionText.trim(), hasNext: !!(await page.$(SELECTORS.surveyPage.nextButton)) };
}

function randomDelay(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

module.exports = { PLATFORM_INFO, SELECTORS, login, findSurveys, startSurvey, getBalance, isLoggedIn, detectQuestionType };
