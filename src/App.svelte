<script lang="ts">
  import PartySocket from "partysocket";
  import { fade, fly } from "svelte/transition";

  // Get userId from URL or generate demo IDs
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("userId") || "demo-user-1";
  const demoIds = ["demo-user-1", "demo-user-2", "demo-user-3"];
  let selectedId = $state(userId);

  let socket = new PartySocket({
    host: window.location.host,
    room: userId,
    party: "user-profile-cache",
  });

  let profile = $state(null);
  let connecting = $state(true);

  $effect(() => {
    // Reconnect when ID changes
    socket.close();
    connecting = true;
    profile = null;

    const newSocket = new PartySocket({
      host: window.location.host,
      room: selectedId,
      party: "user-profile-cache",
    });

    socket = newSocket;
    socket.addEventListener("message", handleMessage);

    // Update URL without reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("userId", selectedId);
    window.history.pushState({}, "", newUrl);

    // Request profile for new ID
    socket.addEventListener("open", () => {
      connecting = false;
      socket.send(
        JSON.stringify({
          type: "get_profile",
          userId: selectedId,
        }),
      );
    });
  });

  function handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "profile":
        profile = data.data;
        break;
      case "profile_updated":
        profile = data.profile;
        break;
    }
  }

  function updateProfile(updates: Partial<typeof profile>) {
    socket.send(
      JSON.stringify({
        type: "update_profile",
        profile: { ...profile, ...updates },
      }),
    );
  }
</script>

<main class="min-h-screen bg-neutral-50 py-8">
  <div class="container px-4 max-w-2xl mx-auto">
    <section class="border-b pb-6 border-neutral-200 space-y-4 mb-8">
      <h1 class="text-4xl font-bold flex items-center gap-2 justify-between">
        <span>Sync & Cache Pattern</span>
        <a
          href="https://github.com/acoyfellow/cache-sync"
          class="text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <img src="/github.svg" class="w-8 h-8" alt="View on GitHub" />
        </a>
      </h1>

      <p class="text-lg text-neutral-600">
        This pattern is designed for applications with high read/write traffic,
        offering a scalable and low-latency caching solution using Cloudflare
        Durable Objects.
      </p>
    </section>

    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4">Test with Demo Users:</h2>
      <div class="flex gap-3">
        {#each demoIds as id}
          <button
            class="px-5 py-2.5 rounded-lg border shadow-sm transition-all {selectedId ===
            id
              ? 'bg-orange-500 text-white border-orange-600'
              : 'bg-white hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow'}"
            onclick={() => (selectedId = id)}
          >
            {id}
          </button>
        {/each}
      </div>
    </div>

    <div
      class="bg-white rounded-xl shadow-md p-8"
      in:fly={{ y: 20, duration: 300 }}
    >
      {#if connecting}
        <div class="text-center py-12 min-h-60" in:fade={{ duration: 200 }}>
          <div
            class="animate-spin inline-block w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full"
            role="status"
            aria-label="Connecting"
          ></div>
          <p class="mt-4 text-neutral-600">Connecting to {selectedId}...</p>
        </div>
      {:else if profile}
        <div class="space-y-6 min-h-60" in:fade={{ duration: 200 }}>
          <div class="space-y-4">
            <div class="space-y-2">
              <label
                for="name"
                class="block text-sm font-medium text-neutral-700">Name</label
              >
              <input
                id="name"
                type="text"
                class="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                bind:value={profile.data.name}
              />
            </div>

            <div class="space-y-2">
              <label
                for="email"
                class="block text-sm font-medium text-neutral-700">Email</label
              >
              <input
                id="email"
                type="email"
                class="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                bind:value={profile.data.email}
              />
            </div>
          </div>

          <button
            class="w-full px-5 py-2.5 rounded-lg bg-orange-500 text-white font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow hover:bg-orange-600 focus:ring-2 focus:ring-orange-500/20"
            onclick={() =>
              updateProfile({
                ...profile,
                lastUpdated: new Date().toISOString(),
              })}
          >
            Update Profile
          </button>

          <p class="text-sm text-neutral-500">
            Last Updated: {new Date(profile.lastUpdated).toLocaleString()}
          </p>
        </div>
      {/if}
    </div>

    <div
      class="mt-8 p-4 bg-orange-50 rounded-lg text-sm text-neutral-600 space-y-2"
    >
      <p>
        Open multiple tabs/windows with the same user ID to see real-time sync.
      </p>
      <p class="font-medium">Current User ID: {selectedId}</p>
    </div>
  </div>
</main>
