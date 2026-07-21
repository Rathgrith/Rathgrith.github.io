(function () {
  function isSkippableProtocol(href) {
    return (
      href.indexOf("mailto:") === 0 ||
      href.indexOf("tel:") === 0 ||
      href.indexOf("javascript:") === 0
    );
  }

  function addRelValue(anchor, value) {
    var rel = anchor.getAttribute("rel") || "";
    if (new RegExp("(^|\\s)" + value + "(\\s|$)").test(rel)) return;
    anchor.setAttribute("rel", (rel + " " + value).trim());
  }

  function applyLinkPolicy() {
    var anchors = document.querySelectorAll("a[href]");

    Array.prototype.forEach.call(anchors, function (anchor) {
      var href = anchor.getAttribute("href");
      if (!href || href[0] === "#" || isSkippableProtocol(href)) return;

      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (e) {
        return;
      }

      var isExternal = url.origin !== window.location.origin;
      if (!isExternal) return;

      if (!anchor.hasAttribute("target")) {
        anchor.setAttribute("target", "_blank");
      }

      addRelValue(anchor, "noopener");
      addRelValue(anchor, "noreferrer");
    });
  }

  window.__siteApplyLinkTargetPolicy = applyLinkPolicy;

  document.addEventListener("site:content-updated", applyLinkPolicy);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyLinkPolicy);
  } else {
    applyLinkPolicy();
  }
})();
