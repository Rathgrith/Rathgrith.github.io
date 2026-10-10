/* Native audio adapter for the local radio library. No source until explicit play. */
(function () {
  "use strict";
  function Player(slot, options) {
    var audio = document.createElement("audio");
    audio.preload = "none";
    audio.setAttribute("data-radio-audio", "");
    slot.replaceChildren(audio);
    var disposed = false,
      state = -1,
      request = 0,
      wanted = false;
    var events = options.events;
    function emit(value) {
      if (disposed || state === value) return;
      state = value;
      if (events.onStateChange)
        events.onStateChange({ target: api, data: value });
    }
    function play() {
      var token = ++request;
      wanted = true;
      if (audio.paused) emit(3);
      audio
        .play()
        .then(function () {
          // Some providers settle play after Pause or a mixer handoff. A late
          // completion must never override the newest explicit playback intent.
          if (!disposed && !wanted) {
            audio.pause();
            emit(2);
          }
        })
        .catch(function (error) {
          if (disposed || token !== request || error.name === "AbortError")
            return;
          if (error.name === "NotAllowedError")
            events.onAutoplayBlocked({ target: api });
          else events.onError({ target: api, data: error.message });
        });
    }
    audio.addEventListener("playing", function () {
      if (!wanted) {
        audio.pause();
        emit(2);
        return;
      }
      if (!audio.paused) emit(1);
    });
    audio.addEventListener("waiting", function () {
      if (!audio.paused) emit(3);
    });
    audio.addEventListener("pause", function () {
      if (audio.paused && !audio.ended) emit(2);
    });
    audio.addEventListener("ended", function () {
      emit(0);
    });
    audio.addEventListener("error", function () {
      if (!disposed && audio.getAttribute("src"))
        events.onError({ target: api, data: audio.error && audio.error.code });
    });
    var api = {
      getIframe: function () {
        return audio;
      },
      getPlayerState: function () {
        return state;
      },
      getCurrentTime: function () {
        return audio.currentTime || 0;
      },
      getDuration: function () {
        return Number.isFinite(audio.duration) ? audio.duration : 0;
      },
      getVolume: function () {
        return Math.round(audio.volume * 100);
      },
      setVolume: function (value) {
        audio.volume = Math.max(0, Math.min(1, value / 100));
      },
      isMuted: function () {
        return audio.muted;
      },
      mute: function () {
        audio.muted = true;
      },
      unMute: function () {
        audio.muted = false;
      },
      seekTo: function (seconds) {
        if (Number.isFinite(audio.duration))
          audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
      },
      loadVideoById: function (id) {
        var track = window.CompanionRadioTracks.find(function (entry) {
          return entry.id === id && entry.src;
        });
        if (!track) {
          events.onError({ target: api, data: "Missing audio source" });
          return;
        }
        audio.src = track.src;
        state = -1;
        play();
      },
      playVideo: play,
      pauseVideo: function () {
        wanted = false;
        ++request;
        audio.pause();
      },
      destroy: function () {
        disposed = true;
        wanted = false;
        ++request;
        clearTimeout(readyTimer);
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.remove();
      },
    };
    var readyTimer = setTimeout(function () {
      if (!disposed) events.onReady({ target: api });
    }, 0);
    return api;
  }
  window.CompanionRadioAudio = { Player: Player };
})();
