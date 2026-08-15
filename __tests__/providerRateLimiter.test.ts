import {describe, expect, it} from '@jest/globals';
import {DomainRateLimiter} from '../src/lib/sandbox/rateLimiter';

describe('DomainRateLimiter', () => {
  it('allows requests up to the burst allowance immediately', async () => {
    const limiter = new DomainRateLimiter({burst: 3, requestsPerSecond: 1});

    const releases = [
      await limiter.acquire('example.com'),
      await limiter.acquire('example.com'),
      await limiter.acquire('example.com'),
    ];

    expect(releases).toHaveLength(3);
    releases.forEach(release => release());
  });

  it('caps concurrent requests to a single host', async () => {
    const limiter = new DomainRateLimiter({
      burst: 10,
      requestsPerSecond: 100,
      maxConcurrentPerHost: 2,
    });

    const first = await limiter.acquire('example.com');
    const second = await limiter.acquire('example.com');

    expect(limiter.snapshot('example.com').active).toBe(2);

    let thirdStarted = false;
    const third = limiter.acquire('example.com').then(release => {
      thirdStarted = true;
      return release;
    });

    // Still blocked while the first two are in flight.
    await Promise.resolve();
    expect(thirdStarted).toBe(false);

    first();
    const release = await third;
    expect(thirdStarted).toBe(true);

    second();
    release();
  });

  it('does not wake more queued requests than the concurrency cap', async () => {
    const limiter = new DomainRateLimiter({
      burst: 20,
      requestsPerSecond: 100,
      maxConcurrentPerHost: 2,
    });

    const first = await limiter.acquire('example.com');
    const second = await limiter.acquire('example.com');
    const started: Array<() => void> = [];
    let completed = 0;

    const waiters = Array.from({length: 5}, () =>
      limiter.acquire('example.com').then(release => {
        started.push(release);
        completed += 1;
      }),
    );

    first();
    await new Promise(resolve => setTimeout(resolve, 75));

    expect(started).toHaveLength(1);
    expect(limiter.snapshot('example.com').active).toBe(2);

    second();
    while (completed < waiters.length) {
      while (started.length > 0) {
        started.shift()?.();
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    started.forEach(release => release());
    await Promise.all(waiters);
  });

  it('tracks hosts independently', async () => {
    const limiter = new DomainRateLimiter({
      burst: 1,
      requestsPerSecond: 1,
      maxConcurrentPerHost: 1,
    });

    const a = await limiter.acquire('a.example');
    const b = await limiter.acquire('b.example');

    expect(limiter.snapshot('a.example').active).toBe(1);
    expect(limiter.snapshot('b.example').active).toBe(1);

    a();
    b();
  });

  it('shares one budget across sibling subdomains', async () => {
    const limiter = new DomainRateLimiter({
      burst: 2,
      requestsPerSecond: 100,
      maxConcurrentPerHost: 2,
    });

    const a = await limiter.acquire('a.example.co.uk');
    const b = await limiter.acquire('b.example.co.uk');

    expect(limiter.snapshot('example.co.uk').active).toBe(2);
    expect(limiter.snapshot('c.example.co.uk').active).toBe(2);

    a();
    b();
  });

  it('rejects once the per-host queue is saturated', async () => {
    const limiter = new DomainRateLimiter({
      burst: 1,
      requestsPerSecond: 1,
      maxConcurrentPerHost: 1,
      maxQueuedPerHost: 1,
    });

    const release = await limiter.acquire('example.com');
    const queued = limiter.acquire('example.com');

    await expect(limiter.acquire('example.com')).rejects.toThrow(
      /Too many pending requests/,
    );

    release();
    (await queued)();
  });

  it('treats hosts case insensitively', async () => {
    const limiter = new DomainRateLimiter({
      burst: 1,
      requestsPerSecond: 1,
      maxConcurrentPerHost: 1,
    });

    const release = await limiter.acquire('Example.COM');
    expect(limiter.snapshot('example.com').active).toBe(1);
    release();
  });
});
