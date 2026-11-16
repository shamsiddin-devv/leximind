import { Controller, Get, Header, Injectable } from '@nestjs/common';
import { Admin } from './security';

const buckets = [0.05, 0.1, 0.25, 0.5, 1, 2, 5];
interface Observation {
  count: number;
  seconds: number;
  buckets: number[];
}

@Injectable()
export class HttpMetrics {
  private readonly data = new Map<string, Observation>();
  observe(method: string, route: string, status: number, seconds: number) {
    const safeMethod = [
      'GET',
      'POST',
      'PATCH',
      'PUT',
      'DELETE',
      'OPTIONS',
      'HEAD',
    ].includes(method)
      ? method
      : 'OTHER';
    const key = JSON.stringify([
      safeMethod,
      route,
      Math.floor(status / 100) + 'xx',
    ]);
    const previous = this.data.get(key) ?? {
      count: 0,
      seconds: 0,
      buckets: buckets.map(() => 0),
    };
    previous.count++;
    previous.seconds += seconds;
    buckets.forEach((boundary, index) => {
      if (seconds <= boundary) previous.buckets[index]++;
    });
    this.data.set(key, previous);
  }
  render() {
    const name = 'leximind_http_request_duration_seconds';
    const lines = ['# TYPE ' + name + ' histogram'];
    for (const [key, observation] of this.data) {
      const [method, route, status] = JSON.parse(key) as string[];
      const labels =
        'method=' +
        JSON.stringify(method) +
        ',route=' +
        JSON.stringify(route) +
        ',status=' +
        JSON.stringify(status);
      buckets.forEach((boundary, index) =>
        lines.push(
          name +
            '_bucket{' +
            labels +
            ',le="' +
            boundary +
            '"} ' +
            observation.buckets[index],
        ),
      );
      lines.push(
        name + '_bucket{' + labels + ',le="+Inf"} ' + observation.count,
        name + '_count{' + labels + '} ' + observation.count,
        name + '_sum{' + labels + '} ' + observation.seconds,
      );
    }
    return lines.join('\n') + '\n';
  }
}

@Controller('ops')
@Admin()
export class OperationsController {
  constructor(private readonly metrics: HttpMetrics) {}
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  scrape() {
    return this.metrics.render();
  }
}
