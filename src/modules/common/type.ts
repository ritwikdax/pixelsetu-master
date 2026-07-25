export interface Metadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppConfig {
  MONGODB_URI: string;
  MONGO_DB_NAME: string;
  GCP_SERVICE_ACCOUNT_B64: string;
  REDIS_URI: string;
}
