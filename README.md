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

