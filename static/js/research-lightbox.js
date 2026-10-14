(() => {
  "use strict";

  const dialog = document.getElementById("research-lightbox");
  if (!dialog || typeof dialog.showModal !== "function" || typeof dialog.close !== "function") return;
  if (dialog.dataset.researchLightboxReady === "true") return;

  const image = dialog.querySelector("#research-lightbox-image");
  const title = dialog.querySelector("#research-lightbox-title");
  const closeButton = dialog.querySelector("[data-research-close]");
  const links = Array.from(document.querySelectorAll("a.research-figure[data-research-name]"));
  if (!image || !title || !closeButton || !links.length) return;

  let lastTrigger = null;
  let backdropPointerDown = false;

  const closeLightbox = () => {
    if (dialog.open) dialog.close();
  };

  const isBackdrop = (event) => {
    if (event.target !== dialog) return false;
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  };

  closeButton.addEventListener("click", closeLightbox);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeLightbox();
  });
  dialog.addEventListener("pointerdown", (event) => {
    backdropPointerDown = isBackdrop(event);
  });
  dialog.addEventListener("click", (event) => {
    if (backdropPointerDown && isBackdrop(event)) closeLightbox();
    backdropPointerDown = false;
  });
  dialog.addEventListener("close", () => {
    // A previously queued close event must not reset a newly opened dialog.
    if (dialog.open) return;
    document.body.classList.remove("research-lightbox-open");
    backdropPointerDown = false;
    image.removeAttribute("src");
    const trigger = lastTrigger;
    lastTrigger = null;
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  });

  links.forEach((link) => {
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 ||
          event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (dialog.open) {
        event.preventDefault();
        return;
      }

      const originalImage = link.querySelector("img");
      if (!originalImage || !link.getAttribute("href")) return;
      image.src = link.href;
      image.alt = originalImage.alt;
      ["width", "height"].forEach((attribute) => {
        const value = originalImage.getAttribute(attribute);
        if (value) image.setAttribute(attribute, value);
        else image.removeAttribute(attribute);
      });
      title.textContent = link.dataset.researchName || "Research figure";

      try {
        dialog.showModal();
      } catch (_) {
        // Leave the click untouched so the image link remains a usable fallback.
        image.removeAttribute("src");
        return;
      }

      event.preventDefault();
      lastTrigger = link;
      document.body.classList.add("research-lightbox-open");
      closeButton.focus({ preventScroll: true });
    });
  });

  dialog.dataset.researchLightboxReady = "true";
})();
