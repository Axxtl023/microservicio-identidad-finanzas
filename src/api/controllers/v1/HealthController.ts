import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ApiResponse as ApiResult } from '../../common/api-response';

@ApiTags('Health Check')
@Controller('api/v1/health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verificar el estado general del microservicio' })
  @ApiResponse({ status: 200, description: 'Servicio operativo' })
  @ApiResponse({ status: 503, description: 'Algún servicio caído' })
  async check(): Promise<any> {
    let dbStatus = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch (err) {
      dbStatus = 'down';
    }

    const rabbitStatus = this.amqpConnection.connected ? 'up' : 'down';
    const allUp = dbStatus === 'up' && rabbitStatus === 'up';

    const result = {
      status: allUp ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        rabbitmq: rabbitStatus,
      },
    };

    if (!allUp) {
      throw new HttpException(
        { success: false, data: result, message: 'El servicio no está en un estado saludable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return ApiResult.ok(result, 'Servicio saludable');
  }

  @Get('rabbitmq')
  @ApiOperation({ summary: 'Verificar específicamente la conexión con RabbitMQ' })
  @ApiResponse({ status: 200, description: 'RabbitMQ conectado' })
  @ApiResponse({ status: 503, description: 'RabbitMQ desconectado' })
  async checkRabbit(): Promise<any> {
    const isConnected = this.amqpConnection.connected;
    const result = {
      rabbitmq: isConnected ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };

    if (!isConnected) {
      throw new HttpException(
        { success: false, data: result, message: 'RabbitMQ desconectado' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return ApiResult.ok(result, 'RabbitMQ operativo');
  }
}
