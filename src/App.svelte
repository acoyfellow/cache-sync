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
    party: "userprofile",
    path: `parties/userprofile/${userId}`,
  });

  let offlineQueue = $state<Array<Partial<typeof profile>>>([]);
  let isOnline = $state(navigator.onLine);
  let persistedProfile = localStorage.getItem(`profile-${userId}`);
  let profile = $state(persistedProfile ? JSON.parse(persistedProfile) : null);
  let connecting = $state(true);
  let showSuccess = $state(false);

  // Cost calculator state
  let reads = $state(1);
  let writes = $state(0.1);
  let readCost = $state(2);
  let writeCost = $state(5);

  // Computed values
  let currentCost = $derived(
    (reads * readCost + writes * writeCost).toFixed(2),
  );
  let doCost = $derived((reads * 0.2 + writes * 1.0).toFixed(2));
  let savings = $derived(
    (
      reads * readCost +
      writes * writeCost -
      (reads * 0.2 + writes * 1.0)
    ).toFixed(2),
  );

  $effect(() => {
    // Reconnect when ID changes
    socket.close();
    connecting = true;
    profile = null;

    const newSocket = new PartySocket({
      host: window.location.host,
      room: selectedId,
      party: "userprofile",
      path: `parties/userprofile/${selectedId}`,
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
          type: "get",
          userId: selectedId,
        }),
      );
    });
  });

  // Add network status listeners
  $effect(() => {
    const updateOnlineStatus = () => (isOnline = navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  });

  // Add auto-sync when coming online
  $effect(() => {
    if (isOnline && offlineQueue.length > 0) {
      offlineQueue.forEach((update) => {
        socket.send(
          JSON.stringify({
            type: "update",
            profile: { ...profile, ...update },
          }),
        );
      });
      offlineQueue = [];
    }
  });

  // Add localStorage persistence
  $effect(() => {
    if (profile) {
      localStorage.setItem(`profile-${selectedId}`, JSON.stringify(profile));
      localStorage.setItem(
        `offline-queue-${selectedId}`,
        JSON.stringify(offlineQueue),
      );
    }
  });

  function handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "profile":
        profile = data.data;
        break;
      case "profile_updated":
        profile = data.profile;
        showSuccess = true;
        setTimeout(() => (showSuccess = false), 2000);
        break;
    }
  }

  function updateProfile(updates: Partial<typeof profile>) {
    if (isOnline) {
      socket.send(
        JSON.stringify({
          type: "update",
          userId: selectedId,
          profile: {
            ...profile,
            ...updates,
            lastUpdated: new Date().toISOString(),
          },
        }),
      );
    } else {
      offlineQueue = [...offlineQueue, updates];
      profile = { ...profile, ...updates };
    }
  }
</script>

<main class="min-h-screen bg-neutral-50 py-8">
  <div class="container px-4 max-w-2xl mx-auto">
    <section class="space-y-4 mb-8">
      <div class="flex items-center justify-between gap-2">
        <h1
          class="text-2xl md:text-3xl font-bold flex items-center gap-2 justify-between"
        >
          <a href="/" class="hover:rotate-90 transition-transform">🔄</a>
          <span>Cache & Sync</span>
        </h1>
        <a
          href="https://github.com/acoyfellow/cache-sync"
          class="text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <img src="/github.svg" class="w-8 h-8" alt="View on GitHub" />
        </a>
      </div>

      <p class="text-lg text-neutral-600">
        This pattern is designed for applications with high read/write traffic,
        offering a scalable and low-latency caching solution using Cloudflare
        Workers & Durable Objects.
      </p>
    </section>

    <section class="mb-12">
      <details>
        <summary
          class="text-lg font-semibold mb-4 cursor-pointer hover:text-orange-500 transition-colors"
          >Cost Savings Calculator</summary
        >
        <div class="mt-4">
          <div
            class="bg-white rounded-xl p-8 border border-neutral-200 space-y-6"
          >
            <div class="grid md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <h3 class="font-medium">Your Current Costs</h3>
                <div class="space-y-2">
                  <label class="block text-sm text-neutral-700">
                    Monthly Read Operations (millions)
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      bind:value={reads}
                      class="mt-1 w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </label>
                  <label class="block text-sm text-neutral-700">
                    Cost per Million Reads ($)
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      bind:value={readCost}
                      class="mt-1 w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </label>
                  <label class="block text-sm text-neutral-700">
                    Monthly Write Operations (millions)
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      bind:value={writes}
                      class="mt-1 w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </label>
                  <label class="block text-sm text-neutral-700">
                    Cost per Million Writes ($)
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      bind:value={writeCost}
                      class="mt-1 w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </label>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="font-medium">Estimated Savings</h3>
                <div class="space-y-4">
                  <div class="p-4 bg-neutral-50 rounded-lg">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm text-neutral-600"
                        >Current Monthly Cost</span
                      >
                      <span class="font-medium">${currentCost}</span>
                    </div>
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm text-neutral-600"
                        >DO Monthly Cost</span
                      >
                      <span class="font-medium">${doCost}</span>
                    </div>
                    <div
                      class="flex justify-between items-center pt-2 border-t"
                    >
                      <span class="font-medium text-neutral-600"
                        >Monthly Savings</span
                      >
                      <span class="font-medium text-green-600">${savings}</span>
                    </div>
                  </div>
                  <p class="text-sm text-neutral-500">
                    Includes <a
                      href="https://developers.cloudflare.com/durable-objects/platform/pricing/"
                      class="text-orange-500 hover:text-orange-600 transition-colors underline-offset-2 underline"
                      >Durable Objects pricing</a
                    >:
                    <br />• Reads: $0.20 per million
                    <br />• Writes: $1.00 per million
                    <br />• Storage: $0.20 per GB-month
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>

    <div class="mb-8"></div>

    <div
      class="bg-white rounded-xl p-8 relative border border-neutral-200"
      in:fly={{ y: 20, duration: 300 }}
    >
      <h2 class="text-lg font-semibold mb-4">Demo:</h2>

      <div class="flex gap-3 pb-6 flex-col md:flex-row">
        {#each demoIds as id}
          <button
            class="px-5 py-2.5 rounded-lg border hover:-translate-y-0.5 hover:shadow cursor-pointer transition-all {selectedId ===
            id
              ? 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600'
              : 'bg-white hover:bg-neutral-50 border-neutral-200 hover:-translate-y-0.5 hover:shadow '}"
            onclick={() => (selectedId = id)}
          >
            {id}
          </button>
        {/each}
      </div>

      {#if showSuccess}
        <div
          class="absolute top-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-md"
          in:fade={{ duration: 200 }}
          out:fade={{ duration: 200 }}
        >
          ✓ Profile updated successfully
        </div>
      {/if}
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
        <h3 class="text-lg font-semibold mb-4">Edit Profile</h3>
        <form
          class="space-y-6 min-h-60"
          in:fade={{ duration: 200 }}
          onsubmit={(e: Event) => {
            e.preventDefault();
            updateProfile({
              ...profile,
              lastUpdated: new Date().toISOString(),
            });
          }}
        >
          <div class="space-y-4">
            <div class="space-y-2">
              <label
                for="name"
                class="block text-sm font-medium text-neutral-700">Name</label
              >
              <input
                id="name"
                type="text"
                class="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all focus:outline-none"
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
                class="w-full px-4 py-2.5 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all focus:outline-none"
                bind:value={profile.data.email}
              />
            </div>
          </div>

          <button
            class="w-full px-5 py-2.5 rounded-lg bg-orange-500 text-white font-medium transition-all hover:-translate-y-0.5 hover:shadow hover:bg-orange-600 focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
            type="submit"
            aria-disabled={!profile}
            disabled={!profile}
          >
            {isOnline ? "Update Profile" : "Save Locally (Offline)"}
          </button>

          <p class="text-sm text-neutral-500">
            Last Updated: {new Date(profile.lastUpdated).toLocaleString()}
            <br />
            Current User ID: {selectedId}
          </p>
        </form>
      {/if}
    </div>
    <p class="text-sm text-neutral-500 p-3 text-center">
      Open
      <a
        href="/?userId={selectedId}"
        target="_blank"
        class="text-orange-500 hover:text-orange-600 transition-colors underline-offset-2 underline"
        >multiple tabs/windows</a
      >
      with the same user ID to see real-time sync.
    </p>

    <!-- Add offline status banner at top -->
    <div role="status" aria-live="polite">
      {#if !isOnline}
        <div class="bg-red-100 p-2 text-center text-sm text-red-800">
          ⚡ Offline - Changes will sync when connection resumes
        </div>
      {/if}
    </div>
  </div>
</main>
