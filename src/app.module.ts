import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaService } from './common/prisma/prisma.service';

// ─── Data Access ───────────────────────────────────────────────────────────────
import { UsuarioAppRepository } from './data-access/repositories/usuario-app.repository';
import { IUSUARIO_APP_REPOSITORY } from './data-access/repositories/interfaces/i-usuario-app.repository';
import { UsuarioRepository } from './data-access/repositories/usuario.repository';
import { IUSUARIO_REPOSITORY } from './data-access/repositories/interfaces/i-usuario.repository';
import { ClienteRepository } from './data-access/repositories/cliente.repository';
import { ICLIENTE_REPOSITORY } from './data-access/repositories/interfaces/i-cliente.repository';
import { FacturasRepository } from './data-access/repositories/facturas.repository';
import { IFACTURAS_REPOSITORY } from './data-access/repositories/interfaces/i-facturas.repository';
import { DetallesFacturaRepository } from './data-access/repositories/detalles-factura.repository';
import { IDETALLES_FACTURA_REPOSITORY } from './data-access/repositories/interfaces/i-detalles-factura.repository';
import { PagosRepository } from './data-access/repositories/pagos.repository';
import { IPAGOS_REPOSITORY } from './data-access/repositories/interfaces/i-pagos.repository';
import { MetodosPagoRepository } from './data-access/repositories/metodos-pago.repository';
import { IMETODOS_PAGO_REPOSITORY } from './data-access/repositories/interfaces/i-metodos-pago.repository';
import { AuditoriaRepository } from './data-access/repositories/auditoria.repository';
import { IAUDITORIA_REPOSITORY } from './data-access/repositories/interfaces/i-auditoria.repository';

// ─── Data Management ───────────────────────────────────────────────────────────
import { UnitOfWork } from './data-management/unit-of-work';
import { IUNIT_OF_WORK } from './data-management/interfaces/i-unit-of-work';

// ─── Business ──────────────────────────────────────────────────────────────────
import { AuthService } from './business/auth/auth.service';
import { IAUTH_SERVICE } from './business/auth/interfaces/i-auth.service';
import { JwtStrategy } from './business/auth/strategies/jwt.strategy';
import { UsuariosService } from './business/usuarios/usuarios.service';
import { IUSUARIOS_SERVICE } from './business/usuarios/interfaces/i-usuarios.service';
import { ClientesService } from './business/clientes/clientes.service';
import { ICLIENTES_SERVICE } from './business/clientes/interfaces/i-clientes.service';
import { FacturacionService } from './business/facturacion/facturacion.service';
import { IFACTURACION_SERVICE } from './business/facturacion/interfaces/i-facturacion.service';
import { MetodosPagoService } from './business/facturacion/metodos-pago.service';
import { IMETODOS_PAGO_SERVICE } from './business/facturacion/interfaces/i-metodos-pago.service';
import { AuditoriaService } from './business/auditoria/auditoria.service';
import { IAUDITORIA_SERVICE } from './business/auditoria/interfaces/i-auditoria.service';
import { AuditoriaInterceptor } from './business/auditoria/interceptors/auditoria.interceptor';

// ─── API ───────────────────────────────────────────────────────────────────────
import { AuthController } from './api/controllers/v1/AuthController';
import { UsuariosController } from './api/controllers/v1/UsuariosController';
import { ClientesController } from './api/controllers/v1/ClientesController';
import { FacturasController } from './api/controllers/v1/FacturasController';
import { MetodosPagoController } from './api/controllers/v1/MetodosPagoController';
import { AuditoriaController } from './api/controllers/v1/AuditoriaController';
import { FinanceGrpcController } from './api/controllers/grpc/FinanceGrpcController';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as any },
      }),
    }),
  ],
  controllers: [
    AuthController,
    UsuariosController,
    ClientesController,
    FacturasController,
    MetodosPagoController,
    AuditoriaController,
    FinanceGrpcController,
  ],
  providers: [
    PrismaService,

    // ── Repositories ──────────────────────────────────────────────────────────
    UsuarioAppRepository,
    { provide: IUSUARIO_APP_REPOSITORY, useExisting: UsuarioAppRepository },
    UsuarioRepository,
    { provide: IUSUARIO_REPOSITORY, useExisting: UsuarioRepository },
    ClienteRepository,
    { provide: ICLIENTE_REPOSITORY, useExisting: ClienteRepository },
    FacturasRepository,
    { provide: IFACTURAS_REPOSITORY, useExisting: FacturasRepository },
    DetallesFacturaRepository,
    { provide: IDETALLES_FACTURA_REPOSITORY, useExisting: DetallesFacturaRepository },
    PagosRepository,
    { provide: IPAGOS_REPOSITORY, useExisting: PagosRepository },
    MetodosPagoRepository,
    { provide: IMETODOS_PAGO_REPOSITORY, useExisting: MetodosPagoRepository },
    AuditoriaRepository,
    { provide: IAUDITORIA_REPOSITORY, useExisting: AuditoriaRepository },

    // ── Data Management ───────────────────────────────────────────────────────
    UnitOfWork,
    { provide: IUNIT_OF_WORK, useExisting: UnitOfWork },

    // ── Business Services ─────────────────────────────────────────────────────
    AuthService,
    { provide: IAUTH_SERVICE, useExisting: AuthService },
    UsuariosService,
    { provide: IUSUARIOS_SERVICE, useExisting: UsuariosService },
    ClientesService,
    { provide: ICLIENTES_SERVICE, useExisting: ClientesService },
    FacturacionService,
    { provide: IFACTURACION_SERVICE, useExisting: FacturacionService },
    MetodosPagoService,
    { provide: IMETODOS_PAGO_SERVICE, useExisting: MetodosPagoService },
    AuditoriaService,
    { provide: IAUDITORIA_SERVICE, useExisting: AuditoriaService },

    // ── Auth ──────────────────────────────────────────────────────────────────
    JwtStrategy,

    // ── Global Interceptors ───────────────────────────────────────────────────
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
  ],
})
export class AppModule {}
