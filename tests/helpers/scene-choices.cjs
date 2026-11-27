const assert = require("node:assert/strict");

module.exports = async function checkSceneChoices(widget) {
  const frame = widget.locator(".vn-scene-frame");
  assert.equal(await frame.count(), 1, "The scene includes a frame for the actor and the replies");
  const geometry = await frame.evaluate(async scene => {
    // Test the settled layout here. The transition test samples the clipped menu in motion.
    await Promise.all(scene.getAnimations().filter(effect => effect instanceof CSSTransition)
      .map(effect => effect.finished.catch(() => {})));
    const rect = element => element.getBoundingClientRect().toJSON();
    return {
      scene: rect(scene),
      actor: rect(scene.querySelector(".vn-actor-area")),
      canvas: rect(scene.querySelector("#live2dcanvas")),
      caption: rect(scene.closest("#live2d-widget").querySelector(".companion-conversation")),
      buttons: Array.from(scene.querySelectorAll(".vn-scene-choices button"), rect),
    };
  });
  const { scene, actor, canvas, caption, buttons } = geometry;
  const overlaps = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 &&
    Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1;
  assert(!overlaps(scene, caption), "The dialogue retains its separate position outside the scene");
  assert(buttons.length > 0, "Replies appear inside the scene frame");
  assert(actor.width > 0 && actor.height > 0, "The character's safe area remains visible with replies");
  assert(Math.abs(scene.width - canvas.width) <= 4 && Math.abs(scene.height - canvas.height) <= 4,
    "The WebGL canvas continues to cover the scene: " + JSON.stringify(geometry));
  for (const button of buttons) {
    assert(button.left >= scene.left - 1 && button.right <= scene.right + 1 &&
      button.top >= scene.top - 1 && button.bottom <= scene.bottom + 1,
      "The complete reply lies within the scene: " + JSON.stringify(geometry));
    assert(!overlaps(button, actor), "A scene reply overlaps the character safe area: " + JSON.stringify(geometry));
  }
};
