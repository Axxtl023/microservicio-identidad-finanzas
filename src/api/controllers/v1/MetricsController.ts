import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { MetricsService } from '../../../common/observability/metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener métricas en formato compatible con Prometheus' })
  @ApiResponse({ status: 200, description: 'Métricas generadas' })
  getMetrics(@Res() res: Response): void {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(this.metrics.getMetricsText());
  }
}

