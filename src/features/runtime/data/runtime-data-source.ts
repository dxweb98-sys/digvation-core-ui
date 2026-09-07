import type { RuntimeData, RuntimeServiceDetail } from '../types/runtime';
export interface RuntimeDataSource { getRuntimeData(): Promise<RuntimeData>; getInstallationRuntime(installationId: string): Promise<RuntimeServiceDetail[]>; }
