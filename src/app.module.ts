import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { HealthModule } from './health/health.module';
import { OngsModule } from './ongs/ongs.module';
import { NeedsModule } from './needs/needs.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    GoogleSheetsModule,
    HealthModule,
    OngsModule,
    NeedsModule,
    SeedModule,
  ],
})
export class AppModule {}
