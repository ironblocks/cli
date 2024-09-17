import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import config from '@/config/configuration';
import { AppCommand } from '@/app/app.command';
import { VennModule } from '@/venn/venn.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { FirewallModule } from '@/firewall/firewall.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [config]
        }),
        VennModule,
        LoggerModule,
        FirewallModule
    ],
    providers: [AppCommand]
})
export class AppModule {}
