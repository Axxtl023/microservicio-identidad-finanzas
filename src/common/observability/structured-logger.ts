import { ConsoleLogger, Injectable, Scope, LogLevel } from '@nestjs/common';
import { getCorrelationId } from './trace-context';

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger extends ConsoleLogger {
  protected formatPid(pid: number): string {
    return `[${pid}]`;
  }

  protected override printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
  ): void {
    const correlationId = getCorrelationId();

    if (process.env.NODE_ENV === 'production' || process.env.STRUCTURED_LOG === 'true') {
      const output = messages
        .map((msg) => {
          const entry: Record<string, unknown> = {
            timestamp: new Date().toISOString(),
            level: logLevel,
            context: context || this.context || 'Application',
            message: typeof msg === 'object' ? msg : String(msg),
          };
          if (correlationId) entry.correlationId = correlationId;
          return JSON.stringify(entry);
        })
        .join('\n');

      process[writeStreamType === 'stderr' ? 'stderr' : 'stdout'].write(output + '\n');
      return;
    }

    // Development: inject correlationId into standard colorized output
    if (correlationId) {
      const prefixedMessages = messages.map((msg) =>
        typeof msg === 'string' ? `\x1b[35m[${correlationId}]\x1b[0m ${msg}` : msg,
      );
      super.printMessages(prefixedMessages, context, logLevel, writeStreamType);
    } else {
      super.printMessages(messages, context, logLevel, writeStreamType);
    }
  }
}

