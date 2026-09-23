import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;
    const expectedKey = this.configService.get<string>('API_KEY');
    if (!expectedKey) {
      throw new UnauthorizedException('API_KEY não configurada no servidor');
    }

    const actualDigest = createHash('sha256').update(apiKey ?? '').digest();
    const expectedDigest = createHash('sha256').update(expectedKey).digest();
    if (!apiKey || !timingSafeEqual(actualDigest, expectedDigest)) {
      throw new UnauthorizedException('API key inválida');
    }

    return true;
  }
}
