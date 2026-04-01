import { querySelectorRequired } from '../utils/querySelectors';

const selectors = {
  root: '[data-js-video-player]',
  video: '[data-js-video-player-video]',
  playBtn: '[data-js-video-player-play-btn]',
};

const ACTIVE_CLASS = 'is-active';

class VideoPlayer {
  private readonly video: HTMLVideoElement;
  private readonly playBtn: HTMLButtonElement;

  constructor(rootEl: HTMLElement) {
    this.video = querySelectorRequired<HTMLVideoElement>(
      selectors.video,
      rootEl,
    );

    this.playBtn = querySelectorRequired<HTMLButtonElement>(
      selectors.playBtn,
      rootEl,
    );

    this.init();
  }

  private init() {
    this.playBtn.addEventListener('click', this.playVideo);
    this.video.addEventListener('pause', this.onVideoPause);
    this.video.addEventListener(
      'fullscreenchange',
      this.onVideoFullScreenChange,
    );
  }

  private playVideo = () => {
    this.video.play();
    this.video.requestFullscreen();
    this.video.controls = true;
    this.video.classList.remove(ACTIVE_CLASS);
  };

  onVideoPause = () => {
    this.video.controls = false;
    this.playBtn.classList.add(ACTIVE_CLASS);
  };

  onVideoFullScreenChange = () => {
    const isFullScreenEnabled = document.fullscreenElement === this.video;

    if (!isFullScreenEnabled) {
      this.video.pause();
    }
  };
}

class VideoPlayerCollection {
  constructor() {
    document
      .querySelectorAll<HTMLElement>(selectors.root)
      .forEach((videoPlayerEl) => new VideoPlayer(videoPlayerEl));
  }
}

export default VideoPlayerCollection;
