/**
 * Appen Platform Handler
 * AI training data tasks (formerly Figure Eight/CrowdFlower)
 * 
 * URL: https://connect.appen.com
 * Reward Type: Cash (USD)
 * Min Payout: $1.00 via PayPal
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
  name: 'Appen',
  url: 'https://connect.appen.com',
  type: 'ai_training',
  rewardType: 'cash',
  rewardCurrency: 'USD',
  minPayout: 1.00,
  loginRequired: true,
  captchaExpected: false,
  taskTypes: ['data_annotation', 'image_labeling', 'audio_transcription', 'text_evaluation', 'search_evaluation']
};

// CSS Selectors for Appen Connect
const SELECTORS = {
  // Login page
  loginForm: {
    email: 'input[name="email"], input[type="email"], #email',
    password: 'input[name="password"], input[type="password"], #password',
    submit: 'button[type="submit"], .login-btn, input[type="submit"]',
    loginError: '.error-message, .alert-error, .login-error'
  },
  
  // Project list
  projectList: {
    container: '.project-list, .job-list, .available-projects',
    item: '.project-item, .job-card, .project-row',
    title: '.project-title, .job-title, h3',
    reward: '.project-pay, .job-reward, .pay-rate',
    taskCount: '.task-count, .available-count, .job-quantity',
    startButton: '.start-project, .begin-work, a.btn-primary',
    status: '.project-status, .qualification-status'
  },
  
  // Task page
  taskPage: {
    instruction: '.instruction, .task-instruction, .guidelines',
    question: '.question, .task-prompt, .annotation-task',
    input: 'input, textarea, select, .annotation-tool',
    submitButton: 'button[type="submit"], .submit-judgment, .next-task',
    skipButton: '.skip-task, .cannot-judge',
    progress: '.progress, .task-progress, .completion-rate',
    timer: '.timer, .time-limit'
  },
  
  // Account
  account: {
    balance: '.balance, .earnings, .account-balance',
    pendingBalance: '.pending, .pending-earnings',
    profile: '.profile, .user-menu, .account-dropdown',
    qualifications: '.qualifications, .skill-badges'
  }
};

/**
 * Login to Appen Connect
 * @param {Page} page - Playwright page instance
 * @param {object} credentials - { email, password }
 * @returns {Promise<boolean>} Login success
 */
async function login(page, credentials) {
  try {
    logger.info('Appen: Starting login flow');
    
    await page.goto('https://connect.appen.com/qrp/core/login', { 
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
      logger.error(`Appen: Login failed - ${errorText}`);
      return false;
    }
    
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('connect.appen.com') && 
                       !currentUrl.includes('login');
    
    if (isLoggedIn) {
      logger.info('Appen: Login successful');
    }
    
    return isLoggedIn;
    
  } catch (error) {
    logger.error(`Appen: Login error - ${error.message}`);
    return false;
  }
}

/**
 * Find available projects on Appen
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object[]>} Array of project objects
 */
async function findSurveys(page) {
  try {
    logger.info('Appen: Finding available projects');
    
    await page.goto('https://connect.appen.com/qrp/core/vendors/tasks', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector(SELECTORS.projectList.container, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    const projects = await page.$$eval(
      SELECTORS.projectList.item,
      (items, selectors) => {
        return items.map((item, index) => {
          const titleEl = item.querySelector(selectors.title);
          const rewardEl = item.querySelector(selectors.reward);
          const countEl = item.querySelector(selectors.taskCount);
          const statusEl = item.querySelector(selectors.status);
          
          // Parse reward (e.g., "$0.05/task" -> 0.05)
          const rewardText = rewardEl?.textContent?.trim() || '0';
          const rewardMatch = rewardText.match(/[\d.]+/);
          const reward = rewardMatch ? parseFloat(rewardMatch[0]) : 0;
          
          // Parse task count
          const countText = countEl?.textContent?.trim() || '0';
          const countMatch = countText.match(/(\d+)/);
          const taskCount = countMatch ? parseInt(countMatch[1], 10) : 0;
          
          return {
            index,
            title: titleEl?.textContent?.trim() || `Project ${index + 1}`,
            reward,
            rewardText,
            taskCount,
            status: statusEl?.textContent?.trim() || 'unknown',
            totalPotential: (reward * taskCount).toFixed(2)
          };
        });
      },
      {
        title: SELECTORS.projectList.title,
        reward: SELECTORS.projectList.reward,
        taskCount: SELECTORS.projectList.taskCount,
        status: SELECTORS.projectList.status
      }
    );
    
    const validProjects = projects
      .filter(p => p.reward > 0 && p.taskCount > 0)
      .sort((a, b) => parseFloat(b.totalPotential) - parseFloat(a.totalPotential));
    
    logger.info(`Appen: Found ${validProjects.length} valid projects`);
    return validProjects;
    
  } catch (error) {
    logger.error(`Appen: Find projects error - ${error.message}`);
    return [];
  }
}

/**
 * Start a specific project
 * @param {Page} page - Playwright page instance
 * @param {number} projectIndex - Index of project to start
 * @returns {Promise<boolean>} Success status
 */
async function startSurvey(page, projectIndex) {
  try {
    logger.info(`Appen: Starting project at index ${projectIndex}`);
    
    const startButtons = await page.$$(SELECTORS.projectList.startButton);
    
    if (projectIndex >= startButtons.length) {
      logger.error(`Appen: Project index ${projectIndex} out of range`);
      return false;
    }
    
    await startButtons[projectIndex].click();
    await page.waitForTimeout(3000);
    
    const taskVisible = await page.$(SELECTORS.taskPage.question);
    if (taskVisible) {
      logger.info('Appen: Project started successfully');
      return true;
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Appen: Start project error - ${error.message}`);
    return false;
  }
}

/**
 * Get current account balance
 * @param {Page} page - Playwright page instance
 * @returns {Promise<number>} Balance in USD
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
    logger.error(`Appen: Get balance error - ${error.message}`);
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
 * Detect task type on current page
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object>} Task info
 */
async function detectQuestionType(page) {
  const inputs = await page.$$(SELECTORS.taskPage.input);
  const instructionEl = await page.$(SELECTORS.taskPage.instruction);
  const instructionText = instructionEl ? await instructionEl.textContent() : '';
  
  return {
    type: 'annotation',
    inputCount: inputs.length,
    instructionText: instructionText.trim().substring(0, 200),
    hasSubmit: !!(await page.$(SELECTORS.taskPage.submitButton)),
    hasSkip: !!(await page.$(SELECTORS.taskPage.skipButton))
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
