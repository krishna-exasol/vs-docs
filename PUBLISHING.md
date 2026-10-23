# Publishing the slides

GitHub Pages should use **GitHub Actions** as its publishing source. The workflow
in `.github/workflows/pages.yml` builds and deploys each push to `main`.

One-time migration from branch publishing: after this workflow is committed,
choose **Settings → Pages → Build and deployment → Source → GitHub Actions**.
The existing published site remains in place until the new deployment succeeds.

`scripts/build-pages.mjs` embeds the checkout's full commit ID and commit time
in the published HTML and writes matching `version.json` metadata. It changes
only the generated `_site/` output. It refuses to publish uncommitted source
files as a committed version.

The compact footer shows the presentation version, the loaded commit, the
viewer-local timestamp (for example `23 Oct 2026 7:44 PM`) and the navigation
hint inline, wrapping naturally on smaller screens. It has no publication-status
messages or latest-version checking control. Its commit link identifies the
loaded HTML, not a later commit from GitHub.

The working HTML labels its revision as **Base commit**. When editing it, update
`page-build-info.updatedAt` with the edit time in ISO 8601 UTC and `basedOn` with
the current base commit. Keep `commit` null and `state` as `local-preview`.
To render an unpublished local preview, run:

```sh
node scripts/build-pages.mjs --preview
```

Do not copy generated `_site/vs-slides.html` back over the source. A raw copy of
the source from GitHub is a development document; the Pages deployment is the
commit-stamped presentation.
