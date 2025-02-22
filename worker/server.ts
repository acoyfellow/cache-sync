import { Server, type Connection, routePartykitRequest } from "partyserver"
import { DurableObjectNamespace, DurableObjectStorage, DurableObjectState } from "@cloudflare/workers-types"

// Rename TYPE to avoid conflict
type UserProfileData = {
  id: string
  data: any
  lastUpdated: number
}

type Env = {
  UserProfileCache: DurableObjectNamespace
  DATABASE_URL: string // Your main database connection
}

// Single DO class that creates one instance per user
export class UserProfileCache extends Server<Env> {
  private readonly TTL = 86_400_000 // 24h

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    // Each DO instance is created for a specific user
    state.storage.setAlarm(Date.now() + this.TTL)
  }

  // Unified message handler
  async onMessage(conn: Connection, message: string) {
    const { type, userId, profile } = JSON.parse(message);

    switch (type) {
      case 'get':
        const data = await this.ctx.storage.get<Uint8Array>(userId);
        conn.send(JSON.stringify({
          type: "profile",
          data: data ? await this.decompress(data) : this.createStub()
        }));
        break;

      case 'update':
        const compressed = await this.compress(profile);
        await this.ctx.storage.put(userId, compressed);
        this.broadcast(JSON.stringify({
          type: "profile_updated",
          profile: profile
        }));
        break;
    }
  }

  // Batch sync with main DB
  async alarm() {
    const pending = await this.ctx.storage.list({ prefix: 'pending_' })
    const updates = [...pending.values()].map(buf => this.decompress(buf))

    if (updates.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 200))
      // TODO: Uncomment this when we have a main database
      // await fetch(this.env.DATABASE_URL, {
      //   method: 'PUT',
      //   body: JSON.stringify({ updates })
      // })
      await this.ctx.storage.delete([...pending.keys()])
    }

    await this.ctx.storage.setAlarm(Date.now() + this.TTL)
  }

  // Compression utilities
  private async compress(data: UserProfileData) {
    const stream = new Blob([JSON.stringify(data)]).stream()
      .pipeThrough(new CompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  private async decompress(buffer: Uint8Array) {
    const stream = new Blob([buffer]).stream()
      .pipeThrough(new DecompressionStream('gzip'))
    return JSON.parse(await new Response(stream).text()) as UserProfileData
  }

  private createStub() {
    return {
      id: 'New User',
      data: { name: 'New User' }
    }
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return await routePartykitRequest(request, env, {
      userprofile: UserProfileCache as unknown as PartyServer
    }) || new Response("Not found", { status: 404 })
  }
} satisfies ExportedHandler<Env>
