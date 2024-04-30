/*
 * MMM-OnSpotify
 * MIT license
 *
 * By Fabrizio <3 (Fabrizz) | https://github.com/Fabrizz/MMM-OnSpotify
 * Original implementation: Raywo | https://github.com/raywo/MMM-NowPlayingOnSpotify
 */

// Use node fetch as most MM2 installs use older node
const fetch = require("node-fetch");
const axios = require('axios');
const tokenRefreshBase = "https://accounts.spotify.com";
const userBase = "https://api.spotify.com";
const openSpotify = "https://open.spotify.com/";
const canvasesUrl = 'https://spclient.wg.spotify.com/canvaz-cache/v0/canvases';
const canvas = require('./canvas_pb.js');

module.exports = class SpotifyFetcher {
  constructor(payload) {
    this.credentials = payload.credentials;
    this.preferences = payload.preferences;
    this.language = payload.language;
    this.tokenExpiresAt = Date.now();
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

  async getCanvas(trackUri) {
    let canvasRequest = new canvas.CanvasRequest();
    const canvasToken = await this.getCanvasToken();

    let spotifyTrack = new canvas.CanvasRequest.Track();
    spotifyTrack.setTrackUri(trackUri);
    canvasRequest.addTracks(spotifyTrack);    
    let requestBytes = canvasRequest.serializeBinary();

    const options = {
      responseType: 'arraybuffer',
      headers: {
        'accept': 'application/protobuf',
        'content-type': 'application/x-www-form-urlencoded',
        'accept-language': 'en',
        'user-agent': 'Spotify/8.5.49 iOS/Version 13.3.1 (Build 17D50)',
        'accept-encoding': 'gzip, deflate, br',
        'authorization': `Bearer ${canvasToken.accessToken}`,
      }
    }
    return axios.post(canvasesUrl, requestBytes, options)
      .then(response => {
        if (response.statusText !== 'OK') {
          console.log(`ERROR ${canvasesUrl}: ${response.status} ${response.statusText}`);
          if (response.data.error) {
            console.log(response.data.error);
          }
        } else {
          return canvas.CanvasResponse.deserializeBinary(response.data).toObject();
        }
      })
      .catch(error => console.log(`ERROR ${canvasesUrl}: ${error}`));    
   
  }

  formatTime(milliseconds) {
    const formattedTime = new Date(milliseconds).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return formattedTime === "Invalid date" ? milliseconds : formattedTime;
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

  getCanvasToken() {

    return fetch(new URL("get_access_token?reason=transport&productType=web_player", openSpotify))
      .then(res => {
        if (!res.ok && res.status === 429)
        console.warn(
          "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] Refresh access token >> \x1b[41m\x1b[37m CODE 429 \x1b[0m %s",
          "You are being rate limited by Spotify (429). Use only one SpotifyApp per module/implementation",
        );
        return res.json();
      })
      .catch((error) => {
        console.error(
          "\x1b[0m[\x1b[35mMMM-OnSpotify\x1b[0m] getCanvasToken >> \x1b[41m\x1b[37m Request error \x1b[0m",
          error,
        );
        return error;
      });
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
};
