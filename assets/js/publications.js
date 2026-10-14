(function () {
  "use strict";

  var page = document.querySelector(".publications-page");
  if (!page || page.dataset.publicationsReady === "true") return;
  var content = page.querySelector("[data-publications-content]");
  var search = page.querySelector("[data-publication-search]");
  var input = document.getElementById("publication-search");
  var clearButton = page.querySelector("[data-publication-clear]");
  var status = page.querySelector("[data-publication-status]");
  var empty = page.querySelector("[data-publication-empty]");
  var nav = page.querySelector("[data-publication-years]");
  var toolbar = page.querySelector(".publications-toolbar");
  if (!content || !search || !input || !search.contains(input) || !clearButton || !status || !empty) return;

  var groups = [];
  var currentGroup = null;
  function isSpacer(node) {
    if (node.nodeType === 3) return !node.textContent.trim();
    return node.nodeType === 1 && node.tagName === "P" && !node.textContent.trim() &&
      Array.from(node.children).every(function (child) { return child.tagName === "BR"; });
  }

  // Move existing rendered nodes; the Markdown and shortcode output stay the source of truth.
  Array.from(content.childNodes).forEach(function (node) {
    if (isSpacer(node)) { node.remove(); return; }
    if (node.nodeType === 1 && node.matches("h2.publication-year-heading") && node.id) {
      var section = document.createElement("section");
      section.className = "publication-year";
      section.setAttribute("aria-labelledby", node.id);
      var label = document.createElement("div");
      label.className = "publication-year-label";
      var count = document.createElement("p");
      count.className = "publication-year-count";
      var papers = document.createElement("div");
      papers.className = "publication-year-papers";
      content.insertBefore(section, node);
      label.appendChild(node);
      label.appendChild(count);
      section.appendChild(label);
      section.appendChild(papers);
      currentGroup = { section: section, heading: node, count: count, papers: papers, entries: [], hasOtherContent: false };
      groups.push(currentGroup);
    } else if (currentGroup) {
      currentGroup.papers.appendChild(node);
      if (node.nodeType !== 8 && !(node.nodeType === 1 && node.matches("article.publication-reference"))) {
        currentGroup.hasOtherContent = true;
      }
    }
  });

  function normalize(value) {
    return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  }

  var entries = Array.from(content.querySelectorAll("article.publication-reference")).map(function (article) {
    var entry = { article: article, text: normalize(article.textContent + " " + (article.dataset.topic || "")) };
    var group = groups.find(function (item) { return item.section.contains(article); });
    if (group) group.entries.push(entry);
    return entry;
  });
  var yearLinks = [];
  if (nav) {
    nav.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      var id;
      try { id = decodeURIComponent(href.slice(1)); } catch (_) { return; }
      // Numeric year IDs cannot safely be used as unescaped CSS selectors.
      var heading = document.getElementById(id);
      var group = groups.find(function (item) { return item.heading === heading; });
      if (group) yearLinks.push({ link: link, item: link.closest("li") || link, group: group });
    });
  }

  function syncYearNavigation() {
    var visible = groups.filter(function (group) { return !group.section.hidden; });
    var active = visible[0];
    var anchorOffset = active ? parseFloat(window.getComputedStyle(active.heading).scrollMarginTop) : 0;
    var scrollPadding = parseFloat(window.getComputedStyle(document.documentElement).scrollPaddingTop);
    var threshold = (Number.isFinite(anchorOffset) ? anchorOffset : 0) +
      (Number.isFinite(scrollPadding) ? scrollPadding : 0) + 2;
    visible.forEach(function (group) {
      if (group.section.getBoundingClientRect().top <= threshold) active = group;
    });
    yearLinks.forEach(function (item) {
      if (!item.group.section.hidden && item.group === active) item.link.setAttribute("aria-current", "location");
      else item.link.removeAttribute("aria-current");
    });
  }

  var navigationFrame = null;
  function scheduleYearNavigation() {
    if (navigationFrame !== null) return;
    navigationFrame = window.requestAnimationFrame(function () {
      navigationFrame = null;
      syncYearNavigation();
    });
  }

  function revealResultStart() {
    if (!toolbar) return;
    var contentTop = content.getBoundingClientRect().top;
    var toolbarBottom = toolbar.getBoundingClientRect().bottom;
    var gap = 16;
    if (contentTop < toolbarBottom + gap) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + contentTop - toolbarBottom - gap),
        behavior: "instant"
      });
    }
  }

  function filterPublications(keepResultsVisible) {
    var query = normalize(input.value);
    var tokens = query ? query.split(" ") : [];
    var visibleCount = 0;
    entries.forEach(function (entry) {
      var matches = tokens.every(function (token) { return entry.text.includes(token); });
      entry.article.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    groups.forEach(function (group) {
      var count = group.entries.filter(function (entry) { return !entry.article.hidden; }).length;
      group.count.textContent = count + (count === 1 ? " paper" : " papers");
      // Preserve unexpected prose/media instead of making it disappear as an empty year.
      group.section.hidden = count === 0 && !group.hasOtherContent;
    });
    yearLinks.forEach(function (item) { item.item.hidden = item.group.section.hidden; });
    clearButton.hidden = input.value.length === 0;
    empty.hidden = visibleCount !== 0;
    status.textContent = visibleCount ? visibleCount + (visibleCount === 1 ? " publication" : " publications") : "No publications found";
    if (keepResultsVisible !== false) revealResultStart();
    syncYearNavigation();
  }

  function clearSearch() {
    input.value = "";
    filterPublications();
    input.focus({ preventScroll: true });
  }

  input.addEventListener("input", filterPublications);
  input.addEventListener("search", filterPublications);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && input.value) {
      event.preventDefault();
      clearSearch();
    }
  });
  search.addEventListener("submit", function (event) { event.preventDefault(); });
  clearButton.addEventListener("click", clearSearch);
  page.querySelectorAll("[data-publication-reset]").forEach(function (button) {
    button.addEventListener("click", clearSearch);
  });
  if (yearLinks.length) {
    window.addEventListener("scroll", scheduleYearNavigation, { passive: true });
    window.addEventListener("scrollend", scheduleYearNavigation);
    window.addEventListener("resize", scheduleYearNavigation);
    window.addEventListener("hashchange", scheduleYearNavigation);
    window.addEventListener("load", scheduleYearNavigation, { once: true });
    // Keep native anchor navigation; update the active year after its scroll.
    nav.addEventListener("click", scheduleYearNavigation);
  }

  content.classList.add("is-enhanced");
  search.hidden = false;
  filterPublications(false);
  scheduleYearNavigation();
  page.dataset.publicationsReady = "true";
})();
