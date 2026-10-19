import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_REQUIRED = 'allowPasswordChangeRequired';

/**
 * Marks a route as reachable by a user who must change their password before doing anything
 * else (e.g. accounts created with a temporary or seeded password).
 */
export const AllowPasswordChangeRequired = () => SetMetadata(ALLOW_PASSWORD_CHANGE_REQUIRED, true);
