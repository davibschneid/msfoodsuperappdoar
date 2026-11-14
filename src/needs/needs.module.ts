import { Module } from '@nestjs/common';
import { NeedsController } from './needs.controller';
import { NeedsService } from './needs.service';
import { OngsModule } from '../ongs/ongs.module';
import { PortalNeedsController } from './portal-needs.controller';
import { PortalNeedsService } from './portal-needs.service';

@Module({
  imports: [OngsModule],
  controllers: [NeedsController, PortalNeedsController],
  providers: [NeedsService, PortalNeedsService],
})
export class NeedsModule {}
