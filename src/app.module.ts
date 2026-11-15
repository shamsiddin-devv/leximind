import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateEnvironment } from './infrastructure/config';
import { DrizzleModule } from './infrastructure/db/drizzle/drizzle.module';
import { DatabasePool } from './infrastructure/db/drizzle/drizzle.provider';
import { RepositoriesModule } from './infrastructure/repositories.module';
import { AuthModule } from './presentation/modules/user/auth.module';
import { RateLimitStorage } from './infrastructure/auth/RateLimitStorage';
import { UserModule } from './presentation/modules/user/User.module';
import { WordModule } from './presentation/modules/word/word.module';
import { CardModule } from './presentation/modules/card/card.module';
import { LearningModule } from './presentation/modules/learning/learning.module';
import { DomainExceptionFilter } from './presentation/filters/DomainExceptionFilter';
import { AuthGuard } from './presentation/security';
import { HealthController } from './presentation/health.controller';
import { ReleaseReadiness } from './infrastructure/ReleaseReadiness';
import { DatabaseMaintenance } from './infrastructure/db/DatabaseMaintenance';
import {
  HttpMetrics,
  OperationsController,
} from './presentation/observability';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DrizzleModule,
    RepositoriesModule,
    AuthModule,
    ThrottlerModule.forRootAsync({
      inject: [DatabasePool],
      useFactory: (p: DatabasePool) => ({
        throttlers: [{ ttl: 60000, limit: 120 }],
        storage: new RateLimitStorage(p),
      }),
    }),
    UserModule,
    WordModule,
    CardModule,
    LearningModule,
  ],
  controllers: [HealthController, OperationsController],
  providers: [
    ReleaseReadiness,
    DatabaseMaintenance,
    HttpMetrics,
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
