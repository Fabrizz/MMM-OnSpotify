/*
 * MMM-OnSpotify
 * MIT license
 *
 * By Fabrizio <3 (Fabrizz) | https://github.com/Fabrizz/MMM-OnSpotify
 * Original implementation: Raywo | https://github.com/raywo/MMM-NowPlayingOnSpotify
 */

// Use node fetch as most MM2 installs use older node
const fetch = require("node-fetch");
const Headers = fetch.Headers;
const canvas = require('./canvas/canvas_pb.js');
const tokenRefreshBase = "https://accounts.spotify.com";
const userBase = "https://api.spotify.com";
const spotifyBase = "https://open.spotify.com/";
const canvasBase = 'https://spclient.wg.spotify.com/canvaz-cache/v0/canvases';

module.exports = class SpotifyFetcher {
  constructor(payload) {
    this.credentials = payload.credentials;
    this.preferences = payload.preferences;
    this.language = payload.language;
    this.tokenExpiresAt = Date.now();

    this.canvasTokenExpiresAt = Date.now();
    this.canvasToken = null;
  }

  async getData(type) {
    const currentTime = Date.now();
    if (currentTime < this.tokenExpiresAt) {
      return this.requestData(type);
    } else {
      let res = await this.refreshAccessToken();
      if (res.access_token) {
        console.log(
          "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Access token expiration 🗝  >> \x1b[44m\x1b[37m %s \x1b[0m",
          `${this.formatTime(this.tokenExpiresAt)}`,
        );
        this.credentials.accessToken = res.access_token;
        this.tokenExpiresAt = currentTime + res.expires_in * 1000;
        return this.requestData(type);
      } else {
        return new Error("Error getting access token")
      }
    }
  }

  requestData(type) {
    let sl = "v1/me/top/artists?limit=9";
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${this.credentials.accessToken}`);
    // TODO: Check if using &locale= (or &market=) has any different effect, as its not documented correctly
    if (this.language) headers.append("Accept-Language", this.language);
    switch (type) {
      case "PLAYER":
        return fetch(
          new URL("v1/me/player?additional_types=track,episode", userBase),
          {
            method: "GET",
            referrerPolicy: "no-referrer",
            headers: headers,
          },
        )
          .then((res) => {
            if (!res.ok && res.status === 429)
              console.warn(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Player data >> \x1b[41m\x1b[37m CODE 429 \x1b[0m %s",
                "You are being rate limited by Spotify (429). Use only one SpotifyApp per module/implementation",
              );

            this.errorCount = 0;
            if (res.statusText === "No Content") return null;
            return res.body ? res.json() : null;
          })
          .catch((error) => {
              console.error(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Player data >> \x1b[41m\x1b[37m Request error \x1b[0m",
                error,
              );
            return error;
          });
      case "USER":
        return fetch(new URL("v1/me", userBase), {
          method: "GET",
          referrerPolicy: "no-referrer",
          headers: headers,
        })
          .then((res) => {
            if (!res.ok && res.status === 429)
              console.warn(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] User data >> \x1b[41m\x1b[37m CODE 429 \x1b[0m %s",
                "You are being rate limited by Spotify (429). Use only one SpotifyApp per module/implementation",
              );

            this.errorCount = 0;
            return res.body ? res.json() : null;
          })
          .catch((error) => {
              console.error(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] User data >> \x1b[41m\x1b[37m Request error \x1b[0m",
                error,
              );
            return error;
          });
      case "QUEUE":
        return fetch(new URL("v1/me/player/queue", userBase), {
          method: "GET",
          referrerPolicy: "no-referrer",
          headers: headers,
        })
          .then((res) => {
            if (!res.ok && res.status === 429)
              console.warn(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Queue data >> \x1b[41m\x1b[37m CODE 429 \x1b[0m %s",
                "You are being rate limited by Spotify (429). Use only one SpotifyApp per module/implementation",
              );

            this.errorCount = 0;
            return res.body ? res.json() : null;
          })
          .catch((error) => {
              console.error(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Queue data >> \x1b[41m\x1b[37m Request error \x1b[0m",
                error,
              );
            return error;
          });
      case "AFFINITY":
        if (this.preferences.userAffinityUseTracks)
          sl = "v1/me/top/tracks?limit=9";
        return fetch(new URL(sl, userBase), {
          method: "GET",
          referrerPolicy: "no-referrer",
          headers: headers,
        })
          .then((res) => {
            if (!res.ok && res.status === 429)
              console.warn(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Affinity data >> \x1b[41m\x1b[37m CODE 429 \x1b[0m %s",
                "You are being rate limited by Spotify (429). Use only one SpotifyApp per module/implementation",
              );

            this.errorCount = 0;
            return res.body ? res.json() : null;
          })
          .catch((error) => {
            this.errorCount++;
            if (this.errorCount % this.showErrorEvery === 0)
              console.error(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Affinity data >> \x1b[41m\x1b[37m Request error \x1b[0m",
                error,
              );
            return error;
          });
      case "RECENT":
        return fetch(new URL("v1/me/player/recently-played", userBase), {
          method: "GET",
          referrerPolicy: "no-referrer",
          headers: headers,
        })
          .then((res) => {
            if (!res.ok && res.status === 429)
              console.warn(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Recent data >> \x1b[41m\x1b[37m CODE 429 \x1b[0m %s",
                "You are being rate limited by Spotify (429). Use only one SpotifyApp per module/implementation",
              );

            this.errorCount = 0;
            return res.body ? res.json() : null;
          })
          .catch((error) => {
              console.error(
                "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Recent data >> \x1b[41m\x1b[37m Request error \x1b[0m",
                error,
              );
            return error;
          });
    }
  }
  
  refreshAccessToken() {
    let client_id = this.credentials.clientId;
    let client_secret = this.credentials.clientSecret;
    let refresh_token = this.credentials.refreshToken;

    return fetch(new URL("api/token", tokenRefreshBase), {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }),
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${client_id}:${client_secret}`,
        ).toString("base64")}`,
      },
    })
      .then((res) => {
        if (!res.ok && res.status === 429)
          console.warn(
            "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Refresh access token >> \x1b[41m\x1b[37m CODE 429 \x1b[0m %s",
            "You are being rate limited by Spotify (429). Use only one SpotifyApp per module/implementation",
          );
        if (res.status !== 200) {
          console.warn(
            `\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Refresh access token >> \x1b[41m\x1b[37m CODE ${res.status} \x1b[0m %s`,
            "Error refreshing access token. Check your credentials, account type or status.",
          );
          return new Error("Error refreshing access token")
        }

        return res.json();
      })
      .catch((error) => {
        console.error(
          "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Refresh access token >> \x1b[41m\x1b[37m Request error \x1b[0m",
          error,
        );
        return error;
      });
  }

  /* UTILS */
  formatTime(milliseconds) {
    const formattedTime = new Date(milliseconds).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return formattedTime === "Invalid date" ? milliseconds : formattedTime;
  }

  /* SPOTIFY CANVAS UTILS */
  async getCanvas(trackUri) {
    await this.getCanvasToken();
    let canvasRequest = new canvas.CanvasRequest();
    let spotifyTrack = new canvas.CanvasRequest.Track();

    spotifyTrack.setTrackUri(trackUri);
    canvasRequest.addTracks(spotifyTrack);
    const body = canvasRequest.serializeBinary()

    const options = {
      method: 'POST',
      headers: {
        'accept': 'application/protobuf',
        'content-type': 'application/x-www-form-urlencoded',
        'accept-language': 'en',
        'user-agent': 'Spotify/8.6.98 iOS/15.3.1',
        'accept-encoding': 'gzip, deflate, br',
        'authorization': `Bearer ${this.canvasToken}`,
      },
      body
    };

    try {
      const response = await fetch(canvasBase, options);
      if (!response.ok) {
        console.log(`ERROR ${canvasBase}: ${response.status} ${response.statusText}`);
        const errorData = await response.json();
        if (errorData.error) {
          console.log(errorData.error);
        }
        return null;
      }
      const responseData = await response.arrayBuffer();
      return canvas.CanvasResponse.deserializeBinary(new Uint8Array(responseData)).toObject()

    } catch (error) {
      console.log(`ERROR ${canvasBase}: ${error}`);
      return null;
    }
  }

  getCanvasToken() {
    const currentTime = Date.now();
    if (currentTime < this.canvasTokenExpiresAt) {
      return this.canvasToken
    } else {
      let ccc = {
        headers: {
          //"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/114.0",
          //Accept:
          //  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          //"Accept-Language": "en-US,en;q=0.5",
          //"Alt-Used": "open.spotify.com",
          //"Upgrade-Insecure-Requests": "1",
          //"Sec-Fetch-Dest": "document",
          //"Sec-Fetch-Mode": "navigate",
          //"Sec-Fetch-Site": "cross-site",
        }
      }
      if (this.credentials.experimentalCanvasSPDCookie.length > 0) {
        ccc.headers.Cookie = `sp_dc=${this.credentials.experimentalCanvasSPDCookie}`;
      }
      return fetch(new URL("get_access_token?reason=transport&productType=web_player", spotifyBase), ccc)
        .then(async res => {
          if (!res.ok && res.status === 429)
            console.warn(
              "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Refresh (web_player:canvas) access token token >> \x1b[41m\x1b[37m CODE 429 \x1b[0m %s",
              "You are being rate limited by Spotify (429). Canvas is an experimantal feature. You only can use one SpotifyApp per module/implementation.",
            );
          const data = await res.json()
          this.canvasToken = data.accessToken;
          this.canvasTokenExpiresAt = data.accessTokenExpirationTimestampMs;
          console.log(
            "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] (web_player:canvas) Access token expiration 🗝  >> \x1b[44m\x1b[37m %s \x1b[0m",
            `${this.formatTime(this.canvasTokenExpiresAt)}`,
          );
          return data.accessToken;
        })
        .catch((error) => {
          console.error(
            "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] getCanvasToken >> \x1b[41m\x1b[37m Request error \x1b[0m",
            error,
          );
          return error;
        });
    }
  }
};
