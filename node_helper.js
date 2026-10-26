/*
 * MMM-OnSpotify
 * MIT license
 *
 * By Fabrizio <3 (Fabrizz) | https://github.com/Fabrizz/MMM-OnSpotify
 */

"use strict";
const path = require("path");
const crypto = require("crypto");
// MagicMirror's own express (MM2 always ships it, no extra dependency)
const express = require("express");
const NodeHelper = require("node_helper");
const SpotifyFetcher = require("./utils/SpotifyFetcher");
const CredentialStore = require("./utils/CredentialStore");

// The module page (web/local, built into page/) and its API
const pageBase = "/onspotify";
const apiBase = `${pageBase}/api`;
// Same scopes as the onsp auth tool (web/src/components/authtool.tsx)
const authScopes =
  "user-read-playback-state user-read-currently-playing user-top-read user-read-private";
// onsp knows a login belongs to a mirror (and not to its own tool) by this prefix
const mirrorStatePrefix = "onsp-mirror";
// Time to finish the Spotify login started from the module page
const authAttemptLifetime = 15 * 60 * 1000;

const logPrefix = "[\x1b[35mMMM-OnSpotify\x1b[0m]";
// Max size of a JSON body sent by the local page
const maxBodySize = 4 * 1024;

module.exports = NodeHelper.create({
  start: function () {
    console.log(
      "[\x1b[35mMMM-OnSpotify\x1b[0m] by Fabrizz >> Node helper loaded.",
    );
    this.fetcher = undefined;
    // Helps keping track of when the player becomes empty
    this.lastPlayerStatus = undefined;
    // Helps keping track of when the song actually changes
    this.lastMediaUri = undefined;
    // Helps keping track of when the current device target is changed
    this.lastDeviceName = undefined;
    // The times that an available (but empty) player has been returned by the api
    this.lastPlayerStatusCount = 0;
    // Configuration sent to the helper
    this.preferences = undefined;
    // Use a identifier to filter socket-io retries
    this.appendableId = undefined;
    this.serversideId = Date.now().toString(16);

    // Canvas url and to which item it corresponds to
    this.savedCanvasUrl = false;
    this.savedCanvasUri = "";

    /* Module page (page/, served at /onspotify/) */
    this.store = new CredentialStore(CredentialStore.defaultPath());
    // Credentials from config.js, as sent by the frontend
    this.configCredentials = null;
    // Redirect URI registered in the user's Spotify App (onsp handoff)
    this.authRedirectUri = "https://onsp.fabriziob.com/";
    // Spotify logins started from the page: nonce => { redirectUri, createdAt }
    this.authAttempts = new Map();
    // Which refresh token is in use: { source, authorizedAt, expiresBy }
    this.tokenInfo = null;
    this.pageUser = null;
    this.nowPlaying = { empty: true };
    this.lastError = null;
    this.lastSuccess = false;
    this.reauthNotified = false;
    this.lastStatusJson = "";
    // SSE senders for the open pages
    this.pageClients = new Set();
    this.registerRoutes();
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case "SET_CREDENTIALS_REFRESH":
        // Blocks re-requests caused by socket.io implementation
        if (payload.backendExpectId === this.appendableId) break;
        this.configCredentials = payload.credentials;
        if (payload.authRedirectUri) this.authRedirectUri = payload.authRedirectUri;
        this.tokenInfo = this.resolveToken();
        this.fetcher = new SpotifyFetcher({
          ...payload,
          credentials: {
            ...payload.credentials,
            refreshToken: this.tokenInfo.refreshToken,
          },
        });
        this.fetcher.onTokenRotated = (account, refreshToken) => {
          if (account === 0) this.saveToken({ refreshToken, source: "rotation" });
        };
        this.lastError = null;
        this.lastSuccess = false;
        this.reauthNotified = false;
        this.broadcastStatus();
        this.fetchSpotifyData("PLAYER");
        this.preferences = payload.preferences;
        this.appendableId = payload.backendExpectId;
        if (this.appendableId !== "ABC")
          console.log(
            "[\x1b[35mMMM-OnSpotify\x1b[0m] Session identifier: >> \x1b[44m\x1b[37m %s \x1b[0m",
            `${this.appendableId}`,
          );
        break;
        // TODO: Frontend should ask for which account and balance the refreshes
      case "REFRESH_PLAYER":
        if (this.isCorrectIdOrRefresh(payload)) this.fetchSpotifyData("PLAYER", payload.accountNum || 0);
        break;
      case "REFRESH_USER":
        if (this.isCorrectIdOrRefresh(payload)) this.fetchSpotifyData("USER", payload.accountNum || 0);
        break;
      case "REFRESH_AFFINITY":
        if (this.isCorrectIdOrRefresh(payload))
          this.fetchSpotifyData("AFFINITY", payload.accountNum || 0);
        break;

      /* WIP | Non implemented */
      case "REFRESH_QUEUE":
        this.fetchSpotifyData("QUEUE", payload.accountNum || 0);
        break;
      case "REFRESH_RECENT":
        this.fetchSpotifyData("RECENT", payload.accountNum || 0);
        break;
    }
  },

  fetchSpotifyData: async function (type, accountNum = 0) {
    try {
      let data = await this.fetcher.getData(type, accountNum);
      if (data instanceof Error) {
        this.lastError = data.message;
        if (data.reauth && !this.reauthNotified) {
          this.reauthNotified = true;
          this.sendSocketNotification("REAUTH_REQUIRED");
        }
        this.broadcastStatus();
        return this.sendSocketNotification(
          "CONNECTION_ERRONED",
          JSON.stringify(data),
        );
      }
      this.lastError = null;
      this.lastSuccess = true;
      this.broadcastStatus();

      switch (type) {
        case "PLAYER":
          // CASE S1 The data is OK and the target is a filtered device
          if (
            data &&
            data.device &&
            data.device.name &&
            !this.isAllowedDevice(data.device.name)
          ) {
            this.sendPlayerData({
              statusIsPlayerEmpty: true,
              statusIsNewSong: false,
              statusIsChangeToEmptyPlayer: this.lastPlayerStatus,
              statusIsChangeToMediaPlayer: false,
              statusPlayerUpdating: false,
              statusIsDeviceChange: false,
              notAllowedDevice: data.device.name,
            });
            this.lastMediaUri = "empty";
            this.lastPlayerStatus = false;
            this.lastPlayerStatusCount = 0;
            this.lastDeviceName = "unknown";
            break;
          }
          // CASE S2 The data is OK and the target is in a private session
          if (data && data.device && data.device.is_private_session) {
            let payload = {
              /* Player data */
              playerIsPlaying: true,
              /* Device data (Some are not used yet) */
              deviceName: data.device.name,
              deviceType: data.device.type,
              deviceVolume: data.device.volume_percent,
              deviceIsPrivate: data.device.is_private_session,
              deviceId: data.device.id,
              /* Special status sync */
              statusIsPlayerEmpty: false,
              statusIsNewSong:
                this.lastMediaUri !== "privatesession" ? true : false,
              statusIsChangeToEmptyPlayer: false,
              statusIsChangeToMediaPlayer: this.lastPlayerStatus ? false : true,
              statusPlayerUpdating: false,
              statusIsDeviceChange:
                this.lastDeviceName !== data.device.name ? true : false,
              notAllowedDevice: false,
            };
            this.sendPlayerData(payload);
            this.lastMediaUri = "privatesession";
            this.lastDeviceName = data.device.name;
            this.lastPlayerStatus = true;
            this.lastPlayerStatusCount = 0;
            break;
          }

          if (data && data.item) {
            // CASE 1 The data is OK and there is an ITEM in the player
            const isTrack =
              data.currently_playing_type === "track" ? true : false;

            const itemImages =
              this.processImages(
                (isTrack ? data.item.album.images : data.item.show.images) || []);

            // Add a canvas object if enabled
            // if (isTrack && this.preferences.useCanvas && (this.lastMediaUri !== data.item.uri)) this.statelessGetCanvas(data.item.uri, itemImages)
            
            let payload = {
              /* Player data */
              playerIsPlaying: data.is_playing,
              playerProgress: data.progress_ms,
              playerMediaType: data.currently_playing_type,
              playerShuffleState: data.shuffle_state,
              playerRepeatState: data.repeat_state,
              /* Item generics */
              itemId: data.item.id,
              itemUri: data.item.uri,
              itemName: data.item.name,
              itemDuration: data.item.duration_ms,
              itemImages,
              /* Item specifics (Some are not used yet) */
              itemAlbum: isTrack ? data.item.album.name : null,
              itemPublisher: isTrack ? null : data.item.show.publisher,
              itemShowName: isTrack ? null : data.item.show.name,
              itemShowDescription: isTrack ? null : data.item.show.description,
              itemArtist: isTrack ? data.item.artists[0].name : null,
              itemArtists: this.processArtists(
                (isTrack ? data.item.artists : null) || [],
              ),
              /* Device data (Some are not used yet) */
              deviceName: data.device.name,
              deviceType: data.device.type,
              deviceVolume: data.device.volume_percent,
              deviceIsPrivate: data.device.is_private_session,
              deviceId: data.device.id,
              /* Special canvas sync */
              canvas: data.item.uri === this.savedCanvasUri ? this.savedCanvasUrl : false,
              /* Special status sync */
              statusIsPlayerEmpty: false,
              statusIsNewSong:
                this.lastMediaUri !== data.item.uri ? true : false,
              statusIsChangeToEmptyPlayer: false,
              statusIsChangeToMediaPlayer: this.lastPlayerStatus ? false : true,
              statusPlayerUpdating: false,
              statusIsDeviceChange:
                this.lastDeviceName !== data.device.name ? true : false,
              notAllowedDevice: false,
            };
            this.sendPlayerData(payload);
            this.lastMediaUri = data.item.uri;
            this.lastPlayerStatus = true;
            this.lastPlayerStatusCount = 0;
            this.lastDeviceName = data.device.name;
          } else if (data && !data.item) {
            // CASE 2 The player in in transit (data OK, no ITEM)
            if (this.lastPlayerStatusCount <= 3) {
              // CASE 2A The player is available but there are no items in it. Wait 3 calls
              // This prevents an empty module when the player is loading or the playlist updating
              this.sendPlayerData({
                statusIsPlayerEmpty: true,
                statusIsNewSong: false,
                statusIsChangeToEmptyPlayer: this.lastPlayerStatus,
                statusIsChangeToMediaPlayer: false,
                statusPlayerUpdating: true,
                statusIsDeviceChange: false,
                notAllowedDevice: false,
              });
              this.lastPlayerStatusCount = this.lastPlayerStatusCount + 1;
              this.lastPlayerStatus = true;
            } else {
              this.sendPlayerData({
                // CASE 2B The player is empty but still available for more than expected. Mark it as empty
                statusIsPlayerEmpty: true,
                statusIsNewSong: false,
                statusIsChangeToEmptyPlayer: this.lastPlayerStatus,
                statusIsChangeToMediaPlayer: false,
                statusPlayerUpdating: false,
                statusIsDeviceChange: false,
                notAllowedDevice: false,
              });
              this.lastMediaUri = "empty";
              this.lastPlayerStatus = false;
              this.lastDeviceName = "unknown";
            }
            // CASE 3 There is nothing playing and there is not a player available
          } else {
            this.sendPlayerData({
              statusIsPlayerEmpty: true,
              statusIsNewSong: false,
              statusIsChangeToEmptyPlayer: this.lastPlayerStatus,
              statusIsChangeToMediaPlayer: false,
              statusPlayerUpdating: false,
              statusIsDeviceChange: false,
              notAllowedDevice: false,
            });
            this.lastMediaUri = "empty";
            this.lastPlayerStatus = false;
            this.lastPlayerStatusCount = 0;
            this.lastDeviceName = "unknown";
          }
          break;
        case "USER":
          if (data) {
            let payload = {
              country: data.country,
              name: data.display_name,
              id: data.id,
              image: data.images && data.images[0] ? data.images[0].url : null,
              product: data.product,
              filterEnabled: data.explicit_content?.filter_enabled,
              filterLocked: data.explicit_content?.filter_locked,
              type: data.type,
            };
            this.sendSocketNotification("USER_DATA", payload);
            this.setPageUser(data);
          }
          break;
        case "AFFINITY":
          if (data && Array.isArray(data.items)) {
            const payload = data.items.map((item) => {
              const images =
                (item.type === "track" ? item.album?.images : item.images) || [];
              // Here we use medium sized images || Maybe later even the icon ones, as its just a background
              // Fallback to any of the available image sizes.
              const image =
                images.find((image) => image.width >= 240 && image.width <= 360) ||
                images[0];
              return { name: item.name, image: image ? image.url : "" };
            });
            this.sendSocketNotification("AFFINITY_DATA", payload);
          }
          break;

        // Future update
        case "QUEUE":
          break;
      }
    } catch (error) {
      console.warn(
        "[\x1b[35mMMM-OnSpotify\x1b[0m] >> \x1b[41m\x1b[37m %s \x1b[0m ",
        "Error fetching data (OOB)",
        error,
      );
    }
  },

  /* LOCAL PAGE */
  registerRoutes: function () {
    const base = apiBase;
    // Not in public/, MM2 would also serve it at /MMM-OnSpotify/ where the API paths break
    this.expressApp.use(pageBase, express.static(path.join(this.path, "page")));

    this.expressApp.get(`${base}/status`, (req, res) => {
      res.json(this.pageStatus());
    });

    // Server-Sent Events: "status" and "nowPlaying"
    this.expressApp.get(`${base}/events`, (req, res) => {
      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      res.flushHeaders();
      res.write("retry: 5000\n\n");

      const send = (event, data) =>
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      this.pageClients.add(send);
      send("status", this.pageStatus());
      send("nowPlaying", this.currentNowPlaying());
      this.loadPageUser();

      const heartbeat = setInterval(() => res.write(": ping\n\n"), 25 * 1000);
      req.on("close", () => {
        clearInterval(heartbeat);
        this.pageClients.delete(send);
      });
    });

    // Use a new refresh token (pasted in the page). It is tested with Spotify before saving.
    this.expressApp.post(`${base}/auth/token`, async (req, res) => {
      if (!this.isPageRequest(req))
        return res.status(403).json({ error: "Request not allowed" });
      if (!this.fetcher)
        return res.status(409).json({
          error: "The module has not started yet, open the mirror and try again",
        });

      const body = await this.readJsonBody(req);
      const refreshToken =
        body && typeof body.refreshToken === "string"
          ? body.refreshToken.trim()
          : "";
      if (!refreshToken || refreshToken.length > 1024)
        return res.status(400).json({ error: "Missing or invalid refresh token" });

      const result = await this.fetcher.testRefreshToken(0, refreshToken);
      if (result instanceof Error)
        return res.status(400).json({ error: result.message });

      this.saveToken({ refreshToken: result, source: "manual", authorizedAt: Date.now() });
      this.afterTokenChange();
      res.json(this.pageStatus());
    });

    // Forget the saved token and use the one in config.js again
    this.expressApp.delete(`${base}/auth`, (req, res) => {
      if (!this.isPageRequest(req))
        return res.status(403).json({ error: "Request not allowed" });
      if (!this.fetcher)
        return res.status(409).json({
          error: "The module has not started yet, open the mirror and try again",
        });

      try {
        this.store.clear(this.configCredentials);
      } catch (error) {
        console.error(`${logPrefix} Could not update .credentials.json`, error);
      }
      this.tokenInfo = this.resolveToken();
      this.fetcher.setRefreshToken(0, this.tokenInfo.refreshToken);
      this.afterTokenChange();
      res.json(this.pageStatus());
    });

    /*
     * onsp handoff (see README):
     * page > onsp /connect (save mirror) > auth/start > Spotify login > onsp (redirect URI) > auth/callback
     * The client secret never leaves the mirror, onsp only forwards the login code.
     */
    this.expressApp.get(`${base}/auth/start`, (req, res) => {
      if (!this.fetcher)
        return this.redirectToPage(res, {
          reauth: "error",
          reason: "The module has not started yet, open the mirror and try again",
        });

      const nonce = crypto.randomBytes(16).toString("hex");
      this.addAuthAttempt(nonce, { redirectUri: this.authRedirectUri });
      // The address the browser used to reach this page, onsp sends the login back here
      const mirror = `${req.protocol}://${req.get("host")}${pageBase}/`;
      const state = [
        mirrorStatePrefix,
        nonce,
        Buffer.from(mirror).toString("base64url"),
      ].join(".");

      const url = new URL("https://accounts.spotify.com/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", this.configCredentials.clientId);
      url.searchParams.set("scope", authScopes);
      url.searchParams.set("redirect_uri", this.authRedirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("show_dialog", "true");
      res.redirect(url.href);
    });

    // onsp forwards the Spotify login here. Only logins started by auth/start (nonce) are accepted.
    this.expressApp.get(`${base}/auth/callback`, async (req, res) => {
      const { code, state, error } = req.query;
      const nonce = typeof state === "string" ? state.split(".")[1] : null;
      const attempt = nonce ? this.takeAuthAttempt(nonce) : null;
      if (!attempt)
        return this.redirectToPage(res, {
          reauth: "error",
          reason: "This login was not started from this mirror, or it took too long. Start again.",
        });
      if (error)
        return this.redirectToPage(res, { reauth: "error", reason: `Spotify: ${error}` });
      if (typeof code !== "string" || !code || !this.fetcher)
        return this.redirectToPage(res, { reauth: "error", reason: "Missing login code" });

      const result = await this.fetcher.exchangeCode(0, code, attempt.redirectUri);
      if (result instanceof Error)
        return this.redirectToPage(res, { reauth: "error", reason: result.message });

      this.saveToken({ refreshToken: result, source: "handoff", authorizedAt: Date.now() });
      this.afterTokenChange();
      this.redirectToPage(res, { reauth: "ok" });
    });
  },

  redirectToPage: function (res, params) {
    res.redirect(`${pageBase}/?${new URLSearchParams(params)}`);
  },

  addAuthAttempt: function (nonce, attempt) {
    // Drop expired attempts, and keep only a few so a loop of requests can't fill memory
    for (const [key, value] of this.authAttempts)
      if (Date.now() - value.createdAt > authAttemptLifetime || this.authAttempts.size >= 10)
        this.authAttempts.delete(key);
    this.authAttempts.set(nonce, { ...attempt, createdAt: Date.now() });
  },

  // Single use: the attempt is removed when it is read
  takeAuthAttempt: function (nonce) {
    const attempt = this.authAttempts.get(nonce);
    this.authAttempts.delete(nonce);
    if (!attempt || Date.now() - attempt.createdAt > authAttemptLifetime) return null;
    return attempt;
  },

  /**
   * Only accepts JSON requests from the page itself, so other websites open in
   * the same browser cannot change the token (CSRF).
   */
  isPageRequest: function (req) {
    if (!(req.headers["content-type"] || "").startsWith("application/json"))
      return false;
    const origin = req.headers.origin;
    // Browsers always send Origin on POST/DELETE, tools like curl do not
    if (!origin) return true;
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  },

  readJsonBody: function (req) {
    return new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > maxBodySize) {
          resolve(null);
          req.destroy();
        }
      });
      req.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(null);
        }
      });
      req.on("error", () => resolve(null));
    });
  },

  resolveToken: function () {
    try {
      return this.store.resolve(this.configCredentials);
    } catch (error) {
      console.error(`${logPrefix} Could not read/write .credentials.json`, error);
      return {
        refreshToken: this.configCredentials.refreshToken,
        source: "config",
        authorizedAt: null,
        expiresBy: null,
      };
    }
  },

  saveToken: function (token) {
    try {
      this.store.save(this.configCredentials, token);
      this.tokenInfo = this.store.resolve(this.configCredentials);
      console.log(
        `${logPrefix} Refresh token saved to .credentials.json >> \x1b[44m\x1b[37m %s \x1b[0m`,
        token.source,
      );
    } catch (error) {
      console.error(`${logPrefix} Could not save .credentials.json`, error);
    }
  },

  afterTokenChange: function () {
    this.lastError = null;
    this.reauthNotified = false;
    this.pageUser = null;
    this.broadcastStatus();
    this.loadPageUser();
  },

  pageStatus: function () {
    let state = "waiting";
    if (this.fetcher) {
      if (this.fetcher.needsReauth(0)) state = "reauth";
      else if (this.lastError) state = "error";
      else if (this.lastSuccess) state = "connected";
    }
    return {
      state,
      error: this.lastError,
      user: this.pageUser,
      token: this.tokenInfo
        ? {
            source: this.tokenInfo.source,
            authorizedAt: this.tokenInfo.authorizedAt,
            expiresBy: this.tokenInfo.expiresBy,
          }
        : null,
      // The redirect URI the user's Spotify App needs for the onsp handoff
      redirectUri: this.authRedirectUri,
    };
  },

  broadcast: function (event, data) {
    this.pageClients.forEach((send) => send(event, data));
  },

  // Only sends when something changed, this is called on every poll
  broadcastStatus: function () {
    const status = this.pageStatus();
    const json = JSON.stringify(status);
    if (json === this.lastStatusJson) return;
    this.lastStatusJson = json;
    this.broadcast("status", status);
  },

  setPageUser: function (data) {
    this.pageUser = {
      name: data.display_name || data.id,
      image: data.images && data.images[0] ? data.images[0].url : null,
      product: data.product,
    };
    this.broadcastStatus();
  },

  // The frontend only asks for user data if it shows it, so the page may need to load it
  loadPageUser: async function () {
    if (this.pageUser || !this.fetcher || this.fetcher.needsReauth(0)) return;
    const data = await this.fetcher.getData("USER");
    if (data && !(data instanceof Error)) this.setPageUser(data);
  },

  // Progress as of now, the page animates it from the moment it gets the event
  currentNowPlaying: function () {
    const playing = this.nowPlaying;
    if (!playing.isPlaying || playing.progress === undefined) return playing;
    return {
      ...playing,
      progress: Math.min(
        playing.duration || Infinity,
        playing.progress + (Date.now() - playing.at),
      ),
    };
  },

  sendPlayerData: function (payload) {
    this.sendSocketNotification("PLAYER_DATA", payload);
    // The player is loading, keep showing the last item
    if (payload.statusPlayerUpdating) return;

    const previous = this.nowPlaying;
    let next;
    if (payload.deviceIsPrivate)
      next = { private: true, device: payload.deviceName, deviceType: payload.deviceType };
    else if (payload.statusIsPlayerEmpty)
      next = { empty: true, filteredDevice: payload.notAllowedDevice || null };
    else
      next = {
        name: payload.itemName,
        artists: payload.itemArtists || payload.itemShowName || "",
        album: payload.itemAlbum,
        image: payload.itemImages ? payload.itemImages.large || payload.itemImages.medium : null,
        uri: payload.itemUri,
        type: payload.playerMediaType,
        device: payload.deviceName,
        deviceType: payload.deviceType,
        isPlaying: payload.playerIsPlaying,
        progress: payload.playerProgress,
        duration: payload.itemDuration,
        at: Date.now(),
      };
    this.nowPlaying = next;

    // Send on changes and seeks, the page animates the progress by itself
    const key = (n) =>
      JSON.stringify([n.empty, n.private, n.filteredDevice, n.uri, n.isPlaying, n.device]);
    const expected =
      previous.isPlaying && previous.progress !== undefined
        ? previous.progress + (next.at - previous.at)
        : previous.progress;
    const seeked =
      next.progress !== undefined && Math.abs(next.progress - expected) > 3000;
    if (key(previous) !== key(next) || seeked) this.broadcast("nowPlaying", next);
  },
  isCorrectIdOrRefresh(rcvd) {
    if (rcvd !== this.appendableId) {
      if (typeof this.appendableId === "undefined") {
        // Means that the backend reloaded and the frontend is in a different state
        this.sendSocketNotification("REQUEST_REAUTH", this.serversideId);
      }
      return false;
    }
    return true;
  },
  isAllowedDevice: function (currentDevice) {
    if (
      !this.preferences.deviceFilter ||
      this.preferences.deviceFilter.length < 1
    )
      return true;
    return this.preferences.deviceFilterExclude
      ? !this.preferences.deviceFilter.includes(currentDevice)
      : this.preferences.deviceFilter.includes(currentDevice);
  },
  processArtists: (artists) => artists.map((artist) => artist.name).join(", "),
  processImages: (images) => {
    if (!images || images.length === 0) {
      return { large: "", medium: "", thumb: "" };
    }

    function isVideoLikeAspect(image) {
      const ratio = image.width / image.height;
      return ratio > 1.3 || ratio < 0.75; // Wide or tall (non-square)
    };

    function findClosest(target) {
      return images.reduce((closest, image) => {
        const closestDiff = Math.abs(closest.width - target);
        const currentDiff = Math.abs(image.width - target);
        return currentDiff < closestDiff ? image : closest;
      }, images[0]).url;
    };;

    return {
      large: findClosest(640),
      medium: findClosest(300),
      thumb: findClosest(100),

      // Detect if its a video playback as Spotify does not expose this information
      // Use the aspect ratio to determine if its a video or not
      isProbablyVideo: (images.reduce((count, image) => {
        return count + (isVideoLikeAspect(image) ? 1 : 0);
      }, 0) >= 2)
    };
  },
});


/* Support for canvases, will be removed in later versions */
// async statelessGetCanvas(uri, itemImages) {
//   try {
//     // use then to prevent context issue
//     this.fetcher.getCanvas(uri).then(canvas => {
//       // console.log("[CANVAS DATA]", JSON.stringify(canvas))

//       console.log(canvas)

//       if (!canvas || !canvas.canvasesList) return;

//       if (canvas.canvasesList.length == 1 && canvas.canvasesList[0].canvasUrl.endsWith('.mp4')) {
//         const item = canvas.canvasesList[0];
//         this.savedCanvasUrl = item.canvasUrl;
//         this.savedCanvasUri = item.trackUri;

//         this.sendSocketNotification("UPDATE_CANVAS", {
//           itemUri: item.trackUri,
//           url: item.canvasUrl,
//           itemImages: itemImages
//         });
//       }
//     });
//   } catch (error) {
//     console.warn(
//       "[\x1b[35mMMM-OnSpotify\x1b[0m] >> \x1b[41m\x1b[37m %s \x1b[0m ",
//       "Error fetching cover data (OOB)",
//       error,
//     );
//   }
// },