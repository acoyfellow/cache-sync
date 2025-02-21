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
  private syncInterval: number = 5000 // 5 seconds

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.storage = state.storage

    // Setup periodic sync
    this.setupSync()
  }

  async onConnect(conn: Connection) {
    // Send initial profile data
    const profile = await this.storage.get(conn.id)
    if (profile) {
      conn.send(JSON.stringify({ type: 'profile', data: profile }))
    }
  }

  async onMessage(conn: Connection, message: string) {
    const data = JSON.parse(message)

    switch (data.type) {
      case 'update_profile':
        await this.handleProfileUpdate(conn, data.profile)
        break
      case 'get_profile':
        await this.handleGetProfile(conn, data.userId)
        break
    }
  }

  private async handleProfileUpdate(conn: Connection, profile: UserProfile) {
    // Update cache immediately
    await this.storage.put(profile.id, {
      ...profile,
      lastUpdated: Date.now()
    })

    // Broadcast to all connected clients
    this.broadcast(JSON.stringify({
      type: 'profile_updated',
      profile
    }))
  }

  private async handleGetProfile(conn: Connection, userId: string) {
    // Try to get profile from DO cache
    let profile = await this.storage.get(userId)

    if (!profile) {
      // In a real implementation, you would fetch from your main database here
      // For now, we'll create a dummy profile
      profile = {
        id: userId,
        data: {
          name: 'New User',
          email: '',
          // other profile fields...
        },
        lastUpdated: Date.now()
      }

      // Cache it in DO
      await this.storage.put(userId, profile)
    }

    // Send profile to requesting client
    conn.send(JSON.stringify({
      type: 'profile',
      data: profile
    }))
  }

  private setupSync() {
    setInterval(async () => {
      const updates = await this.storage.list({ prefix: 'pending_' })
      // Sync to main database
      // Remove 'pending_' prefix after successful sync
    }, this.syncInterval)
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
