/* Both planes use CSS animation. Their lifetime follows the scene camera. */
(function () {
  "use strict";
  // Starting position, lifetime and initial age. Light sources in the distance
  // use the coordinates of each room's painting.
  var distance = [
    [10, 67, 5.8, 3.3], [0, 0, 7.6, 1.9, "window"], [0, 0, 8.7, 5.4, "lamp"], [28, 47, 6.2, 1.2],
    [84, 90, 7.2, 4.6], [0, 0, 6.6, 3.8, "glint"], [62, 32, 5.3, 1.6], [43, 68, 7.8, 0.6],
  ];
  var foreground = [[6, 70, 7.4, 3.7, "bokeh"], [93, 76, 4.8, 2.9], [12, 80, 6.1, 1.3]];

  function plane(depth, particles) {
    var layer = document.createElement("div");
    layer.className = "vn-motes vn-motes-" + depth;
    layer.setAttribute("aria-hidden", "true");
    layer.inert = true;
    particles.forEach(function (particle) {
      var mote = document.createElement("i");
      mote.className = "vn-mote vn-mote-" + (particle[4] ? "bokeh" : "spark");
      if (depth === "far" && particle[4]) mote.dataset.lightSource = particle[4];
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
      var far = plane("far", economy ? distance.slice(0, 4) : distance);
      var near = plane("near", economy ? foreground.slice(0, 1) : foreground);
      stage.insertBefore(far, stage.querySelector("#live2dcanvas"));
      scene.querySelector(".vn-scene-choices").before(near);
    },
  };
})();
