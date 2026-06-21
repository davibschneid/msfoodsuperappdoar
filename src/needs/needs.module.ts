import { Module } from '@nestjs/common';
import { NeedsController } from './needs.controller';
import { NeedsService } from './needs.service';
import { OngsModule } from '../ongs/ongs.module';

@Module({
  imports: [OngsModule],
  controllers: [NeedsController],
  providers: [NeedsService],
})
export class NeedsModule {}
