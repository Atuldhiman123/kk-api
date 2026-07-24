import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAdminPayload {
  id: string;
  email: string;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdminPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: CurrentAdminPayload }>();
    return request.user;
  },
);
