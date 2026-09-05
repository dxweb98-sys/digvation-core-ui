export type FoundationStatus = 'ready' | 'deferred';

export interface FoundationCapability {
  id: string;
  name: string;
  description: string;
  status: FoundationStatus;
}

export interface OverviewFoundation {
  dataSourceLabel: string;
  capabilities: FoundationCapability[];
}
