import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'preview')
    .default('development'),
  LOG_LEVEL: Joi.string().valid(
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'trace',
    'silent',
  ),
  EVALUATION_SITES_FILE: Joi.string(),
  HEARTBEAT_INTERVAL_MS: Joi.number().positive(),
  ALLOW_PRIVATE_NETWORK_TARGETS: Joi.boolean(),
  CRAWLER_USER_AGENT: Joi.string(),
  CRAWLER_MAX_CONCURRENCY: Joi.number().integer().positive(),
  CRAWLER_MAX_REQUESTS_PER_SITE: Joi.number().integer().positive(),
  CRAWLER_MAX_REQUESTS_PER_MINUTE: Joi.number().integer().positive(),
  CRAWLER_SAME_DOMAIN_DELAY_SECONDS: Joi.number().min(0),
  CRAWLER_NAVIGATION_TIMEOUT_SECONDS: Joi.number().positive(),
  CRAWLER_MAX_REQUEST_RETRIES: Joi.number().integer().min(0),
  CRAWLER_RESPECT_ROBOTS_TXT: Joi.boolean(),
});
