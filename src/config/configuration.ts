/* eslint-disable no-process-env */
export const configuration = () => ({
  allowPrivateNetworkTargets:
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS === 'true',
  environment: process.env.NODE_ENV || 'development',
  evaluationSitesFile:
    process.env.EVALUATION_SITES_FILE || 'evaluation/phase1-sites.json',
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS || 30000),
  logLevel: process.env.LOG_LEVEL || 'info',
});
