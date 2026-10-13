/* The receiver's audio path: continuous RF search, station lock and real FFT. */
(function () {
  "use strict";
  function create() {
    var context, analyser, attached, source, filter, fade, noise;
    var tuning = false,
      level = 0.28,
      generation = 0,
      sweepTimer = 0,
      endTimer = 0;
    function ramp(param, value, seconds) {
      var now = context.currentTime;
      // Preserve the instantaneous gain when a new scan interrupts a fade.
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
      else {
        var current = param.value;
        param.cancelScheduledValues(now);
        param.setValueAtTime(current, now);
      }
      param.linearRampToValueAtTime(value, now + seconds);
    }
    function unlock() {
      try {
        var Constructor = window.AudioContext || window.webkitAudioContext;
        if (!Constructor) return Promise.resolve(false);
        if (!context) {
          context = new Constructor();
          analyser = context.createAnalyser();
          analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0.72;
          analyser.minDecibels = -85;
          analyser.maxDecibels = -20;
          analyser.connect(context.destination);
        }
        return Promise.resolve(context.resume()).then(
          function () {
            return context.state === "running";
          },
          function () {
            return false;
          }
        );
      } catch (_) {
        return Promise.resolve(false);
      }
    }
    function attach(audio) {
      if (attached === audio) return true;
      if (!context || context.state !== "running") return false;
      detach();
      try {
        source = context.createMediaElementSource(audio);
        filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = tuning ? 1300 : 20000;
        filter.Q.value = 0.5;
        fade = context.createGain();
        fade.gain.value = tuning ? 0 : 1;
        source.connect(filter);
        filter.connect(fade);
        fade.connect(analyser);
        attached = audio;
        return true;
      } catch (_) {
        return false;
      }
    }
    function detach() {
      [source, filter, fade].forEach(function (node) {
        if (node) node.disconnect();
      });
      attached = source = filter = fade = null;
    }
    function clearNoise() {
      clearInterval(sweepTimer);
      clearTimeout(endTimer);
      sweepTimer = endTimer = 0;
      if (!noise) return;
      try {
        noise.source.stop();
      } catch (_) {}
      [noise.source, noise.band, noise.treble, noise.gain].forEach(
        function (node) {
          node.disconnect();
        }
      );
      noise = null;
    }
    function tune(value) {
      level = value;
      if (tuning) {
        setVolume(value);
        return;
      }
      tuning = true;
      var token = ++generation;
      clearNoise();
      if (fade) {
        ramp(fade.gain, 0, 0.025);
        ramp(filter.frequency, 1300, 0.08);
      }
      unlock().then(function (running) {
        if (!running || !tuning || token !== generation) return;
        var buffer = context.createBuffer(
          1,
          context.sampleRate * 2,
          context.sampleRate
        );
        var samples = buffer.getChannelData(0),
          pink = 0;
        for (var i = 0; i < samples.length; i++) {
          var white = Math.random() * 2 - 1;
          pink = 0.985 * pink + 0.075 * white;
          samples[i] = white * 0.6 + pink * 1.6;
        }
        noise = {
          source: context.createBufferSource(),
          band: context.createBiquadFilter(),
          treble: context.createBiquadFilter(),
          gain: context.createGain(),
        };
        noise.source.buffer = buffer;
        noise.source.loop = true;
        noise.band.type = "bandpass";
        noise.band.frequency.value = 1900;
        noise.band.Q.value = 0.6;
        noise.treble.type = "lowpass";
        noise.treble.frequency.value = 5200;
        noise.gain.gain.value = 0;
        noise.source.connect(noise.band);
        noise.band.connect(noise.treble);
        noise.treble.connect(noise.gain);
        noise.gain.connect(analyser);
        ramp(noise.gain.gain, level * 0.85, 0.07);
        noise.source.start();
        sweepTimer = setInterval(function () {
          if (!noise || !tuning) return;
          ramp(noise.band.frequency, 380 + Math.random() * 2800, 0.42);
          ramp(noise.gain.gain, level * (0.55 + Math.random() * 0.38), 0.18);
        }, 460);
      });
    }
    function lock() {
      if (!tuning) return;
      tuning = false;
      ++generation;
      clearInterval(sweepTimer);
      if (fade) {
        ramp(fade.gain, 1, 1.65);
        ramp(filter.frequency, 20000, 1.35);
      }
      if (noise) {
        ramp(noise.band.frequency, 1150, 0.3);
        ramp(noise.gain.gain, 0, 1.4);
        endTimer = setTimeout(clearNoise, 1450);
      }
    }
    function stop() {
      tuning = false;
      ++generation;
      clearNoise();
      if (fade) {
        ramp(fade.gain, 1, 0.025);
        ramp(filter.frequency, 20000, 0.025);
      }
    }
    function setVolume(value) {
      level = value;
      if (noise && tuning) ramp(noise.gain.gain, level * 0.75, 0.05);
      if (!value && noise) ramp(noise.gain.gain, 0, 0.02);
    }
    return {
      unlock: unlock,
      attach: attach,
      detach: detach,
      tune: tune,
      lock: lock,
      stop: stop,
      setVolume: setVolume,
      frequencies: function (array) {
        if (
          !analyser ||
          !context ||
          context.state !== "running" ||
          (!attached && !noise)
        ) {
          array.fill(0);
          return false;
        }
        analyser.getByteFrequencyData(array);
        return true;
      },
      sampleRate: function () {
        return context ? context.sampleRate : 48000;
      },
      destroy: function () {
        stop();
        detach();
        if (context) context.close();
      },
    };
  }
  window.CompanionRadioSignal = { create: create };
})();
