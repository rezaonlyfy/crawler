import { Module } from '@nestjs/common';

// Reporting starts at the application layer — no domain layer on purpose
// (CRAWL-P1-003: no empty layers where they provide no value).
@Module({})
export class CrawlReportingModule {}
