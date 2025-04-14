/*
 * MMM-OnSpotify
 * MIT license
 *
 * By Fabrizio <3 (Fabrizz) | https://github.com/Fabrizz/MMM-OnSpotify
 */

"use strict";

/* FUTURE: Add a "guessTrackTime" option that still changes the timer even when the update interval window is higher */

Module.register("MMM-OnSpotify", {
  defaults: {
    name: "MMM-OnSpotify",
    /* configDeepMerge: true, deepMerge: true, <-- Does not work */

    // Sends notifications containin them locking. Works with other DynamicTheme modules.
    advertisePlayerTheme: true,
    // What to display when the player is idle
    // user | affinity | both | none | logo
    displayWhenEmpty: "both",
    // Show tracks instead of albums when the player is idle.
    userAffinityUseTracks: false,
    // Prefers larger images. Affects display and the "NOW_PLAYING" broadcast.
    prefersLargeImageSize: false,
    // If you selected a high interval, you can hide the progress timestamp
    // and animate the seekbar to the timing of the updateInterval, making it look better.
    hideTrackLengthAndAnimateProgress: false,
    // Shows the Vibrant output in the console as a palette and color data.
    showDebugPalette: false,
    // Max age in seconds for personal data. If set to 0 they update when the player changes
    // state, as user data does not change that much, this prevents unnecessary api calls.
    userDataMaxAge: 14400,
    userAffinityMaxAge: 36000,
    // Filter which devices show up in the module
    deviceFilter: [],
    deviceFilterExclude: false,
    filterNoticeSubtitle: true,
    // Changes the language sent to Spotify
    language: config.language,
    // Shows the recieved data from the node_helper
    debugSpotifyData: false,

    updateInterval: {
      isPlaying: 1,
      isEmpty: 2,
      isPlayingHidden: 1,
      isEmptyHidden: 4,
      // When there is a connection error
      onReconnecting: 4,
      // If the errors persist, use a wider window between calls.
      onError: 8,
    },

    theming: {
      // As RPIs are not powerful you can disable some of the animations.
      mediaAnimations: false,
      fadeAnimations: false,
      transitionAnimations: true,
      textAnimations: true,
      scrollAnimations: false,
      spotifyVectorAnimations: false,
      // Show the Spotify Code Bar [EXPERIMENTAL]
      spotifyCodeExperimentalShow: true,
      // Themes the code and bars using the cover art
      // Using this option uses a brighter color palette, to allow better
      // scans using the camera. Also affects other colors in the module.
      spotifyCodeExperimentalUseColor: true,
      // If the code should be shown standalone or separated from the cover art.
      spotifyCodeExperimentalSeparateItem: true,
      // Allows to override CSS variables for MM2 included modules (or custom modules)
      experimentalCSSOverridesForMM2: false, // <-- merge for older versions ?
      // Round cover art and Spotify Code corners
      roundMediaCorners: true,
      roundProgressBar: true,
      showVerticalPipe: true,
      useColorInProgressBar: true,
      useColorInTitle: true,
      // Get colors from the used profile image
      useColorInUserData: true,
      // Show the blurred color background to give a depth to the module
      showBlurBackground: true,
      // Blur less on the side that the module touches the frame, if your actual mirror
      // is larger than your screen, this deletes the color overflow in the corners [bottom | left | right]
      blurCorrectionInFrameSide: false,
      // Blur less in all sides, useful if you like less color or you dont like the blur difference just
      // in the frame sides.
      blurCorrectionInAllSides: false,
      // Depending on the device, the device icon changes, you can use always the dault if you dont like it
      alwaysUseDefaultDeviceIcon: false,
    },
    // Internal, if you want to change the "GET_PLAYING" notification mapping
    events: {
      GET_PLAYING: "GET_PLAYING",
      ONSPOTIFY_GET: "ONSPOTIFY_GET",
      LIVELYRICS_NOTICE: "LIVELYRICS_NOTICE",
      ALL_MODULES_STARTED: "ALL_MODULES_STARTED",
      ONSPOTIFY_SHOW: "ONSPOTIFY_SHOW",
      ONSPOTIFY_HIDE: "ONSPOTIFY_HIDE",
    },

    // Allow config with or without subdivition
    isPlaying: 1,
    isEmpty: 2,
    isPlayingHidden: 1,
    isEmptyHidden: 3,
    onReconnecting: 4,
    onError: 8,
    mediaAnimations: false,
    fadeAnimations: false,
    textAnimations: true,
    scrollAnimations: false,
    spotifyVectorAnimations: false,
    transitionAnimations: false,
    spotifyCodeExperimentalShow: true,
    spotifyCodeExperimentalUseColor: true,
    spotifyCodeExperimentalSeparateItem: true,
    experimentalCSSOverridesForMM2: false,
    roundMediaCorners: true,
    roundProgressBar: true,
    useColorInProgressBar: true,
    useColorInTitle: true,
    useColorInUserData: true,
    showBlurBackground: true,
    blurCorrectionInFrameSide: false,
    blurCorrectionInAllSides: false,
    alwaysUseDefaultDeviceIcon: false,
    showVerticalPipe: true,

    // Show Canvas
    experimentalCanvas: false,
    // "contain" - Place the canvas in the frame leaving vertical stripes
    // "scale" - Scale the container to fit the canvas
    // "cover" -  Fill the container to fit the canvas
    experimentalCanvasEffect: "cover",
    // Add the album cover inside the canvas
    experimentalCanvasAlbumOverlay: true,
    experimentalCanvasSPDCookie: "",

    // In special use cases where a frontend needs to take over other you can disabl
    // the id matching for the frontend, so "multiple" frontends can talk to the module even if not supported
    matchBackendUUID: false,

    // Send a notification with the color data when only when the song changes, this is useful for modules
    // that are not going to show the color inside the dom.
    experimentalColorSignaling: false,
  },

  start: function () {
    this.configFix();
    this.logBadge();

    this.isConnectedToSpotify = false;
    this.currentIntervalId = null;
    this.isFirstCall = true;
    this.nowDisplaying = null;
    this.globalThemeSelected = null;
    this.currentStatus = "";
    this.backendExpectId = this.config.matchBackendUUID
      ? Date.now().toString(16)
      : "ABC";
    this.lastServerId = undefined;
    this.retries = 0;
    this.lastPrivate = [null, null];
    this.lastStatus = "isPlaying";
    this.muduleHidden = false;
    this.firstSongOnLoad = true;
    this.usesCssOverrides =
      typeof this.config.theming.experimentalCSSOverridesForMM2 === "object";

    ////////////////////////////////////////////////////////////////////////////////////////////
    this.version = "4.0.0";
    ////////////////////////////////////////////////////////////////////////////////////////////

    this.displayUser =
      this.config.displayWhenEmpty.toLowerCase() === "user" ||
      this.config.displayWhenEmpty.toLowerCase() === "both"
        ? true
        : false;
    this.displayAffinity =
      this.config.displayWhenEmpty.toLowerCase() === "affinity" ||
      this.config.displayWhenEmpty.toLowerCase() === "both"
        ? true
        : false;

    this.loadVibrantPalette =
      this.config.advertisePlayerTheme ||
      this.config.theming.useColorInProgressBar ||
      this.config.theming.useColorInTitle ||
      this.config.theming.showBlurBackground ||
      this.config.theming.useColorInUserData ||
      (this.config.theming.spotifyCodeExperimentalShow &&
        this.config.theming.spotifyCodeExperimentalUseColor)
        ? true
        : false;

    // eslint-disable-next-line no-undef
    this.builder = new SpotifyDomBuilder(
      this.file(""),
      this.config,
      {
        useVibrantOnChange: this.loadVibrantPalette,
        moduleSide: this.data.position,
        version: this.version,
      },
      (a, b) => this.translate(a, b),
      (a, b) => this.sendNotification(a, b), // This is not the best as I would like this logic to be separated from the,
                                             // DomBuilder but I dont have time to refractor everything. Solves #81 issue
    );

    /* Future update:
     * Maybe cache music lyrics based on the queue based on module notfs ? (MMM-Lyrics)
     * Show queue instead of nowplaying or (nowplaying + next)
     * cache next song images on slow networks ? <--- Nah, more api calls
     */
    this.userData = null;
    this.playerData = null;
    this.affinityData = null;
    this.canvasData = null;
    // this.queueData = null;
    // this.recentData = null;

    this.root = document.querySelector(":root");

    this.sendCredentialsBackend();
    this.updateFetchingLoop(this.config.updateInterval[this.lastStatus]);
    if (this.config.debugSpotifyData) console.debug(
      `%c· MMM-OnSpotify %c %c DBUG %c`,
      "background-color:#84CC16;color:black;border-radius:0.5em",
      "",
      "background-color:#293f45;color:white;",
      "",
      this.config,
    );
  },

  getDom: function () {
    if (this.playerData && this.playerData.deviceIsPrivate) {
      this.nowDisplaying = "private";
      return this.builder.privateSession(this.playerData);
    }
    if (this.playerData && !this.playerData.statusIsPlayerEmpty) {
      this.nowDisplaying = "player";
      if (!this.globalThemeSelected) {
        this.sendNotification("THEME_PREFERENCE", {
          provider: "MMM-OnSpotify",
          // --[ONSP]-[VIBRANT]-[VIBRANT-SCHEME-COLOR]
          providerPrefix: "ONSP",
          providerScheme: "VIBRANT",
          set: "lock",
        });
        this.globalThemeSelected = true;
      }

      return this.builder.nowPlaying(this.playerData);
    } else {
      this.nowDisplaying = "empty";
      if (this.globalThemeSelected) {
        this.sendNotification("THEME_PREFERENCE", {
          provider: "MMM-OnSpotify",
          set: "unlock",
        });
        this.globalThemeSelected = false;
      }

      switch (this.config.displayWhenEmpty.toLowerCase()) {
        case "both":
          return this.builder.userAffinity(this.userData, this.affinityData);
        case "user":
          return this.builder.user(this.userData);
        case "affinity":
          return this.builder.affinity(this.affinityData);
        case "none":
          return this.builder.empty(false);
        default:
          return this.builder.spotifyLogo();
      }
    }
  },
  getStyles: function () {
    let files = [this.file("css/included.css")];
    // Load theming.css only if experimentalCSSOverridesForMM2 is enabled
    if (
      this.config.theming.experimentalCSSOverridesForMM2 ||
      this.config.experimentalCSSOverridesForMM2
    )
      files.push(this.file("css/theming.css"));
    return files;
  },
  getScripts: function () {
    let files = [
      this.file("utils/SpotifyDomBuilder.js"),
      // Use a custom build of the "node-vibrant" library that fixes the webworker usage
      this.file("vendor/vibrant.worker.min.js"),
      // MM2 loader cannot load .map files - this.file("vendor/vibrant.worker.min.js.map"),
    ];
    // eslint-disable-next-line no-undef
    if (
      (this.config.theming.spotifyCodeExperimentalShow ||
        this.config.spotifyCodeExperimentalShow) &&
      // Check if other modules load DOMPurify
      !("DOMPurify" in window)
    )
      files.push(this.file("node_modules/dompurify/dist/purify.min.js"));

    return files;
  },
  getTranslations: function () {
    return {
      en: "translations/en.json",
      es: "translations/es.json",
      de: "translations/de.json",
    };
  },
  suspend: function () {
    this.moduleHidden = true;
    this.smartUpdate();
    console.info(
      `%c· MMM-OnSpotify %c %c INFO %c ${this.translate("SUSPEND")}`,
      "background-color:#84CC16;color:black;border-radius:0.5em",
      "",
      "background-color:#02675d;color:white;",
      "",
    );
  },
  resume: function () {
    console.info(
      `%c· MMM-OnSpotify %c %c INFO %c ${this.translate("RESUME")}`,
      "background-color:#84CC16;color:black;border-radius:0.5em",
      "",
      "background-color:#02675d;color:white;",
      "",
    );
    this.moduleHidden = false;
    this.smartUpdate();
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case "PLAYER_DATA":
        if (this.config.debugSpotifyData) console.debug(
          `%c· MMM-OnSpotify %c %c DBUG %c`,
          "background-color:#84CC16;color:black;border-radius:0.5em",
          "",
          "background-color:#293f45;color:white;",
          "",
          "PLAYER_DATA",
          payload,
        );
        this.isConnectedToSpotify = true;
        this.connectionRetries = 0;
        if (!payload.statusPlayerUpdating) this.playerData = payload;
        this.smartUpdate("PLAYER_DATA");
        if (payload.statusIsNewSong || this.firstSongOnLoad) {
          if (payload.itemName)
            this.sendNotification("NOW_PLAYING", {
              playerIsEmpty: false,
              name: payload.itemName,
              image: this.getImage(
                this.playerData.itemImages,
                this.config.prefersLargeImageSize,
              ),
              uri: this.playerData.itemUri,
              artist: payload.itemArtist,
              artists: payload.itemArtists,
              type: payload.playerMediaType,
              device: payload.deviceName,
              deviceType: payload.deviceType,
            });
          this.firstSongOnLoad = false;
          if (this.usesCssOverrides)
            this.builder.setMM2colors(
              this.config.theming.experimentalCSSOverridesForMM2,
            );
        }
        if (payload.statusIsChangeToEmptyPlayer) {
          if (this.usesCssOverrides)
            this.builder.removeMM2colors(
              this.config.theming.experimentalCSSOverridesForMM2,
            );
          this.sendNotification("NOW_PLAYING", { playerIsEmpty: true });
        }
        if (payload.statusIsDeviceChange)
          this.sendNotification("DEVICE_CHANGE", {
            device: payload.deviceName,
            type: payload.deviceType,
          });
        break;
      case "USER_DATA":
        if (this.config.debugSpotifyData) console.debug(
          `%c· MMM-OnSpotify %c %c DBUG %c`,
          "background-color:#84CC16;color:black;border-radius:0.5em",
          "",
          "background-color:#293f45;color:white;",
          "",
          "USER_DATA",
          payload,
        );
        this.userData = {
          ...payload,
          subtitleOverride:
            this.playerData && this.config.filteredDeviceNotice
              ? this.playerData.notAllowedDevice
              : false,
        };
        this.userData.age = Date.now();
        this.requestUserData = false;
        this.smartUpdate("USER_DATA");
        if (this.userData.product !== "premium")
          console.warn(
            `%c· MMM-OnSpotify %c %c WARN %c ${this.translate(
              "PRODUCT_WARNING",
            )}`,
            "background-color:#84CC16;color:black;border-radius:0.5em",
            "",
            "background-color:#754700;color:white;",
            "",
          );
        break;
      case "AFFINITY_DATA":
        if (this.config.debugSpotifyData) console.debug(
          `%c· MMM-OnSpotify %c %c DBUG %c`,
          "background-color:#84CC16;color:black;border-radius:0.5em",
          "",
          "background-color:#293f45;color:white;",
          "",
          "AFFINITY_DATA",
          payload,
        );
        this.affinityData = payload;
        this.affinityData.age = Date.now();
        this.requestAffinityData = false;
        this.smartUpdate("AFFINITY_DATA");
        break;
      case "CONNECTION_ERRONED":
        if (this.isConnectedToSpotify) {
          console.info(
            `%c· MMM-OnSpotify %c %c INFO %c ${this.translate(
              "CONNECTION_WARNING",
            )}`,
            "background-color:#84CC16;color:black;border-radius:0.5em",
            "",
            "background-color:#02675d;color:white;",
            "",
          );
        }
        this.isConnectedToSpotify = false;
        this.smartUpdate("PLAYER_DATA");
        break;
      case "REQUEST_REAUTH":
        if (this.lastServerId === payload) break;
        this.lastServerId = payload;
        console.warn(
          `%c· MMM-OnSpotify %c %c WARN %c ${this.translate("BACKEND_REAUTH")}`,
          "background-color:#84CC16;color:black;border-radius:0.5em",
          "",
          "background-color:#754700;color:white;",
          "",
        );
        this.sendNotification("SERVERSIDE_RESTART");
        this.sendCredentialsBackend();
        break;
      case "UPDATE_CANVAS":
        this.canvasData = payload;
        this.smartUpdate("CANVAS_DATA");
        break
    }
  },
  notificationReceived: function (notification, payload) {
    this.config.events[notification]?.split(" ").forEach((e) => {
      switch (e) {
        case "GET_PLAYING":
          this.sendNotification("NOW_PLAYING", {
            playerIsEmpty: this.playerData.isEmpty,
            name: this.playerData.itemName,
            image: this.getImage(
              this.playerData.itemImages,
              this.config.prefersLargeImageSize,
            ),
            uri: this.playerData.itemUri,
            artist: this.playerData.itemArtist,
            artists: this.playerData.itemArtists,
            type: this.playerData.playerMediaType,
            device: this.playerData.deviceName,
            deviceType: this.playerData.deviceType,
          });
          break;
        case "ONSPOTIFY_GET":
          this.sendNotification("ONSPOTIFY_NOTICE", {
            version: this.version,
            directColorData:
              this.loadVibrantPalette && this.config.advertisePlayerTheme,
            loadsSpotifyCode: this.config.theming.spotifyCodeExperimentalShow,
          });
          break;
        case "ONSPOTIFY_HIDE":
          this.hide();
          break;
        case "ONSPOTIFY_SHOW":
          this.show();
          break;
        case "LIVELYRICS_NOTICE":
          console.info(
            `%c· MMM-OnSpotify %c %c INFO %c ${this.translate(
              "LIVELYRICS_NOTICE",
            )}`,
            "background-color:#84CC16;color:black;border-radius:0.5em",
            "",
            "background-color:#02675d;color:white;",
            "",
          );
          break;
        case "ALL_MODULES_STARTED":
          if (this.config.showDebugPalette)
            console.info(
              `%c· MMM-OnSpotify %c %c INFO %c ${this.translate(
                "DEBUG_COLORS",
              )}`,
              "background-color:#84CC16;color:black;border-radius:0.5em",
              "",
              "background-color:#02675d;color:white;",
              "",
            );
          if (this.config.theming.spotifyCodeExperimentalShow)
            console.info(
              `%c· MMM-OnSpotify %c %c WARN %c ${this.translate(
                "SPOTIFYCODE_EXPERIMENTAL",
              )}`,
              "background-color:#84CC16;color:black;border-radius:0.5em",
              "",
              "background-color:#754700;color:white;",
              "",
            );
          if (this.config.theming.experimentalCSSOverridesForMM2)
            console.info(
              `%c· MMM-OnSpotify %c %c INFO %c ${this.translate(
                "CSSOVERRIDE_NOTICE",
              )}`,
              "background-color:#84CC16;color:black;border-radius:0.5em",
              "",
              "background-color:#02675d;color:white;",
              "",
            );
          this.sendNotification("LIVELYRICS_GET");
          break;
        default:
          break;
      }
    });
  },

  /* Utils */
  updateFetchingLoop: function (n) {
    clearInterval(this.currentIntervalId);
    this.currentIntervalId = setInterval(() => {
      if (this.isConnectedToSpotify || this.currentStatus === "onReconnecting")
        this.instantUpdate();
    }, n * 1000);
  },

  instantUpdate: function () {
    this.sendSocketNotification("REFRESH_PLAYER", this.backendExpectId);
    // To prevent multiple api calls, the call is requested but its only called
    // here, following the interval of the player.
    if (this.requestUserData)
      this.sendSocketNotification("REFRESH_USER", this.backendExpectId);
    if (this.requestAffinityData)
      this.sendSocketNotification("REFRESH_AFFINITY", this.backendExpectId);
  },

  smartUpdate: function (type) {
    // Request data to display when the player is empty
    // Update only if there is no data or the player is changing state 

    this.requestUserData =
      this.displayUser &&
      this.isConnectedToSpotify &&
      (!this.userData ||
        (this.playerData
          ? this.playerData.statusIsChangeToEmptyPlayer
            ? Date.now() > this.userData.age + this.config.userDataMaxAge * 1000
            : false
          : false));
    this.requestAffinityData =
      this.displayAffinity &&
      this.isConnectedToSpotify &&
      (!this.affinityData ||
        (this.playerData
          ? this.playerData.statusIsChangeToEmptyPlayer
            ? Date.now() >
              this.affinityData.age + this.config.userAffinityMaxAge * 1000
            : false
          : false))
        ? true
        : false;

    this.currentStatus = this.isConnectedToSpotify
      ? this.playerData
        ? this.playerData.playerIsPlaying
          ? this.moduleHidden
            ? "isPlayingHidden"
            : "isPlaying"
          : this.moduleHidden
          ? "isEmptyHidden"
          : "isEmpty"
        : null
      : "onReconnecting";
    if (this.currentStatus !== this.lastStatus) {
      if (this.isFirstCall) {
        this.instantUpdate();
        this.isFirstCall = false;
      }
      this.updateFetchingLoop(this.config.updateInterval[this.currentStatus]);
      this.lastStatus = this.currentStatus;
    }

    if (this.currentStatus === "onReconnecting") {
      this.retries = this.retries > 25 ? this.retries : this.retries + 1;
      if (this.retries === 25) {
        console.error(
          `%c· MMM-OnSpotify %c %c ERRO %c ${this.translate(
            "CONNECTION_ERROR",
          )}`,
          "background-color:#84CC16;color:black;border-radius:0.5em",
          "",
          "background-color:#781919;color:white;",
          "",
        );
        this.playerData = {
          statusIsPlayerEmpty: true,
          statusIsNewSong: false,
          statusIsChangeToEmptyPlayer: true,
          statusIsChangeToMediaPlayer: false,
          statusPlayerUpdating: false,
          statusIsDeviceChange: false,
        };
        this.updateFetchingLoop(this.config.updateInterval.onError);
        return this.updateDom();
      }
      return;
    } else {
      this.retries = 0;
    }

    if (
      this.playerData &&
      this.playerData.deviceIsPrivate &&
      !this.lastPrivate[0]
    ) {
      this.lastPrivate = [true];
      return this.updateDom();
    }
    if (
      this.playerData &&
      !this.playerData.deviceIsPrivate &&
      this.lastPrivate[0]
    ) {
      this.lastPrivate = [false];
      return this.updateDom();
    }

    if (this.playerData) {
      if (
        this.playerData.statusIsChangeToEmptyPlayer ||
        (this.nowDisplaying === "empty" && !this.playerData.statusIsPlayerEmpty)
      )
        return this.updateDom();
      if (
        this.playerData.statusIsChangeToMediaPlayer ||
        (this.nowDisplaying === "player" && this.playerData.statusIsPlayerEmpty)
      )
        return this.updateDom();
      if (
        this.nowDisplaying === "player" &&
        !this.playerData.statusIsPlayerEmpty &&
        type === "PLAYER_DATA"
      )
        return this.builder.updatePlayerData(this.playerData);
    }

    if (type === "CANVAS_DATA") this.builder.updateCanvas(this.canvasData);
    if (type === "USER_DATA") this.builder.updateUserData(this.userData);
    if (type === "AFFINITY_DATA")
      this.builder.updateAffinityData(this.affinityData);
  },

  getImage: (im, prefersLarge) =>
    im ? (prefersLarge ? im.large : im.medium) : null,
  sendCredentialsBackend() {
    this.sendSocketNotification("SET_CREDENTIALS_REFRESH", {
      preferences: {
        userAffinityUseTracks: this.config.userAffinityUseTracks,
        deviceFilter: this.config.deviceFilter,
        deviceFilterExclude: this.config.deviceFilterExclude,
        useCanvas: this.config.experimentalCanvas,
      },
      credentials: {
        clientId: this.config.clientID,
        clientSecret: this.config.clientSecret,
        accessToken: this.config.accessToken,
        refreshToken: this.config.refreshToken,
        experimentalCanvasSPDCookie: this.config.experimentalCanvasSPDCookie,
      },
      language: this.config.language,
      backendExpectId: this.backendExpectId,
    });
  },
  logBadge: function () {
    console.log(
      ` ⠖ %c by Fabrizz %c ${this.name}`,
      "background-color: #555;color: #fff;margin: 0.4em 0em 0.4em 0.4em;padding: 5px 3px 5px 5px;border-radius: 7px 0 0 7px;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;",
      "background-color: #bc81e0;background-image: linear-gradient(90deg, #3F6212, #84CC16);color: #fff;margin: 0.4em 0.4em 0.4em 0em;padding: 5px 5px 5px 3px;border-radius: 0 7px 7px 0;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)",
    );
  },
  /* Fix for older version that have object based cfg */
  /* Its not pretty, but the default does not work */
  configFix: function () {
    typeof this.config.isPlaying === "number"
      ? (this.config.updateInterval.isPlaying = this.config.isPlaying)
      : null;
    typeof this.config.isEmpty === "number"
      ? (this.config.updateInterval.isEmpty = this.config.isEmpty)
      : null;
    typeof this.config.isPlayingHidden === "number"
      ? (this.config.updateInterval.isPlayingHidden =
          this.config.isPlayingHidden)
      : null;
    typeof this.config.isEmptyHidden === "number"
      ? (this.config.updateInterval.isEmptyHidden = this.config.isEmptyHidden)
      : null;
    typeof this.config.onReconnecting === "number"
      ? (this.config.updateInterval.onReconnecting = this.config.onReconnecting)
      : null;
    typeof this.config.onError === "number"
      ? (this.config.updateInterval.onError = this.config.onError)
      : null;

    typeof this.config.mediaAnimations === "boolean"
      ? (this.config.theming.mediaAnimations = this.config.mediaAnimations)
      : null;
    typeof this.config.fadeAnimations === "boolean"
      ? (this.config.theming.fadeAnimations = this.config.fadeAnimations)
      : null;
    typeof this.config.transitionAnimations === "boolean"
      ? (this.config.theming.transitionAnimations =
          this.config.transitionAnimations)
      : null;
    typeof this.config.textAnimations === "boolean"
      ? (this.config.theming.textAnimations = this.config.textAnimations)
      : null;
    typeof this.config.scrollAnimations === "boolean"
      ? (this.config.theming.scrollAnimations = this.config.scrollAnimations)
      : null;
    typeof this.config.spotifyVectorAnimations === "boolean"
      ? (this.config.theming.spotifyVectorAnimations =
          this.config.spotifyVectorAnimations)
      : null;

    typeof this.config.spotifyCodeExperimentalShow === "boolean"
      ? (this.config.theming.spotifyCodeExperimentalShow =
          this.config.spotifyCodeExperimentalShow)
      : null;
    typeof this.config.spotifyCodeExperimentalUseColor === "boolean"
      ? (this.config.theming.spotifyCodeExperimentalUseColor =
          this.config.spotifyCodeExperimentalUseColor)
      : null;
    typeof this.config.spotifyCodeExperimentalSeparateItem === "boolean"
      ? (this.config.theming.spotifyCodeExperimentalSeparateItem =
          this.config.spotifyCodeExperimentalSeparateItem)
      : null;

    typeof this.config.experimentalCSSOverridesForMM2 === "object"
      ? (this.config.theming.experimentalCSSOverridesForMM2 =
          this.config.experimentalCSSOverridesForMM2)
      : null;

    typeof this.config.roundMediaCorners === "boolean"
      ? (this.config.theming.roundMediaCorners = this.config.roundMediaCorners)
      : null;
    typeof this.config.roundProgressBar === "boolean"
      ? (this.config.theming.roundProgressBar = this.config.roundProgressBar)
      : null;
    typeof this.config.showVerticalPipe === "boolean"
      ? (this.config.theming.showVerticalPipe = this.config.showVerticalPipe)
      : null;

    typeof this.config.useColorInProgressBar === "boolean"
      ? (this.config.theming.useColorInProgressBar =
          this.config.useColorInProgressBar)
      : null;
    typeof this.config.useColorInTitle === "boolean"
      ? (this.config.theming.useColorInTitle = this.config.useColorInTitle)
      : null;
    typeof this.config.useColorInUserData === "boolean"
      ? (this.config.theming.useColorInUserData =
          this.config.useColorInUserData)
      : null;

    typeof this.config.showBlurBackground === "boolean"
      ? (this.config.theming.showBlurBackground =
          this.config.showBlurBackground)
      : null;
    typeof this.config.blurCorrectionInFrameSide === "boolean"
      ? (this.config.theming.blurCorrectionInFrameSide =
          this.config.blurCorrectionInFrameSide)
      : null;
    typeof this.config.blurCorrectionInAllSides === "boolean"
      ? (this.config.theming.blurCorrectionInAllSides =
          this.config.blurCorrectionInAllSides)
      : null;

    typeof this.config.alwaysUseDefaultDeviceIcon === "boolean"
      ? (this.config.theming.alwaysUseDefaultDeviceIcon =
          this.config.alwaysUseDefaultDeviceIcon)
      : null;
  },
});
