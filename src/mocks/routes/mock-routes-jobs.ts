// Stable registration order; domain implementations live beside their helpers.
import type { Route } from '../core/mock-backend.ts';
import { deliveryRoutes } from './delivery/routes.ts';
import { productionRoutes } from './production/routes.ts';

export const jobRoutes: Route[] = [...productionRoutes, ...deliveryRoutes];
