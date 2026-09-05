import { Injectable } from '@nestjs/common';
import { ClockPort } from 'src/shared/domain/ports/clockPort';

@Injectable()
export class SystemClockAdapter implements ClockPort {
  now(): Date {
    return new Date();
  }
}
