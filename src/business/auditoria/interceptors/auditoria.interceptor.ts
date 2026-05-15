import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { IAuditoriaService } from '../interfaces/i-auditoria.service';
import { IAUDITORIA_SERVICE } from '../interfaces/i-auditoria.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

const METHOD_ACCION: Record<string, 'CREATE' | 'UPDATE' | 'DELETE'> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(
    @Inject(IAUDITORIA_SERVICE)
    private readonly auditoriaService: IAuditoriaService,
    private readonly jwtService: JwtService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      body: unknown;
      ip: string;
      user?: JwtPayload;
      headers: Record<string, string | undefined>;
    }>();

    const accion = METHOD_ACCION[request.method];
    if (!accion) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const tabla = this.extractTabla(request.url);
        const idUsuario = this.extractUserId(request);
        void this.auditoriaService
          .log({
            idUsuario,
            accion,
            tabla,
            valorNuevo: request.method !== 'DELETE' ? request.body : undefined,
            ip: request.ip,
          })
          .catch(() => {});
      }),
    );
  }

  private extractUserId(request: {
    user?: JwtPayload;
    headers: Record<string, string | undefined>;
  }): string | null {
    if (request.user?.sub) return request.user.sub;
    const auth = request.headers['authorization'];
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = this.jwtService.decode(auth.slice(7)) as JwtPayload | null;
        return payload?.sub ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private extractTabla(url: string): string {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    const v1Index = parts.findIndex((p) => /^v\d+$/i.test(p));
    return v1Index >= 0 && parts[v1Index + 1] ? parts[v1Index + 1] : 'unknown';
  }
}
