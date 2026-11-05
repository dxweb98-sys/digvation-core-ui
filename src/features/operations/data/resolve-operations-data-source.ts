import { isCoreMode, notConnectedDataSource } from '../../../shared/data/data-availability';
import {createMockOperationsDataSource}from'./mock-operations-data-source'; export const resolveOperationsDataSource=()=>isCoreMode()?notConnectedDataSource<ReturnType<typeof createMockOperationsDataSource>>('Operations'):createMockOperationsDataSource();
