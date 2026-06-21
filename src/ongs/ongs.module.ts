import { Module } from '@nestjs/common';
import { OngsController } from './ongs.controller';
import { OngsService } from './ongs.service';

@Module({
  controllers: [OngsController],
  providers: [OngsService],
  exports: [OngsService],
})
export class OngsModule {}
