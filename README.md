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
        "name": "userprofile",
        "class_name": "UserProfileCache"
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
Client → Worker → Dedicated User DO Instance (Isolated per session)
                ↳ (Cache Miss) → Create New DO Instance → Return Stub
```

2. **Write Path**:
```plaintext
Client → Dedicated User DO Instance → In-Memory State + Storage
                               ↳ Alarm → Batch Sync to Main DB
```

3. **Client Sync**:
```plaintext
Offline → Local Storage → Auto Retry
```

**Features**:
- Network detection
- Local persistence
- Auto-retry on reconnect
- Accessible status

This implements a robust offline-first pattern where:
- All user interactions remain available offline
- Changes queue locally until connectivity resumes
- UI clearly indicates sync status
- Data automatically reconciles when back online

## Implementation Phases:
  1. Shadow Mode: Run cache layer parallel to main API, compare results
  
  2. Read-Only Canary: Route 5% of read traffic through cache
  
  3. Write Queueing: Enable write buffering for canary users
  
  4. Full Cutover: Gradually increase traffic over 1-2 weeks
  
This maintains security while allowing gradual rollout. The key is keeping the cache layer as a transparent proxy that enforces existing auth rules.


## Future Concerns

- [x] **Data Compression** - Store more data in Durable Object state  
- [x] **TTL Expiration** - Automatically expire stale data
- [ ] **Rate Limiting** - Prevent API abuse
- [ ] **Auth Integration** - Add request validation
- [ ] **Metrics Dashboard** - Track cache performance

## License

MIT License - Free for commercial and personal use.