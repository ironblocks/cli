// 3rd party.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Internal.
import config from '../config/configuration';
import { FirewallModule } from '../firewall/firewall.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [config],
        }),
        FirewallModule,
    ],
    providers: [FirewallModule],
})
export class AppModule {}
