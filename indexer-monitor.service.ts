/**
 * @fileoverview Service to monitor blockchain indexer drift and failures.
 * @issue #208
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { PrismaService } from '../database/prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service'; // Assuming a blockchain service exists

@Injectable()
export class IndexerMonitorService {
  private readonly logger = new Logger(IndexerMonitorService.name);

  constructor(
    @InjectMetric('propchain_indexer_current_height')
    private readonly currentHeightGauge: Gauge<string>,
    @InjectMetric('propchain_indexer_target_height')
    private readonly targetHeightGauge: Gauge<string>,
    @InjectMetric('propchain_indexer_height_drift')
    private readonly driftGauge: Gauge<string>,
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkIndexerDrift() {
    this.logger.debug('Checking for indexer drift...');
    try {
      const targetHeight = await this.blockchainService.getLatestBlockHeight();

      const lastIndexedBlock = await this.prisma.block.findFirst({
        orderBy: { height: 'desc' },
      });

      const currentHeight = lastIndexedBlock?.height ?? 0;
      const drift = targetHeight - currentHeight;

      // Update Prometheus metrics
      this.currentHeightGauge.set(currentHeight);
      this.targetHeightGauge.set(targetHeight);
      this.driftGauge.set(drift);

      if (drift > 10) {
        this.logger.warn(
          `High indexer drift detected! Drift is ${drift} blocks. (Current: ${currentHeight}, Target: ${targetHeight})`,
        );
      } else {
        this.logger.log(
          `Indexer is healthy. Drift is ${drift} blocks. (Current: ${currentHeight}, Target: ${targetHeight})`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to check indexer drift', error.stack);
      this.driftGauge.set(-1); // Use -1 to indicate a check failure
    }
  }
}