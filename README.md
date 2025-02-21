# Durable Object Sync/Cache Pattern

A scalable, low-latency caching pattern using Cloudflare Durable Objects (DO) to reduce load on your primary database and improve user experience.

![Sync/Caching Pattern](https://github.com/acoyfellow/cache-sync/raw/main/public/chart.svg?raw=true)

---

## **Why Use This Pattern?**

If your application is experiencing high read/write traffic on your primary database, this pattern can help:
- **Reduce Database Load:** Offload frequent read/write operations to Durable Objects.
- **Improve Latency:** Serve data from a cache closer to your users.
- **Scale Easily:** Durable Objects are designed for high concurrency and global distribution.

This pattern is ideal for:
- Applications with **high read/write traffic** (e.g., SaaS platforms, real-time collaboration tools).
- Use cases where **eventual consistency** is acceptable (e.g., user profiles, non-critical updates).

---

## **How It Works**

1. **Read Workflow:**
   - Check if the data exists in the Durable Object (DO) cache.
   - If yes, serve it from DO.
   - If no, fetch it from the primary database, store it in DO, and serve it.

2. **Write Workflow:**
   - Write the data to DO first (low-latency).
   - Queue the data for sync to the primary database.

3. **Sync Process:**
   - A background Worker periodically syncs data from DO to the primary database.
   - Handles conflicts (e.g., last-write-wins or merge strategies).

---

## **Architecture Details**

### Components
- **Durable Objects:** Acts as the primary cache and temporary storage
- **Workers:** Handle request routing and background sync
- **Primary Database:** Source of truth for persistent data
- **Queue System:** Manages sync operations between DO and database

### Data Flow
1. **Client Request → Edge Worker**
   - Worker determines if request needs DO interaction
   - Routes to appropriate DO instance

2. **DO → Primary Database**
   - Periodic sync process
   - Conflict resolution handling
   - Error recovery mechanisms

---

## **Implementation Considerations**

### Consistency Model
- This pattern implements eventual consistency
- Suitable for non-critical data where some lag is acceptable
- Not recommended for financial transactions or similar critical operations

### Performance Characteristics
- Read latency: ~1-5ms from DO
- Write latency: ~1-5ms to DO, async to database
- Sync interval: Configurable (typically 5-30 seconds)

### Limitations
- Maximum DO storage: 128KB per object
- DO execution time limits
- Potential for data loss during catastrophic failures

---

## **Example Use Cases**

### Real-time Collaboration
- Document editing with multiple users
- Chat applications
- Live dashboard updates

### User State Management
- Session data
- User preferences
- Feature flags

### Gaming Applications
- Player state
- Game room management
- Leaderboard updates

---

## **Setup and Configuration**

### Prerequisites
- Cloudflare Workers account
- Durable Objects enabled
- Compatible primary database

### Key Configurations
- Sync interval timing
- Conflict resolution strategy
- Error handling policies
- Storage limits and cleanup

---

## **Monitoring and Maintenance**

### Key Metrics
- Cache hit/miss rates
- Sync latency
- Error rates
- Storage utilization

### Common Issues
- Sync conflicts
- Storage limits
- Rate limiting
- Network partitions

---

## **License**

MIT License - See LICENSE file for details

