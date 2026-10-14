# [SJTU-DENG-Lab.github.io](https://SJTU-DENG-Lab.github.io/)

This git repo hosts all content displayed on the website of DENG Lab @ SJTU.


## How to build

1. Install Hugo Extended 0.165.0 (also recorded in `.hugo-version` and the deployment workflow).
2. Run the following commands:

```bash
git clone https://github.com/SJTU-DENG-Lab/SJTU-DENG-Lab.github.io.git
cd SJTU-DENG-Lab.github.io
hugo server
```

For local design work, keep generated files separate from the existing `public/` directory:

```bash
hugo server --bind 127.0.0.1 --port 1313 --destination /tmp/deng-lab-preview --cacheDir /tmp/deng-lab-hugo-cache
```

Open `http://localhost:1313/`. Changes reload automatically. Running this command does not commit or publish anything.

GitHub Pages uses the Hugo Actions workflow. Pushes to `main` build into a fresh runner temporary directory and deploy that artifact; the legacy `docs/` and `public/` directories are not deployment sources.

The shared header and footer use `static/img/lab/logo.svg`, derived from `sjtu-deng-lab-black.pdf`. The supplied PDF contains a raster logo with a baked-in checkerboard; the web asset preserves the lettering with a transparent background and tight bounds. `static/favicon.svg` uses the same handwritten D. Both support dark backgrounds.
Restart the preview after changing menu configuration so every page uses the updated navigation.

## Homepage content

- `data/news.json`: all announcements; the first four appear on the homepage and the full list appears at `/news/`. Dates use `YYYY-MM`; keep entries newest first.
- `data/research.json`: selected research with verified paper, code, and blog links. Each figure records its source PDF, page, and figure label in `figure_source`. Leave unavailable links empty.
- `static/img/research/`: figures extracted from the original papers. Display them with `object-fit: contain` to preserve diagram labels and axes.
- `static/js/research-lightbox.js`: opens homepage figures in an accessible native dialog. Without dialog support or JavaScript, each figure link opens the original image; Paper links remain separate.
- `static/fonts/`: self-hosted Inter variable font and its SIL Open Font License.
- `layouts/partials/home/`: homepage sections and project links.
- The homepage Gallery section displays the first two videos with `external_url` from `content/gallery.md`, reusing their posters, titles, and complete source links. Cards open the source video in a new tab; keep posters static and lightweight.
- `assets/css/extended/zz-lab.css`: project styling, responsive navigation, and homepage layout.
- `content/contact.md`: prospective-member information.
- `content/gallery.md`: Gallery media, grouped into Photos and Videos at `/gallery/`. Each photo fills the album width without cropping. Videos use a two-column grid (one on phones); `external_url` and `platform` link a local `poster` to the original video page in a new tab. The four Xiaohongshu videos and their covers were verified on the DENG Lab account on 2026-10-12. Keep the platform-provided share parameters when updating links. Local videos/GIFs can still use `src`, `format`, and `poster` to open in the viewer. `label: Illustration` distinguishes artwork from lab photographs.
- `assets/css/gallery.css` and `assets/js/gallery.js`: Gallery layout, album controls, and media viewer. Hugo fingerprints both assets. The album advances every five seconds, with arrows over the photo edges and position dots along the bottom. Arrows loop through the album; Home/End and touch scrolling are supported. The play/pause control appears only on keyboard focus. Hover, focus, an open viewer, or a hidden page suspend playback; reduced motion disables autoplay by default. Media links remain usable without JavaScript.

The canonical homepage is `/`; `/home/` forwards to it. Keep image sources under `static/` or a content bundle; `public/` is generated output.

The legacy `publications.json` is older than `content/publications.md`. Do not regenerate or replace the current publication list from it without reconciling newer entries.

## Publications page

- `content/publications.md` remains the bibliography source. Keep the `### YYYY` year headings and `publication` shortcodes; preserve author contribution markers and link parameters.
- `layouts/_default/publications.html`, `layouts/shortcodes/publication.html`, and `assets/css/publications.css` control the year-grouped layout and paper resources. The heading render hook promotes publication years to H2 while leaving other headings unchanged.
- `assets/js/publications.js` adds search across titles, authors, venues, and the existing `data-topic` metadata, plus the active-year indicator. All terms must match; empty years disappear from the results. Without JavaScript, all papers and year links remain available. CSS and JS are fingerprinted by Hugo.

## Blogs page

- `layouts/section/blogs.html` and `assets/css/blogs.css` control the responsive article cards at `/blogs/`. The stylesheet only loads on the listing; article pages keep their reading layout.
- `data/blog_previews.json` contains short listing summaries and language labels, keyed by the article's content path. New entries without an override fall back to a shortened Hugo summary. Titles, dates, covers, and full author lists come from the article front matter. Preserve the separate AdaMoE English and Chinese URLs.

## Join Us page

- `content/contact.md` is the source for research interests, contact information, and introductory-email suggestions. The `join_block` shortcode groups this Markdown into the introduction, research, contact, preparation, and related links.
- `layouts/_default/contact.html` and `assets/css/join.css` control the layout at `/contact/`. Keep materials and the example subject line as suggestions, and preserve the optional wording for work samples.

## People portraits

- `content/people.md`: member cards in one continuous `lab_members_grid`, with each person’s role below their name. `image` selects a file under `static/img/members/`; optional `image_position`, `image_fit`, and `image_scale` adjust the displayed crop without editing the source.
- `assets/css/team.css`: Team-only member grids, portrait frames, link motion, and the compact Alumni list. Personal homepages link from the portrait and name; Scholar and OpenReview remain separately labeled. Hover motion is limited to linked portraits and respects reduced-motion preferences.
- Alumni uses a bulleted list with bold names followed by the original description. Empty or `#` homepage values render as plain text.
- `data/member_portraits.json`: personal-homepage image URLs and user-supplied photo provenance. Preserve illustrated homepage avatars unless the member supplies a replacement; do not substitute a guessed photograph.
- `static/img/members/unknown.jpg`: shared placeholder, replaced at the user's request on 2026-10-13 with the original default portrait from [TSAIL People](https://ml.cs.tsinghua.edu.cn/people.html), [source image](https://ml.cs.tsinghua.edu.cn/imgs/bayes.jpg). This is a placeholder, not a member's photograph.
- Original images remain local. The member shortcode generates WebP thumbnails up to 400px wide during the build, so the page does not load full-size portraits or rely on external image hosts.

## How to generate publication list

1. Copy the latest publication json to the root folder.
2. Run the following
```bash
python gen_publications.py
```
3. Copy the output of this script to `content/publications.md`
