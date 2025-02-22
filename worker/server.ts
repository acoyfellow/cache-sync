import { Server, type Connection, routePartykitRequest } from "partyserver"
import { DurableObjectNamespace, DurableObjectStorage, DurableObjectState } from "@cloudflare/workers-types"

type UserProfile = {
  id: string
  data: any
  lastUpdated: number
}

type Env = {
  UserProfileCache: DurableObjectNamespace
  DATABASE_URL: string // Your main database connection
}

export class UserProfileCache extends Server<Env> {
  declare broadcast: (message: string) => void;

  private storage: DurableObjectStorage
  private readonly SYNC_INTERVAL = 60_000 // 60 seconds in ms

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.storage = state.storage
    state.blockConcurrencyWhile(() => this.initialize())
  }

  private initialize = async () => {
    await this.processPendingUpdates()
  }

  async onConnect(conn: Connection) {
    conn.send(JSON.stringify({
      type: 'profile',
      data: await this.getProfile(conn.id)
    }))
  }

  async onMessage(conn: Connection, message: string) {
    const { type, profile, userId } = JSON.parse(message)

    switch (type) {
      case 'update_profile':
        await this.cacheAndQueueUpdate(profile)
        break

      case 'get_profile':
        conn.send(JSON.stringify({
          type: 'profile',
          data: await this.getProfile(userId)
        }))
        break
    }
  }

  // Shared compression utilities
  private async compress(data: unknown): Promise<Uint8Array> {
    const stream = new Blob([JSON.stringify(data)]).stream()
      .pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  private async decompress(buffer: Uint8Array): Promise<unknown> {
    const stream = new Blob([buffer]).stream()
      .pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }

  private async getProfile(userId: string): Promise<UserProfile> {
    const buffer = await this.storage.get<Uint8Array>(userId);
    const profile = buffer ? await this.decompress(buffer) as UserProfile : null;

    return profile ?? this.createStubProfile(userId);
  }

  private createStubProfile(userId: string): UserProfile {
    return {
      id: userId,
      data: { name: 'New User', email: '' },
      lastUpdated: Date.now()
    }
  }

  private async cacheAndQueueUpdate(profile: UserProfile) {
    // Store compressed version in main cache
    await this.storage.put(profile.id, await this.compress(profile));

    // Store uncompressed version in pending queue for DB sync
    await this.storage.put(`pending_${Date.now()}`, {
      ...profile,
      lastUpdated: Date.now()
    });

    // Schedule sync if needed
    if (!(await this.storage.getAlarm())) {
      await this.storage.setAlarm(Date.now() + this.SYNC_INTERVAL);
    }

    this.broadcast(JSON.stringify({
      type: 'profile_updated',
      profile
    }));
  }

  async alarm() {
    await this.processPendingUpdates()
  }

  private async processPendingUpdates() {
    const pendingUpdates = await this.storage.list({ prefix: 'pending_' });

    if (pendingUpdates.size > 0) {
      console.log(`🔄 Syncing ${pendingUpdates.size} updates (mock DB call)`);

      // Simulate occasional sync failures
      if (Math.random() < 0.2) { // 20% failure rate
        console.error('❌ Mock DB sync failed - retrying later');
        throw new Error('Mock DB failure');
      }

      // Simulate successful sync
      await new Promise(r => setTimeout(r, 500));
      console.log('✅ Mock database sync completed');

      // Clear processed updates
      await Promise.all(
        [...pendingUpdates.keys()].map(key => this.storage.delete(key))
      )
    }

    // Reschedule if more updates exist
    if ((await this.storage.list({ prefix: 'pending_' })).size > 0) {
      await this.storage.setAlarm(Date.now() + this.SYNC_INTERVAL)
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not found", {
        status: 404,
      })
    )
  },
} satisfies ExportedHandler<Env>
