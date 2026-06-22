import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class SecurityLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SecurityAudit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - now;
        if (statusCode >= 400) {
          this.logger.warn(
            `${method} ${url} ${statusCode} ${duration}ms - IP: ${ip} - UA: ${userAgent}`,
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - now;
        const status = error.status || 500;
        this.logger.error(
          `${method} ${url} ${status} ${duration}ms - IP: ${ip} - UA: ${userAgent} - ${error.message}`,
        );
        return throwError(() => error);
      }),
    );
  }
}
