import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppCommand } from '@/app/app.command';
import config from '@/config/configuration';
import { FirewallModule } from '@/firewall/firewall.module';
import { LoggerModule } from '@/lib/logging/logger.module';
import { ModeModule } from '@/mode/mode.module';
import { VennModule } from '@/venn/venn.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [config],
        }),
        VennModule,
        LoggerModule,
        FirewallModule,
        ModeModule,
    ],
    providers: [AppCommand],
})
export class AppModule {}
