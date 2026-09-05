import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdGeneratorPort } from 'src/shared/domain/ports/idGeneratorPort';

@Injectable()
export class CryptoIdGeneratorAdapter implements IdGeneratorPort {
  generate(): string {
    return randomUUID();
  }
}
