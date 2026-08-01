export interface EntityMetadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  orgId?: string; // Optional orgId for entities that belong to an organization
}
