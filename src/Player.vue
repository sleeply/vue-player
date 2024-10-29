<script setup lang="ts">
import { ref, toRefs } from "vue";
import { IPlayerAdditionLang, IPlayerParams, IPlayerProvider } from "./types";
import { reactive } from "vue";
import Loader from "./components/loader.vue";
import { provide } from "vue";
import PlayerProgressiveBar from "./components/PlayerProgressiveBar.vue";
import { onMounted } from "vue";
import Hls, { HlsConfig } from "hls.js";
import PlBtn from "./components/PlBtn.vue";
import { usePlayer } from "./player";
import Quality from "./widgets/Quality.vue";
import Track from "./widgets/Track.vue";
import SettingsModal from "./widgets/SettingsModal.vue";
import { watch } from "vue";
import { useEventListener } from "./composables/useEventListener";
import { useAdapter } from "./composables/useAdapter";
import Captions from "./widgets/Captions.vue";
import { onBeforeUnmount } from "vue";

interface IProps {
  isShort?: boolean;
  url: string;
  poster?: string;
  changeTimTo?: number | null;
  disabledFirstLoad?: boolean;
  stopOnUnFocus?: boolean;
  customHls?: Hls | null;
  config?: Partial<HlsConfig> | undefined;
  showFullScreen?: boolean;
  showIsShort?: boolean;
  showIsPip?: boolean;
  canAutoPlay?: boolean;
  langs?: IPlayerAdditionLang;
  lang?: string;
}
const props = withDefaults(defineProps<IProps>(), {
  showFullScreen: true,
  showIsShort: true,
  showIsPip: true,
  lang: "ru",
});

const { lang, langs } = toRefs(props);

const emits = defineEmits([
  "exit",
  "changeVolume",
  "playing",
  "paused",
  "canPlay",
  "handleFullScreen",
  "setPip",
  "exitPip",
  "changeSize",
  "videoTimeChanged",
  "progressed",
  "beforeRemovingUrl",
  "ended",
  "started",
  "watchedTime",
  "loadedMetaData",
  "getActiveChunk",
]);

const { secondsToHms, isMobile, activeLang, updateSettings } = usePlayer();
const { getAdapter, killAdapter, setAdapter } = useAdapter();

updateSettings(lang.value || "ru", langs.value || {});

const videoContainer = ref<HTMLDivElement | null>(null);
const midContainer = ref<HTMLDivElement | null>(null);
const videoElement = ref<HTMLVideoElement | null>(null);
const onFirstPlay = ref(false);
let timeout_of_progress: ReturnType<typeof setTimeout>;
let time_out_of_overlay: ReturnType<typeof setTimeout>;
let changeVideoTimeOnClick_timer: ReturnType<typeof setTimeout>;
let changeVideoVolumeOnClick_timer: ReturnType<typeof setTimeout>;
let paused_timer: ReturnType<typeof setTimeout>;
let url_refresh_timer: ReturnType<typeof setTimeout>;
let startTime = 0,
  endTime = 0;
let hls: Hls | null = null;

const params: IPlayerParams = reactive({
  loading: false,
  paused: true,
  startedTime: 0,
  currentTime: 0,
  duration: 0,
  canPlay: 0,
  startedTimeOnProgress: 0,
  endedTimeOnProgress: 0,
  beforeStartTimeOnProgress: 0,
  totalRewindTime: 0,
  totalWatchedTime: 0,
  volume: 0.5,
  fullScreen: false,
  activeLevel: -1,
  activeTrack: 0,
  audioTracks: [],
  levels: [],
  isSettings: false,
  isProgressive: false,
  volumeShowed: false,
  changingVideoTime: false,
  pausedBeforePause: false,
  overlay: false,
  secondaryActiveLevel: null,
  secondaryActiveTrack: null,

  activeCaption: null,
  captions: null,
  activeCue: "",
  activeChunk: null,
  isCue: false,
  secondaryActiveCaption: null,
});

const launchVideo = () => {
  if (videoElement.value) {
    params.loading = true;
    if (Hls.isSupported()) {
      if (props.customHls) {
        hls = props.customHls;
      } else {
        hls = new Hls({
          debug: false,
          lowLatencyMode: true,
          enableWorker: false,
          maxBufferSize: 10 * 1000 * 1000,
          startLevel: 0,
          autoStartLoad: !props.disabledFirstLoad,
          ...props.config,
        });
      }

      if (hls) {
        hls.attachMedia(videoElement.value);
        new Promise(() => {
          if (hls) {
            hls.loadSource(props.url);
            if (props.canAutoPlay) {
              videoElement.value?.play();
            }
          }
        }).then(() => {
          params.loading = false;
        });

        setTimeout(() => {
          getVideoParams();
        }, 0);
      }
    } else if (
      videoElement.value.canPlayType("application/vnd.apple.mpegurl")
    ) {
      videoElement.value.src = props.url;
    } else {
      videoElement.value.src = props.url;
    }
  }
};

const getVideoParams = async () => {
  if (hls) {
    hls.on(Hls.Events.MANIFEST_PARSED, async () => {
      setTimeout(async () => {
        if (hls?.audioTracks) {
          params.audioTracks = hls?.audioTracks;
        }
        if (hls?.levels) {
          const levels = [];
          levels.push(...hls.levels);

          params.levels = levels.sort((a, b) => {
            if (a.height < b.height) {
              return 1;
            }
            if (a.height > b.height) {
              return -1;
            }
            return 0;
          });

          let activeLevel = await getAdapter("splay:level");
          params.levels[JSON.parse(activeLevel)]
            ? setLevel(
                params.levels[JSON.parse(activeLevel)],
                JSON.parse(activeLevel)
              )
            : setLevel(null, -1);
        }

        if (hls) {
          hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, async () => {
            if (hls) {
              params.activeTrack = hls?.audioTrack;
            }
          });
        }

        if (videoElement.value) {
          params.captions = videoElement.value.textTracks;
          let cur_sub = await getAdapter("sleeply:caption");
          if (params.captions)
            for (let i = 0; i < params.captions?.length; i++) {
              if (params.captions[i].language === cur_sub) {
                setCap(i);
              } else {
                setCap(-1);
              }
            }
        }
      });
    });
    hls.on(Hls.Events.FRAG_CHANGED, function (_, data) {
      params.activeChunk = data.frag;
      emits("getActiveChunk", params);
    });
  }
};

const videoTimeUpdate = () => {
  try {
    if (videoElement.value && videoElement.value.duration > 0) {
      params.loading = false;
      params.currentTime = videoElement.value.currentTime;
      params.duration = videoElement.value.duration;
      if (!videoElement.value.paused) {
        const currentTime = new Date().getTime();
        params.totalWatchedTime += (currentTime - startTime) / 1000;
        startTime = currentTime;
      }

      if (videoElement.value.buffered && videoElement.value.buffered.length) {
        for (let d_i = 0; d_i < videoElement.value.buffered.length; d_i++) {
          if (
            videoElement.value.buffered.start(
              videoElement.value.buffered.length - 1 - d_i
            ) < videoElement.value.currentTime
          ) {
            params.canPlay =
              videoElement.value.buffered.end(
                videoElement.value.buffered.length - 1 - d_i
              ) / videoElement.value.duration;
            break;
          }
        }

        emits("canPlay", params.canPlay, "canPlay");
      }

      if (videoElement.value.readyState !== 4) {
        checkLoad();
      }

      emits("videoTimeChanged", params, "videoTimeUpdated");
    }
  } catch (e) {
    params.loading = true;
  }
};

const checkLoad = () => {
  if (timeout_of_progress) clearTimeout(timeout_of_progress);
  timeout_of_progress = setTimeout(() => {
    if (videoElement.value) {
      if (videoElement.value.readyState >= 3) {
        params.loading = false;
      } else {
        params.loading = true;
      }
    }
  }, 10);
};

const clickCounter = ref(0);
const playPause = () => {
  // if(event){event.stopImmediatePropagation()}
  if (videoElement.value) {
    if (params.overlay) {
      params.overlay = false;
      clickCounter.value++;
      handleOverlay();
    } else {
      handleOverlay();
      videoElement.value.paused
        ? videoElement.value.play()
        : videoElement.value.pause();
      clickCounter.value = 0;
      if (hls && !hls.config.autoStartLoad) {
        hls.startLoad();
      }
      if (!onFirstPlay.value && !videoElement.value.paused) {
        onFirstPlay.value = true;
        params.startedTime = videoElement.value.currentTime;
        emits("started", params, "started");
      }
    }
  }
};

const updateVolume = () => {
  if (videoElement.value) {
    videoElement.value.volume = params.volume;
    setAdapter("sleeply-volume", params.volume == 0 ? "muted" : params.volume);
    emits("changeVolume", params, "changeVolume");
  }
};

const setPictureInPicture = () => {
  if (videoElement.value) {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
      videoElement.value.removeEventListener("leavepictureinpicture", exitPip);
    } else if (document.pictureInPictureEnabled) {
      videoElement.value.requestPictureInPicture();
      videoElement.value.addEventListener("leavepictureinpicture", exitPip);
    }

    emits("setPip");
  }
};

const exitPip = () => {
  emits("exitPip", "exitPip");
  if (paused_timer) clearTimeout(paused_timer);
  paused_timer = setTimeout(() => {
    if (
      videoElement.value &&
      videoElement.value.paused &&
      !props.stopOnUnFocus
    ) {
      playPause();
    }
  }, 500);
};

const handleFullScreen = () => {
  emits("handleFullScreen", params, "handleFullScreen");
  if (isMobile.iOS()) {
    if (videoElement.value) {
      videoElement.value.removeAttribute("playsinline");
      videoElement.value.pause();
      playPause();
    }
    if (videoElement.value) {
      videoElement.value.setAttribute("playsinline", "true");
      playPause();
      videoElement.value.play();
    }
    return;
  }

  params.fullScreen = !params.fullScreen;
  if (params.fullScreen) {
    if (videoContainer.value) {
      if (videoContainer.value.requestFullscreen) {
        videoContainer.value.requestFullscreen();
        // @ts-ignore
      } else if (videoInject.videoContainer.webkitRequestFullscreen) {
        // @ts-ignore
        videoInject.videoContainer.webkitRequestFullscreen();
        // @ts-ignore
      } else if (videoInject?.videoContainer.msRequestFullscreen) {
        // @ts-ignore
        videoInject?.videoContainer.msRequestFullscreen();
      }
    }
    if (screen) {
      // @ts-ignore
      window.screen.orientation["lock"]("landscape-primary")
        .then(() => {})
        .catch(function () {
          return;
        });
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      // @ts-ignore
    } else if (document.mozCancelFullScreen) {
      // @ts-ignore
      document.mozCancelFullScreen();
      // @ts-ignore
    } else if (document.webkitExitFullscreen) {
      // @ts-ignore
      document.webkitExitFullscreen();
      // @ts-ignore
    } else if (document.msExitFullscreen) {
      // @ts-ignore
      document.msExitFullscreen();
    }
  }
};

const updateIsSettings = (val: boolean) => {
  params.isSettings = val;
  if (videoElement.value) {
    if (val) {
      params.pausedBeforePause = false;
      detectIsPausedBeforePause();
      videoElement.value.pause();
    } else {
      if (params.pausedBeforePause) {
        videoElement.value.play();
        params.pausedBeforePause = false;
      }
    }
  }
};

const handleProgressive = (value: boolean, selectedTime: number) => {
  params.isProgressive = value;

  if (!value) {
    if (selectedTime < params.startedTimeOnProgress) {
      emits("progressed", params, "rewindBackward");
    } else if (selectedTime >= params.endedTimeOnProgress) {
      emits("progressed", params, "rewindForward");
    }
  }
  try {
    if (videoElement.value) {
      videoElement.value.currentTime = selectedTime;
    }
  } catch (e) {
    console.log(e);
  }
};

const changeSize = () => {
  emits("changeSize", !props.isShort, "changeSize");
};

const setLevel = (item: any, index: number) => {
  if (hls) {
    if (index == -1) {
      params.activeLevel = -1;
      hls.currentLevel = -1;
      hls.capLevelToPlayerSize = true;
      return;
    }
    const selectedItemIndex = hls.levels.indexOf(
      hls.levels.find((el) => el.height == item) || item
    );
    params.activeLevel = index;
    hls.currentLevel = selectedItemIndex;
  }
};

const setTrack = (index: number) => {
  if (hls) {
    hls.audioTrack = index;
    params.activeTrack = index;
    setAdapter("sleeply-track", index);
  }
};
const setCap = (index: number) => {
  params.activeCaption = index;
  if (hls) {
    if (params.activeCaption !== -1) {
      hls.subtitleTrack = index;
      params.isCue = true;
      getMediaText(index);
      if (params.captions) {
        setAdapter("sleeply:caption", params.captions[index].language);
      }
    } else {
      params.isCue = false;
      killAdapter("sleeply:caption");
    }
  }
};
const getMediaText = (value: number) => {
  if (params.captions) {
    const mainTrack = params.captions[value];
    params.activeCue = "";
    mainTrack.oncuechange = function () {
      params.activeCue = "";
      if (mainTrack.activeCues) {
        for (let i = 0; i < mainTrack.activeCues?.length; i++) {
          // @ts-ignore
          let cue = mainTrack.activeCues[i].getCueAsHTML().textContent;
          params.activeCue = cue;
        }
      }
    };
  }
};

const detectIsPausedBeforePause = () => {
  if (videoElement.value && !videoElement.value.paused) {
    params.pausedBeforePause = true;
    videoElement.value.pause();
  }
};

const playerProvides: IPlayerProvider = {
  videoElement: videoElement.value,
  playPause: playPause,
  params: params,
  setLevel: setLevel,
  setTrack: setTrack,
  handleProgressive: handleProgressive,
  detectIsPausedBeforePause: detectIsPausedBeforePause,
  setCaption: setCap,
  videoContainer: videoContainer.value,
};

provide("videoPlayer", playerProvides);

const handleOverlay = () => {
  if (time_out_of_overlay) clearTimeout(time_out_of_overlay);
  params.overlay = false;
  time_out_of_overlay = setTimeout(() => {
    if (params.isProgressive || params.volumeShowed || params.isSettings)
      return;
    if (videoElement.value && videoElement.value.paused) return;
    params.overlay = true;
  }, 2000);
};

const checkToMobileBeforeAction = (cb: any, event?: Event) => {
  if (event) {
    event.stopImmediatePropagation();
  }

  if (params.overlay) {
    params.overlay = false;
    clickCounter.value++;
    handleOverlay();
  } else {
    if (cb) {
      return cb();
    }
    return cb;
  }
};

const rewindForward = () => {
  if (videoElement.value) {
    params.isProgressive = true;
    params.currentTime += 10;
    videoElement.value.currentTime += 10;
    changeVideoTimeOnClick();
    emits("progressed", params);
  }
};
const rewindBackward = () => {
  if (videoElement.value) {
    params.isProgressive = true;
    params.currentTime -= 10;
    videoElement.value.currentTime -= 10;
    changeVideoTimeOnClick();
    emits("progressed", params);
  }
};

const changeVideoTimeOnClick = () => {
  if (videoElement.value) {
    detectIsPausedBeforePause();

    if (changeVideoTimeOnClick_timer)
      clearTimeout(changeVideoTimeOnClick_timer);

    changeVideoTimeOnClick_timer = setTimeout(() => {
      if (videoElement.value) {
        if (videoElement.value && params.pausedBeforePause) {
          playPause();
        }
        params.isProgressive = false;
      }
    }, 200);
  }
};

const updateValues = () => {
  if (params.secondaryActiveLevel !== null) {
    setLevel(
      params.secondaryActiveLevel.text,
      params.secondaryActiveLevel.value
    );
    params.secondaryActiveLevel = null;
  }

  if (params.secondaryActiveTrack != null) {
    setTrack(params.secondaryActiveTrack);
    params.secondaryActiveTrack = null;
  }

  if (params.secondaryActiveCaption != null) {
    setCap(params.secondaryActiveCaption);
    params.secondaryActiveCaption = null;
  }

  params.isSettings = false;
};

let audio_vol;
const handleKeyController = (event: KeyboardEvent) => {
  switch (event.code) {
    case "Space":
      playPause();
      return;

    case "ArrowRight":
      return checkToMobileBeforeAction(rewindForward);
    case "ArrowLeft":
      return checkToMobileBeforeAction(rewindBackward);
    case "ArrowUp":
      if (videoElement.value) {
        params.volumeShowed = true;
        params.overlay = false;
        disableScroll();
        audio_vol = videoElement.value.volume;
        if (audio_vol != 1) {
          try {
            videoElement.value.volume = audio_vol + 0.1;
          } catch (err) {
            videoElement.value.volume = 1;
          }

          params.volume = videoElement.value.volume;
        }

        if (changeVideoVolumeOnClick_timer)
          clearTimeout(changeVideoVolumeOnClick_timer);
        changeVideoVolumeOnClick_timer = setTimeout(() => {
          params.volumeShowed = false;
          enableScroll();
          handleOverlay();
        }, 500);
      }
      break;

    case "ArrowDown":
      if (videoElement.value) {
        params.volumeShowed = true;
        params.overlay = false;
        disableScroll();
        audio_vol = videoElement.value.volume;
        if (audio_vol != 0) {
          try {
            videoElement.value.volume = audio_vol - 0.1;
          } catch (err) {
            videoElement.value.volume = 0;
          }

          params.volume = videoElement.value.volume;
        }

        if (changeVideoVolumeOnClick_timer)
          clearTimeout(changeVideoVolumeOnClick_timer);

        changeVideoVolumeOnClick_timer = setTimeout(() => {
          params.volumeShowed = false;
          enableScroll();
          handleOverlay();
        }, 500);
      }
  }
};

const disableScroll = () => {
  // To get the scroll position of current webpage
  let TopScroll = window.pageYOffset || document.documentElement.scrollTop;
  let LeftScroll = window.pageXOffset || document.documentElement.scrollLeft;

  window.onscroll = function () {
    window.scrollTo(LeftScroll, TopScroll);
  };

  document.body.setAttribute("style", "pointer-events: none");
};

const enableScroll = () => {
  window.onscroll = function () {};
  document.body.setAttribute("style", "");
};

watch(
  () => props.changeTimTo,
  (val) => {
    if (val && videoElement.value) {
      videoElement.value.currentTime = val;
    }
  }
);

watch(
  () => params.volume,
  () => {
    updateVolume();
  }
);

watch(
  () => params.isSettings,
  (val) => {
    if (val) {
      if (isMobile.any()) {
        disableScroll();
      }
    } else {
      enableScroll();
    }
  }
);

watch(
  () => props.url,
  () => {
    if (!hls) {
    }
    if (hls) {
      hls.destroy();
      hls.stopLoad();
      hls = null;
    }
    emits("beforeRemovingUrl", params, "ended");
    emits("watchedTime", params, "ended");

    if (url_refresh_timer) clearTimeout(url_refresh_timer);

    url_refresh_timer = setTimeout(() => {
      launchVideo();
      updateVolume();
    }, 1000);
  }
);

defineExpose({
  playPause,
  handleFullScreen,
  setPictureInPicture,
  exitPip,
  disableScroll,
  enableScroll,
  secondsToHms,
  setTrack,
  setLevel,
  changeVideoTimeOnClick,
  updateValues,

  videoElement,
  videoContainer,
  playerProvides,
  params,
  hls,
  midContainer,
  isMobile,
});

if (props.stopOnUnFocus) {
  useEventListener(window, "blur", () => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    }
    if (videoElement.value && !videoElement.value.paused) {
      videoElement.value.pause();
    }
  });
}

useEventListener(videoElement, "play", () => {
  params.paused = false;
  startTime = new Date().getTime();
  emits("playing", params, "playing");
});

useEventListener(videoElement, "ended", () => {
  emits("ended", params, "ended");
  if (videoElement.value) {
    videoElement.value.currentTime = 0;
  }
});

useEventListener(videoElement, "pause", () => {
  params.paused = true;
  params.overlay = false;
  endTime = new Date().getTime();
  params.totalWatchedTime += (endTime - startTime) / 1000;
  emits("paused", params, "pause");
});

useEventListener(window, "scroll", () => {
  if (videoElement.value && props.stopOnUnFocus) {
    if (window.scrollY > videoElement.value.offsetHeight / 2) {
      videoElement.value.pause();
    }
  }
});

if (isMobile.any()) {
  useEventListener(videoContainer, "touchmove", handleOverlay);
  useEventListener(midContainer, "click", function (event: Event) {
    checkToMobileBeforeAction(playPause, event);
  });
} else {
  useEventListener(videoContainer, "mousemove", handleOverlay);
  useEventListener(midContainer, "click", function (event: Event) {
    checkToMobileBeforeAction(playPause, event);
  });
}

onMounted(() => {
  launchVideo();
  updateVolume();
  playerProvides.videoElement = videoElement.value;
  playerProvides.videoContainer = videoContainer.value;
  window.addEventListener("click", (event) => {
    if (
      videoContainer.value &&
      event.composedPath().includes(videoContainer.value)
    ) {
      window.addEventListener("keydown", handleKeyController);
    } else {
      window.removeEventListener("keydown", handleKeyController);
    }
  });
});

watch(
  () => window.location.pathname,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      if (hls) {
        hls.destroy();
        hls.stopLoad();
        hls = null;
      }
      emits("watchedTime", params, "ended");
    }
  }
);

// onBeforeRouteLeave(() => {
//   if (hls) {
//     hls.destroy();
//     hls.stopLoad();
//     hls = null;
//   }
//   emits("watchedTime", params, "ended");
//   emits("exit", params, "exit");
// });

onBeforeUnmount(() => {
  startTime = 0;
  endTime = 0;
  emits("exit", params, "exit");
  // emits("watchedTime", params, "ended");
});
</script>

<template>
  <div
    class="sleeply-player"
    ref="videoContainer"
    id="player"
    :class="{
      playing: !params.paused,
    }"
  >
    <div
      class="video-element"
      :class="{
        long: !!isShort,
      }"
    >
      <div class="video-element-container">
        <video
          ref="videoElement"
          @progress="videoTimeUpdate"
          @timeupdate="videoTimeUpdate"
          @waiting="checkLoad"
          @canplay="checkLoad"
          @loadedmetadata="emits('loadedMetaData', $event)"
          playsinline
          :muted="params.volume == 0"
          :poster="poster"
        ></video>
      </div>
    </div>
    <slot name="loader" :params="params">
      <Loader v-if="params.loading" />
    </slot>
    <div
      class="interface"
      :class="{
        hovered: !params.overlay,
      }"
    >
      <slot name="top-controller">
        <div class="top"></div>
      </slot>
      <slot name="mid" :ref="midContainer">
        <div class="mid" ref="midContainer">
          <PlBtn class="play-icon" v-if="params.paused && !isMobile.any()">
            <div class="play-icon-size">
              <slot name="paused-big-icon">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 32V50.5787C8 56.7387 14.7573 60.6293 20.2587 57.64L28.8 52.9947M8 21.3333V13.4213C8 7.26134 14.7573 3.37067 20.2587 6.36001L54.424 24.9413C55.7048 25.6224 56.7761 26.6392 57.5232 27.8826C58.2703 29.1261 58.665 30.5494 58.665 32C58.665 33.4506 58.2703 34.8739 57.5232 36.1174C56.7761 37.3608 55.7048 38.3776 54.424 39.0587L37.3413 48.3493"
                    stroke="currentColor"
                    stroke-width="6"
                    stroke-linecap="round"
                  />
                </svg>
              </slot>
            </div>
          </PlBtn>
          <div
            class="mobile-controller"
            :class="{
              hovered: !params.overlay,
            }"
            v-if="isMobile.any()"
          >
            <PlBtn
              class="large-icon-size"
              @click="checkToMobileBeforeAction(rewindBackward, $event)"
            >
              <div class="large-icon-size-inner">
                <slot name="rewindBackward">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M11.0198 2.04817C13.3222 1.8214 15.6321 2.39998 17.5557 3.68532C19.4794 4.97066 20.8978 6.88324 21.5694 9.09717C22.241 11.3111 22.1242 13.6894 21.2388 15.8269C20.3534 17.9643 18.7543 19.7286 16.714 20.8192C14.6736 21.9098 12.3182 22.2592 10.0491 21.8079C7.77999 21.3565 5.73759 20.1323 4.26989 18.3439C2.80219 16.5555 2 14.3136 2 12L0 12C-2.74181e-06 14.7763 0.962627 17.4666 2.72387 19.6127C4.48511 21.7588 6.93599 23.2278 9.65891 23.7694C12.3818 24.3111 15.2083 23.8918 17.6568 22.5831C20.1052 21.2744 22.0241 19.1572 23.0866 16.5922C24.149 14.0273 24.2892 11.1733 23.4833 8.51661C22.6774 5.85989 20.9752 3.56479 18.6668 2.02238C16.3585 0.479973 13.5867 -0.214321 10.8238 0.0578004C8.71195 0.265799 6.70517 1.02858 5 2.2532V1H3V5C3 5.55228 3.44772 6 4 6H8V4H5.99999C7.45608 2.90793 9.19066 2.22833 11.0198 2.04817ZM2 4V7H5V9H1C0.447715 9 0 8.55228 0 8V4H2ZM14.125 16C13.5466 16 13.0389 15.8586 12.6018 15.5758C12.1713 15.2865 11.8385 14.8815 11.6031 14.3609C11.3677 13.8338 11.25 13.2135 11.25 12.5C11.25 11.7929 11.3677 11.1758 11.6031 10.6488C11.8385 10.1217 12.1713 9.71671 12.6018 9.43388C13.0389 9.14463 13.5466 9 14.125 9C14.7034 9 15.2077 9.14463 15.6382 9.43388C16.0753 9.71671 16.4116 10.1217 16.6469 10.6488C16.8823 11.1758 17 11.7929 17 12.5C17 13.2135 16.8823 13.8338 16.6469 14.3609C16.4116 14.8815 16.0753 15.2865 15.6382 15.5758C15.2077 15.8586 14.7034 16 14.125 16ZM14.125 14.6501C14.5151 14.6501 14.8211 14.4637 15.043 14.0909C15.2649 13.7117 15.3759 13.1814 15.3759 12.5C15.3759 11.8186 15.2649 11.2916 15.043 10.9187C14.8211 10.5395 14.5151 10.3499 14.125 10.3499C13.7349 10.3499 13.4289 10.5395 13.207 10.9187C12.9851 11.2916 12.8741 11.8186 12.8741 12.5C12.8741 13.1814 12.9851 13.7117 13.207 14.0909C13.4289 14.4637 13.7349 14.6501 14.125 14.6501ZM8.60395 15.8554V10.7163L7 11.1405V9.81956L10.1978 9.01928V15.8554H8.60395Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </slot>
              </div>
            </PlBtn>
            <PlBtn class="large-icon-size">
              <div class="large-icon-size-inner">
                <template v-if="params.paused">
                  <slot name="mobile-mid-pause">
                    <svg
                      width="15"
                      height="18"
                      viewBox="0 0 15 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        data-v-ebb1e6b8=""
                        d="M2.25926 17.7498C1.76543 18.0644 1.26519 18.0823 0.758519 17.8035C0.25284 17.5256 0 17.0963 0 16.5154V1.48502C0 0.904131 0.25284 0.474277 0.758519 0.195453C1.26519 -0.0824035 1.76543 -0.0640087 2.25926 0.250637L14.3333 7.76583C14.7778 8.05627 15 8.46773 15 9.00021C15 9.53268 14.7778 9.94414 14.3333 10.2346L2.25926 17.7498Z"
                        fill="white"
                      ></path>
                    </svg>
                  </slot>
                </template>
                <template v-else>
                  <slot name="playIcon">
                    <svg
                      width="16"
                      height="20"
                      viewBox="0 0 16 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2.66667 19.3337C4.13333 19.3337 5.33333 18.1337 5.33333 16.667V3.33366C5.33333 1.86699 4.13333 0.666992 2.66667 0.666992C1.2 0.666992 0 1.86699 0 3.33366V16.667C0 18.1337 1.2 19.3337 2.66667 19.3337ZM10.6667 3.33366V16.667C10.6667 18.1337 11.8667 19.3337 13.3333 19.3337C14.8 19.3337 16 18.1337 16 16.667V3.33366C16 1.86699 14.8 0.666992 13.3333 0.666992C11.8667 0.666992 10.6667 1.86699 10.6667 3.33366Z"
                        fill="currentColor"
                      />
                    </svg>
                  </slot>
                </template>
              </div>
            </PlBtn>
            <PlBtn
              class="large-icon-size"
              @click="checkToMobileBeforeAction(rewindForward, $event)"
            >
              <div class="large-icon-size-inner">
                <slot name="rewindForward">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M6.4443 3.68532C8.36795 2.39998 10.6778 1.8214 12.9802 2.04817C14.8093 2.22833 16.5439 2.90793 18 4H16V6H20C20.5523 6 21 5.55229 21 5V1H19V2.2532C17.2948 1.02859 15.2881 0.2658 13.1762 0.057802C10.4133 -0.214319 7.64154 0.479975 5.33316 2.02238C3.02478 3.56479 1.32262 5.85989 0.516718 8.51661C-0.289188 11.1733 -0.148981 14.0273 0.913451 16.5922C1.97588 19.1572 3.8948 21.2744 6.34325 22.5831C8.79169 23.8918 11.6182 24.3111 14.3411 23.7694C17.064 23.2278 19.5149 21.7588 21.2761 19.6127C23.0374 17.4666 24 14.7763 24 12L22 12C22 14.3136 21.1978 16.5555 19.7301 18.3439C18.2624 20.1323 16.22 21.3565 13.9509 21.8079C11.6818 22.2592 9.32641 21.9098 7.28604 20.8192C5.24567 19.7286 3.64657 17.9643 2.76121 15.8269C1.87585 13.6894 1.75901 11.3111 2.4306 9.09718C3.10219 6.88324 4.52065 4.97067 6.4443 3.68532ZM22 4V7H19V9H23C23.5523 9 24 8.55229 24 8V4H22ZM12.6018 15.5758C13.0389 15.8586 13.5466 16 14.125 16C14.7034 16 15.2078 15.8586 15.6382 15.5758C16.0753 15.2865 16.4116 14.8815 16.6469 14.3609C16.8823 13.8338 17 13.2135 17 12.5C17 11.7929 16.8823 11.1759 16.6469 10.6488C16.4116 10.1217 16.0753 9.71671 15.6382 9.43389C15.2078 9.14463 14.7034 9 14.125 9C13.5466 9 13.0389 9.14463 12.6018 9.43389C12.1713 9.71671 11.8385 10.1217 11.6031 10.6488C11.3677 11.1759 11.25 11.7929 11.25 12.5C11.25 13.2135 11.3677 13.8338 11.6031 14.3609C11.8385 14.8815 12.1713 15.2865 12.6018 15.5758ZM15.043 14.0909C14.8211 14.4637 14.5151 14.6501 14.125 14.6501C13.7349 14.6501 13.429 14.4637 13.207 14.0909C12.9851 13.7117 12.8741 13.1814 12.8741 12.5C12.8741 11.8186 12.9851 11.2916 13.207 10.9187C13.429 10.5395 13.7349 10.3499 14.125 10.3499C14.5151 10.3499 14.8211 10.5395 15.043 10.9187C15.2649 11.2916 15.3759 11.8186 15.3759 12.5C15.3759 13.1814 15.2649 13.7117 15.043 14.0909ZM8.60395 10.7163V15.8554H10.1978V9.01929L7 9.81956V11.1405L8.60395 10.7163Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </slot>
              </div>
            </PlBtn>
          </div>
        </div>
      </slot>
      <slot name="bottom-interface">
        <div class="bottom">
          <div class="pass-btn">
            <div class="cue-container" v-if="params.isCue">
              <span class="cue" v-if="params.activeCue">
                {{ params.activeCue }}
              </span>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="progress-bar">
            <PlayerProgressiveBar
              :style="{
                opacity: params.isSettings ? 0 : 1,
                transition: 'all .4s',
                pointerEvents: params.isSettings ? 'none' : 'all',
              }"
            >
              <template #skippedTime>
                <slot name="skippedTime" :params="params"></slot>
              </template>
              <template #watchedTime>
                <slot name="watchedTime" :params="params"></slot>
              </template>
            </PlayerProgressiveBar>

            <div class="video-time" v-if="isMobile.any()">
              <span> {{ secondsToHms(params.currentTime) }} </span>/
              <span> {{ secondsToHms(params.duration) }} </span>
            </div>
          </div>
          <!-- Progress bar -->
          <!-- Play/Pouse 1o sec forward/backward -->
          <div class="bottom-controls">
            <slot name="bottom-controls-left-collar">
              <div class="left-collapse" v-if="!isMobile.any()">
                <slot name="prev"></slot>
                <PlBtn
                  class="icon-size"
                  @click="checkToMobileBeforeAction(rewindBackward)"
                  v-if="!isMobile.any()"
                >
                  <slot
                    name="rewindBackWard"
                    :changeVideoTimeOnClick="changeVideoTimeOnClick"
                  >
                    <div class="icon-size-inner">
                      <slot name="rewindBack">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M11.0198 2.04817C13.3222 1.8214 15.6321 2.39998 17.5557 3.68532C19.4794 4.97066 20.8978 6.88324 21.5694 9.09717C22.241 11.3111 22.1242 13.6894 21.2388 15.8269C20.3534 17.9643 18.7543 19.7286 16.714 20.8192C14.6736 21.9098 12.3182 22.2592 10.0491 21.8079C7.77999 21.3565 5.73759 20.1323 4.26989 18.3439C2.80219 16.5555 2 14.3136 2 12L0 12C-2.74181e-06 14.7763 0.962627 17.4666 2.72387 19.6127C4.48511 21.7588 6.93599 23.2278 9.65891 23.7694C12.3818 24.3111 15.2083 23.8918 17.6568 22.5831C20.1052 21.2744 22.0241 19.1572 23.0866 16.5922C24.149 14.0273 24.2892 11.1733 23.4833 8.51661C22.6774 5.85989 20.9752 3.56479 18.6668 2.02238C16.3585 0.479973 13.5867 -0.214321 10.8238 0.0578004C8.71195 0.265799 6.70517 1.02858 5 2.2532V1H3V5C3 5.55228 3.44772 6 4 6H8V4H5.99999C7.45608 2.90793 9.19066 2.22833 11.0198 2.04817ZM2 4V7H5V9H1C0.447715 9 0 8.55228 0 8V4H2ZM14.125 16C13.5466 16 13.0389 15.8586 12.6018 15.5758C12.1713 15.2865 11.8385 14.8815 11.6031 14.3609C11.3677 13.8338 11.25 13.2135 11.25 12.5C11.25 11.7929 11.3677 11.1758 11.6031 10.6488C11.8385 10.1217 12.1713 9.71671 12.6018 9.43388C13.0389 9.14463 13.5466 9 14.125 9C14.7034 9 15.2077 9.14463 15.6382 9.43388C16.0753 9.71671 16.4116 10.1217 16.6469 10.6488C16.8823 11.1758 17 11.7929 17 12.5C17 13.2135 16.8823 13.8338 16.6469 14.3609C16.4116 14.8815 16.0753 15.2865 15.6382 15.5758C15.2077 15.8586 14.7034 16 14.125 16ZM14.125 14.6501C14.5151 14.6501 14.8211 14.4637 15.043 14.0909C15.2649 13.7117 15.3759 13.1814 15.3759 12.5C15.3759 11.8186 15.2649 11.2916 15.043 10.9187C14.8211 10.5395 14.5151 10.3499 14.125 10.3499C13.7349 10.3499 13.4289 10.5395 13.207 10.9187C12.9851 11.2916 12.8741 11.8186 12.8741 12.5C12.8741 13.1814 12.9851 13.7117 13.207 14.0909C13.4289 14.4637 13.7349 14.6501 14.125 14.6501ZM8.60395 15.8554V10.7163L7 11.1405V9.81956L10.1978 9.01928V15.8554H8.60395Z"
                            fill="currentColor"
                          ></path>
                        </svg>
                      </slot>
                    </div>
                  </slot>
                </PlBtn>
                <PlBtn
                  class="icon-size"
                  @click="checkToMobileBeforeAction(playPause, $event)"
                  v-if="!isMobile.any()"
                >
                  <div class="icon-size-inner">
                    <slot
                      name="playPause"
                      :playPause="playPause"
                      :params="params"
                    >
                      <template v-if="params.paused">
                        <slot name="pauseIcon">
                          <svg
                            width="15"
                            height="18"
                            viewBox="0 0 15 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              data-v-ebb1e6b8=""
                              d="M2.25926 17.7498C1.76543 18.0644 1.26519 18.0823 0.758519 17.8035C0.25284 17.5256 0 17.0963 0 16.5154V1.48502C0 0.904131 0.25284 0.474277 0.758519 0.195453C1.26519 -0.0824035 1.76543 -0.0640087 2.25926 0.250637L14.3333 7.76583C14.7778 8.05627 15 8.46773 15 9.00021C15 9.53268 14.7778 9.94414 14.3333 10.2346L2.25926 17.7498Z"
                              fill="white"
                            ></path>
                          </svg>
                        </slot>
                      </template>
                      <template v-else>
                        <slot name="playIcon">
                          <svg
                            width="16"
                            height="20"
                            viewBox="0 0 16 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M2.66667 19.3337C4.13333 19.3337 5.33333 18.1337 5.33333 16.667V3.33366C5.33333 1.86699 4.13333 0.666992 2.66667 0.666992C1.2 0.666992 0 1.86699 0 3.33366V16.667C0 18.1337 1.2 19.3337 2.66667 19.3337ZM10.6667 3.33366V16.667C10.6667 18.1337 11.8667 19.3337 13.3333 19.3337C14.8 19.3337 16 18.1337 16 16.667V3.33366C16 1.86699 14.8 0.666992 13.3333 0.666992C11.8667 0.666992 10.6667 1.86699 10.6667 3.33366Z"
                              fill="currentColor"
                            />
                          </svg>
                        </slot>
                      </template>
                    </slot>
                  </div>
                </PlBtn>
                <PlBtn
                  class="icon-size"
                  @click="checkToMobileBeforeAction(rewindForward)"
                  v-if="!isMobile.any()"
                >
                  <div class="icon-size-inner">
                    <slot name="rewindForward" :params="params">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M6.4443 3.68532C8.36795 2.39998 10.6778 1.8214 12.9802 2.04817C14.8093 2.22833 16.5439 2.90793 18 4H16V6H20C20.5523 6 21 5.55229 21 5V1H19V2.2532C17.2948 1.02859 15.2881 0.2658 13.1762 0.057802C10.4133 -0.214319 7.64154 0.479975 5.33316 2.02238C3.02478 3.56479 1.32262 5.85989 0.516718 8.51661C-0.289188 11.1733 -0.148981 14.0273 0.913451 16.5922C1.97588 19.1572 3.8948 21.2744 6.34325 22.5831C8.79169 23.8918 11.6182 24.3111 14.3411 23.7694C17.064 23.2278 19.5149 21.7588 21.2761 19.6127C23.0374 17.4666 24 14.7763 24 12L22 12C22 14.3136 21.1978 16.5555 19.7301 18.3439C18.2624 20.1323 16.22 21.3565 13.9509 21.8079C11.6818 22.2592 9.32641 21.9098 7.28604 20.8192C5.24567 19.7286 3.64657 17.9643 2.76121 15.8269C1.87585 13.6894 1.75901 11.3111 2.4306 9.09718C3.10219 6.88324 4.52065 4.97067 6.4443 3.68532ZM22 4V7H19V9H23C23.5523 9 24 8.55229 24 8V4H22ZM12.6018 15.5758C13.0389 15.8586 13.5466 16 14.125 16C14.7034 16 15.2078 15.8586 15.6382 15.5758C16.0753 15.2865 16.4116 14.8815 16.6469 14.3609C16.8823 13.8338 17 13.2135 17 12.5C17 11.7929 16.8823 11.1759 16.6469 10.6488C16.4116 10.1217 16.0753 9.71671 15.6382 9.43389C15.2078 9.14463 14.7034 9 14.125 9C13.5466 9 13.0389 9.14463 12.6018 9.43389C12.1713 9.71671 11.8385 10.1217 11.6031 10.6488C11.3677 11.1759 11.25 11.7929 11.25 12.5C11.25 13.2135 11.3677 13.8338 11.6031 14.3609C11.8385 14.8815 12.1713 15.2865 12.6018 15.5758ZM15.043 14.0909C14.8211 14.4637 14.5151 14.6501 14.125 14.6501C13.7349 14.6501 13.429 14.4637 13.207 14.0909C12.9851 13.7117 12.8741 13.1814 12.8741 12.5C12.8741 11.8186 12.9851 11.2916 13.207 10.9187C13.429 10.5395 13.7349 10.3499 14.125 10.3499C14.5151 10.3499 14.8211 10.5395 15.043 10.9187C15.2649 11.2916 15.3759 11.8186 15.3759 12.5C15.3759 13.1814 15.2649 13.7117 15.043 14.0909ZM8.60395 10.7163V15.8554H10.1978V9.01929L7 9.81956V11.1405L8.60395 10.7163Z"
                          fill="currentColor"
                        ></path>
                      </svg>
                    </slot>
                  </div>
                </PlBtn>
                <slot name="next"></slot>
                <PlBtn
                  class="volume"
                  :class="{
                    show: params.volumeShowed,
                  }"
                  v-if="!isMobile.any()"
                  @mousemove="
                    () => {
                      disableScroll();
                    }
                  "
                  @mouseleave="
                    () => {
                      enableScroll();
                    }
                  "
                >
                  <div class="icon-size volume-icon">
                    <slot
                      name="volume-icon"
                      :updateVolume="updateVolume"
                      :params="params"
                    >
                      <div class="icon-size-inner">
                        <svg
                          v-if="params.volume != 0 || !videoElement?.muted"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          class="ltr-4z3qvp e1svuwfo1"
                          data-name="VolumeHigh"
                          aria-hidden="true"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M24 12C24 8.28693 22.525 4.72597 19.8995 2.10046L18.4853 3.51468C20.7357 5.76511 22 8.81736 22 12C22 15.1826 20.7357 18.2348 18.4853 20.4852L19.8995 21.8995C22.525 19.2739 24 15.713 24 12ZM11 3.99995C11 3.59549 10.7564 3.23085 10.3827 3.07607C10.009 2.92129 9.57889 3.00685 9.29289 3.29285L4.58579 7.99995H1C0.447715 7.99995 0 8.44767 0 8.99995V15C0 15.5522 0.447715 16 1 16H4.58579L9.29289 20.7071C9.57889 20.9931 10.009 21.0786 10.3827 20.9238C10.7564 20.7691 11 20.4044 11 20V3.99995ZM5.70711 9.70706L9 6.41417V17.5857L5.70711 14.2928L5.41421 14H5H2V9.99995H5H5.41421L5.70711 9.70706ZM16.0001 12C16.0001 10.4087 15.368 8.88254 14.2428 7.75732L12.8285 9.17154C13.5787 9.92168 14.0001 10.9391 14.0001 12C14.0001 13.0608 13.5787 14.0782 12.8285 14.8284L14.2428 16.2426C15.368 15.1174 16.0001 13.5913 16.0001 12ZM17.0709 4.92889C18.9462 6.80426 19.9998 9.3478 19.9998 12C19.9998 14.6521 18.9462 17.1957 17.0709 19.071L15.6567 17.6568C17.157 16.1565 17.9998 14.1217 17.9998 12C17.9998 9.87823 17.157 7.8434 15.6567 6.34311L17.0709 4.92889Z"
                            fill="currentColor"
                          ></path>
                        </svg>
                        <svg
                          v-if="params.volume == 0 || videoElement?.muted"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          class="ltr-4z3qvp e1svuwfo1"
                          data-name="VolumeOff"
                          aria-hidden="true"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M11 4.00003C11 3.59557 10.7564 3.23093 10.3827 3.07615C10.009 2.92137 9.57889 3.00692 9.29289 3.29292L4.58579 8.00003H1C0.447715 8.00003 0 8.44774 0 9.00003V15C0 15.5523 0.447715 16 1 16H4.58579L9.29289 20.7071C9.57889 20.9931 10.009 21.0787 10.3827 20.9239C10.7564 20.7691 11 20.4045 11 20V4.00003ZM5.70711 9.70714L9 6.41424V17.5858L5.70711 14.2929L5.41421 14H5H2V10H5H5.41421L5.70711 9.70714ZM15.2929 9.70714L17.5858 12L15.2929 14.2929L16.7071 15.7071L19 13.4142L21.2929 15.7071L22.7071 14.2929L20.4142 12L22.7071 9.70714L21.2929 8.29292L19 10.5858L16.7071 8.29292L15.2929 9.70714Z"
                            fill="currentColor"
                          ></path>
                        </svg>
                      </div>
                    </slot>
                  </div>
                  <slot name="volume-range">
                    <input
                      tabindex="0"
                      @input="updateVolume"
                      v-model="params.volume"
                      min="0"
                      max="1"
                      step="0.01"
                      type="range"
                      :style="{
                        background: `linear-gradient(to right, var(--player-primary) 0% , var(--player-primary) ${
                          params.volume == 0.5 ? 50 : params.volume * 100
                        }%  , var(--player-progressive-bar-background) 0%,var(--player-progressive-bar-background) 100%)`,
                      }"
                    />
                  </slot>
                </PlBtn>
                <div class="video-time">
                  <slot name="video-time" :params="params">
                    <span> {{ secondsToHms(params.currentTime) }} </span>/
                    <span> {{ secondsToHms(params.duration) }} </span>
                  </slot>
                </div>
              </div>
            </slot>
            <slot name="bottom-controls-right-collar">
              <div
                class="right-collapse"
                :class="{
                  touch: isMobile.any(),
                }"
              >
                <PlBtn
                  class="icon-size"
                  v-if="
                    params.audioTracks.length ||
                    params.levels.length ||
                    params.captions
                  "
                  @click="params.isSettings = true"
                >
                  <div class="icon-size-inner">
                    <slot name="settings">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6"
                        />
                      </svg>
                    </slot>
                  </div>
                </PlBtn>
                <PlBtn
                  v-if="showIsPip"
                  class="icon-size"
                  @click="checkToMobileBeforeAction(setPictureInPicture)"
                  slot-name="pip"
                >
                  <div class="icon-size-inner">
                    <slot
                      name="pip"
                      :setPictureInPicture="setPictureInPicture"
                      :params="params"
                    >
                      <svg
                        viewBox="0 0 24 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M18.5455 8.88889H12C11.4 8.88889 10.9091 9.38889 10.9091 10V14.4444C10.9091 15.0556 11.4 15.5556 12 15.5556H18.5455C19.1455 15.5556 19.6364 15.0556 19.6364 14.4444V10C19.6364 9.38889 19.1455 8.88889 18.5455 8.88889ZM24 17.7778V2.2C24 0.977778 23.0182 0 21.8182 0H2.18182C0.981818 0 0 0.977778 0 2.2V17.7778C0 19 0.981818 20 2.18182 20H21.8182C23.0182 20 24 19 24 17.7778ZM20.7273 17.8H3.27273C2.67273 17.8 2.18182 17.3 2.18182 16.6889V3.3C2.18182 2.68889 2.67273 2.18889 3.27273 2.18889H20.7273C21.3273 2.18889 21.8182 2.68889 21.8182 3.3V16.6889C21.8182 17.3 21.3273 17.8 20.7273 17.8Z"
                          fill="currentColor"
                        />
                      </svg>
                    </slot>
                  </div>
                </PlBtn>
                <PlBtn
                  v-if="showIsShort"
                  class="icon-size"
                  @click="checkToMobileBeforeAction(changeSize)"
                >
                  <div class="icon-size-inner">
                    <slot name="size">
                      <svg
                        v-if="isShort"
                        width="80"
                        height="40"
                        viewBox="0 0 80 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M78.0953 3.21631V36.7836H1.90479V3.21631H78.0953ZM9.52383 8.01163H70.4762V31.9882H9.52383V8.01163Z"
                          fill="white"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M78.0953 3.21631V36.7836H1.90479V3.21631H78.0953ZM9.52383 8.01163H70.4762V31.9882H9.52383V8.01163Z"
                          fill="white"
                        />
                      </svg>

                      <svg
                        v-else
                        width="56"
                        height="40"
                        viewBox="0 0 56 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M54.6668 3.21631V36.7836H1.3335V3.21631H54.6668ZM6.66683 8.01163H49.3335V31.9882H6.66683V8.01163Z"
                          fill="white"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M54.6668 3.21631V36.7836H1.3335V3.21631H54.6668ZM6.66683 8.01163H49.3335V31.9882H6.66683V8.01163Z"
                          fill="white"
                        />
                      </svg>
                    </slot>
                  </div>
                </PlBtn>

                <PlBtn
                  v-if="showFullScreen"
                  class="icon-size"
                  @click="checkToMobileBeforeAction(handleFullScreen)"
                >
                  <div class="icon-size-inner">
                    <slot name="fullScreen" :params="params">
                      <slot name="exitedFullScreen"></slot>
                      <svg
                        v-if="params.fullScreen"
                        class="exit-full"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4.07143 19V14.9286H0V12.2143H6.78571V19H4.07143ZM12.2143 19V12.2143H19V14.9286H14.9286V19H12.2143ZM0 6.78571V4.07143H4.07143V0H6.78571V6.78571H0ZM12.2143 6.78571V0H14.9286V4.07143H19V6.78571H12.2143Z"
                          fill="currentColor"
                        />
                      </svg>
                      <svg
                        v-else
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        class="full"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 1H3C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V6M19 6V3C19 2.46957 18.7893 1.96086 18.4142 1.58579C18.0391 1.21071 17.5304 1 17 1H14M14 19H17C17.5304 19 18.0391 18.7893 18.4142 18.4142C18.7893 18.0391 19 17.5304 19 17V14M1 14V17C1 17.5304 1.21071 18.0391 1.58579 18.4142C1.96086 18.7893 2.46957 19 3 19H6"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </slot>
                  </div>
                </PlBtn>
              </div>
            </slot>

            <template v-if="!isMobile.any()">
              <Transition name="fade">
                <SettingsModal
                  v-if="params?.isSettings"
                  @update:is-settings="updateIsSettings"
                />
              </Transition>
            </template>
          </div>
          <!-- Play/Pouse 1o sec forward/backward -->
        </div>
      </slot>
    </div>

    <div class="wing-controls" v-if="isMobile.any()">
      <!-- <div class="wing-controls-content">
        <div class="icon-size">
          <svg
            @click="updateIsSettings(true)"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path
              d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"
            ></path>
            <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"></path>
          </svg>
        </div>
      </div> -->
      <Teleport to="body">
        <Transition name="fade">
          <div class="wing-controls__modal" v-if="params.isSettings">
            <div class="wing-controls__modal-inner">
              <div class="close-icon" @click="updateIsSettings(false)">
                <div class="icon-size">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                    <path d="M18 6l-12 12"></path>
                    <path d="M6 6l12 12"></path>
                  </svg>
                </div>
              </div>
              <Quality
                style="margin-bottom: 1.25rem"
                v-if="params.levels.length"
              />
              <Track v-if="params.audioTracks.length" />
              <Captions v-if="params.captions && params.captions.length" />

              <div class="btns">
                <button
                  class="btn btn-cancel"
                  type="button"
                  @click="updateIsSettings(false)"
                >
                  {{ activeLang?.Cancel || "Cancel" }}
                </button>
                <button
                  class="btn btn-search"
                  type="button"
                  @click="updateValues"
                >
                  {{ activeLang?.Save || "Save" }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>
<style>
::cue {
  font-size: 0;
  opacity: 0;
}
</style>

<style lang="scss">
:root {
  --player-font: "Montserrat", sans-serif;
  --player-primary-background: #141414;
  --player-background: #141414;
  --player-settings-bg: rgba(28, 28, 28, 0.9);
  --player-primary-grey: #8592a3;
  --player-light: #fff;
  --player-light-bg: #fff;
  --player-secondary-light: #ebeef0;
  --player-primary: #05b187;
  --player-progressive-bar-background: rgba(255, 255, 255, 0.2);
  --player-progressive-bar-updated-time: rgba(255, 255, 255, 0.2);
  --player-progressive-bar-skipped-time: rgba(140, 8, 8, 1);
  --player-pm-radius: 1.25em;
  --player-btn-padding: 0.625em 1.25em;
  --player-btn-border-radius: 0.375em;
  --player-border-radius: 0em;
  --player-divider: #999898;

  font-family: var(--player-font);
}

.wing-controls__modal {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100000;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2em;
  font-size: 1.25rem;
  overflow-y: scroll;
  pointer-events: all;
  &-inner {
    display: flex;
    flex-direction: column;
    padding: 1em;
    background: var(--player-light);
    border-radius: var(--player-border-radius);
    flex: 0 0 43.75em;
    width: 100%;
    position: relative;
    z-index: 9999;

    @media screen and (max-width: 996px) {
      flex: 0 0 100%;
    }
    .items {
      width: 100%;
      margin-bottom: 15px;
    }

    .close-icon {
      position: relative;
      display: flex;
      justify-content: center;
      margin-left: auto;
      margin-bottom: 0.625rem;
      align-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: var(--player-btn-border-radius);
      background: var(--player-settings-bg);
      color: var(--player-light);
      cursor: pointer;

      .icon-size {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 1.25rem;
        height: 1.25rem;
        position: relative;
        svg {
          width: 100%;
          height: 100%;
          position: absolute;
          left: 0;
          top: 0;
        }
      }
    }

    .btns {
      display: flex;
      justify-content: space-between;
      gap: 0.3125em;
      margin-top: 1.25em;

      .btn {
        font-size: 1em;
        line-height: 1.2;
        padding: var(--player-btn-padding);
        border-radius: var(--player-btn-border-radius);
        outline: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.625em;
        &-cancel {
          background: var(--player-primary-grey);
          color: var(--player-light);
          transition: background 0.4s;
        }
        &-search {
          background: var(--player-primary);
          color: var(--player-light);
          transition: background 0.4s;
          &:disabled {
            opacity: 0.5;
          }
        }
      }
    }
  }

  @media screen and (orientation: portrait) {
    height: 100vh;
    width: 100vw;
  }

  @media screen and (max-width: 600px) {
    padding: 1em;
    font-size: 1rem;
  }
}
</style>
<style lang="scss">
.sleeply-player {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--player-border-radius);
  overflow: hidden;
  background: var(--player-background);
  outline: transparent;
  border: none;
  outline: none;
  font-size: calc(max(var(--index) * 0.545, 16px));

  @media screen and (max-width: 600px) {
    font-size: calc(max(var(--index) * 0.545, 10px));
  }

  .progress-bar {
    display: flex;
    align-items: center;
    gap: 0.3125rem;
  }

  .video-element {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    width: 100%;
    overflow: hidden;
    border: none;
    outline: none;
    border-radius: var(--player-border-radius);

    &.long {
      width: 75%;
      border-radius: 0;

      video {
        border-radius: 0;
      }
    }
    .video-element-container {
      position: relative;
      height: 0;
      padding-bottom: 56.25%;
      width: 100%;
      margin: 0 auto;
      overflow: hidden;
      border: none;
      outline: none;
    }
    video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--player-background);
      object-fit: cover;
      border: none;
      outline: none;
      border-radius: var(--player-border-radius);
    }
  }

  .wing-controls {
    position: absolute;
    right: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    // .wing-controls-content {
    //   background: var(--player-light);
    //   padding: 0.5em;
    //   top: 10%;
    //   position: absolute;
    //   right: 0;
    //   top: 10%;
    //   width: 2rem;
    //   height: 2rem;
    //   border-top-left-radius: 0.5em;
    //   border-bottom-left-radius: 0.5em;
    //   z-index: 41;
    //   pointer-events: all;
    // }
  }
  .interface {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.4s;
    pointer-events: all;
    background-image: linear-gradient(
      rgb(23, 24, 24) 0%,
      transparent 0%,
      transparent 75%,
      rgb(23, 24, 24) 100%
    );
    opacity: 0;

    .top {
      padding: 1em 2em;
      display: flex;
      justify-content: space-between;
    }

    .mid {
      flex: 1;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;

      .play-icon {
        padding: 0.5em;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;

        .play-icon-size {
          width: 5em;
          height: 5em;
          flex: 0 0 5em;
          position: relative;
          svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
        }
      }
      .mobile-controller {
        display: flex;
        // max-width: 40%;
        width: 80%;
        justify-content: space-between;
        align-items: center;

        .large-icon-size {
          display: flex;
          align-items: center;
          pointer-events: all;
          &-inner {
            width: 5em;
            height: 5em;
            position: relative;
            svg {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
            }
          }

          @media screen and (max-width: 1024px) {
            width: 3em;
            height: 3em;
          }

          @media screen and (max-width: 600px) {
            // width: 2em;
            // height: 2em;
          }
        }

        @media screen and (max-width: 600px) {
          width: 60%;
        }

        @media screen and (orientation: landscape) {
          width: 80%;
        }
      }
    }

    .bottom {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 0.5em 1em;
      gap: 0.3125em;
      // background-image: url(&quot;data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAEYCAYAAACdu5xuAAAAAXNSR0IArs4c6QAAAShJREFUOE9tyGdHhgEARuG3vffee++9954iiSSRRJJIIkkkkSSSSBJJpB+Z05fDo/vDxblDof8Xxi3hpESQEklKFCnRpMSQEktKHCnxpCSQkkhKEinJpKSQAVL5JI2UdFIySMkkJYuUbFJySMklJY+UfFIKSCkkpYiUYlJKyAClfFJGSjkpFaRUklJFSjUpNaTUklJHSj0pDaQ0ktJESjMZoIVPWklpI6WdlA5SOknpIqWblB5SeknpI6WflAFSBkkZImWYDDDCJ6OkjJEyTsoEKZOkTJEyTcoMKbOkzJEyT8oCKYukLJF/LMMKrMIarMMGbMIWbMMO7MIe7MMBHMIRHMMJnMIZnMMFXMIVXMMN3MId3MMDPMITPMMLvMIbvMMHfMIXfMPPL6qhOAH0qu4XAAAAAElFTkSuQmCC&quot;);
      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        pointer-events: none;
        flex: 0 0 100%;
      }
      .pass-btn {
        display: flex;
        justify-content: space-between;
        .end {
          margin-left: auto;
        }
        .skip {
          margin-right: auto;
        }
        :deep() .btn {
          width: auto;
        }

        .cue-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-left: auto;
          margin-right: auto;
          color: var(--player-light);
          .cue {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 0.5rem;
            border-radius: 1.5rem;
            transition: all 0.4s ease;
            background: var(--player-primary-background);
          }
        }
      }

      &-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        .left-collapse {
          display: flex;
          align-items: center;
          // gap: 10px;
        }
        .right-collapse {
          display: flex;
          align-items: center;
          @media screen and (max-width: 1336px) {
            .icon-size {
              &-inner {
                width: 2em;
                height: 2em;
              }
            }

            &.touch {
              justify-content: flex-end;
              width: 100%;
            }
          }
          @media screen and (max-width: 600px) {
            // justify-content: space-between;
            .icon-size {
              &-inner {
                width: 1.5em;
                height: 1.5em;
              }
            }
          }
        }
      }
      .icon-size {
        display: flex;
        justify-content: center;
        align-items: center;
        // background: rgba(255, 255, 255, 0.2);
        padding: 0.5em;
        border-radius: 50%;
        transition: all 0.4s;
        &-inner {
          width: 1.5em;
          height: 1.5em;
          position: relative;
          svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
        }
      }

      .video-time {
        display: flex;
        align-items: center;
        white-space: nowrap;
        color: var(--player-light);
        gap: 0.125em;
        span {
          font-size: 0.875em;
        }
      }

      .volume {
        display: flex;
        align-items: center;
        overflow: hidden;
        margin-right: 0.3125em;
        border: none;
        outline: none;

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 0;
          height: 0.375em;
          position: relative;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition: all 0.4s;

          &::-webkit-slider-thumb {
            appearance: none;
            -webkit-appearance: none;
            width: 0.75em;
            height: 0.75em;
            border: none;
          }

          &::-moz-range-thumb {
            appearance: none;
            -webkit-appearance: none;
            background: var(--player-primary);
            width: 0.75em;
            height: 0.75em;
            border: none;
            border-radius: 0;
          }

          &::-webkit-slider-runnable-track {
            appearance: none;
            -webkit-appearance: none;
            width: 0.75em;
            height: 0.75em;
          }
        }

        &:hover,
        &:focus,
        &:active {
          input {
            transform: translateX(0);
            width: 5em;
            pointer-events: all;
            opacity: 1;
          }
        }
        &.show {
          input {
            transform: translateX(0);
            width: 5em;
            pointer-events: all;
            opacity: 1;
          }
        }
      }
    }

    @media (hover: none) {
      background-image: linear-gradient(
        rgb(23, 24, 24) 0%,
        transparent 0%,
        transparent 0%,
        rgb(23, 24, 24) 100%
      );
    }

    &.hovered {
      opacity: 1;
    }

    &.paused {
      background: rgba(0, 0, 0, 0.5);
      &:hover {
        background: rgba(0, 0, 0, 0.5);
      }
    }
  }
}
</style>
