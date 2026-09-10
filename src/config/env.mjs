export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  trustProxyHops: process.env.TRUST_PROXY_HOPS ? Number(process.env.TRUST_PROXY_HOPS) : null,
  adminPassword: process.env.ADMIN_PASSWORD,
  databaseUrl: process.env.DATABASE_URL,
  dataDir: process.env.DATA_DIR,
};

if (config.trustProxyHops !== null) {
  if (!Number.isInteger(config.trustProxyHops) || config.trustProxyHops < 1 || config.trustProxyHops > 5) {
    throw Error('TRUST_PROXY_HOPS inválido.');
  }
}
