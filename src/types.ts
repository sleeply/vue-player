import { Fragment } from "hls.js";

export interface IPlayerProvider {
  videoElement: HTMLVideoElement | null;
  videoContainer: HTMLDivElement | null;
  playPause: () => void;
  detectIsPausedBeforePause: () => void;
  handleProgressive: (e: boolean, selectedTime: number) => void;
  params: IPlayerParams;
  setLevel: (item: any, index: number) => void;
  setTrack: (e: number) => void;
  setCaption: (e: number) => void;
}

export interface IPlayerParams {
  loading: boolean;
  fullScreen: boolean;
  isSettings: boolean;
  isProgressive: boolean;
  volumeShowed: boolean;
  changingVideoTime: boolean;
  overlay: boolean;
  paused: boolean;
  pausedBeforePause: boolean;

  startedTime: number;
  currentTime: number;
  duration: number;
  canPlay: number;
  volume: number;

  beforeStartTimeOnProgress: number;
  startedTimeOnProgress: number;
  endedTimeOnProgress: number;

  totalWatchedTime: number;
  totalRewindTime: number;

  activeChunk: Fragment | null;

  /* list */
  audioTracks: any[];
  captions: TextTrackList | null;
  levels: any[];
  activeTrack: number;
  activeCaption: number | null;

  secondaryActiveTrack: any;
  activeLevel: number;
  secondaryActiveLevel: any;
  secondaryActiveCaption: any;
  activeCue: string;
  isCue: boolean;
}

export interface IPlayerLang {
  quality: string;
  audioTrack: string;
  auto: string;
  captions: string;
  Back: string;
  off: string;
  NotFound: string;
  Cancel: string;
  Save: string;
}

export interface IPlayerAdditionLang {
  [key: string]: IPlayerLang;
}
