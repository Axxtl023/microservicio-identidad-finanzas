import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Intenta marcar el mensaje como procesado.
   * @returns `true` si es la primera vez que se procesa (continuar proceso)
   * @returns `false` si ya fue procesado antes (mensaje duplicado, ignorar)
   */
  async tryMarkProcessed(eventId: string, eventType: string): Promise<boolean> {
    try {
      await this.prisma.processed_messages.create({
        data: {
          event_id: eventId,
          event_type: eventType,
        },
      });
      return true;
    } catch (err: unknown) {
      // Prisma lanza P2002 en violación de UNIQUE constraint
      const prismaError = err as { code?: string };
      if (prismaError?.code === 'P2002') {
        this.logger.debug(`[inbox] Mensaje duplicado ${eventId}, ignorando`);
        return false;
      }
      throw err;
    }
  }

  /**
   * Limpieza semanal: elimina mensajes procesados más viejos de 30 días.
   * Evita que la tabla crezca indefinidamente.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldMessages(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { count } = await this.prisma.processed_messages.deleteMany({
      where: {
        processed_at: { lt: cutoff },
      },
    });

    if (count > 0) {
      this.logger.log(`[inbox] Limpieza: ${count} mensajes procesados eliminados (>30 días)`);
    }
  }
}
