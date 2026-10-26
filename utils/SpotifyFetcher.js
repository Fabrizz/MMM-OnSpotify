/*
 * MMM-OnSpotify
 * MIT license
 *
 * By Fabrizio <3 (Fabrizz) | https://github.com/Fabrizz/MMM-OnSpotify
 * Original implementation: Raywo | https://github.com/raywo/MMM-NowPlayingOnSpotify
 */

// Prefer native fetch when available (Node 18+). node-fetch v2 fails on newer
// Node versions with "Premature close" while reading the token response.
// Fall back to node-fetch for older MM2 installs.
const fetch = globalThis.fetch ?? require("node-fetch");
const tokenRefreshBase = "https://accounts.spotify.com";
const userBase = "https://api.spotify.com";
const logPrefix = "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m]";
const requestTimeout = 10 * 1000;
// Refresh a bit before Spotify expires the token, so it does not expire mid-request
const tokenRefreshMargin = 60 * 1000;

// path can be a function of the module preferences
const endpoints = {
  PLAYER: {
    label: "Player data",
    path: "v1/me/player",
    params: { additional_types: "track,episode" },
  },
  USER: { label: "User data", path: "v1/me" },
  QUEUE: { label: "Queue data", path: "v1/me/player/queue" },
  AFFINITY: {
    label: "Affinity data",
    path: (preferences) =>
      `v1/me/top/${preferences.userAffinityUseTracks ? "tracks" : "artists"}`,
    params: { limit: 9 },
  },
  RECENT: { label: "Recent data", path: "v1/me/player/recently-played" },
};

module.exports = class SpotifyFetcher {
  constructor(payload) {
    this.preferences = payload.preferences;
    this.language = payload.language;
    this.credentials = [];
    this.credentials.push({ ...payload.credentials, tokenExpiresAt: Date.now() });
    this.credentials.push({ ...payload.secondaryCredentials, tokenExpiresAt: Date.now() });
    this.canvasTokenExpiresAt = Date.now();
    this.canvasToken = null;
  }

  /**
   * Fetches data from the Spotify API, refreshing the access token first if it expired.
   *
   * @param {"PLAYER" | "USER" | "QUEUE" | "AFFINITY" | "RECENT"} type - The type of data to fetch.
   * @param {Number} account - The account to get data from.
   * @returns {Promise<Object|null|Error>} The parsed JSON, `null` if there is no content, or an Error.
   */
  async getData(type, account = 0) {
    const credentials = this.credentials[account];
    if (Date.now() >= credentials.tokenExpiresAt) {
      // Calls that arrive while a refresh is in flight wait for that same refresh
      if (!credentials.refreshing)
        credentials.refreshing = this.updateToken(account).finally(() => {
          credentials.refreshing = null;
        });
      const result = await credentials.refreshing;
      if (result instanceof Error) return result;
    }
    return this.requestData(type, account);
  }

  /**
   * Refreshes the access token and saves it, along with the refresh token if Spotify rotated it.
   *
   * @param {Number} account - The account to update.
   * @returns {Promise<null|Error>} `null` when the token was updated, or an Error.
   */
  async updateToken(account) {
    const credentials = this.credentials[account];
    const token = await this.refreshAccessToken(account);
    if (token instanceof Error) return token;
    if (!token || !token.access_token)
      return this.fail("Refresh access token", "Response did not include an access token");

    credentials.accessToken = token.access_token;
    credentials.tokenExpiresAt =
      Date.now() + Math.max(0, token.expires_in * 1000 - tokenRefreshMargin);
    // Spotify can send a new refresh token, the old one may stop working.
    // Only kept in memory, the config still has the original one.
    if (token.refresh_token && token.refresh_token !== credentials.refreshToken) {
      credentials.refreshToken = token.refresh_token;
      console.log(
        `${logPrefix} Refresh token rotated by Spotify >> \x1b[44m\x1b[37m %s \x1b[0m`,
        `[Account: ${account + 1}]`,
      );
    }
    console.log(
      `${logPrefix} Access token expiration 🗝  >> \x1b[44m\x1b[37m %s \x1b[0m`,
      `${this.formatTime(credentials.tokenExpiresAt)} [Account: ${account + 1}]`,
    );
    return null;
  }

  /**
   * Requests one of the Web API endpoints with the current access token.
   *
   * @param {"PLAYER" | "USER" | "QUEUE" | "AFFINITY" | "RECENT"} type - The type of data to fetch.
   * @param {Number} account - The account to get data from.
   * @returns {Promise<Object|null|Error>} The parsed JSON, `null` if there is no content, or an Error.
   */
  async requestData(type, account) {
    const endpoint = endpoints[type];
    if (!endpoint) return this.fail("Request data", `Unknown data type "${type}"`);

    const path =
      typeof endpoint.path === "function"
        ? endpoint.path(this.preferences)
        : endpoint.path;
    const url = new URL(path, userBase);
    Object.entries(endpoint.params || {}).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );

    const headers = {
      Authorization: `Bearer ${this.credentials[account].accessToken}`,
    };
    // TODO: Check if using &locale= (or &market=) has any different effect, as its not documented correctly
    if (this.language) headers["Accept-Language"] = this.language;

    const data = await this.request(endpoint.label, url, { method: "GET", headers });
    // The token was revoked or expired early, get a new one on the next call
    if (data instanceof Error && data.status === 401)
      this.credentials[account].tokenExpiresAt = 0;
    return data;
  }

  /**
   * Refreshes the access token for the specified account.
   *
   * @param {Number} account - The account to refresh the access token for.
   * @returns {Promise<Object|null|Error>} The token response as a JSON object, or an Error.
   */
  refreshAccessToken(account) {
    const { clientId, clientSecret, refreshToken } = this.credentials[account];

    return this.request(
      "Refresh access token",
      new URL("api/token", tokenRefreshBase),
      {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`,
          ).toString("base64")}`,
        },
      },
      "Error refreshing access token. Check your credentials, account type or status.",
    );
  }

  /**
   * Shared fetch for every request: checks the status and parses the body.
   *
   * @param {String} label - Name used in the logs.
   * @param {URL} url - The URL to request.
   * @param {Object} options - fetch options.
   * @param {String} [failHint] - Message logged when the response is not OK.
   * @returns {Promise<Object|null|Error>} The parsed JSON, `null` if there is no content, or an Error.
   */
  async request(label, url, options, failHint = "Request failed") {
    // AbortController is global from Node 15, older installs just get no timeout
    const controller =
      typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(), requestTimeout)
      : null;

    let res;
    let body;
    try {
      res = await fetch(url, {
        ...options,
        ...(controller && { signal: controller.signal }),
      });
      // Read as text so an empty body works the same with native fetch and node-fetch
      body = await res.text();
    } catch (error) {
      const timedOut = controller && controller.signal.aborted;
      return this.fail(
        label,
        timedOut ? `Request timed out after ${requestTimeout / 1000}s` : "Request error",
        { cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const message =
        res.status === 429
          ? "You are being rate limited by Spotify (429). Use only one SpotifyApp per module/implementation"
          : failHint;
      const reason = this.spotifyErrorReason(body);
      return this.fail(label, reason ? `${message} (Spotify: ${reason})` : message, {
        status: res.status,
      });
    }
    if (res.status === 204 || !body) return null;

    try {
      return JSON.parse(body);
    } catch (error) {
      return this.fail(label, "Invalid response body", { cause: error });
    }
  }

  /**
   * Extracts the reason from a Spotify error body. The accounts service uses
   * { error, error_description } and the Web API uses { error: { status, message } }.
   *
   * @param {String} body - The raw response body.
   * @returns {String|null} The reason, or null if the body has none.
   */
  spotifyErrorReason(body) {
    try {
      const { error, error_description } = JSON.parse(body);
      if (typeof error === "string")
        return error_description ? `${error}: ${error_description}` : error;
      return (error && error.message) || null;
    } catch {
      return null;
    }
  }

  /* UTILS */
  /**
   * Logs a failed request and returns it as an Error.
   *
   * @param {String} label - Name used in the logs.
   * @param {String} message - What went wrong.
   * @param {{status?: Number, cause?: *}} [details] - HTTP status and/or original error.
   * @returns {Error} The error, with `status` set for HTTP errors.
   */
  fail(label, message, { status, cause } = {}) {
    console.error(
      `${logPrefix} ${label} >> \x1b[41m\x1b[37m %s \x1b[0m %s`,
      status ? `CODE ${status}` : "Request error",
      message,
      ...(cause ? [cause] : []),
    );
    const error = new Error(`${label}: ${message}`);
    if (status) error.status = status;
    if (cause) error.cause = cause;
    return error;
  }

  /**
   * Formats a given time in milliseconds to a human-readable format.
   *
   * @param {number} milliseconds - The time in milliseconds to format.
   * @return {string} The formatted time as a string in the format "HH:MM:SS".
   */
  formatTime(milliseconds) {
    const formattedTime = new Date(milliseconds).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return formattedTime === "Invalid date" ? milliseconds : formattedTime;
  }
};
