import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './security';
import { ReleaseReadiness } from '../infrastructure/ReleaseReadiness';
@Controller('health')
@ApiTags('Health')
@Public()
@SkipThrottle()
export class HealthController {
  constructor(private readonly readiness: ReleaseReadiness) {}
  @Get('live')
  @ApiOperation({ security: [] })
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  @ApiOperation({ security: [] })
  async ready() {
    try {
      if (await this.readiness.isReady()) return { status: 'ok' };
    } catch {
      // Readiness responses must not expose database connection details.
    }
    throw new ServiceUnavailableException(
      'Release assets or database migrations are unavailable.',
    );
  }
}
