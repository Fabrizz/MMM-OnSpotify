/*
 * MMM-OnSpotify
 * MIT license
 *
 * By Fabrizio <3 (Fabrizz) | https://github.com/Fabrizz/MMM-OnSpotify
 */

/*
 * Keeps refresh tokens that the module got by itself (pasted in the local page or
 * rotated by Spotify) in .credentials.json, without ever writing to config.js.
 *
 * A saved token is only used while the config still has the refresh token it was
 * saved on top of (`basedOn`). If the user pastes a new token in config.js, the
 * config wins and the saved one is ignored. The client secret is never stored.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Spotify refresh tokens expire 6 months after the user authorized the app
const refreshTokenLifetime = 182 * 24 * 60 * 60 * 1000;

const hash = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

module.exports = class CredentialStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.load();
  }

  load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      return Array.isArray(data.accounts) ? data : { accounts: [] };
    } catch {
      return { accounts: [] };
    }
  }

  write() {
    // Write to a temp file first, so a crash never leaves a half written file
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.filePath);
  }

  /**
   * Finds (or creates) the entry for a config account, keyed by client id.
   * An entry saved on top of a different config refresh token is reset.
   *
   * @param {{clientId: String, refreshToken: String}} configCredentials - Credentials from config.js.
   * @returns {Object} The account entry.
   */
  entry(configCredentials) {
    const basedOn = hash(configCredentials.refreshToken);
    let account = this.data.accounts.find(
      (a) => a.clientId === configCredentials.clientId,
    );
    if (!account) {
      account = { clientId: configCredentials.clientId };
      this.data.accounts.push(account);
    }
    if (account.basedOn !== basedOn) {
      // The config token changed, forget anything saved for the old one
      for (const key of Object.keys(account))
        if (key !== "clientId") delete account[key];
      account.basedOn = basedOn;
      account.configFirstSeen = Date.now();
    }
    return account;
  }

  /**
   * Picks the refresh token to use for a config account.
   *
   * @param {{clientId: String, refreshToken: String}} configCredentials - Credentials from config.js.
   * @returns {{refreshToken: String, source: "config"|"credentials", authorizedAt: Number|null, expiresBy: Number}}
   */
  resolve(configCredentials) {
    const before = JSON.stringify(this.data);
    const account = this.entry(configCredentials);
    if (JSON.stringify(this.data) !== before) this.write();

    if (account.refreshToken)
      return {
        refreshToken: account.refreshToken,
        source: "credentials",
        authorizedAt: account.authorizedAt || null,
        expiresBy:
          (account.authorizedAt || account.configFirstSeen) + refreshTokenLifetime,
      };
    // We don't know when the config token was issued, only when we first saw it
    return {
      refreshToken: configCredentials.refreshToken,
      source: "config",
      authorizedAt: null,
      expiresBy: account.configFirstSeen + refreshTokenLifetime,
    };
  }

  /**
   * Saves a refresh token for a config account.
   *
   * @param {{clientId: String, refreshToken: String}} configCredentials - Credentials from config.js.
   * @param {{refreshToken: String, source: "manual"|"handoff"|"rotation", authorizedAt?: Number}} token - The token to save.
   *   `authorizedAt` is set for new authorizations; a rotated token keeps the previous date
   *   (Spotify does not reset the clock), which can be unknown for config tokens.
   */
  save(configCredentials, { refreshToken, source, authorizedAt }) {
    const account = this.entry(configCredentials);
    account.refreshToken = refreshToken;
    account.source = source;
    account.authorizedAt = authorizedAt || account.authorizedAt || null;
    this.write();
  }

  /**
   * Forgets the saved token, so the config token is used again.
   *
   * @param {{clientId: String, refreshToken: String}} configCredentials - Credentials from config.js.
   */
  clear(configCredentials) {
    const account = this.entry(configCredentials);
    delete account.refreshToken;
    delete account.source;
    delete account.authorizedAt;
    this.write();
  }

  static defaultPath() {
    // MM2 serves the whole modules/ folder as static files, but not dotfiles.
    // Keep the leading dot, or the token can be downloaded from /modules/MMM-OnSpotify/
    return path.join(__dirname, "..", ".credentials.json");
  }
};
