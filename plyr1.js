import captions from './captions';
import defaults from './config/defaults';
import { pip } from './config/states';
import { getProviderByUrl, providers, types } from './config/types';
import Console from './console';
import controls from './controls';
import Fullscreen from './fullscreen';
import html5 from './html5';
import Listeners from './listeners';
import media from './media';
import Ads from './plugins/ads';
import PreviewThumbnails from './plugins/preview-thumbnails';
import source from './source';
import Storage from './storage';
import support from './support';
import ui from './ui';
import { closest } from './utils/arrays';
import { createElement, hasClass, removeElement, replaceElement, toggleClass, wrap } from './utils/elements';
import { off, on, once, triggerEvent, unbindListeners } from './utils/events';
import is from './utils/is';
import loadSprite from './utils/load-sprite';
import { clamp } from './utils/numbers';
import { cloneDeep, extend } from './utils/objects';
import { silencePromise } from './utils/promise';
import { getAspectRatio, reduceAspectRatio, setAspectRatio, validateAspectRatio } from './utils/style';
import { parseUrl } from './utils/urls';

// Private properties
// TODO: Use a WeakMap for private globals
// const globals = new WeakMap();

// Plyr instance
class Plyr {
  constructor(target, options) {
    this.timers = {};

    // State
    this.ready = false;
    this.loading = false;
    this.failed = false;

    // Touch device
    this.touch = support.touch;

    // Set the media element
    this.media = target;

    // String selector passed
    if (is.string(this.media)) {
      this.media = document.querySelectorAll(this.media);
    }

    // If the media is a NodeList, grab the first element
    if ((window.jQuery && this.media instanceof jQuery) || is.nodeList(this.media)) {
      [this.media] = this.media;
    }

    // Set config
    this.config = extend({}, defaults, Plyr.defaults, options || {}, (() => {
      try {
        return JSON.parse(this.media.getAttribute('data-plyr-config'));
      } catch (e) {
        return {};
      }
    })());

    // Elements cache
    this.elements = {
      container: null,
      buttons: {},
      display: {},
      progress: {},
      inputs: {},
      settings: {
        popup: null,
        menu: null,
        inputs: {},
      },
      captions: null,
      fullscreen: null,
      pip: null,
      airplay: null,
    };

    // Captions
    this.captions = {
      enabled: false,
      active: null,
      language: 'en',
      languages: [],
    };

    // Fullscreen
    this.fullscreen = {
      enabled: false,
      active: false,
    };

    // Picture-in-picture
    this.pip = {
      enabled: false,
      active: false,
    };

    // Airplay
    this.airplay = {
      enabled: false,
      active: false,
    };

    // Original attributes
    this.attributes = {};

    // Ads
    this.ads = {
      enabled: false,
      active: false,
    };

    // Listeners
    this.listeners = new Listeners(this);

    // Setup
    this.setup();
  }

  // ---------------------------------------------------------------
  // API
  // ---------------------------------------------------------------

  /**
   * Play the media, or play the advertisement (if active)
   * @param {Boolean} focus Whether to focus the player
   * @returns {Promise}
   */
  play(focus = true) {
    if (!is.function(this.media.play)) {
      return null;
    }

    // Ads
    if (this.ads.enabled && this.ads.active) {
      this.ads.play();
    }

    // Play the media
    return this.media.play().then(() => {
      if (focus) {
        this.elements.container.focus();
      }
    });
  }

  /**
   * Pause the media
   */
  pause() {
    if (!this.playing || !is.function(this.media.pause)) {
      return;
    }

    this.media.pause();
  }

  /**
   * Get playing state
   * @returns {Boolean}
   */
  get playing() {
    return this.media.playing;
  }

  /**
   * Get paused state
   * @returns {Boolean}
   */
  get paused() {
    return this.media.paused;
  }

  /**
   * Get stopped state
   * @returns {Boolean}
   */
  get stopped() {
    return this.paused && this.currentTime === 0;
  }

  /**
   * Get ended state
   * @returns {Boolean}
   */
  get ended() {
    return this.media.ended;
  }

  /**
   * Get the media duration
   * @returns {Number}
   */
  get duration() {
    return this.media.duration;
  }

  /**
   * Get the media current time
   * @returns {Number}
   */
  get currentTime() {
    return this.media.currentTime;
  }

  /**
   * Set the media current time
   * @param {Number} time
   */
  set currentTime(time) {
    this.media.currentTime = time;
  }

  /**
   * Get the media volume
   * @returns {Number}
   */
  get volume() {
    return this.media.volume;
  }

  /**
   * Set the media volume
   * @param {Number} volume
   */
  set volume(volume) {
    this.media.volume = volume;
  }

  /**
   * Get the media muted state
   * @returns {Boolean}
   */
  get muted() {
    return this.media.muted;
  }

  /**
   * Set the media muted state
   * @param {Boolean} muted
   */
  set muted(muted) {
    this.media.muted = muted;
  }

  /**
   * Get the media hasAudio state
   * @returns {Boolean}
   */
  get hasAudio() {
    return this.media.hasAudio;
  }

  /**
   * Get the media speed
   * @returns {Number}
   */
  get speed() {
    return this.media.speed;
  }

  /**
   * Set the media speed
   * @param {Number} speed
   */
  set speed(speed) {
    this.media.speed = speed;
  }

  /**
   * Get the media quality
   * @returns {Number}
   */
  get quality() {
    return this.media.quality;
  }

  /**
   * Set the media quality
   * @param {Number} quality
   */
  set quality(quality) {
    this.media.quality = quality;
  }

  /**
   * Get the media loop state
   * @returns {Boolean}
   */
  get loop() {
    return this.media.loop;
  }

  /**
   * Set the media loop state
   * @param {Boolean} loop
   */
  set loop(loop) {
    this.media.loop = loop;
  }

  /**
   * Get the media source
   * @returns {Object}
   */
  get source() {
    return this.media.source;
  }

  /**
   * Set the media source
   * @param {Object} source
   */
  set source(source) {
    this.source.change(source);
  }

  /**
   * Get the media poster
   * @returns {String}
   */
  get poster() {
    return this.media.poster;
  }

  /**
   * Set the media poster
   * @param {String} poster
   */
  set poster(poster) {
    this.media.poster = poster;
  }

  /**
   * Get the media autoplay state
   * @returns {Boolean}
   */
  get autoplay() {
    return this.config.autoplay;
  }

  /**
   * Set the media autoplay state
   * @param {Boolean} autoplay
   */
  set autoplay(autoplay) {
    this.config.autoplay = autoplay;
  }

  /**
   * Toggle the captions
   * @param {Boolean} input
   */
  toggleCaptions(input) {
    captions.toggle.call(this, input);
  }

  /**
   * Set the captions language
   * @param {String} language
   */
  setCaptions(language) {
    captions.set.call(this, language);
  }

  /**
   * Get the captions language
   * @returns {String}
   */
  get currentTrack() {
    return this.captions.active;
  }

  /**
   * Get the captions language
   * @returns {String}
   */
  get language() {
    return this.captions.language;
  }

  /**
   * Set the captions language
   * @param {String} language
   */
  set language(language) {
    this.setCaptions(language);
  }

  /**
   * Toggle the fullscreen state
   * @param {Boolean} input
   */
  toggleFullscreen(input) {
    // Se o Plyr estiver em fullscreen, mas o navegador não, sair do fullscreen do Plyr
    if (this.fullscreen.active && !document.fullscreenElement) {
      this.fullscreen.exit();
    } else {
      this.fullscreen.toggle(input);
    }
  }

  /**
   * Toggle the picture-in-picture state
   * @param {Boolean} input
   */
  togglePip(input) {
    this.pip.toggle(input);
  }

  /**
   * Toggle the airplay state
   * @param {Boolean} input
   */
  toggleAirplay(input) {
    this.airplay.toggle(input);
  }

  /**
   * Rewind the media by the config seek time
   * @param {Number} seekTime
   */
  rewind(seekTime) {
    this.currentTime -= is.number(seekTime) ? seekTime : this.config.seekTime;
  }

  /**
   * Fast forward the media by the config seek time
   * @param {Number} seekTime
   */
  forward(seekTime) {
    this.currentTime += is.number(seekTime) ? seekTime : this.config.seekTime;
  }

  /**
   * Restart the media
   */
  restart() {
    this.currentTime = 0;
  }

  /**
   * Add an event listener
   * @param {String} event
   * @param {Function} callback
   */
  on(event, callback) {
    on.call(this, this.elements.container, event, callback);
  }

  /**
   * Add an event listener that will only be called once
   * @param {String} event
   * @param {Function} callback
   */
  once(event, callback) {
    once.call(this, this.elements.container, event, callback);
  }

  /**
   * Remove an event listener
   * @param {String} event
   * @param {Function} callback
   */
  off(event, callback) {
    off.call(this, this.elements.container, event, callback);
  }

  /**
   * Destroy the instance
   * @param {Function} callback
   */
  destroy(callback) {
    // Setup a promise to resolve when destroyed
    new Promise(resolve => {
      // Reset the UI
      ui.reset.call(this);

      // Restore the original media element
      this.media.setAttribute('data-plyr', null);
      this.media.removeAttribute('tabindex');

      // Unbind listeners
      unbindListeners.call(this);

      // Allow the API to be called again
      this.ready = false;

      // Resolve the promise
      resolve();
    }).then(callback);
  }

  /**
   * Check for support for a certain media type
   * @param {String} type
   * @returns {Boolean}
   */
  static supported(type) {
    return support[type];
  }

  // ---------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------

  /**
   * Setup the instance
   */
  setup() {
    // Set the classname on the container
    this.elements.container = this.media.parentElement;
    if (!is.element(this.elements.container)) {
      this.elements.container = document.createElement('div');
      this.elements.container.setAttribute('data-plyr-container', '');
      wrap(this.media, this.elements.container);
    }

    // Add the classname to the container
    this.elements.container.classList.add(this.config.classNames.container);

    // Set the provider and type on the container
    this.elements.container.setAttribute('data-plyr-provider', this.provider);
    this.elements.container.setAttribute('data-plyr-type', this.type);

    // Set the ARIA role on the container
    this.elements.container.setAttribute('role', 'application');

    // Set the tabindex on the media element
    this.media.setAttribute('tabindex', -1);

    // Add the listeners
    this.listeners.bind();

    // Setup the UI
    ui.setup.call(this);

    // Setup the media
    media.setup.call(this);

    // Setup the source
    this.source = new source(this);

    // Setup the fullscreen
    this.fullscreen = new Fullscreen(this);

    // Setup the captions
    this.captions = new captions(this);

    // Setup the controls
    this.controls = new controls(this);

    // Setup the ads
    this.ads = new Ads(this);

    // Setup the preview thumbnails
    this.previewThumbnails = new PreviewThumbnails(this);

    // Setup the storage
    this.storage = new Storage(this);

    // Setup the console
    this.console = new Console(this);

    // Set the ready state
    this.ready = true;

    // Trigger the ready event
    triggerEvent.call(this, this.media, 'ready');
  }
}

Plyr.defaults = cloneDeep(defaults);

export default Plyr;


