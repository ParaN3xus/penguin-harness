# Third-party notices

PenguinHarness itself is licensed under Apache-2.0 (see [LICENSE](LICENSE)). Some **distributed
release artifacts** additionally bundle third-party programs and files, which keep their own
licenses. This file records those, and how to obtain their source.

Nothing listed here is source code of this repository. The programs below are downloaded by the
release workflow (`.github/workflows/release.yml`) and placed alongside the application inside the
release archives; the fonts are copied out of an npm dependency into the built web assets.
Installing from npm (`@prismshadow/penguin-cli`) bundles none of them.

What earns an entry is a third-party work redistributed **as its own file**. An npm package whose
JavaScript is compiled and minified into the application bundle (React, Shiki, xterm.js, KaTeX's own
code, ...) is not listed: its license travels with it in `node_modules` and in the lockfile, and
repeating every one of them here would be a second, staler copy of `pnpm-lock.yaml`.

## Node.js runtime — `node/`

Present in every archive except `penguin-universal.tar.gz`. Downloaded unmodified from the
official distribution at <https://nodejs.org/dist/>. Node.js is MIT-licensed with additional
notices for its dependencies; the full text ships inside the bundle
(`node/LICENSE`, and on Windows `node/LICENSE`).

Source: <https://github.com/nodejs/node> — the tag matching the bundled version, which is pinned
as `NODE_RUNTIME_VERSION` in the release workflow.

## MinGit (Git for Windows) — `git/`

Present in `penguin-win32-x64.zip` only.

The Windows package bundles **MinGit**, the minimal redistributable build of Git for Windows,
unmodified, as published by the Git for Windows project. It supplies the POSIX shell that the
agent's `exec_command` runs (`git/usr/bin/sh.exe`, which is GNU bash), roughly sixty core
utilities, and `git.exe`. It is used only when the machine has no Git for Windows installation of
its own; a user-installed one always takes precedence.

**License: GNU General Public License version 2** (with the additional per-component licenses
that Git for Windows ships). The complete license texts are included inside the bundle at
`git/LICENSE.txt` and `git/mingw64/share/licenses/`.

Version bundled: the release attached to the Git for Windows tag pinned as `MINGIT_TAG` in the
release workflow.

**Written offer / source availability.** The complete corresponding source code for the bundled
MinGit is published by the Git for Windows project at:

- <https://github.com/git-for-windows/git> — repository, tagged per release
- <https://github.com/git-for-windows/git/releases> — release assets, including the source
  archives for each tag

The bundled binaries are byte-identical to the `MinGit-<version>-64-bit.zip` asset of that tag;
no patches are applied. If you need the corresponding source and cannot obtain it from the URLs
above, open an issue on this repository and we will provide it.

## KaTeX fonts — `KaTeX_*.woff2` in the web assets

Present wherever the Web App ships: every release archive, the desktop application, and the assets
the server serves.

Math rendering uses [KaTeX](https://katex.org), whose typefaces are separate font files rather than
code. The web build copies them unmodified out of the `katex` npm package into the application's
asset directory, where the browser fetches them by URL; bundling them locally is what lets the
desktop application render formulas with no network. Only the woff2 format is copied — the woff and
truetype fallbacks KaTeX also ships are dropped at build time (`dropNonWoff2FontSources` in
`packages/web/vite.config.ts`).

**License: MIT**, the same license as the rest of KaTeX. The full text ships inside the package, at
`node_modules/katex/LICENSE`.

Source: <https://github.com/KaTeX/KaTeX> — the tag matching the `katex` version resolved in
`pnpm-lock.yaml`. The font sources and the script that builds them live in that repository.

## MiSans typeface — MiSans Light

PenguinHarness uses [MiSans](https://hyperos.mi.com/font/) (MiSans Light), a typeface by Xiaomi Inc.
(小米科技有限责任公司), unmodified, as its light (thin) typeface in its pages and screenshots, and
may bundle the font files inside the application. The license permits distributing an application
made with MiSans; the font files, or any component of them, are never distributed, sublicensed or
offered for download on their own. When the application bundles MiSans, it also states that it
uses the font, as condition 1 below requires.

Copyright (c) Xiaomi Inc. All rights reserved.

**License: MiSans Font Intellectual Property License Agreement (MiSans 字体知识产权许可协议).** The
full text follows as published by the licensor, in Chinese:

> 本《MiSans 字体知识产权许可协议》（以下简称“协议”）是您与小米科技有限责任公司（以下简称“小米”或“许可方”）之间有关安装、使用 MiSans 字体（以下简称“MiSans”或“MiSans 字体”）的法律协议。
>
> 您在使用 MiSans 的所有或任何部分前，应接受本协议中规定的所有条款和条件。安装、使用 MiSans 的行为表示您同意接受本协议所有条款的约束。否则，请不要安装或使用 MiSans，并应立即销毁和删除所有 MiSans 字体包。
>
> 根据本协议的条款和条件，许可方在此授予您一份不可转让的、非独占的、免版税的、可撤销的、全球性的版权许可，使您依照本协议约定使用 MiSans 字体，前提是符合下列条件：
>
> 1. 您应在软件中特别注明使用了 MiSans 字体。
> 2. 您不得对 MiSans 字体或其任何单独组件进行改编或二次开发。
> 3. 您不得单独将 MiSans 字体或其组件对外租赁、再许可、给予、出借或进一步分发字体软件或其任何副本以及重新分发或售卖。此限制不适用于您使用 MiSans 字体创作的任何其他作品。如您使用 MiSans 字体创作宣传素材、logo、应用 App 等，您有权分发或出售该作品。
