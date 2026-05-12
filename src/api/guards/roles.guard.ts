import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ApiResponse } from '../common/api-response';
import type { JwtPayload } from '../../business/auth/interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user || !user.rol) {
      throw new ForbiddenException(ApiResponse.fail('Acceso denegado: sin rol asignado'));
    }

    const userRol = user.rol.toLowerCase();
    if (!requiredRoles.some((role) => role.toLowerCase() === userRol)) {
      throw new ForbiddenException(
        ApiResponse.fail('Acceso denegado: permisos insuficientes'),
      );
    }

    return true;
  }
}
