import { Module } from '@nestjs/common';
import { SHARED_SYMBOLS } from 'src/shared/infrastructure/IoC/Symbols';
import { CryptoIdGeneratorAdapter } from 'src/shared/infrastructure/adapters/cryptoIdGenerator.adapter';
import { SystemClockAdapter } from 'src/shared/infrastructure/adapters/systemClock.adapter';

@Module({
  providers: [
    {
      provide: SHARED_SYMBOLS.CLOCK_PORT,
      useClass: SystemClockAdapter,
    },
    {
      provide: SHARED_SYMBOLS.ID_GENERATOR_PORT,
      useClass: CryptoIdGeneratorAdapter,
    },
  ],
  exports: [SHARED_SYMBOLS.CLOCK_PORT, SHARED_SYMBOLS.ID_GENERATOR_PORT],
})
export class SharedModule {}
