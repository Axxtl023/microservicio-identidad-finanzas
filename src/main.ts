require('dotenv').config();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173', 'https://booking-frontend-ashy.vercel.app'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ── gRPC FinanceService ────────────────────────────────────────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'booking.finance.v1',
      protoPath: join(__dirname, 'protos/finance.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT || 5002}`,
    },
  });

  const config = new DocumentBuilder()
    .setTitle('API de Identidad y Finanzas - Proyecto Booking')
    .setDescription('Gestión de usuarios, roles, clientes, facturas y pagos')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu token JWT',
        in: 'header',
      },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');
  console.log(`gRPC FinanceService escuchando en el puerto ${process.env.GRPC_PORT || 5002}`);
  console.log(`Microservicio Identidad & Finanzas corriendo en el puerto ${port}`);
}
bootstrap();

