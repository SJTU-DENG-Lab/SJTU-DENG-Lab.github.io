(function () {
  "use strict";

  var page = document.querySelector(".gallery-page");
  if (!page || page.dataset.galleryReady === "true") return;

  var lightbox = document.getElementById("galleryLightbox");
  var lightboxMedia = document.getElementById("galleryLightboxMedia");
  var lightboxTitle = document.getElementById("galleryLightboxTitle");
  var lightboxMeta = document.getElementById("galleryLightboxMeta");
  var closeButton = lightbox && lightbox.querySelector(".gallery-lightbox__close");
  if (!lightbox || !lightboxMedia || !lightboxTitle || !lightboxMeta || !closeButton) return;

  var motionQuery = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var isOpen = false;
  var lastTrigger = null;
  var currentMedia = null;
  var closeTimer = null;
  var openFrame = null;
  var backgroundState = [];
  var albumPlaybackUpdates = [];

  function reduceMotion() {
    return Boolean(motionQuery && motionQuery.matches);
  }

  function syncAlbumPlayback() {
    albumPlaybackUpdates.forEach(function (update) { update(); });
  }

  function setupAlbums() {
    page.querySelectorAll("[data-gallery-album]").forEach(function (album) {
      var track = album.querySelector("[data-gallery-track]");
      var previousButton = album.querySelector("[data-gallery-prev]");
      var nextButton = album.querySelector("[data-gallery-next]");
      var position = album.querySelector("[data-gallery-position]");
      var total = album.querySelector("[data-gallery-total]");
      var controls = album.querySelector("[data-gallery-controls]");
      var autoplayButton = album.querySelector("[data-gallery-autoplay]");
      var playIcon = album.querySelector("[data-gallery-play-icon]");
      var pauseIcon = album.querySelector("[data-gallery-pause-icon]");
      var counter = album.querySelector("[data-gallery-counter]");
      var dots = Array.from(album.querySelectorAll("[data-gallery-dot]"));
      if (!track || !previousButton || !nextButton || !position || !total || !controls ||
          !autoplayButton || !playIcon || !pauseIcon || !counter ||
          typeof track.scrollTo !== "function") return;
      var items = Array.from(track.querySelectorAll("[data-gallery-item]"));
      if (!items.length) return;
      var offsets = [];
      var requestedIndex = null;
      var resizeFrame = null;
      var autoplayTimer = null;
      var autoplayEnabled = !reduceMotion() && items.length > 1;
      var hovered = Boolean(window.matchMedia && window.matchMedia("(hover: hover)").matches && album.matches(":hover"));
      var hasFocus = album.contains(document.activeElement);
      var pointerActive = false;
      var playFocusOverride = false;

      function canAutoplay() {
        var focusPaused = hasFocus && !(playFocusOverride && document.activeElement === autoplayButton);
        return autoplayEnabled && items.length > 1 && !hovered && !focusPaused &&
          !pointerActive && !isOpen && !document.hidden;
      }

      function updateAutoplay() {
        if (autoplayTimer !== null) window.clearTimeout(autoplayTimer);
        autoplayTimer = null;
        var running = canAutoplay();
        var label = autoplayEnabled ? "Pause automatic slideshow" : "Play automatic slideshow";
        autoplayButton.setAttribute("aria-label", label);
        autoplayButton.setAttribute("title", label);
        autoplayButton.disabled = items.length < 2;
        playIcon.toggleAttribute("hidden", autoplayEnabled);
        pauseIcon.toggleAttribute("hidden", !autoplayEnabled);
        // Automatic rotation must not generate repeated screen-reader announcements.
        counter.setAttribute("aria-live", running ? "off" : "polite");
        if (running) {
          autoplayTimer = window.setTimeout(function () {
            autoplayTimer = null;
            if (!canAutoplay()) { updateAutoplay(); return; }
            var index = requestedIndex === null ? currentIndex() : requestedIndex;
            goTo((index + 1) % items.length, index === items.length - 1);
          }, 5000);
        }
      }

      function currentIndex() {
        var closest = 0;
        offsets.forEach(function (offset, index) {
          if (Math.abs(offset - track.scrollLeft) < Math.abs(offsets[closest] - track.scrollLeft)) closest = index;
        });
        return closest;
      }

      function syncPosition() {
        var index = currentIndex();
        position.textContent = String(index + 1).padStart(2, "0");
        previousButton.disabled = false;
        nextButton.disabled = false;
        dots.forEach(function (dot) {
          dot.setAttribute("aria-current", Number(dot.dataset.galleryDot) === index ? "true" : "false");
        });
        if (requestedIndex !== null && Math.abs(track.scrollLeft - offsets[requestedIndex]) < 2) requestedIndex = null;
        var tabIndex = requestedIndex === null ? index : requestedIndex;
        items.forEach(function (item, itemIndex) {
          var trigger = item.querySelector("[data-gallery-open]");
          if (trigger) trigger.tabIndex = itemIndex === tabIndex ? 0 : -1;
        });
      }

      function measure() {
        var left = track.getBoundingClientRect().left + track.clientLeft;
        var limit = Math.max(0, track.scrollWidth - track.clientWidth);
        offsets = items.map(function (item) {
          return Math.max(0, Math.min(limit, item.getBoundingClientRect().left - left + track.scrollLeft));
        });
        requestedIndex = null;
        syncPosition();
      }

      function scheduleMeasure() {
        if (resizeFrame !== null) return;
        resizeFrame = window.requestAnimationFrame(function () {
          resizeFrame = null;
          measure();
        });
      }

      function goTo(index, instant) {
        index = Math.max(0, Math.min(items.length - 1, index));
        requestedIndex = index;
        track.scrollTo({ left: offsets[index], behavior: reduceMotion() || instant ? "auto" : "smooth" });
        syncPosition();
        updateAutoplay();
        return index;
      }

      function step(direction, focusedIndex) {
        var index = focusedIndex === undefined ? currentIndex() : focusedIndex;
        var nextIndex = (requestedIndex === null ? index : requestedIndex) + direction;
        return goTo((nextIndex + items.length) % items.length, nextIndex < 0 || nextIndex >= items.length);
      }

      function clearRequest() {
        requestedIndex = null;
      }

      previousButton.addEventListener("click", function () { step(-1); });
      nextButton.addEventListener("click", function () { step(1); });
      dots.forEach(function (dot) {
        var index = Number(dot.dataset.galleryDot);
        if (!Number.isInteger(index) || index < 0 || index >= items.length) return;
        dot.addEventListener("click", function () { goTo(index); });
      });
      autoplayButton.addEventListener("click", function () {
        autoplayEnabled = !autoplayEnabled;
        // Explicit Play can start from the rotation control without moving focus.
        playFocusOverride = autoplayEnabled;
        updateAutoplay();
      });
      track.addEventListener("scroll", syncPosition, { passive: true });
      track.addEventListener("scrollend", function () { clearRequest(); syncPosition(); updateAutoplay(); });
      track.addEventListener("pointerdown", function () {
        clearRequest(); pointerActive = true; updateAutoplay();
      }, { passive: true });
      track.addEventListener("wheel", function () { clearRequest(); updateAutoplay(); }, { passive: true });
      function releasePointer() {
        if (!pointerActive) return;
        pointerActive = false;
        updateAutoplay();
      }
      window.addEventListener("pointerup", releasePointer, { passive: true });
      window.addEventListener("pointercancel", releasePointer, { passive: true });
      album.addEventListener("pointerenter", function (event) {
        if (event.pointerType === "touch") return;
        hovered = true; updateAutoplay();
      });
      album.addEventListener("pointerleave", function () { hovered = false; updateAutoplay(); });
      album.addEventListener("focusin", function (event) {
        hasFocus = true;
        if (event.target !== autoplayButton) playFocusOverride = false;
        updateAutoplay();
      });
      album.addEventListener("focusout", function (event) {
        if (album.contains(event.relatedTarget)) return;
        hasFocus = false;
        playFocusOverride = false;
        updateAutoplay();
      });
      document.addEventListener("visibilitychange", updateAutoplay);
      track.addEventListener("keydown", function (event) {
        if (isOpen || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
            (event.target !== track && !event.target.closest("[data-gallery-item]")) ||
            event.target.closest("input, textarea, select, [contenteditable]")) return;
        var sourceTrigger = event.target.closest("[data-gallery-open]");
        var focusedIndex = sourceTrigger ? items.indexOf(sourceTrigger.closest("[data-gallery-item]")) : undefined;
        var targetIndex;
        switch (event.key) {
          case "ArrowLeft": targetIndex = step(-1, focusedIndex); break;
          case "ArrowRight": targetIndex = step(1, focusedIndex); break;
          case "Home": targetIndex = goTo(0); break;
          case "End": targetIndex = goTo(items.length - 1); break;
          default: return;
        }
        event.preventDefault();
        if (sourceTrigger) focusElement(items[targetIndex].querySelector("[data-gallery-open]"));
      });
      window.addEventListener("resize", scheduleMeasure);
      if (typeof window.ResizeObserver === "function") {
        var observer = new window.ResizeObserver(scheduleMeasure);
        observer.observe(track);
      }
      if (motionQuery) {
        var stopSmoothMotion = function () {
          if (reduceMotion()) { autoplayEnabled = false; playFocusOverride = false; }
          if (reduceMotion() && requestedIndex !== null) goTo(requestedIndex);
          updateAutoplay();
        };
        if (motionQuery.addEventListener) motionQuery.addEventListener("change", stopSmoothMotion);
        else if (motionQuery.addListener) motionQuery.addListener(stopSmoothMotion);
      }

      total.textContent = String(items.length).padStart(2, "0");
      album.classList.add("is-enhanced");
      measure();
      controls.hidden = false;
      albumPlaybackUpdates.push(updateAutoplay);
      updateAutoplay();
    });
  }

  function setBackgroundInert(isInert) {
    if (isInert) {
      // Disable siblings along the dialog's ancestor path, including the skip link,
      // while keeping the dialog itself outside every inert subtree.
      var branch = lightbox;
      while (branch.parentElement) {
        Array.from(branch.parentElement.children).forEach(function (element) {
          if (element === branch || /^(SCRIPT|STYLE|LINK)$/.test(element.tagName)) return;
          backgroundState.push({ element: element, previous: element.inert });
          element.inert = true;
        });
        if (branch.parentElement === document.body) break;
        branch = branch.parentElement;
      }
    } else {
      backgroundState.forEach(function (state) { state.element.inert = state.previous; });
      backgroundState = [];
    }
  }

  function focusElement(element) {
    if (element && element.isConnected) element.focus({ preventScroll: true });
  }

  function focusableElements() {
    return Array.from(lightbox.querySelectorAll("button, a[href], input, select, textarea, video[controls], [tabindex]"))
      .filter(function (element) {
        return !element.hasAttribute("data-gallery-focus-guard") && element.tabIndex >= 0 &&
          !element.disabled && !element.closest("[hidden], [inert]") && element.getClientRects().length > 0;
      });
  }

  function addFocusGuard(atStart) {
    var guard = document.createElement("span");
    guard.tabIndex = 0;
    guard.setAttribute("data-gallery-focus-guard", "");
    guard.setAttribute("aria-hidden", "true");
    guard.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
    guard.addEventListener("focus", function () {
      if (!isOpen) return;
      var elements = focusableElements();
      focusElement(elements[atStart ? elements.length - 1 : 0] || lightbox);
    });
    if (atStart) lightbox.insertBefore(guard, lightbox.firstChild);
    else lightbox.appendChild(guard);
  }

  // Guards preserve the native Tab order inside a video's browser controls.
  lightbox.tabIndex = -1;
  addFocusGuard(true);
  addFocusGuard(false);

  function pauseCurrentVideo() {
    if (currentMedia && currentMedia.tagName === "VIDEO") currentMedia.pause();
  }

  function releaseMedia() {
    pauseCurrentVideo();
    if (currentMedia) {
      currentMedia.removeAttribute("src");
      if (currentMedia.tagName === "VIDEO") currentMedia.load();
    }
    lightboxMedia.replaceChildren();
    currentMedia = null;
  }

  function finishClosing() {
    closeTimer = null;
    if (isOpen) return;
    lightbox.hidden = true;
    releaseMedia();
  }

  function closeLightbox() {
    if (!isOpen) return;
    isOpen = false;
    if (openFrame !== null) window.cancelAnimationFrame(openFrame);
    openFrame = null;
    lightbox.classList.remove("is-open");
    pauseCurrentVideo();
    setBackgroundInert(false);
    document.body.classList.remove("gallery-lightbox-open");

    var trigger = lastTrigger;
    lastTrigger = null;
    focusElement(trigger);
    // Restore focus before hiding the dialog from the accessibility tree.
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.inert = true;
    if (reduceMotion()) finishClosing();
    else closeTimer = window.setTimeout(finishClosing, 180);
    syncAlbumPlayback();
  }

  function openLightbox(trigger) {
    if (isOpen) return true;
    if (!trigger.dataset.src) return false;
    if (closeTimer !== null) window.clearTimeout(closeTimer);
    closeTimer = null;
    releaseMedia();

    var isVideo = trigger.dataset.type === "video" && trigger.dataset.format !== "gif";
    var preview = trigger.querySelector("img, video");
    var description = trigger.dataset.alt || (preview && (preview.alt || preview.getAttribute("aria-label"))) ||
      trigger.dataset.title || "Gallery item";
    var media = document.createElement(isVideo ? "video" : "img");
    if (isVideo) {
      media.controls = true;
      media.autoplay = !reduceMotion();
      media.loop = !reduceMotion();
      media.muted = true;
      media.playsInline = true;
      media.preload = "metadata";
      media.tabIndex = 0;
      media.setAttribute("aria-label", description);
      if (trigger.dataset.poster) media.poster = trigger.dataset.poster;
    } else {
      media.alt = description;
    }
    media.src = trigger.dataset.src;
    currentMedia = media;
    lightboxMedia.appendChild(media);
    lightboxTitle.textContent = trigger.dataset.title || "Gallery item";
    lightboxMeta.textContent = [trigger.dataset.label, trigger.dataset.year].filter(Boolean).join(" / ");

    lastTrigger = trigger;
    isOpen = true;
    syncAlbumPlayback();
    lightbox.inert = false;
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("gallery-lightbox-open");
    setBackgroundInert(true);
    focusElement(closeButton);
    if (reduceMotion()) {
      lightbox.classList.add("is-open");
    } else {
      openFrame = window.requestAnimationFrame(function () {
        openFrame = null;
        if (isOpen) lightbox.classList.add("is-open");
      });
    }
    return true;
  }

  page.querySelectorAll("[data-gallery-open]").forEach(function (trigger) {
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.addEventListener("click", function (event) {
      if (event.defaultPrevented || (event.button != null && event.button !== 0) ||
          event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (openLightbox(trigger)) event.preventDefault();
    });
  });

  lightbox.querySelectorAll("[data-gallery-close]").forEach(function (button) {
    button.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", function (event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "Tab" && !focusableElements().length) {
      event.preventDefault();
      focusElement(lightbox);
    }
  });

  document.addEventListener("focusin", function (event) {
    if (isOpen && !lightbox.contains(event.target)) focusElement(closeButton);
  });

  function applyMotionPreference() {
    if (!reduceMotion()) return;
    page.querySelectorAll("video").forEach(function (video) {
      video.autoplay = false;
      video.pause();
    });
    pauseCurrentVideo();
    if (currentMedia && currentMedia.tagName === "VIDEO") {
      currentMedia.autoplay = false;
      currentMedia.loop = false;
    }
    if (openFrame !== null) {
      window.cancelAnimationFrame(openFrame);
      openFrame = null;
      if (isOpen) lightbox.classList.add("is-open");
    }
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      finishClosing();
    }
  }

  if (motionQuery) {
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", applyMotionPreference);
    else if (motionQuery.addListener) motionQuery.addListener(applyMotionPreference);
  }
  applyMotionPreference();
  setupAlbums();
  page.dataset.galleryReady = "true";
})();
