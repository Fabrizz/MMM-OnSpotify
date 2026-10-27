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
    // Set by the node_helper: (account, refreshToken) => void
    this.onTokenRotated = null;
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
    // Spotify will not accept this refresh token again, wait for a new one
    if (credentials.needsReauth) return this.reauthError();
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
    if (token instanceof Error) {
      // Expired (6 months) or revoked refresh token, retrying will not help
      if (token.spotifyError === "invalid_grant") {
        credentials.needsReauth = true;
        console.error(
          `${logPrefix} Refresh access token >> \x1b[41m\x1b[37m %s \x1b[0m %s`,
          "LOGIN EXPIRED",
          `Spotify no longer accepts this refresh token [Account: ${account + 1}]. Get a new one at https://onsp.fabriziob.com/ or from the module page (/onspotify/).`,
        );
        return this.reauthError();
      }
      return token;
    }
    if (!token || !token.access_token)
      return this.fail("Refresh access token", "Response did not include an access token");

    this.applyToken(account, token);
    return null;
  }

  /**
   * Saves a token response: the access token, and the refresh token if Spotify rotated it.
   *
   * @param {Number} account - The account to update.
   * @param {Object} token - The token response from Spotify.
   */
  applyToken(account, token) {
    const credentials = this.credentials[account];
    credentials.accessToken = token.access_token;
    credentials.tokenExpiresAt =
      Date.now() + Math.max(0, token.expires_in * 1000 - tokenRefreshMargin);
    credentials.needsReauth = false;
    // Spotify can send a new refresh token, the old one may stop working
    if (token.refresh_token && token.refresh_token !== credentials.refreshToken) {
      credentials.refreshToken = token.refresh_token;
      console.log(
        `${logPrefix} Refresh token rotated by Spotify >> \x1b[44m\x1b[37m %s \x1b[0m`,
        `[Account: ${account + 1}]`,
      );
      if (this.onTokenRotated) this.onTokenRotated(account, token.refresh_token);
    }
    console.log(
      `${logPrefix} Access token expiration 🗝  >> \x1b[44m\x1b[37m %s \x1b[0m`,
      `${this.formatTime(credentials.tokenExpiresAt)} [Account: ${account + 1}]`,
    );
  }

  /**
   * Replaces the refresh token, the next call gets a new access token with it.
   *
   * @param {Number} account - The account to update.
   * @param {String} refreshToken - The new refresh token.
   */
  setRefreshToken(account, refreshToken) {
    const credentials = this.credentials[account];
    credentials.refreshToken = refreshToken;
    credentials.needsReauth = false;
    credentials.tokenExpiresAt = 0;
  }

  /**
   * Tries a refresh token before using it. Nothing changes if Spotify rejects it.
   *
   * @param {Number} account - The account to test the token for (uses its client id/secret).
   * @param {String} refreshToken - The candidate refresh token.
   * @returns {Promise<String|Error>} The refresh token to keep (Spotify may rotate it), or an Error.
   */
  async testRefreshToken(account, refreshToken) {
    const token = await this.refreshAccessToken(account, refreshToken);
    if (token instanceof Error) return token;
    if (!token || !token.access_token)
      return this.fail("Refresh access token", "Response did not include an access token");

    this.credentials[account].refreshToken = refreshToken;
    // Rotation inside applyToken is not reported, the caller saves the returned token
    const onTokenRotated = this.onTokenRotated;
    this.onTokenRotated = null;
    this.applyToken(account, token);
    this.onTokenRotated = onTokenRotated;
    return this.credentials[account].refreshToken;
  }

  /**
   * Whether the account needs a new refresh token.
   *
   * @param {Number} account - The account to check.
   * @returns {Boolean}
   */
  needsReauth(account = 0) {
    return Boolean(this.credentials[account].needsReauth);
  }

  reauthError() {
    const error = new Error(
      "Refresh access token: Spotify login expired, a new refresh token is needed",
    );
    error.status = 400;
    error.reauth = true;
    return error;
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
   * @param {String} [refreshToken] - Refresh token to use instead of the saved one.
   * @returns {Promise<Object|null|Error>} The token response as a JSON object, or an Error.
   */
  refreshAccessToken(account, refreshToken = this.credentials[account].refreshToken) {
    return this.request(
      "Refresh access token",
      new URL("api/token", tokenRefreshBase),
      {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        headers: { Authorization: this.basicAuth(account) },
      },
      "Error refreshing access token. Check your credentials, account type or status.",
    );
  }

  /**
   * Exchanges a Spotify login code (onsp handoff) for tokens, and starts using them.
   *
   * @param {Number} account - The account the login is for (uses its client id/secret).
   * @param {String} code - The code Spotify sent to the redirect URI.
   * @param {String} redirectUri - The redirect URI used in the login, Spotify checks it matches.
   * @returns {Promise<String|Error>} The new refresh token, or an Error.
   */
  async exchangeCode(account, code, redirectUri) {
    const token = await this.request(
      "Spotify login",
      new URL("api/token", tokenRefreshBase),
      {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
        headers: { Authorization: this.basicAuth(account) },
      },
      "Error finishing the Spotify login. Check that the redirect URI is added in your Spotify App.",
    );
    if (token instanceof Error) return token;
    if (!token || !token.access_token || !token.refresh_token)
      return this.fail("Spotify login", "Response did not include the tokens");

    // Same refresh token in credentials and response, so applyToken does not report a rotation
    this.credentials[account].refreshToken = token.refresh_token;
    this.applyToken(account, token);
    return token.refresh_token;
  }

  basicAuth(account) {
    const { clientId, clientSecret } = this.credentials[account];
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
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
      const error = this.fail(label, reason ? `${message} (Spotify: ${reason})` : message, {
        status: res.status,
      });
      error.spotifyError = this.spotifyErrorCode(body);
      return error;
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

  /**
   * Extracts the error code from an accounts service error body (e.g. "invalid_grant").
   *
   * @param {String} body - The raw response body.
   * @returns {String|null} The error code, or null if the body has none.
   */
  spotifyErrorCode(body) {
    try {
      const { error } = JSON.parse(body);
      return typeof error === "string" ? error : null;
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
