---
name: release-notes
description: Generate ParkFlow release notes from git history since the last tag. Usage: /release-notes [major|minor|patch]
---

Generate professional release notes for a new ParkFlow version bump.

**Project:** ParkFlow
**Remote:** https://git.matheo.si/jakobo/parkflow

## Arguments

`$ARGUMENTS` will be one of: `major`, `minor`, or `patch`.
If omitted, default to `patch`.

## Steps

### 1. Determine current version

Run:
```
git tag --sort=-v:refname | head -1
```

Parse the latest tag as a semver string, stripping any leading `v`.
If no tags exist, start from `0.0.0`.

### 2. Calculate next version

Based on `$ARGUMENTS`:
- `major` → increment first number, reset minor and patch to 0 (e.g. `1.2.3` → `2.0.0`)
- `minor` → increment second number, reset patch to 0 (e.g. `1.2.3` → `1.3.0`)
- `patch` → increment third number only (e.g. `1.2.3` → `1.2.4`)

Always prefix the tag with `v` (e.g. `v2.0.0`).

### 3. Collect commits since last tag

Run:
```
git log <last_tag>..HEAD --pretty=format:"%H|%s|%an"
```

If no previous tag exists, use all commits: `git log --pretty=format:"%H|%s|%an"`.

Filter out bare merge commits (subject starts with `Merge branch` or `Merge pull request`) — unless they carry a meaningful summary in their body.

### 4. Classify commits

Map conventional commit prefixes to sections:

| Prefix | Section | Emoji |
|---|---|---|
| `feat:` / `feat(...):`  | Features | ✨ |
| `fix:` / `fix(...):` | Bug Fixes | 🐛 |
| `perf:` | Performance | ⚡ |
| `refactor:` | Refactoring | ♻️ |
| `chore:` / `style:` / `build:` | Maintenance | 🔧 |
| `docs:` | Documentation | 📝 |
| `test:` / `ci:` | Tests & CI | 🧪 |
| `revert:` | Reverts | ⏪ |

Breaking changes: any commit whose subject contains `!` before the colon (e.g. `feat!:`, `fix(auth)!:`) or whose body contains `BREAKING CHANGE:` → collect into a **⚠️ Breaking Changes** section, which must appear first.

### 5. Collect contributors

From the same `git log` output, extract unique author names (excluding bots such as `dependabot` or names ending in `[bot]`).

### 6. Produce the release notes

Use this exact template, omitting any section that has no entries.

CRITICAL formatting rules:
- Output ONLY the raw markdown — no prose, no commentary, no code fences wrapping the output.
- Every section title MUST start with `###` (three hashes) followed by a space, e.g. `### ✨ Features`.
- The title line uses `##` (two hashes), e.g. `## 🚀 ParkFlow v1.1.0 – Week Navigation`.
- Place `<hr/>` on its own line immediately after the title and again immediately before the Contributors section.
- Bullet points use `- ` with no extra indentation.
- List each contributor on its own bullet line (`- Name`), never comma-separated.
- Place a `---` horizontal rule on its own line immediately before the **Full Changelog** line.
- The **Full Changelog** line MUST be a fully resolved GitLab compare URL in this exact shape: `https://git.matheo.si/jakobo/parkflow/-/compare/<last_tag>...<new_tag>` — with `<last_tag>` and `<new_tag>` replaced by the real tag strings (e.g. `v1.2.8` and `v1.2.9`). Always use the `git.matheo.si/jakobo/parkflow` GitLab path with the `/-/compare/` segment — never `github.com`, never `/compare/` without the `/-/`. Never emit literal `<last_tag>` / `<new_tag>` placeholders. Correct example: `https://git.matheo.si/jakobo/parkflow/-/compare/v1.2.8...v1.2.9`.

Template:

## 🚀 ParkFlow <new_tag> – <Release Title>

<hr/>

### ⚠️ Breaking Changes
- <breaking change description>

### 🗺️ Migration Notes
> Review the following before upgrading:
- [ ] TODO: describe database migration steps
- [ ] TODO: describe API changes
- [ ] TODO: describe environment variable changes

### ✨ Features
- <feat commit message, de-prefixed>

### 🐛 Bug Fixes
- <fix commit message, de-prefixed>

### ⚡ Performance
- <perf commit message, de-prefixed>

### ♻️ Refactoring
- <refactor commit message, de-prefixed>

### 🔧 Maintenance
- <chore/style/build commit message, de-prefixed>

### 📝 Documentation
- <docs commit message, de-prefixed>

### 🧪 Tests & CI
- <test/ci commit message, de-prefixed>

<hr/>

### 👥 Contributors
- <author name>
- <author name>

---

**Full Changelog:** https://git.matheo.si/jakobo/parkflow/-/compare/<last_tag>...<new_tag>

> One bullet per unique contributor (never comma-separated), then a `---` rule before the Full Changelog line. Replace `<last_tag>` and `<new_tag>` with the actual tag strings from steps 1 and 2. Final rendered line must look like: `**Full Changelog:** https://git.matheo.si/jakobo/parkflow/-/compare/v1.2.8...v1.2.9` — never leave the angle-bracket placeholders in the output, never substitute `github.com`, never omit the `/-/` segment.

---

**Release title** conventions:
- `major` → infer a theme from dominant feat commits, else "Major Release"
- `minor` → infer a theme from the most significant feat, else "Minor Release"
- `patch` → "Patch Release"

### 7. Print the git tag and push commands

After the release notes block, print these lines so the user can copy them:

```
**Tag command:**
`git tag <new_tag> && git push origin <new_tag>`
```

### 8. Cleanup rules

- Strip the conventional commit prefix from each bullet (e.g. `feat: add X` → `Add X`; capitalize first letter).
- Strip scope parentheses from bullets, but you may note the scope in parentheses at the end if it aids clarity: `Update BE tests (ci)`.
- Do not include commit hashes in the output.
- Keep bullets concise — one line each.
- Never invent changes that are not in the git log.
- If there are zero commits since the last tag, warn the user and stop — do not generate empty release notes.
