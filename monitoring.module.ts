/**
 * @fileoverview Module for application monitoring tasks, like indexer health.
 * @issue #208
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { IndexerMonitorService } from './indexer-monitor.service';
import { PrismaModule } from '../database/prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module'; // Assuming a blockchain module exists

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, BlockchainModule],
  providers: [
    IndexerMonitorService,
    makeGaugeProvider({
      name: 'propchain_indexer_current_height',
      help: 'The latest block height processed by the indexer.',
    }),
    makeGaugeProvider({
      name: 'propchain_indexer_target_height',
      help: 'The current latest block height on the blockchain.',
    }),
    makeGaugeProvider({
      name: 'propchain_indexer_height_drift',
      help: 'The difference between target and current indexer height.',
    }),
  ],
})
export class MonitoringModule {}