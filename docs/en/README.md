# dsh-translate — Translation Mode for DeepSeek Harness

![dsh-translate icon](../icon-128.png)

![DSH bundle spec 0.2.1-rc.2](../badges/dsh-bundle.svg)

[中文](../../README.md) | English

Adds a **Translation Mode** to [DeepSeek Harness](https://github.com/deepseek-ai) (Web UI and desktop): an agent preset that returns only the translation, plus language-direction and translation-style controls in the composer tool row.

## Features

- **Translation preset**: pick the 「翻译模式」(Translation Mode) preset for a new session; the model returns only the translation — no commentary, no quotes, no code fences — while keeping line breaks, numbering and code blocks.
- **Composer tool row** (translate-mode sessions only): `[source ▾] [⇄] [target ▾] [style ▾]`, matching the native model and permission selectors.
- **Language menu**: search or type a custom language (`+` to add, custom languages can be deleted); the selected language is marked with a check; with "allow the same source and target language" off, the two menus exclude each other.
- **Target language "auto"**: the default, resolved per sentence — see below.
- **Style menu**: the translation style saves automatically; styles can also be saved as presets, applied and deleted.
- **Settings page**: Settings → Translation Mode — preferred source/target language, allow-same toggle, style preset management.
- UI copy and the plugin-inventory title/description are available in 18 languages.

## Target language "auto"

Both source and target default to "auto". With the target on "auto", every sentence is resolved as:

| Source language | UI language | Translate into |
|---|---|---|
| not the UI language | any | the UI language |
| the UI language | not English | English |
| English | English | Chinese |

## Install

This repository is a DSH bundle. Install it with the plugin manager (target: the absolute path to this repository):

```
plugin_manager({ action: "install_bundle", target: "<absolute path to this repository>" })
```

Then enable it under Settings → Plugins and pick the translation preset when creating a new session.

Maintenance and implementation notes: [docs/agent/README.md](../agent/README.md).

## License

MIT (see LICENSE, author 576576)
