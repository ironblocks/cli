// 3rd party.
import { Module } from '@nestjs/common';
// Internal.
import { FirewallModule } from '../firewall/firewall.module';

@Module({
    imports: [FirewallModule],
    providers: [FirewallModule],
})
export class AppModule {}
