# A NOTICE file carries the MiSans typeface's license

- **Date:** 2026-09-17
- **Type:** process
- **Scope:** `tooling`, `ci`

[中文版](2026-09-17-notice-misans.zh.md)

A root `NOTICE` file was added in the style of the Apache Arrow and Typst notices: the project's copyright and license, then one section per third-party component with the license that applies to it. Its first section attributes MiSans (MiSans Light), the light typeface PenguinHarness uses in rendered pages and screenshots, and carries the full text of the MiSans Font Intellectual Property License Agreement as Xiaomi publishes it: the software must state that it uses MiSans, the font may not be adapted, and its files may not be distributed on their own.

## Details

- The published `@prismshadow/penguin-core`, `@prismshadow/penguin-server` and `@prismshadow/penguin-cli` packages ship `NOTICE` beside `LICENSE`: both are in their `files` allowlists, the release workflow copies both into the package directories, and CI's pack check now requires `NOTICE` in the server tarball.
- `THIRD-PARTY-NOTICES.md` and both READMEs point to `NOTICE`; the bundled Node.js runtime, MinGit and KaTeX fonts stay documented in `THIRD-PARTY-NOTICES.md`.
