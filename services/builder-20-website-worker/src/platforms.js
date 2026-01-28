/**
 * Platform Configurations
 * 
 * Supported platforms for automated website tasks:
 * - Survey platforms (Swagbucks, Prolific, Toluna, etc.)
 * - Micro-task platforms (Clickworker, MTurk, Appen)
 * - Reward platforms (LifePoints, YouGov)
 */

const PLATFORMS = {
  swagbucks: {
    id: 'swagbucks',
    name: 'Swagbucks',
    type: 'survey',
    loginUrl: 'https://www.swagbucks.com/p/login',
    dashboardUrl: 'https://www.swagbucks.com/surveys',
    selectors: {
      email: '#sbxJxEmail, input[name="emailAddress"]',
      password: '#sbxJxPassword, input[name="password"]',
      submit: 'button[type="submit"], .loginBtn',
      surveys: '.surveyItem, .survey-card, [data-survey-id]',
      surveyTitle: '.surveyTitle, .survey-name',
      surveyReward: '.surveyReward, .sb-amount'
    },
    rateLimit: {
      minDelay: 5000,
      maxDelay: 15000,
      maxTasksPerHour: 10
    },
    features: ['surveys', 'offers', 'videos']
  },

  prolific: {
    id: 'prolific',
    name: 'Prolific',
    type: 'research',
    loginUrl: 'https://app.prolific.co/login',
    dashboardUrl: 'https://app.prolific.co/studies',
    selectors: {
      email: 'input[name="email"], #email',
      password: 'input[name="password"], #password',
      submit: 'button[type="submit"]',
      studies: '.study-card, [data-study-id]',
      studyTitle: '.study-title',
      studyReward: '.study-reward'
    },
    rateLimit: {
      minDelay: 3000,
      maxDelay: 8000,
      maxTasksPerHour: 20
    },
    features: ['academic_studies']
  },

  toluna: {
    id: 'toluna',
    name: 'Toluna',
    type: 'survey',
    loginUrl: 'https://de.toluna.com/signin',
    dashboardUrl: 'https://de.toluna.com/surveys',
    selectors: {
      email: '#Email, input[name="email"]',
      password: '#Password, input[name="password"]',
      submit: 'button[type="submit"], .signin-btn',
      surveys: '.survey-card, .survey-item',
      surveyTitle: '.survey-title',
      surveyReward: '.survey-points'
    },
    rateLimit: {
      minDelay: 5000,
      maxDelay: 12000,
      maxTasksPerHour: 15
    },
    features: ['surveys', 'polls', 'community']
  },

  clickworker: {
    id: 'clickworker',
    name: 'Clickworker',
    type: 'microtask',
    loginUrl: 'https://workplace.clickworker.com/en/login',
    dashboardUrl: 'https://workplace.clickworker.com/en/jobs',
    selectors: {
      email: '#username, input[name="username"]',
      password: '#password, input[name="password"]',
      submit: 'button[type="submit"]',
      jobs: '.job-item, .job-card, [data-job-id]',
      jobTitle: '.job-title',
      jobReward: '.job-payment'
    },
    rateLimit: {
      minDelay: 3000,
      maxDelay: 10000,
      maxTasksPerHour: 30
    },
    features: ['uhrs', 'writing', 'data_entry']
  },

  mturk: {
    id: 'mturk',
    name: 'Amazon MTurk',
    type: 'microtask',
    loginUrl: 'https://worker.mturk.com/',
    dashboardUrl: 'https://worker.mturk.com/projects',
    selectors: {
      email: '#ap_email',
      password: '#ap_password',
      submit: '#signInSubmit',
      hits: '.hit-row, .project-link',
      hitTitle: '.project-title',
      hitReward: '.reward'
    },
    rateLimit: {
      minDelay: 2000,
      maxDelay: 8000,
      maxTasksPerHour: 50
    },
    features: ['hits', 'qualifications']
  },

  appen: {
    id: 'appen',
    name: 'Appen',
    type: 'microtask',
    loginUrl: 'https://connect.appen.com/qrp/core/login',
    dashboardUrl: 'https://connect.appen.com/qrp/core/vendors/workflows',
    selectors: {
      email: '#email, input[name="email"]',
      password: '#password, input[name="password"]',
      submit: 'button[type="submit"]',
      projects: '.project-row, .workflow-item',
      projectTitle: '.project-name',
      projectRate: '.pay-rate'
    },
    rateLimit: {
      minDelay: 5000,
      maxDelay: 15000,
      maxTasksPerHour: 20
    },
    features: ['ai_training', 'annotation']
  },

  lifepoints: {
    id: 'lifepoints',
    name: 'LifePoints',
    type: 'survey',
    loginUrl: 'https://www.lifepointspanel.com/login',
    dashboardUrl: 'https://www.lifepointspanel.com/surveys',
    selectors: {
      email: '#email, input[name="email"]',
      password: '#password, input[name="password"]',
      submit: 'button[type="submit"]',
      surveys: '.survey-card, .available-survey',
      surveyTitle: '.survey-title',
      surveyReward: '.survey-points'
    },
    rateLimit: {
      minDelay: 5000,
      maxDelay: 12000,
      maxTasksPerHour: 10
    },
    features: ['surveys']
  },

  yougov: {
    id: 'yougov',
    name: 'YouGov',
    type: 'survey',
    loginUrl: 'https://account.yougov.com/de-de/login',
    dashboardUrl: 'https://yougov.de/surveys',
    selectors: {
      email: '#email, input[name="email"]',
      password: '#password, input[name="password"]',
      submit: 'button[type="submit"]',
      surveys: '.survey-item, .poll-card',
      surveyTitle: '.survey-title',
      surveyReward: '.survey-points'
    },
    rateLimit: {
      minDelay: 5000,
      maxDelay: 15000,
      maxTasksPerHour: 8
    },
    features: ['surveys', 'polls', 'opinions']
  }
};

/**
 * Get platform configuration by ID
 */
function getPlatformConfig(platformId) {
  return PLATFORMS[platformId] || null;
}

/**
 * Get list of supported platform IDs
 */
function getSupportedPlatforms() {
  return Object.keys(PLATFORMS);
}

/**
 * Get platforms by type
 */
function getPlatformsByType(type) {
  return Object.values(PLATFORMS).filter(p => p.type === type);
}

/**
 * Get platform info (public data only, no selectors)
 */
function getPlatformInfo(platformId) {
  const platform = PLATFORMS[platformId];
  if (!platform) return null;

  return {
    id: platform.id,
    name: platform.name,
    type: platform.type,
    features: platform.features,
    rateLimit: platform.rateLimit
  };
}

/**
 * Get all platforms info
 */
function getAllPlatformsInfo() {
  return Object.values(PLATFORMS).map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    features: p.features
  }));
}

module.exports = {
  PLATFORMS,
  getPlatformConfig,
  getSupportedPlatforms,
  getPlatformsByType,
  getPlatformInfo,
  getAllPlatformsInfo
};
