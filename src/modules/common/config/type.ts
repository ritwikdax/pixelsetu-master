export interface EntityMetadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppConfig {
  MONGODB_URI: string;
  MONGO_DB_NAME: string;
  GCP_SERVICE_ACCOUNT_B64: string;
  REDIS_URI: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}
