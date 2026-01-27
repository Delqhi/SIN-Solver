/**
 * Clickworker Platform Handler
 * Microtask platform with various task types including surveys
 * 
 * URL: https://www.clickworker.com
 * Reward Type: Cash (EUR/USD)
 * Min Payout: €5.00 via PayPal
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
  name: 'Clickworker',
  url: 'https://www.clickworker.com',
  type: 'microtask',
  rewardType: 'cash',
  rewardCurrency: 'EUR',
  minPayout: 5.00,
  loginRequired: true,
  captchaExpected: false,
  taskTypes: ['surveys', 'data_entry', 'text_creation', 'categorization', 'research']
};

// CSS Selectors for Clickworker
const SELECTORS = {
  // Login page
  loginForm: {
    email: '#username, input[name="username"], input[type="email"]',
    password: '#password, input[name="password"], input[type="password"]',
    submit: 'button[type="submit"], .btn-login, input[type="submit"]',
    loginError: '.error-message, .alert-danger, .login-error'
  },
  
  // Task list (workplace)
  taskList: {
    container: '.job-list, #jobList, .task-container, .available-jobs',
    item: '.job-item, .task-item, .job-row, tr.job',
    title: '.job-title, .task-title, td.title',
    reward: '.job-payment, .task-reward, td.payment',
    duration: '.job-time, .task-duration, td.time',
    quantity: '.job-quantity, .task-count, td.quantity',
    startButton: '.start-job, .accept-btn, a.btn-primary, button.start-task',
    status: '.job-status, .availability'
  },
  
  // Task page (inside task)
  taskPage: {
    question: '.question, .task-question, .instruction',
    input: 'input, textarea, select',
    submitButton: 'button[type="submit"], .submit-btn, .complete-task',
    progress: '.progress, .task-progress',
    timer: '.timer, .time-remaining',
    errorMessage: '.error, .validation-error'
  },
  
  // Account
  account: {
    balance: '.balance, .account-balance, .earnings-total',
    earnings: '.earnings, .total-earned',
    profile: '.profile, .user-menu, .account-dropdown'
  }
};

/**
 * Login to Clickworker account
 * @param {Page} page - Playwright page instance
 * @param {object} credentials - { email, password }
 * @returns {Promise<boolean>} Login success
 */
async function login(page, credentials) {
  try {
    logger.info('Clickworker: Starting login flow');
    
    await page.goto('https://workplace.clickworker.com/en/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForSelector(SELECTORS.loginForm.email, { timeout: 10000 });
    
    await page.fill(SELECTORS.loginForm.email, credentials.email);
    await page.waitForTimeout(randomDelay(300, 600));
    await page.fill(SELECTORS.loginForm.password, credentials.password);
    await page.waitForTimeout(randomDelay(200, 400));
    
    await page.click(SELECTORS.loginForm.submit);
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
    
    const loginError = await page.$(SELECTORS.loginForm.loginError);
    if (loginError) {
      const errorText = await loginError.textContent();
      logger.error(`Clickworker: Login failed - ${errorText}`);
      return false;
    }
    
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('workplace.clickworker.com') && 
                       !currentUrl.includes('login');
    
    if (isLoggedIn) {
      logger.info('Clickworker: Login successful');
    }
    
    return isLoggedIn;
    
  } catch (error) {
    logger.error(`Clickworker: Login error - ${error.message}`);
    return false;
  }
}

/**
 * Find available tasks on Clickworker
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object[]>} Array of task objects
 */
async function findSurveys(page) {
  try {
    logger.info('Clickworker: Finding available tasks');
    
    await page.goto('https://workplace.clickworker.com/en/jobs', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector(SELECTORS.taskList.container, { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const tasks = await page.$$eval(
      SELECTORS.taskList.item,
      (items, selectors) => {
        return items.map((item, index) => {
          const titleEl = item.querySelector(selectors.title);
          const rewardEl = item.querySelector(selectors.reward);
          const durationEl = item.querySelector(selectors.duration);
          const quantityEl = item.querySelector(selectors.quantity);
          
          // Parse reward (e.g., "€0.15" -> 0.15)
          const rewardText = rewardEl?.textContent?.trim() || '0';
          const rewardMatch = rewardText.match(/[\d.]+/);
          const reward = rewardMatch ? parseFloat(rewardMatch[0]) : 0;
          
          // Parse duration
          const durationText = durationEl?.textContent?.trim() || '0';
          const durationMatch = durationText.match(/(\d+)/);
          const duration = durationMatch ? parseInt(durationMatch[1], 10) : 0;
          
          // Parse quantity available
          const quantityText = quantityEl?.textContent?.trim() || '0';
          const quantityMatch = quantityText.match(/(\d+)/);
          const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 0;
          
          return {
            index,
            title: titleEl?.textContent?.trim() || `Task ${index + 1}`,
            reward,
            rewardText,
            duration,
            durationText,
            quantity,
            efficiency: duration > 0 ? ((reward * 60) / duration).toFixed(2) : 0 // €/hour
          };
        });
      },
      {
        title: SELECTORS.taskList.title,
        reward: SELECTORS.taskList.reward,
        duration: SELECTORS.taskList.duration,
        quantity: SELECTORS.taskList.quantity
      }
    );
    
    const validTasks = tasks
      .filter(t => t.reward > 0 && t.quantity > 0)
      .sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency));
    
    logger.info(`Clickworker: Found ${validTasks.length} valid tasks`);
    return validTasks;
    
  } catch (error) {
    logger.error(`Clickworker: Find tasks error - ${error.message}`);
    return [];
  }
}

/**
 * Start a specific task
 * @param {Page} page - Playwright page instance
 * @param {number} taskIndex - Index of task to start
 * @returns {Promise<boolean>} Success status
 */
async function startSurvey(page, taskIndex) {
  try {
    logger.info(`Clickworker: Starting task at index ${taskIndex}`);
    
    const startButtons = await page.$$(SELECTORS.taskList.startButton);
    
    if (taskIndex >= startButtons.length) {
      logger.error(`Clickworker: Task index ${taskIndex} out of range`);
      return false;
    }
    
    await startButtons[taskIndex].click();
    await page.waitForTimeout(3000);
    
    const questionVisible = await page.$(SELECTORS.taskPage.question);
    if (questionVisible) {
      logger.info('Clickworker: Task started successfully');
      return true;
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Clickworker: Start task error - ${error.message}`);
    return false;
  }
}

/**
 * Get current account balance
 * @param {Page} page - Playwright page instance
 * @returns {Promise<number>} Balance in EUR
 */
async function getBalance(page) {
  try {
    const balanceEl = await page.$(SELECTORS.account.balance);
    if (!balanceEl) return 0;
    
    const balanceText = await balanceEl.textContent();
    const match = balanceText.match(/[\d.]+/);
    if (!match) return 0;
    
    return parseFloat(match[0]);
  } catch (error) {
    logger.error(`Clickworker: Get balance error - ${error.message}`);
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
    const profileEl = await page.$(SELECTORS.account.profile);
    const balanceEl = await page.$(SELECTORS.account.balance);
    return !!(profileEl || balanceEl);
  } catch (error) {
    return false;
  }
}

/**
 * Detect task/question type on current page
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object>} Question info
 */
async function detectQuestionType(page) {
  const inputs = await page.$$(SELECTORS.taskPage.input);
  const questionEl = await page.$(SELECTORS.taskPage.question);
  const questionText = questionEl ? await questionEl.textContent() : '';
  
  return {
    type: 'microtask',
    inputCount: inputs.length,
    questionText: questionText.trim(),
    hasSubmit: !!(await page.$(SELECTORS.taskPage.submitButton))
  };
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
