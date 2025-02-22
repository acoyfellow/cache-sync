import { Server, type Connection, routePartykitRequest } from "partyserver"

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
  private storage: DurableObjectStorage
  private readonly SYNC_INTERVAL = 60_000 // 60 seconds in ms

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.storage = state.storage
    state.blockConcurrencyWhile(this.initialize())
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

  private async getProfile(userId: string): Promise<UserProfile> {
    return (await this.storage.get(userId)) ?? this.createStubProfile(userId)
  }

  private createStubProfile(userId: string): UserProfile {
    return {
      id: userId,
      data: { name: 'New User', email: '' },
      lastUpdated: Date.now()
    }
  }

  private async cacheAndQueueUpdate(profile: UserProfile) {
    // Store update in pending queue
    await this.storage.put(`pending_${Date.now()}`, profile)

    // Update live cache immediately
    await this.storage.put(profile.id, {
      ...profile,
      lastUpdated: Date.now()
    })

    // Schedule sync if needed
    if (!(await this.storage.getAlarm())) {
      await this.storage.setAlarm(Date.now() + this.SYNC_INTERVAL)
    }

    this.broadcast(JSON.stringify({
      type: 'profile_updated',
      profile
    }))
  }

  async alarm() {
    await this.processPendingUpdates()
  }

  private async processPendingUpdates() {
    const pendingUpdates = await this.storage.list({ prefix: 'pending_' })

    if (pendingUpdates.size > 0) {
      // Simulate DB sync delay
      await new Promise(r => setTimeout(r, 500))
      // TODO: Implement actual DB sync with MAIN_DB_API

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
