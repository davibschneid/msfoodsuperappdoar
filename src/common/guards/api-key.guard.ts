import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

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

    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('API key inválida');
    }

    return true;
  }
}
