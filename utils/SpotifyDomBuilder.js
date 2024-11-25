/*
 * MMM-OnSpotify
 * MIT license
 *
 * By Fabrizio <3 (Fabrizz) | https://github.com/Fabrizz/MMM-OnSpotify
 */

/* eslint-disable no-undef */

class SpotifyDomBuilder {
  constructor(pathPrefix, config, other, translator, externalNotifier) {
    this.pathPrefix = pathPrefix;
    this.config = { ...config, ...other };
    this.translate = translator;
    this.notifyModules = externalNotifier;
    this.root = document.querySelector(":root");
    this.firstUpdate = true;
    this.lastItemURI = null;
    this.lastUrlProcessed = null;
    this.lastPalette = null;
    this.constrainSide = null;
    this.constrainBottom = null;
    this.affinityGridElements = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    this.backgroundColors = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"];
    this.currentAnimations = { playerTitle: false, playerTarget: false };
    this.scrollerStatus = false;
    this.ONSPcolorVerboseMatch = {
      text: "--ONSP-VIBRANT-DOMINANTBRIGHT",
      background: "--ONSP-VIBRANT-DOMINANTDARK",
      palette_vibrant: "--ONSP-VIBRANT-VIBRANT",
      palette_vibrantlight: "--ONSP-VIBRANT-LIGHTVIBRANT",
      palette_vibrantdark: "--ONSP-VIBRANT-DARKVIBRANT",
      palette_muted: "--ONSP-VIBRANT-MUTED",
      palette_mutedlight: "--ONSP-VIBRANT-LIGHTMUTED",
      palette_muteddark: "--ONSP-VIBRANT-DARKMUTED",
      brand_spotify: "--ONSP-BRANDCOLOR-SPOTIFY",
    };
    this.changeSubtitleForNotice =
      this.config.deviceFilter.length > 0 && this.config.filterNoticeSubtitle
        ? "FILTERED_PLAYING"
        : "NOTHING_PLAYING";
    try {
      this.animationDefaultDelayFromCSS = Number(
        getComputedStyle(this.root)
          .getPropertyValue("--ONSP-INTERNAL-PLAYER-TEXT-TIME")
          .replace("ms", ""),
      );
    } catch (error) {
      console.warn(
        `%c·  MMM-OnSpotify  %c %c WARN %c ${this.translate("USER_CSS_ERROR")}`,
        "background-color:#84CC16;color:black;border-radius:0.5em",
        "",
        "background-color:#754700;color:white;",
        "",
      );
      this.animationDefaultDelayFromCSS = 600;
    }

    // Corrects the background blur and sizes so it does not reach the
    // body borders (actual display size borders). This makes it look good
    // behind the mirror (hides your acual display size)
    if (this.config.theming.blurCorrectionInFrameSide) {
      const s = this.config.moduleSide;
      if (s && s.includes("right")) this.constrainSide = "overrideRight";
      if (s && s.includes("left")) this.constrainSide = "overrideLeft";
      if (s && s.includes("bottom")) this.constrainBottom = true;
    }

    this.root.style.setProperty(
      "--ONSP-INTERNAL-PLAYER-UPDATE-TIME",
      `${this.config.updateInterval.isPlaying * 1000}ms`,
    );
    this.root.style.setProperty(
      "--ONSP-INTERNAL-PLAYER-PROGRESS-ANIMATION",
      this.config.hideTrackLengthAndAnimateProgress
        ? "linear"
        : "cubic-bezier(0.35, 0.11, 0.25, 1)",
    );
    if (this.config.theming.useColorInProgressBar) {
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-COLOR-PROGRESS",
        // Use the same corrected color as the Spotify Code bar if its enabled
        // It looks better and makes it look good if showBlurBackground is enabled
        this.config.theming.spotifyCodeExperimentalShow &&
          this.config.theming.spotifyCodeExperimentalUseColor
          ? "var(--ONSP-VIBRANT-DOMINANTBRIGHT)"
          : "var(--ONSP-VIBRANT-LIGHTVIBRANT)",
      );
    }
    if (!this.config.theming.roundProgressBar)
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-PROGRESS-CORNERS",
        "none",
      );
    if (!this.config.theming.roundMediaCorners)
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-MEDIA-CORNERS",
        "none",
      );
    if (this.config.theming.spotifyCodeExperimentalSeparateItem) {
      this.root.style.setProperty("--ONSP-INTERNAL-PLAYER-CODE-MARGIN", "none");
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-CODE-PADDING",
        "none",
      );
    }
    if (
      this.config.theming.useColorInProgressBar &&
      this.config.theming.showBlurBackground
    )
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-COLOR-PROGRESS-BG",
        "rgb(0,0,0,0.48)",
      );

    if (this.config.theming.fadeAnimations)
      this.root.style.setProperty("--ONSP-INTERNAL-LOWPOWER-FADEIN", "fadein");
    if (this.config.theming.textAnimations) {
      this.root.style.setProperty(
        "--ONSP-INTERNAL-LOWPOWER-TEXT",
        "animation-slide",
      );
      this.root.style.setProperty(
        "--ONSP-INTERNAL-LOWPOWER-TARGET",
        "animation-text",
      );
    }
    if (this.config.theming.mediaAnimations)
      this.root.style.setProperty(
        "--ONSP-INTERNAL-LOWPOWER-COVER",
        "var(--ONSP-INTERNAL-PLAYER-TRANSITION-TIME) cubic-bezier(0.25, 0.15, 0.20, 1)",
      );
    if (this.config.theming.transitionAnimations) {
      this.root.style.setProperty(
        "--ONSP-INTERNAL-LOWPOWER-TRANSITIONS",
        "all",
      );
      if (
        typeof this.config.theming.experimentalCSSOverridesForMM2 === "object"
      )
        this.root.style.setProperty(
          "--ONSP-OVERRIDES-TRANSITIONS-COLOR",
          "all",
        );
    }

    this.svgs = {
      default:
        "M4.93,4.93C3.12,6.74 2,9.24 2,12C2,14.76 3.12,17.26 4.93,19.07L6.34,17.66C4.89,16.22 4,14.22 4,12C4,9.79 4.89,7.78 6.34,6.34L4.93,4.93M19.07,4.93L17.66,6.34C19.11,7.78 20,9.79 20,12C20,14.22 19.11,16.22 17.66,17.66L19.07,19.07C20.88,17.26 22,14.76 22,12C22,9.24 20.88,6.74 19.07,4.93M7.76,7.76C6.67,8.85 6,10.35 6,12C6,13.65 6.67,15.15 7.76,16.24L9.17,14.83C8.45,14.11 8,13.11 8,12C8,10.89 8.45,9.89 9.17,9.17L7.76,7.76M16.24,7.76L14.83,9.17C15.55,9.89 16,10.89 16,12C16,13.11 15.55,14.11 14.83,14.83L16.24,16.24C17.33,15.15 18,13.65 18,12C18,10.35 17.33,8.85 16.24,7.76M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z",
      lock: "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",
      // Spotify devices:
      Speaker:
        "M2 11V13C7 13 11 17 11 22H13C13 15.9 8.1 11 2 11M20 2H10C8.9 2 8 2.9 8 4V10.5C9 11 9.9 11.7 10.7 12.4C11.6 11 13.2 10 15 10C17.8 10 20 12.2 20 15S17.8 20 15 20H14.8C14.9 20.7 15 21.3 15 22H20C21.1 22 22 21.1 22 20V4C22 2.9 21.1 2 20 2M15 8C13.9 8 13 7.1 13 6C13 4.9 13.9 4 15 4C16.1 4 17 4.9 17 6S16.1 8 15 8M15 18C14.8 18 14.5 18 14.3 17.9C13.8 16.4 13.1 15.1 12.2 13.9C12.6 12.8 13.7 11.9 15 11.9C16.7 11.9 18 13.2 18 14.9S16.7 18 15 18M2 15V17C4.8 17 7 19.2 7 22H9C9 18.1 5.9 15 2 15M2 19V22H5C5 20.3 3.7 19 2 19",
      CastVideo:
        "M1,10V12A9,9 0 0,1 10,21H12C12,14.92 7.07,10 1,10M1,14V16A5,5 0 0,1 6,21H8A7,7 0 0,0 1,14M1,18V21H4A3,3 0 0,0 1,18M21,3H3C1.89,3 1,3.89 1,5V8H3V5H21V19H14V21H21A2,2 0 0,0 23,19V5C23,3.89 22.1,3 21,3Z",
      AVR: "M2.175 16.825v-9.65h19.65v9.65Zm3.725-3.75h4.375v-2.15H5.9Zm7.65.15q.5 0 .863-.362.362-.363.362-.863t-.362-.863q-.363-.362-.863-.362t-.862.362q-.363.363-.363.863t.363.863q.362.362.862.362Zm3.475 0q.5 0 .863-.362.362-.363.362-.863t-.362-.863q-.363-.362-.863-.362t-.862.362Q15.8 11.5 15.8 12t.363.863q.362.362.862.362Z",
      Computer:
        "M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z",
      Smartphone:
        "M3,4H20A2,2 0 0,1 22,6V8H18V6H5V18H14V20H3A2,2 0 0,1 1,18V6A2,2 0 0,1 3,4M17,10H23A1,1 0 0,1 24,11V21A1,1 0 0,1 23,22H17A1,1 0 0,1 16,21V11A1,1 0 0,1 17,10M18,12V19H22V12H18Z",
      automobile:
        "M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z",
      SpotifyScannableLogo:
        "M30,0A30,30,0,1,1,0,30,30,30,0,0,1,30,0M43.73,43.2a1.85,1.85,0,0,0-.47-2.43,5,5,0,0,0-.48-.31,30.64,30.64,0,0,0-5.92-2.72,37.07,37.07,0,0,0-11.56-1.84c-1.33.07-2.67.12-4,.23a52.44,52.44,0,0,0-7.08,1.12,3.45,3.45,0,0,0-.54.16,1.83,1.83,0,0,0-1.11,2.08A1.79,1.79,0,0,0,14.37,41a4.29,4.29,0,0,0,.88-.12,48.93,48.93,0,0,1,8.66-1.15,35.33,35.33,0,0,1,6.75.37,28.29,28.29,0,0,1,10.25,3.61,4.77,4.77,0,0,0,.5.27,1.85,1.85,0,0,0,2.33-.74M47.41,35a2.34,2.34,0,0,0-.78-3.19l-.35-.21a35.72,35.72,0,0,0-7.38-3.3,45.39,45.39,0,0,0-15.7-2.13,41.19,41.19,0,0,0-7.39.92c-1,.22-2,.48-2.94.77A2.26,2.26,0,0,0,11.29,30a2.32,2.32,0,0,0,1.44,2.2,2.47,2.47,0,0,0,1.67,0,37,37,0,0,1,10.38-1.46,43,43,0,0,1,7.91.74,35.46,35.46,0,0,1,9.58,3.18c.66.34,1.3.72,1.95,1.08A2.33,2.33,0,0,0,47.41,35m.35-8.49A2.79,2.79,0,0,0,52,24.11c0-.2,0-.4-.08-.6a2.78,2.78,0,0,0-1.4-1.85,35.91,35.91,0,0,0-6.41-2.91,56.19,56.19,0,0,0-16.86-2.89,58.46,58.46,0,0,0-7,.21,48.31,48.31,0,0,0-6.52,1c-.87.2-1.73.42-2.58.7a2.73,2.73,0,0,0-1.85,2.68,2.79,2.79,0,0,0,2,2.61,2.9,2.9,0,0,0,1.6,0c.87-.23,1.75-.47,2.63-.66a45.52,45.52,0,0,1,7.26-.91,57.42,57.42,0,0,1,6.4,0,53.7,53.7,0,0,1,6.11.72,42.63,42.63,0,0,1,8.49,2.35,33.25,33.25,0,0,1,4,2",
    };
    this.images = {
      placeholder: "assets/placeholder.png",
      spotifyGreen: "assets/spotifyGreen.png",
      spotifyLogoGreen: "assets/spotifyLogoGreen.png",
      spotifyLogoWide: "assets/spotifyLogoWide.png",
    };
    this.tmpCanva = null;
  }

  /* All cases */
  empty(isPlaying) {
    const wrapper = this.globalWrapper();
    const content = document.createElement("div");
    const notice = document.createComment(
      isPlaying
        ? "Spotify is playing. The config <displayWhenPlaying> is set to none"
        : "Spotify is empty. The config <displayWhenEmpty> is set to none",
    );
    content.classList.add("empty", isPlaying ? "playing" : "stopped");
    content.appendChild(notice);
    wrapper.appendChild(content);
    this.lastItemURI = null;
    return wrapper;
  }

  /* Player */
  privateSession(data) {
    const wrapper = this.globalWrapper();
    const content = document.createElement("div");
    const text = document.createElement("span");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.setAttribute("d", this.svgs.lock);
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.appendChild(path);
    svg.classList.add("icon");

    text.classList.add("text");
    text.innerText = `'${this.translate("DISPLAY_PRIVATE")}'`;

    content.classList.add("privateSession", "playing");
    content.appendChild(svg);
    content.appendChild(text);

    wrapper.appendChild(content);
    this.lastItemURI = null;
    return wrapper;
  }
  nowPlaying(data) {
    const wrapper = this.globalWrapper();
    const content = document.createElement("div");
    content.classList.add("nowplaying", "playing");
    if (
      data &&
      (data.statusIsNewSong || this.firstUpdate) &&
      this.config.useVibrantOnChange
    )
      this.setGlobalColors(this.selectImage(data.itemImages), data);

    if (this.config.theming.showBlurBackground)
      content.appendChild(this.getPlayerBackground(data));
    content.appendChild(this.getPlayerData(data));

    wrapper.appendChild(content);
    this.lastItemURI = data.itemUri;
    return wrapper;
  }

  /* Empty player */
  spotifyLogo() {
    const wrapper = this.globalWrapper();
    const content = document.createElement("div");
    content.classList.add("logowide", "stopped");

    const logo = document.createElement("img");
    logo.src = `/${this.pathPrefix}${this.images.spotifyLogoWide}`;
    logo.classList.add("logo");
    content.appendChild(logo);

    wrapper.appendChild(content);
    this.lastItemURI = null;
    return wrapper;
  }
  userAffinity(data, datab) {
    const wrapper = this.globalWrapper();

    const content = document.createElement("div");
    content.classList.add("useraffinity", "stopped");

    const userContainer = document.createElement("div");
    userContainer.classList.add("user");
    userContainer.appendChild(this.getUserProfile(data, true));

    const affinityContainer = document.createElement("div");
    affinityContainer.classList.add("affinity");
    affinityContainer.appendChild(this.getAffinityGrid(datab));

    content.appendChild(userContainer);
    content.appendChild(affinityContainer);
    wrapper.appendChild(content);
    this.lastItemURI = null;
    return wrapper;
  }
  user(data) {
    const wrapper = this.globalWrapper();
    const content = document.createElement("div");
    const user = this.getUserProfile(data);

    content.classList.add("user", "stopped");
    content.appendChild(user);

    wrapper.appendChild(content);
    this.lastItemURI = null;
    return wrapper;
  }
  affinity(data) {
    const wrapper = this.globalWrapper();
    const content = document.createElement("div");
    const grid = this.getAffinityGrid(data);

    content.classList.add("affinity", "stopped");
    content.appendChild(grid);

    wrapper.appendChild(content);
    this.lastItemURI = null;
    return wrapper;
  }

  /* COMMON */
  globalWrapper() {
    const wrapper = document.createElement("div");
    const version = document.createComment(
      ` MMM-ONSP Version: ${this.config.version} `,
    );
    const code = document.createComment(
      ` MMM-OnSpotify by Fabrizz | https://github.com/Fabrizz/MMM-OnSpotify `,
    );
    const override = document.createComment(
      ` [!] OnSpotify is using user defined CSS overrides [!] `,
    );
    wrapper.classList.add("ONSP-Base", "ONSP-Custom");
    wrapper.id = "ONSP-WRAPPER";
    wrapper.appendChild(version);
    wrapper.appendChild(code);
    typeof this.config.theming.experimentalCSSOverridesForMM2 === "object"
      ? wrapper.appendChild(override)
      : null;

    return wrapper;
  }

  getCoverContainer(data, video) {
    video = data.canvas ? true : video;
    const cover = !video ? document.createElement("img") : document.createElement("video");
    const event = !video ? 'load' : 'loadedmetadata';

    cover.classList.add('media');
    cover.id = data.itemUri;
    const selectedImage = this.selectImage(data.itemImages);
    const _self = this;

    if (!video) {
      cover.src = selectedImage;
    } else {
      this.root.style.setProperty(
        `--ONSP-INTERNAL-CANVAS-ALBUM`,
        `url('${selectedImage}')`,
      );
      cover.type = 'video/mp4'
      cover.muted = true;
      cover.controls = false;
      cover.autobuffer = true;
      cover.autoplay = true;
      cover.loop = true;
      cover.src = data.canvas ? data.canvas : data.url;    
    }
    
    cover.addEventListener(event, function(e) {
      const parent = e.target.parentNode;
      const children = parent.children;
            
      e.target.classList.add('top');
      if (e.target.previousSibling != null) {
        e.target.previousSibling.classList.remove('top');
      }   

      // Remove all children except the last two
      for (let i = children.length - 3; i >= 0; i--) {
          parent.removeChild(children[i]);
      }      

      if (e.target.tagName === 'VIDEO') {
        if (_self.config.experimentalCanvasEffect == 'scale') {
          parent.style.height = e.target.offsetHeight + 'px';
        }
      } else {
        parent.style.removeProperty('height');
      }
    });

    return cover;
  } 

  /* PLAYER */
  getPlayerData(data) {
    const player = document.createElement("div");
    player.classList.add(
      "player",
      data.playerMediaType ? data.playerMediaType : "unknown",
    );

    /* Header -> Title | Subtitle */
    const header = document.createElement("div");
    header.classList.add("header");
    const names = document.createElement("div");
    names.classList.add("names");
    names.id = "VSNO-TARGET-TEXTCONTAINER";
    const visual = document.createElement("span");
    visual.classList.add("visual");

    const title = document.createElement("span");
    title.id = "VSNO-TARGET-TITLE";
    title.classList.add("title");
    title.innerText = data.itemName;
    const subtitle = document.createElement("span");
    subtitle.id = "VSNO-TARGET-SUBTITLE";
    subtitle.classList.add("subtitle");
    subtitle.innerText = data.itemArtists
      ? data.itemArtists
      : `${data.itemShowName} - ${data.itemPublisher}`;

    names.appendChild(title);
    names.appendChild(subtitle);
    this.config.theming.showVerticalPipe ? header.appendChild(visual) : null;
    header.appendChild(names);

    /* Cover */
    const swappable = document.createElement("div");
    swappable.id = "VSNO-TARGET-SWAPPABLE";
    swappable.classList.add("swappable");
    swappable.classList.add("canvas-" + this.config.experimentalCanvasEffect);
    if (this.config.experimentalCanvasAlbumOverlay) swappable.classList.add("canvas-overlays");
    
    const cover = this.getCoverContainer(data);    
    swappable.appendChild(cover);


    /* Footer -> ProgressBar>Bar | Target>Icon/Device */
    const footer = document.createElement("div");
    footer.classList.add("footer");
    const progressbar = document.createElement("div");
    progressbar.classList.add("progress");
    const progress = document.createElement("div");
    progress.id = "VSNO-TARGET-PROGRESS";
    // As this has been changed to use a widht %, extracting
    // attributtes and not parent width is better
    progress.setAttribute("now", data.playerProgress);
    progress.setAttribute("max", data.itemDuration);
    progress.style.width = `${this.getPercentage(
      data.playerProgress,
      data.itemDuration,
    )}%`;
    progress.classList.add("bar");
    progressbar.appendChild(progress);
    //////////////
    const target = document.createElement("div");
    target.classList.add("target");

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("fill", "currentColor");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.classList.add("icon");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.id = "VSNO-TARGET-PATH";
    path.setAttribute(
      "d",
      this.config.theming.alwaysUseDefaultDeviceIcon
        ? this.svgs.default
        : this.svgs[data.deviceType]
        ? this.svgs[data.deviceType]
        : this.svgs.default,
    );
    icon.appendChild(path);
    target.appendChild(icon);

    const device = document.createElement("span");
    device.id = "VSNO-TARGET-DEVICE";
    device.classList.add("device");
    device.innerText = data.deviceName;
    target.appendChild(device);

    const time = document.createElement("span");
    time.innerText = this.getSanitizedTime(
      data.playerProgress,
      data.itemDuration,
    );
    time.id = "VSNO-TARGET-TIME";
    time.classList.add("time");
    target.appendChild(time);

    footer.appendChild(progressbar);
    footer.appendChild(target);

    if (this.config.theming.scrollAnimations) this.setScrollAnimation(true);

    /* Main */
    player.appendChild(header);
    player.appendChild(swappable);
    if (this.config.theming.spotifyCodeExperimentalShow) {
      player.appendChild(this.getSpotifyCodeDom(data.itemUri));
    }

    player.appendChild(footer);
    return player;
  }
  getPlayerBackground() {
    const bg = document.createElement("div");
    bg.classList.add(
      "background",
      this.config.theming.blurCorrectionInAllSides
        ? "overrideAll"
        : "overrideAllNone",
      this.constrainSide ? this.constrainSide : "overrideSideNone",
      this.constrainBottom ? "overrideBottom" : "overrideBottomNone",
    );
    this.backgroundColors.forEach((c) => {
      let a = document.createElement("div");
      a.classList.add("backgroundBox", `backgroundBox${c}`);
      bg.appendChild(a);
    });
    return bg;
  }
  getSpotifyCodeDom(u) {
    const experimental = document.createElement("div");
    experimental.classList.add("experimental");
    const code = document.createElement("div");
    code.id = "VSNO-TARGET-CODE";
    code.classList.add("code");
    experimental.appendChild(code);
    this.setSpotifyCode(u, "VSNO-TARGET-CODE", true);
    return experimental;
  }

  updatePlayerData(data) {
    if (!document.getElementById("ONSP-WRAPPER")) return;
    if (
      data &&
      (data.statusIsNewSong || this.firstUpdate) &&
      this.config.useVibrantOnChange
    )
      this.setGlobalColors(this.selectImage(data.itemImages), data);

    const progress = document.getElementById("VSNO-TARGET-PROGRESS");
    progress.style.width = `${this.getPercentage(
      data.playerProgress,
      data.itemDuration,
    )}%`;
    progress.setAttribute("now", data.playerProgress);
    progress.setAttribute("max", data.itemDuration);

    document.getElementById("VSNO-TARGET-TIME").innerText =
      this.getSanitizedTime(data.playerProgress, data.itemDuration);

    if (data.statusIsDeviceChange) {
      const playerDevice = document.getElementById("VSNO-TARGET-DEVICE");
      const playerDeviceIcon = document.getElementById("VSNO-TARGET-PATH");

      playerDevice.innerText = data.deviceName;
      playerDeviceIcon.setAttribute(
        "d",
        this.config.theming.alwaysUseDefaultDeviceIcon
          ? this.svgs.default
          : this.svgs[data.deviceType]
          ? this.svgs[data.deviceType]
          : this.svgs.default,
      );

      // Handle text animation clearing
      if (this.config.theming.textAnimations) {
        playerDevice.classList.add("animation-text");
        playerDeviceIcon.classList.add("animation-text");
        if (this.currentAnimations.playerTarget)
          clearTimeout(this.currentAnimations.playerTarget);
        this.currentAnimations.playerTarget = setTimeout(() => {
          document
            .getElementById("VSNO-TARGET-DEVICE")
            .classList.remove("animation-text");
          document
            .getElementById("VSNO-TARGET-PATH")
            .classList.remove("animation-text");
        }, this.animationDefaultDelayFromCSS);
      }
    }

    if (data.statusIsNewSong || data.itemUri !== this.lastItemURI) {
      const playerTitle = document.getElementById("VSNO-TARGET-TITLE");
      const playerSubtitle = document.getElementById("VSNO-TARGET-SUBTITLE");
      playerTitle.innerText = data.itemName;
      playerSubtitle.innerText = data.itemArtists
        ? data.itemArtists
        : `${data.itemShowName} - ${data.itemPublisher}`;

      const container = document.getElementById("VSNO-TARGET-SWAPPABLE");
      const cover = this.getCoverContainer(data)
      container.appendChild(cover)
      // document.getElementById("VSNO-TARGET-COVER").src = this.selectImage(data.itemImages); <-- transitions do not affect src

      // LATER: Add a couple of miliseconds of artificial delay so Vibrant can prefetch the image and
      // see if that removes the background flash on lower bandwidth conections...

      // LATER: Update the new image using two elements on top of each other. different vars for each,
      // keep track of current one and create below/delete on top...

      // Handle text animation clearing
      if (this.config.theming.textAnimations) {
        playerTitle.classList.add("animation-slide");
        playerSubtitle.classList.add("animation-slide");

        if (this.currentAnimations.playerTitle)
          clearTimeout(this.currentAnimations.playerTitle);
        this.currentAnimations.playerTitle = setTimeout(() => {
          document
            .getElementById("VSNO-TARGET-TITLE")
            .classList.remove("animation-slide");
          document
            .getElementById("VSNO-TARGET-SUBTITLE")
            .classList.remove("animation-slide");
        }, this.animationDefaultDelayFromCSS);
      }

      if (this.config.theming.spotifyCodeExperimentalShow)
        this.updateSpotifyCode(data.itemUri, "VSNO-TARGET-CODE", false);
    }

    if (this.config.theming.scrollAnimations)
      this.setScrollAnimation(
        false,
        data.statusIsNewSong || data.itemUri !== this.lastItemURI,
        data.playerProgress,
      );

    this.lastItemURI = data.itemUri;
  }

  updateCanvas(data) {
    const container = document.getElementById("VSNO-TARGET-SWAPPABLE");
    this.coverData = data;
    if (container == null) return;
    const cover = this.getCoverContainer(data, true);
    container.appendChild(cover);
  }


  /* AFFINITY */
  getAffinityGrid(data) {
    const grid = document.createElement("div");
    this.updateAffinityData(data);

    grid.classList.add("grid");
    this.affinityGridElements.forEach((element) => {
      const img = document.createElement("span");
      img.classList.add(
        "gridElement",
        `gridElement-${element}`,
        this.config.theming.fadeAnimations ? "animation-shine" : "no-animation",
      );
      img.style.backgroundImage = `var(--ONSP-INTERNAL-AFFINITY-IMAGES-${element})`;
      grid.appendChild(img);
    });
    return grid;
  }
  updateAffinityData(data) {
    if (data) {
      data.forEach((element) => {
        const name = this.affinityGridElements[data.indexOf(element)];
        this.root.style.setProperty(
          `--ONSP-INTERNAL-AFFINITY-IMAGES-${name}`,
          `url('${element.image}')`,
        );
      });
      if (this.config.theming.fadeAnimations)
        Array.from(document.getElementsByClassName("gridElement")).forEach(
          (element) => {
            element.classList.remove("animation-shine");
          },
        );
      this.root.style.setProperty("--ONSP-INTERNAL-AFFINITY-TEXT", ``);
    } else {
      this.affinityGridElements.forEach((element) => {
        this.root.style.setProperty(
          `--ONSP-INTERNAL-AFFINITY-IMAGES-${element}`,
          `url('/${this.pathPrefix}${this.images.placeholder}')`,
        );
        this.root.style.setProperty(
          "--ONSP-INTERNAL-AFFINITY-TEXT",
          this.translate("STABLISHING_CONNECTION"),
        );
      });
    }
  }

  /* USER */
  getUserProfile(data, sync) {
    const content = document.createElement("div");
    content.classList.add("profile");
    this.updateUserData(data, sync);

    const img = document.createElement("span");
    img.classList.add("image");
    content.appendChild(img);

    const user = document.createElement("div");
    user.classList.add("data");
    const title = document.createElement("span");
    title.classList.add("title");
    const badge = document.createElement("span");
    badge.classList.add("badge");
    title.appendChild(badge);

    const subtitle = document.createElement("span");
    subtitle.classList.add("subtitle");
    user.appendChild(title);
    user.appendChild(subtitle);
    content.appendChild(user);

    return content;
  }
  updateUserData(data, vib) {
    if (data) {
      this.root.style.setProperty(
        "--ONSP-INTERNAL-USER-NAME",
        `"${data.name.charAt(0).toUpperCase() + data.name.slice(1)}"`,
      );
      this.root.style.setProperty(
        "--ONSP-INTERNAL-USER-PRODUCT",
        `"${data.product.toLocaleUpperCase()}"`,
      );
      this.root.style.setProperty(
        "--ONSP-INTERNAL-USER-SUBTITLE",
        `'${this.translate(this.changeSubtitleForNotice)}'`,
      );
      if (!data.image) {
        this.root.style.setProperty(
          "--ONSP-INTERNAL-USER-BG-COLOR",
          `#ffffff0d`,
        );
        this.root.style.setProperty(
          "--ONSP-INTERNAL-USER-IMAGE",
          `url('/${this.pathPrefix}${this.images.spotifyGreen}')`,
        );
        this.root.style.setProperty(
          "--ONSP-INTERNAL-USER-IMAGE-SYNC-HEIGHT",
          `var(--ONSP-INTERNAL-USER-IMAGE-EMPTY)`,
        );
        this.root.style.setProperty(
          "--ONSP-INTERNAL-USER-IMAGE-SYNC-WIDTH",
          `calc(var(--ONSP-INTERNAL-USER-IMAGE-EMPTY) * 0.4)`,
        );
      } else {
        this.root.style.setProperty(
          "--ONSP-INTERNAL-USER-IMAGE-SYNC-HEIGHT",
          `var(--ONSP-INTERNAL-USER-IMAGE-BASE)`,
        );
        this.root.style.setProperty(
          "--ONSP-INTERNAL-USER-IMAGE-SYNC-WIDTH",
          `var(--ONSP-INTERNAL-USER-IMAGE-BASE)`,
        );
        this.root.style.setProperty(
          "--ONSP-INTERNAL-USER-IMAGE",
          `url('${data.image}')`,
        );
        this.userDataProcessImage(data.image, vib);
      }
    } else {
      this.root.style.setProperty("--ONSP-INTERNAL-USER-BG-COLOR", "#191414");
      this.root.style.setProperty(
        "--ONSP-INTERNAL-USER-IMAGE",
        `url('/${this.pathPrefix}${this.images.spotifyLogoGreen}')`,
      );
      this.root.style.setProperty(
        "--ONSP-INTERNAL-USER-NAME",
        `'${this.translate("SPOTIFY_HEADER")}'`,
      );
      this.root.style.setProperty("--ONSP-INTERNAL-USER-PRODUCT", `""`);
      this.root.style.setProperty(
        "--ONSP-INTERNAL-USER-SUBTITLE",
        `'${this.translate("STABLISHING_CONNECTION")}'`,
      );
      this.root.style.setProperty(
        "--ONSP-INTERNAL-USER-IMAGE-SYNC-HEIGHT",
        `var(--ONSP-INTERNAL-USER-IMAGE-BASE)`,
      );
      this.root.style.setProperty(
        "--ONSP-INTERNAL-USER-IMAGE-SYNC-WIDTH",
        `var(--ONSP-INTERNAL-USER-IMAGE-BASE)`,
      );
    }
  }

  /* Image color processing */
  async setGlobalColors(url, data) {
    const shouldUpdatePalette = url !== this.lastUrlProcessed;

    this.firstUpdate = false;
    const palette = shouldUpdatePalette ? await this.getVibrant(url) : this.lastPalette;

    if (!palette) return;
    this.lastPalette = palette;

    for (const element in palette) {
      let rgb = palette[element].rgb;
      this.root.style.setProperty(
        `--ONSP-VIBRANT-${element.toLocaleUpperCase()}`,
        `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
      );
    }

    // Notify external modules about the color change instantly after the color is set
    // Added to fix/help #81
    if (this.config.experimentalColorSignaling)
      this.notifyModules("INSTANT_COLOR", {
        vibrantRawOutput: palette,
        isCacheedPalette: !shouldUpdatePalette,
        forUrl: url,
      })
    

    // Fix color data using RGB_Linear_Shade to get more contrast
    // This is used in the SpotifyCode bar, if enabled with useColorInProgressBar
    // its also used there for continuity

    // [0.6v]
    // Always export the brightness corrected colors even if not used
    // in the SpotifyCode, useful for external theming
    let vibrantCorrectedDark = RGB_Linear_Shade(
      -0.68,
      `rgb(${palette.Vibrant.rgb.join(",")})`,
    );
    let vibrantCorrectedBright = RGB_Linear_Shade(
      0.65,
      `rgb(${palette.Vibrant.rgb.join(",")})`,
    );
    this.root.style.setProperty(
      "--ONSP-VIBRANT-DOMINANTDARK",
      vibrantCorrectedDark,
    );
    this.root.style.setProperty(
      "--ONSP-VIBRANT-DOMINANTBRIGHT",
      vibrantCorrectedBright,
    );
    this.root.style.setProperty(
      "--ONSP-VIBRANT-DOMINANTEMPHASIS",
      vibrantCorrectedBright,
    );

    if (this.config.theming.spotifyCodeExperimentalUseColor) {
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-CODE-BARS",
        "var(--ONSP-VIBRANT-DOMINANTDARK)",
      );
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-CODE-COLOR",
        "var(--ONSP-VIBRANT-DOMINANTBRIGHT)",
      );
    }

    // Set a special transparent color to the progress bar background
    // If showBlurBackground is enabled it uses the default value, that looks
    // better with the blurred background colors. Also respects the color
    // if spotifyCodeExperimentalUseColor is enabled
    if (
      this.config.theming.useColorInProgressBar &&
      !this.config.theming.showBlurBackground
    )
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-COLOR-PROGRESS-BG",
        this.config.theming.spotifyCodeExperimentalShow &&
          this.config.theming.spotifyCodeExperimentalUseColor
          ? `${vibrantCorrectedBright.slice(0, -1)},0.17)`
          : `rgb(${palette.LightMuted.rgb[0]},${palette.LightMuted.rgb[1]},${palette.LightMuted.rgb[2]},0.17)`,
      );

    if (this.config.theming.useColorInTitle) {
      const ls = Math.round(
        (Brightness_By_Color(palette.LightVibrant.hex) / 255) * 100,
      );
      this.root.style.setProperty(
        "--ONSP-INTERNAL-PLAYER-COLOR-TITLE",
        this.config.theming.spotifyCodeExperimentalShow &&
          this.config.theming.spotifyCodeExperimentalUseColor
          ? "var(--ONSP-VIBRANT-DOMINANTBRIGHT)"
          : ls > 68
          ? "var(--ONSP-VIBRANT-LIGHTVIBRANT)"
          : ls > 54
          ? RGB_Linear_Shade(0.3, `rgb(${palette.LightVibrant.rgb.join(",")})`)
          : RGB_Linear_Shade(0.5, `rgb(${palette.LightVibrant.rgb.join(",")})`),
      );
    }

    if (this.config.showDebugPalette) {
      console.log(
        `%cV  ${palette.Vibrant.hex}%cLV ${palette.LightVibrant.hex}%cDV ${
          palette.DarkVibrant.hex
        }%cM  ${palette.Muted.hex}%cLM ${palette.LightMuted.hex}%cDM ${
          palette.DarkMuted.hex
        }%c %c${
          this.config.theming.spotifyCodeExperimentalUseColor ? "SPCBR" : ""
        }%c${
          this.config.theming.spotifyCodeExperimentalUseColor ? "SPCBG" : ""
        }%c ${
          this.config.theming.spotifyCodeExperimentalUseColor
            ? `VHSP: ${Math.round(
                (Brightness_By_Color(palette.Vibrant.hex) / 255) * 100,
              )}%`
            : ""
        } | ${shouldUpdatePalette ? "" : "[PALETTE CACHED] | "}${data.itemName} | ${url}`,
        `padding:0.7em;border-radius:3em;background-color:${palette.Vibrant.hex}`,
        `padding:0.7em;border-radius:3em;margin-left:0.3em;background-color:${palette.LightVibrant.hex};color:${palette.DarkVibrant.hex}`,
        `padding:0.7em;border-radius:3em;margin-left:0.3em;background-color:${palette.DarkVibrant.hex};color:${palette.LightVibrant.hex}`,
        `padding:0.7em;border-radius:3em;margin-left:0.3em;background-color:${palette.Muted.hex}`,
        `padding:0.7em;border-radius:3em;margin-left:0.3em;background-color:${palette.LightMuted.hex};color:${palette.DarkMuted.hex}`,
        `padding:0.7em;border-radius:3em;margin-left:0.3em;background-color:${palette.DarkMuted.hex};color:${palette.LightMuted.hex}`,
        "padding:0.4em;",
        `padding:0.7em;border-radius:3em;background-color:${vibrantCorrectedDark};color:${vibrantCorrectedBright}`,
        `padding:0.7em;border-radius:3em;margin-left:0.3em;background-color:${vibrantCorrectedBright};color:${vibrantCorrectedDark}`,
        "padding:0.4em;",
      );
    }
  }

  userDataProcessImage(url, vib) {
    this.config.theming.useColorInUserData && !vib
      ? this.getVibrant(url, { quality: 6 }).then((palette) =>
          palette
            ? this.root.style.setProperty(
                "--ONSP-INTERNAL-USER-BG-COLOR",
                `${palette.Vibrant.hex}20`,
              )
            : this.root.style.setProperty(
                "--ONSP-INTERNAL-USER-BG-COLOR",
                `#ffffff0d`,
              ),
        )
      : this.root.style.setProperty(
          "--ONSP-INTERNAL-USER-BG-COLOR",
          `#ffffff0d`,
        );
  }
  getVibrant(url, opts) {
    this.lastUrlProcessed = url;
    if (!("Vibrant" in window)) {
      console.error(
        `%c· MMM-OnSpotify %c %c ERRO %c ${this.translate(
          "VIBRANT_NOT_LOADED",
        )}`,
        "background-color:#84CC16;color:black;border-radius:0.5em",
        "",
        "background-color:#781919;color:white;",
        "",
      );
      return;
    }
    return (
      Vibrant.from(url, {
        quality: this.config.prefersLargeImageSize ? 12 : 5,
        // Downsize the sample colors if the image is larger
        // Less accurate but more preformant
        ...opts,
      })
        // Here we use the webworker threads to allow a non blocking update
        .useQuantizer(Vibrant.Quantizer.WebWorker)
        .getPalette((palette) => palette)
        .catch((e) =>
          console.error(
            `%c· MMM-OnSpotify %c %c ERRO %c ${this.translate(
              "VIBRANT_ERROR",
            )}`,
            "background-color:#84CC16;color:black;border-radius:0.5em",
            "",
            "background-color:#781919;color:white;",
            "",
            e,
          ),
        )
    );
  }

  /* MM2 VARIABLE OVERRIDES */
  setMM2colors(userConfig) {
    try {
      userConfig.forEach((entry) => {
        let originalVariable = this.ONSPcolorVerboseMatch.hasOwnProperty(
          entry[1],
        )
          ? this.ONSPcolorVerboseMatch[entry[1]]
          : entry[1]; /* Allow users to just override whatever they want when ONSP is playing */
        this.root.style.setProperty(entry[0], `var(${originalVariable})`);
      });
    } catch (e) {
      console.error(
        `%c· MMM-OnSpotify %c %c ERRO %c ${this.translate(
          "CSSOVERRIDE_MALFORMED",
        )}`,
        "background-color:#84CC16;color:black;border-radius:0.5em",
        "",
        "background-color:#781919;color:white;",
        "",
        e,
      );
    }
  }
  removeMM2colors(userConfig) {
    try {
      userConfig.forEach((entry) => {
        if (entry[2]) {
          this.root.style.setProperty(entry[0], entry[2]);
        } else {
          this.root.style.removeProperty(entry[0]);
        }
      });
    } catch (e) {
      console.error(
        `%c· MMM-OnSpotify %c %c ERRO %c ${this.translate(
          "CSSOVERRIDE_MALFORMED",
        )}`,
        "background-color:#84CC16;color:black;border-radius:0.5em",
        "",
        "background-color:#781919;color:white;",
        "",
        e,
      );
    }
  }

  /* SPOTIFY SCANNABLES SET, GET & ANIMATION */
  async fetchSpotifyCode(uri) {
    const response = await fetch(
      this.getSpotifyScannablesUrl(
        uri,
        this.config.theming.spotifyCodeExperimentalUseColor,
      ),
      {
        method: "GET",
        referrerPolicy: "no-referrer",
      },
    );
    return await response.text();
  }
  getSpotifyCodeData(code, color) {
    const rectElements = code.match(/<rect\s+([^>]+)>/g);
    let attributesList = [];

    if (rectElements) {
      attributesList = rectElements.map((rectElement) => {
        const attributeRegex = /(\w+)="([^"]*)"/g;
        const attributes = {};

        let match;
        while ((match = attributeRegex.exec(rectElement))) {
          const attributeName = match[1];
          let attributeValue = match[2];

          if (attributeName === "fill") {
            if (attributeValue === "#ffffff") {
              attributeValue = "#00000000";
            } else {
              attributeValue = color;
            }
          }
          attributes[attributeName] = attributeValue;
        }
        return attributes;
      });
    }

    return attributesList;
  }
  async setSpotifyCode(uri, id, animate) {
    const code = await this.fetchSpotifyCode(uri);
    if (this.config.theming.spotifyVectorAnimations) {
      const color = "var(--ONSP-INTERNAL-PLAYER-CODE-BARS)";
      const barsData = this.getSpotifyCodeData(code, color);
      const vect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      vect.style.animation = animate
        ? "var(--ONSP-INTERNAL-LOWPOWER-FADEIN) var(--ONSP-INTERNAL-PLAYER-TRANSITION-TIME);"
        : "";
      vect.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      vect.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      vect.setAttribute("viewBox", "0 0 400 100");
      vect.setAttribute("height", "65");
      vect.setAttribute("width", "260");

      if (barsData) {
        let n = 1;
        barsData.forEach((bar) => {
          const rect = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect",
          );
          for (const [key, value] of Object.entries(bar)) {
            rect.setAttribute(key, value);
          }
          rect.id = `VSNO-SPOTIFY-CODE-RECT-${n}`;
          vect.append(rect);
          n++;
        });
      }

      const logo = document.createElementNS("http://www.w3.org/2000/svg", "g");
      logo.setAttribute("transform", "translate(20,20)");
      const innerLogo = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      innerLogo.setAttribute("d", this.svgs.SpotifyScannableLogo);
      innerLogo.setAttribute("fill", color);
      logo.append(innerLogo);
      vect.append(logo);
      document.getElementById(id).appendChild(vect);
    } else {
      this.basicSetSpotifyCode(code, id, animate);
    }
  }
  async updateSpotifyCode(uri, id, animate) {
    const code = await this.fetchSpotifyCode(uri);
    if (this.config.theming.spotifyVectorAnimations) {
      const color = "var(--ONSP-INTERNAL-PLAYER-CODE-BARS)";
      const barsData = this.getSpotifyCodeData(code, color);

      if (barsData) {
        let n = 1;
        barsData.forEach((bar) => {
          const rect = document.getElementById(`VSNO-SPOTIFY-CODE-RECT-${n}`);
          rect.style.transition =
            "all var(--ONSP-INTERNAL-PLAYER-TRANSITION-TIME) var(--ONSP-INTERNAL-PLAYER-PROGRESS-ANIMATION)";
          for (const [key, value] of Object.entries(bar)) {
            rect.setAttribute(key, value);
          }
          n++;
        });
      }
    } else {
      this.basicSetSpotifyCode(code, id, animate);
    }
  }

  async basicSetSpotifyCode(code, id, animate) {
    document.getElementById(id).innerHTML = DOMPurify.sanitize(code)
      .replaceAll("#000000", "var(--ONSP-INTERNAL-PLAYER-CODE-BARS)")
      .replace("#ffffff", "#00000000")
      .replace(
        "<svg ",
        animate
          ? `<svg style="animation: var(--ONSP-INTERNAL-LOWPOWER-FADEIN) var(--ONSP-INTERNAL-PLAYER-TRANSITION-TIME)" `
          : `<svg style="" `,
      );
  }

  /* TEXT DYNAMIC SCROLL */
  setScrollAnimation(disable, newSong, ts) {
    try {
      if (!disable && !newSong) {
        if (Number(ts) > 8000) {
          if (!this.scrollerStatus) {
            this.scrollerStatus = true;
            const container = document.getElementById(
              "VSNO-TARGET-TEXTCONTAINER",
            );
            const subtitle = document.getElementById(
              "VSNO-TARGET-SUBTITLE",
            ).offsetWidth;
            const title =
              document.getElementById("VSNO-TARGET-TITLE").offsetWidth;

            const containerWidth = container.offsetWidth;
            const titleData = [
              title,
              title - containerWidth,
              5000 + (title - containerWidth) * 6,
            ];
            const subtitleData = [
              subtitle,
              subtitle - containerWidth,
              5000 + (subtitle - containerWidth) * 6,
            ];

            if (titleData[1] > 0 && subtitleData[1] > 0) {
              this.root.style.setProperty(
                "--ONSP-INTERNAL-SCROLLER-SIZE-TITLE",
                `${titleData[1]}px`,
              );
              document
                .getElementById("VSNO-TARGET-TITLE")
                .classList.add("scroll");
              this.root.style.setProperty(
                "--ONSP-INTERNAL-SCROLLER-SIZE-SUBTITLE",
                `${subtitleData[1]}px`,
              );
              document
                .getElementById("VSNO-TARGET-SUBTITLE")
                .classList.add("scroll");
              this.root.style.setProperty(
                "--ONSP-INTERNAL-SCROLLER-TIMING-SUM-TITLE",
                `${titleData[2]}ms`,
              );
              this.root.style.setProperty(
                "--ONSP-INTERNAL-SCROLLER-TIMING-SUM-SUBTITLE",
                `${subtitleData[2]}ms`,
              );
            } else if (titleData[1] > 0) {
              this.root.style.setProperty(
                "--ONSP-INTERNAL-SCROLLER-SIZE-TITLE",
                `${titleData[1]}px`,
              );
              document
                .getElementById("VSNO-TARGET-TITLE")
                .classList.add("scroll");
              this.root.style.setProperty(
                "--ONSP-INTERNAL-SCROLLER-TIMING-SUM-TITLE",
                `${titleData[2]}ms`,
              );
            } else if (subtitleData[1] > 0) {
              this.root.style.setProperty(
                "--ONSP-INTERNAL-SCROLLER-SIZE-SUBTITLE",
                `${subtitleData[1]}px`,
              );
              document
                .getElementById("VSNO-TARGET-SUBTITLE")
                .classList.add("scroll");
              this.root.style.setProperty(
                "--ONSP-INTERNAL-SCROLLER-TIMING-SUM-SUBTITLE",
                `${subtitleData[2]}ms`,
              );
            }
          }
        }
      } else {
        if (this.scrollerStatus) {
          this.scrollerStatus = false;
          this.root.style.setProperty(
            "--ONSP-INTERNAL-SCROLLER-SIZE-TITLE",
            "0px",
          );
          this.root.style.setProperty(
            "--ONSP-INTERNAL-SCROLLER-SIZE-SUBTITLE",
            "0px",
          );
          this.root.style.setProperty(
            "--ONSP-INTERNAL-SCROLLER-TIMING-SUM-TITLE",
            "0ms",
          );
          this.root.style.setProperty(
            "--ONSP-INTERNAL-SCROLLER-TIMING-SUM-SUBTITLE",
            "0ms",
          );
          document
            .getElementById("VSNO-TARGET-SUBTITLE")
            .classList.remove("scroll");
          document
            .getElementById("VSNO-TARGET-TITLE")
            .classList.remove("scroll");
        }
      }
    } catch (error) {
      /* This effect is based on the current TS of the song, the module reference is going to always be some ms behind,
      here we catch, even if it never happens, the error thown if the player changes state */
    }
  }

  /* Utils */
  selectImage(im) {
    return im[this.config.prefersLargeImageSize ? "large" : "medium"];
  }
  getPercentage(n, t) {
    return ((n / t) * 100).toFixed(3);
  }
  getVerboseLenght(n) {
    if (n < 1000) return "0:00";
    const seconds = Math.floor(n / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const formattedSeconds = remainingSeconds.toString().padStart(2, "0");

    if (hours > 0) {
      return `${hours.toString()}:${minutes
        .toString()
        .padStart(2, "0")}:${formattedSeconds}`;
    } else {
      return `${minutes.toString()}:${formattedSeconds}`;
    }
  }
  getSanitizedTime(n, t) {
    const lg = this.getVerboseLenght(n);
    const fl = this.getVerboseLenght(t);

    let str = this.config.hideTrackLengthAndAnimateProgress
      ? fl
      : `${lg} / ${fl}`;
    if (
      str.includes("second") &&
      !this.config.hideTrackLengthAndAnimateProgress
    )
      str = `0:00 / ${fl}`;
    return str;
  }
  getSpotifyScannablesUrl(uri) {
    return `https://scannables.scdn.co/uri/plain/svg/ffffff/black/260/${uri}`;
  }
}

// By Trizkit & Mike 'Pomax' Kamermans | https://stackoverflow.com/a/13542669
// eslint-disable-next-line prettier/prettier, no-redeclare, eqeqeq, no-param-reassign
const RGB_Linear_Shade = (p, c) => {var i = parseInt, r = Math.round, [a, b, c, d] = c.split(","), P = p < 0, t = P ? 0 : 255 * p, P = P ? 1 + p : 1 - p; return `rgb${  d ? "a(" : "("  }${r(i(a[3] == "a" ? a.slice(5) : a.slice(4)) * P + t)  },${  r(i(b) * P + t)  },${  r(i(c) * P + t)  }${d ? `,${  d}` : ")"}`;};

// By Max Chuhryaev & danilocastro-toast | https://gist.github.com/w3core/e3d9b5b6d69a3ba8671cc84714cca8a4?permalink_comment_id=3125287#gistcomment-3125287
// eslint-disable-next-line prettier/prettier, no-redeclare, eqeqeq, no-param-reassign
const Brightness_By_Color = (color) => {var r, g, b, hsp; if (color.match(/^rgb/)) {color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/); r = color[1]; g = color[2]; b = color[3];} else {/* HEX > RGB http://gist.github.com/983661 */color = +(`0x${  color.slice(1).replace(color.length < 5 && /./g, '$&$&')}`); r = color >> 16; g = color >> 8 & 255; b = color & 255;} /* HSP equation http://alienryderflex.com/hsp.html */hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b)); return hsp; };
