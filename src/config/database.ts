/**
 * Oracle Database 설정
 *
 * 환경 변수가 설정되어 있으면 환경 변수 값 사용,
 * 없으면 기본값(로컬 개발용) 사용
 */

const getEnv = (key: string, defaultValue: string): string => {
  return process.env[key] ?? defaultValue;
};

export const DB_CONFIG = {
  username: getEnv("DB_USERNAME", "your_username"),
  password: getEnv("DB_PASSWORD", "your_password"),
  dsn: getEnv("DB_DSN", "your_dsn"),
  walletLocation: getEnv("DB_WALLET_LOCATION", "/path/to/wallet"),
  walletPassword: getEnv("DB_WALLET_PASSWORD", "your_wallet_password"),
};
