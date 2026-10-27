// Stable registration order; domain implementations live beside their helpers.
import type { Route } from '../core/mock-backend.ts';
import { authRoutes } from './auth/routes.ts';
import { fulfillmentRoutes } from './fulfillment/routes.ts';
import { inboxRoutes } from './inbox/routes.ts';
import { membershipsRoutes } from './memberships/routes.ts';
import { quotationsRoutes } from './quotations/routes.ts';
import { requestsRoutes } from './requests/routes.ts';
import { workersRoutes } from './workers/routes.ts';

export const salesRoutes: Route[] = [...authRoutes, ...workersRoutes, ...membershipsRoutes, ...inboxRoutes, ...requestsRoutes, ...quotationsRoutes, ...fulfillmentRoutes];
export { publicAccount } from './auth/helpers.ts';
export { jobView } from './fulfillment/helpers.ts';
export { memberCustomers,memberIds } from './memberships/helpers.ts';
export { termsFor } from './quotations/helpers.ts';
export { visibleRequest } from './requests/helpers.ts';
export { workerView } from './workers/helpers.ts';
