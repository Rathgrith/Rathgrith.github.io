/* Both planes use CSS animation. Their lifetime follows the scene camera. */
(function () {
  "use strict";
  // Starting position, lifetime and initial age of each airborne particle.
  var distance = [
    [10, 67, 5.8, 3.3], [28, 47, 6.2, 1.2], [84, 90, 7.2, 4.6],
    [62, 32, 5.3, 1.6], [43, 68, 7.8, 0.6],
  ];
  var foreground = [[93, 76, 4.8, 2.9], [12, 80, 6.1, 1.3]];

  function plane(depth, particles) {
    var layer = document.createElement("div");
    layer.className = "vn-motes vn-motes-" + depth;
    layer.setAttribute("aria-hidden", "true");
    layer.inert = true;
    particles.forEach(function (particle) {
      var mote = document.createElement("i");
      mote.className = "vn-mote vn-mote-spark";
      mote.style.setProperty("--origin-x", particle[0] + "%");
      mote.style.setProperty("--origin-y", particle[1] + "%");
      mote.style.setProperty("--mote-life", particle[2] + "s");
      mote.style.setProperty("--mote-age", -particle[3] + "s");
      layer.appendChild(mote);
    });
    return layer;
  }

  window.CompanionAtmosphere = {
    mount: function (scene) {
      var stage = scene.querySelector("[data-companion-stage]");
      var economy = navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4 ||
        (navigator.connection && navigator.connection.saveData);
      var far = plane("far", economy ? distance.slice(0, 2) : distance);
      var near = plane("near", economy ? foreground.slice(0, 1) : foreground);
      stage.insertBefore(far, stage.querySelector("#live2dcanvas"));
      scene.querySelector(".vn-scene-choices").before(near);
    },
  };
})();
