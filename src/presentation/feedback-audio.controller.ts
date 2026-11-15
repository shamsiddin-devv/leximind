import {
  Controller,
  Get,
  HttpException,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { resolve } from 'node:path';
import { soundIds } from '../domain/entities/GameFeedback';
import { Public } from './security';

@Controller('feedback-audio')
@ApiTags('Feedback audio')
@Public()
@SkipThrottle()
export class FeedbackAudioController {
  @Get(':file')
  @ApiOperation({ security: [] })
  @ApiProduces('audio/wav')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  audio(@Param('file') file: string, @Res() res: Response) {
    if (!soundIds.some((id) => file === id + '.wav'))
      throw new NotFoundException('Sound not found.');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return new Promise<void>((resolveTransfer, reject) => {
      res.sendFile(
        file,
        { root: resolve('assets', 'feedback-audio') },
        (
          error?: Error & {
            statusCode?: number;
            headers?: Record<string, string>;
          },
        ) => {
          if (!error || res.destroyed) return resolveTransfer();
          if (res.headersSent) {
            res.destroy();
            return resolveTransfer();
          }
          res.removeHeader('Content-Type');
          res.removeHeader('Content-Length');
          res.setHeader('Cache-Control', 'no-store');
          if (error.statusCode === 416) {
            const range =
              error.headers?.['Content-Range'] ??
              error.headers?.['content-range'];
            if (range) res.setHeader('Content-Range', range);
            return reject(
              new HttpException('Audio range is not satisfiable.', 416),
            );
          }
          if (error.statusCode === 404)
            return reject(new NotFoundException('Sound not found.'));
          return reject(error);
        },
      );
    });
  }
}
