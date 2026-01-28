import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../api-types';

export const trpc = createTRPCReact<AppRouter>();
