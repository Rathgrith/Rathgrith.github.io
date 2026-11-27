// Capture the app through its normal lighting hook, keeping production globals private.
module.exports = async function captureRenderer(page) {
  await page.addInitScript(() => {
    // Project the moving eyes and mouth through Cubism, PIXI and the actual CSS canvas.
    window.cameraTestFace = () => {
      const app = window.cameraTestApp, model = app.stage.children[0];
      const id = document.querySelector("#live2d-widget").dataset.live2dCharacter;
      const features = {
        alice: ["EyeWhiteR", "EyeWhiteL", "MouthOral"],
        marisa: ["EyeWhite", "EyeWhite2", "MouthOral"],
        patchouli: ["D_PSD1_74", "D_PSD1_83", "D_PSD1_58"],
      };
      const view = app.view.getBoundingClientRect();
      const project = (x, y) => {
        const point = model.toGlobal(model.internalModel.localTransform.apply(new PIXI.Point(x, y)));
        return { x: view.x + point.x * view.width / app.screen.width, y: view.y + point.y * view.height / app.screen.height };
      };
      return features[id].map(name => {
        const b = model.internalModel.getDrawableBounds(name);
        const tl = project(b.x, b.y), br = project(b.x + b.width, b.y + b.height);
        return { left: tl.x, top: tl.y, right: br.x, bottom: br.y };
      });
    };
  });
  await page.route("**/companion-lighting.js*", async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + `
      const originalLighting = CompanionLighting.create;
      CompanionLighting.create = (app, widget) => {
        window.cameraTestApp = app;
        return originalLighting(app, widget);
      };` });
  });
};
