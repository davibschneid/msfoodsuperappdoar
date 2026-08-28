import { Module } from '@nestjs/common';
import { OngsController } from './ongs.controller';
import { OngsService } from './ongs.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';

@Module({
  controllers: [OngsController],
  providers: [OngsService, GoogleSheetsService],
  exports: [OngsService, GoogleSheetsService],
})
export class OngsModule {}
