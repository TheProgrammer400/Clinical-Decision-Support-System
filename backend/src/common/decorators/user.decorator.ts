import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

/** The authenticated principal, re-read from the database on every request. */
export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  organizationId: string | null;
  mustChangePassword: boolean;
}

/** @deprecated kept as an alias for existing imports. */
export type UserPayload = AuthUser;

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    return data ? user?.[data] : user;
  },
);
