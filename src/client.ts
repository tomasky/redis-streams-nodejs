import OriginalRedisClient from '@node-redis/client/dist/lib/client';
import { RedisScripts } from 'redis';
import { RedisClientOptions } from 'redis';

import { RedisConsumer, ConsumerOptions } from './consumer';
import { RedisProducer } from './producer';
import { RetryFailedMessage } from './retry-processor';

const InstRedisClient = OriginalRedisClient.extend();

interface AdditionalClientOptions {
  groupName: string;
  clientName: string;
}

export declare interface RedisClient<S extends RedisScripts> {
  on(event: 'retry-failed', listener: (data: RetryFailedMessage) => void): this;
  on(event: string, listener: (data: any) => void): this;
}

export class RedisClient<S extends RedisScripts> extends InstRedisClient {
  public readonly groupName: string;
  public readonly clientName: string;

  constructor(options: Omit<RedisClientOptions<never, S>, 'modules'> & AdditionalClientOptions) {
    super(options);
    this.groupName = options.groupName;
    this.clientName = options.clientName;
  }

  createConsumer<S extends RedisScripts>(options?: ConsumerOptions): RedisConsumer<S> {
    return new RedisConsumer<S>(this, options);
  }

  createProducer() {
    return new RedisProducer<S>(this);
  }

  async streamExists(key: string) {
    return await this.exists(key);
  }

  async groupExists(key: string) {
    if (!(await this.streamExists(key))) return false;

    const groupInfo = await this.xInfoGroups(key);
    return groupInfo.length > 0;
  }

  async createGroup(key: string) {
    const result = await this.xGroupCreate(key, this.groupName, '$', { MKSTREAM: true });
    return result;
  }
}
