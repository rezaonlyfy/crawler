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
});
