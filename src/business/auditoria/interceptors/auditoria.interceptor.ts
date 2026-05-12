import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
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
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      body: unknown;
      ip: string;
      user?: JwtPayload;
    }>();

    const accion = METHOD_ACCION[request.method];
    if (!accion) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const tabla = this.extractTabla(request.url);
        void this.auditoriaService
          .log({
            idUsuario: request.user?.sub ?? null,
            accion,
            tabla,
            valorNuevo: request.method !== 'DELETE' ? request.body : undefined,
            ip: request.ip,
          })
          .catch(() => {});
      }),
    );
  }

  private extractTabla(url: string): string {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    const v1Index = parts.findIndex((p) => /^v\d+$/i.test(p));
    return v1Index >= 0 && parts[v1Index + 1] ? parts[v1Index + 1] : 'unknown';
  }
}
