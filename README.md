# pr-title-check

A GitHub Action that validates pull-request titles against deterministic
structural rules and an optional AI semantic check via Gemini Flash.

It is designed to be trivially adoptable: drop it into a workflow and you
get sane defaults out of the box. Override anything via a YAML file in
the consumer repo.

## What it catches

* Low-effort titles — `dev fixes`, `wip`, `misc updates`, `various changes`.
* Missing structural conventions — emoji prefix, length minimums.
* Syntactically valid but semantically lazy titles (e.g. `🐛 fix some
  stuff`) via an optional Gemini Flash call.

## Quick start (zero config)

```yaml
# .github/workflows/pr-title-check.yml
name: PR Title Check
on:
  pull_request:
    types: [opened, edited, synchronize, reopened]
permissions:
  pull-requests: write
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: slntopp/pavel-request-checker@v1
```

That's it. With no other config, the action enforces:

* Required emoji prefix from a small set (`✨`, `🐛`, `📝`, `♻️`, `🧪`,
  `🔧`, `⚡`, `🚀`, `⭐`, `🧹`, `⚙️`).
* Minimum 4 words after the emoji.
* Maximum 72 characters total.
* A banned-phrase list (`dev fixes`, `wip`, `misc`, etc.).
* Sticky PR comment with the verdict; the job fails when the title is
  not acceptable.

## Enable the AI semantic check

Add a `gemini-api-key` input:

```yaml
- uses: slntopp/pavel-request-checker@v1
  with:
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
```

The AI step runs only when the structural rules already pass. If Gemini
errors or times out the check **fails open** — the AI check is skipped
and a note is added to the sticky comment.

## Inputs

| Input              | Default                            | Description                                                              |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------ |
| `github-token`     | `${{ github.token }}`              | Token used for commenting.                                               |
| `config-path`      | `.github/pr-title-check.yml`       | Path to the ruleset YAML. If missing, defaults are used.                 |
| `gemini-api-key`   | _(unset)_                          | Enables the AI semantic check when present.                              |
| `mode`             | `both`                             | `fail` (set the job red), `comment` (only comment), or `both`.           |
| `comment-on-pass`  | `true`                             | If `false`, the sticky comment is deleted when the title passes.         |

## Outputs

| Output    | Description                                                  |
| --------- | ------------------------------------------------------------ |
| `passed`  | `"true"` if all enabled checks passed.                       |
| `reasons` | JSON array of failure-reason strings (empty when passing).   |

## Customizing the ruleset

Drop a file at `.github/pr-title-check.yml`. The schema mirrors the
[defaults](src/defaults.ts) and is **deep-merged** over them — partial
overrides are fine.

```yaml
rules:
  emoji:
    enabled: true
    required: true
    allowed:
      "✨": feat
      "🐛": fix
      "🎨": style
  length:
    min_words: 5
    max_chars: 80
  banned_phrases:
    - "dev fixes"
    - "small tweaks"
  conventional:
    enabled: false
  format: all  # or "any" — see below

ai:
  enabled: true
  model: gemini-3.1-flash-lite
  guidance: |
    We work on a payments system. Reject titles that don't name the
    specific service or endpoint affected.
```

### Footgun: arrays and the emoji map replace, not merge

* `rules.banned_phrases` — your list **replaces** the default list.
* `rules.conventional.extra_types` — same.
* `rules.emoji.allowed` — your map **replaces** the default map.

This is intentional. Pulling in 9 default banned phrases when you only
wanted 1 of them is more surprising than just listing what you want.
If you want defaults plus extras, copy the defaults into your YAML.

Everything else (numbers, booleans, nested objects) deep-merges
normally — set just one field and the rest stay at their defaults.

### Combining emoji and conventional: `rules.format`

When both `rules.emoji.enabled` and `rules.conventional.enabled` are
`true`, the `rules.format` setting controls how they combine:

* `all` _(default)_ — title must satisfy **both** the emoji rule and
  the Conventional Commits rule.
* `any` — title must satisfy **either** the emoji rule **or** the
  Conventional Commits rule. Each one passing on its own is enough.

`length` and `banned_phrases` always apply regardless of `format`.

```yaml
rules:
  emoji:
    enabled: true
    required: true
  conventional:
    enabled: true
  format: any
```

With the config above, all three of these titles pass:

* `✨ add user pagination endpoint` _(emoji only)_
* `feat: add user pagination endpoint` _(conventional only)_
* `✨ feat: add user pagination endpoint` _(both)_

## How it works

1. The action reads the PR title from the event payload.
2. Rules layer runs all enabled checks and collects every failure.
3. If the rules pass and `gemini-api-key` is provided, Gemini is called
   with a fixed system prompt and a strict JSON response schema. The
   call has a 10-second timeout and one retry on 5xx/timeout. On
   persistent error the AI step is skipped (fail-open) and noted in
   the comment.
4. A sticky comment (`<!-- pr-title-check -->`) is created or updated.

## Default rules

The defaults live in [`src/defaults.ts`](src/defaults.ts). Summary:

| Rule              | Default                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `emoji.enabled`   | `true`                                                                 |
| `emoji.required`  | `true`                                                                 |
| `emoji.allowed`   | `✨ feat`, `🐛 fix`, `📝 docs`, `♻️ refactor`, `🧪 test`, `🔧 chore`, `⚡ perf`, `🚀 release`, `⭐ highlight`, `🧹 cleanup`, `⚙️ config` |
| `length.min_words`| `4` (after stripping the emoji)                                        |
| `length.max_chars`| `72`                                                                   |
| `banned_phrases`  | `dev fixes`, `wip`, `misc`, `misc updates`, `various changes`, `stuff`, `things` |
| `conventional`    | `enabled: false`                                                       |
| `format`          | `all` (when both emoji and conventional are enabled)                   |
| `ai.enabled`      | `true` (only runs if a `gemini-api-key` is provided)                   |
| `ai.model`        | `gemini-3.1-flash-lite`                                                |

## Behavior notes

* **Draft PRs**: skipped with success.
* **Non-pull_request events**: skipped with a warning. The action
  should only be wired up against `pull_request` (or
  `pull_request_target`).
* **Title edited during a run**: the title is read from the event
  payload, so the value at trigger time is what's checked. Include
  `synchronize` in your trigger types if you want the workflow to
  re-run when commits are pushed.
* **Forks without comment permissions**: the action logs a warning and
  continues; the job's pass/fail status still works.
* **Gemini quota or rate-limit (429)**: fail-open, no retry.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

The action is bundled with `@vercel/ncc` into `dist/index.js`. CI
verifies that `dist/` is in sync with `src/`. Always run `npm run
build` and commit `dist/` along with your changes.

### Releasing

* Push a tag `vX.Y.Z`.
* CI updates the `vX` floating tag to point at the same SHA so
  consumers tracking `@v1` get the latest patch.

## License

[MIT](LICENSE)
