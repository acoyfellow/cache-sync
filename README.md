# Durable Cache Sync Pattern

A production-ready pattern for high-traffic applications needing low-latency reads with eventual consistency. Perfect for:

- Session management
- User profile caching
- Real-time collaboration features
- High-velocity write buffers

## Why This Pattern?

| Traditional Database Challenges          | With Cache Sync Pattern                |
|------------------------------------------|----------------------------------------|
| 📉 90%+ of queries hit primary DB        | 📈 90%+ cache hit rate                 |
| 💸 Expensive direct DB writes            | 🐢 Batched async writes save costs     |
| 🌍 Global latency inconsistencies        | 🚀 Edge caching <5ms responses         |
| 🔄 Complex cache invalidation            | 🔄 Auto-sync with writeback queue      |

## Architecture
![Sync/Caching Pattern](https://github.com/acoyfellow/cache-sync/raw/main/public/chart.svg?raw=true)

**Key Components**:
- **Durable Object Cache**: Per-key cache with in-memory access
- **Write Buffer**: Batched updates every 60s
- **Auto Refresh**: Stale-while-revalidate pattern
- **Pass-through Worker**: Simple edge routing

## Napkin Math Cost Comparison (1M Requests/Month)

| Resource          | Traditional DB      | Cache Sync Pattern  |
|-------------------|---------------------|---------------------|
| Database Reads    | \$500-\$2000        | \$15-\$50           |
| Database Writes   | \$300-\$1500        | \$5-\$20            |
| Cache Layer       | \$0                 | \$10-\$30           |
| **Total**         | **\$800-\$3500**    | **\$30-\$100**      |

## Getting Started

1. **Clone and install**:
```bash
git clone https://github.com/acoyfellow/cache-sync.git
cd cache-sync
bun install
```

2. **Configure environment** (`wrangler.json`):
```json
{
  "name": "cache-sync-pattern",
  "main": "src/worker.ts",
  "compatibility_date": "2024-03-01",
  "durable_objects": {
    "bindings": [
      {
        "name": "SESSION_CACHE",
        "class_name": "CacheDO"
      }
    ]
  },
  "vars": {
    "MAIN_DB_API": "https://your-db-api.com"
  }
}
```

3. **Local development**:
```bash
bun run dev
# Interact with App.svelte at http://localhost:5173
```

4. **Deploy to Cloudflare**:
```bash
bunx wrangler deploy
```

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/acoyfellow/cache-sync)

## How It Works

1. **Read Path**:
```plaintext
Client → Worker → Durable Object Cache
                ↳ (Cache Miss) → Main DB → Cache Population
```

2. **Write Path**:
```plaintext
Client → Durable Object Cache → In-Memory Buffer
                               ↳ Alarm → Batch DB Write
```

## Performance Benchmarks

| Metric               | Direct DB Access | Cache Sync Pattern |
|----------------------|------------------|--------------------|
| Read Latency (p95)   | 150-300ms        | 2-5ms              |
| Write Throughput     | 100 ops/s        | 10,000 ops/s       |
| Availability         | 99.9%            | 99.99%             |

## License

MIT License - Free for commercial and personal use.