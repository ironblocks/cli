// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { FirewallIntegrateCommand } from './integrate.command';
import { FirewallIntegrateService } from './integrate.service';

@Module({
    providers: [FirewallIntegrateCommand, FirewallIntegrateService],
})
export class FirewallIntegrateModule {}
