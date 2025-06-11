import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public, meaning it does not require authentication.
 * This is used in conjunction with guards to allow unauthenticated access.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
