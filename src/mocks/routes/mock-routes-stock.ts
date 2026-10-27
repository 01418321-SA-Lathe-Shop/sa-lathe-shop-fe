// Stable registration order; domain implementations live beside their helpers.
import type { Route } from '../core/mock-backend.ts';
import { inventoryRoutes } from './inventory/routes.ts';
import { procurementRoutes } from './procurement/routes.ts';
import { receivingRoutes } from './receiving/routes.ts';

export const stockRoutes: Route[] = [...inventoryRoutes, ...procurementRoutes, ...receivingRoutes];
export { allocate,freeStock,materialById,moveStock,planView,reservedTotal,type PlanLine } from './inventory/helpers.ts';
