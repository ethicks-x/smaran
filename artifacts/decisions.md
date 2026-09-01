# Decisions

Choices already made, with the reasoning. The point of this file is that a future agent
does not accidentally reverse one while "fixing" something adjacent.

Format: `D-nn` · date · decision · why · what would change it.

---

## D-01 · 2026-08 · Auth is Clerk, not Better Auth

**Decision.** The mobile app authenticates with Clerk (`@clerk/expo`) using the hosted
Account Portal flow, returning to the app on the `smaran://` scheme.

**`plan.md` §4.2 says Better Auth.** It has not been updated; `plan.md` is a submission
document and is treated as read-only. The code is the fact.

**Why.** Clerk ships a working Expo hosted-auth flow, secure token cache, and user profile
out of the box — days of work the team does not have. `useUser()` gives first name, email,
phone and avatar, which several screens already read.

**Consequences.** Web and API auth are still undesigned, and they must end up sharing an
identity with the mobile app. The PS's *enrollment* model — a caregiver provisions the
device once, the patient never signs in again — is not what Clerk's sign-in flow does out
of the box, and bridging that gap is open work.

**Binding regardless of provider:** the patient signs in once and stays signed in. No flow
may ask an elderly user with dementia to re-authenticate.

**Would change it if:** the caregiver-enrollment model turns out to be unbuildable on
Clerk, or web/API integration proves worse than a self-hosted alternative.

---

## D-02 · 2026-08 · `UIScale` — one global size dial

**Decision.** Every spacing, radius, touch target and type size derives from a single
`UIScale` constant in `theme/layout.ts` (currently `0.75`) via `scale()`.

**Why.** The base scale is tuned for low-vision, low-dexterity users and is very large. One
constant lets the whole app be re-tuned in a single edit instead of a hundred.

**Consequences.** A hardcoded pixel value is a bug, not a style nit — it silently opts out
of the dial. Touch targets are clamped so scaling can never push them under the 48pt
platform floor.

---

## D-03 · 2026-08 · Semantic colour tokens only, AAA-rated

**Decision.** Screens and components read `colors.text`, `colors.primaryMuted`,
`colors.dangerMuted` — never a hex literal. Both palettes are tuned so every foreground
token clears WCAG AAA (7:1) against the surfaces it pairs with, accents included.

**Why.** The audience has age-related vision loss. A hex literal in a component is an
uncheckable contrast claim and breaks dark mode silently.

**Consequences.** New colours go in `theme/colors.ts` in both schemes, contrast-checked, or
they do not go in.

---

## D-04 · 2026-08 · `NativeHost` wraps every `@expo/ui` component, with a fixed seed

**Decision.** All `@expo/ui` usage sits inside `NativeHost`, which passes the current colour
scheme and a **fixed** seed colour (`Colors.light.primary`) into SwiftUI/Compose.

**Why.** The seed is not a colour to paint — it is the root of a tonal palette the platform
regenerates from scratch whenever the value changes, in every host on screen. A fixed seed
plus a `colorScheme` switch means toggling light/dark no longer rebuilds a Material 3
palette per icon.

**Consequences.** An `@expo/ui` component outside a `NativeHost` silently falls back to
platform defaults. Do not pass the live theme's `primary` as the seed.

---

## D-05 · 2026-08 · Recall is a warm-up, not a lock

**Decision.** After sign-in, once per launch, the reader types their own name into a row of
boxes and watches a progress bar fill. Scored per letter as it lands. After three wrong
full-length attempts the name is offered outright. State is in memory only — nothing is
written to the device and nothing carries across launches.

**Why.** It is a gentle cognitive warm-up and a moment of success, not a gate. Withholding
the answer from someone with dementia is cruel and would make the app unusable. Persisting
the result would defeat the once-per-launch rhythm.

**Consequences.** Do not add a "remember this" flag, a failure state, a timer, or a lockout.

---

## D-06 · 2026-08 · Bottom `TopTabs` pager, five labelled destinations

**Decision.** Navigation is a `TopTabs` pager pinned to the bottom. Icons and labels always
visible, never collapsed. Active tab marked by a filled pill behind the icon, not an
underline. Tapping jumps directly; only swiping animates.

**Why.** Recognition beats recall — no hidden drawers, no unlabelled icons, no gesture that
is the only path to something. A solid pill reads at arm's length where a 3pt rule does not.
Swipe is the gesture people reach for; tap must remain fully sufficient.

**Consequences.** Five is the ceiling. A sixth destination needs a different pattern, which
is why placing the games section is an open question (`progress.md`).

---

## D-07 · 2026-08 · Adaptive engine is a pure module with a frozen signature

**Decision.** `adjustDifficulty(recentSessions, current) → Difficulty`. No I/O, no storage
handle, no clock, no ambient randomness. v1 is rule-based and runs on-device.

**Why.** The rules must later be swapped for a model without touching game or storage code.
The seam only holds if the function is pure. Rules first because there is no patient data to
train on and it must work with the network off.

**Consequences.** Never add a fetch, a DB read, or a `Date.now()` inside it. Pass everything
in.

---

## D-08 · 2026-08 · Personal baseline, never a population score

**Decision.** Every metric, flag, and difficulty adjustment compares a patient to their own
history. No percentiles, no cohort averages, no cross-patient benchmarks anywhere in the
product or the pitch.

**Why.** It is the project's stated differentiator, and it is also the honest position — a
population norm for a dementia cohort in NER does not exist, and inventing one would put a
clinical-sounding number behind a guess.

**Consequences.** Constrains schema and API design: aggregates are per-patient time series
(`data-model.md`), and "is this concerning?" is always a deviation from that patient's own
trend.

---

## D-09 · 2026-08 · Sync is triggered, never assumed

**Decision.** The queue drains on app open, on connectivity regained, and on explicit user
action. No feature's correctness may depend on a background task having run.

**Why.** Managed Expo cannot promise unattended background execution, and the target devices
are low-end phones on unreliable power and network.

**Consequences.** Idempotent ingest is mandatory — `(device_id, seq)` upsert — because
batches will be retried and duplicated.

---

## D-10 · 2026-08 · Monorepo tooling: bun + uv + task + biome + ruff

**Decision.** Bun workspaces for JS/TS, uv for Python, `task` as the single command surface,
tmux for the dev dashboard, Biome for JS/TS lint+format, ruff for Python, husky +
lint-staged on commit.

**Why.** One fast toolchain per language, one entry point for humans and agents. Biome
replaces ESLint+Prettier in a single binary; ruff does the same on the Python side.

**Consequences.** Do not add ESLint, Prettier, black, isort, or npm/yarn/pnpm lockfiles.
New scripts get a `task` target rather than living only in a `package.json`.

---

## D-11 · 2026-08 · The product is called **Smaran**

**Decision.** User-facing name: **Smaran** (`app.json` `name`/`slug`, bundle
`com.smaran.app`, scheme `smaran://`).

**Why.** The team is *spaced* and the root package is still `cgamp` — both are internal
artefacts. `plan.md` uses the team name throughout because it predates the product name.

**Consequences.** Never surface "spaced" or "cgamp" to a user. Renaming the root package is
cosmetic and low priority.

---

## D-12 · 2026-08-29 · Localisation is bundled, not fetched — four languages to start

**Decision.** `i18next` + `react-i18next`, with `expo-localization` used only to guess an
opening language. All four catalogues — `en`, `hi`, `bn`, `as` — are `import`ed into the
bundle in `src/i18n/index.ts`. The reader's choice is stored on the device
(`smaran.language` in `expo-secure-store`) and applied by `LanguageProvider` before the
splash screen lifts, alongside the appearance preferences.

**Why bundled.** The catalogues are a few tens of kilobytes of text each; carrying all four
costs less than the code needed to fetch one, and it is the only shape that satisfies §2.1.
Syncing "just the active language" would mean a phone with no signal could not change
language — and the moment someone most wants their own language is not a moment we choose.
Every catalogue present means switching is an in-memory lookup.

**Why the stored choice beats the device locale.** These phones are usually set up by a
relative and then handed over, so the system language is a fact about the wrong person.
`deviceLanguage()` is the opening offer only; a stored choice always wins.

**Why these four.** English, Hindi, and the two languages that between them cover most of
the Brahmaputra valley. Full NER coverage is a translation and voice-recording programme,
not a hackathon task; the architecture extends by one locale file plus one row in
`Languages`.

**Latin digits everywhere.** Every locale tag pins `-u-nu-latn`. Otherwise `bn-IN` numbers
a date in Bengali digits while a count interpolated into a sentence stays Latin, and one
screen carries both. Latin is what the reader's clock, keypad and medicine packet already
use, and a dose or a time misread across numbering systems is a safety problem.

**Consequences and constraints.**

- **`en.json` is the contract.** `CustomTypeOptions` is augmented from `typeof en`, so a key
  that is not in the English catalogue is a compile error, and a translation that drops one
  falls back to English rather than showing a raw key.
- **No English string literals in screens.** A hardcoded string is now a bug in the same
  class as a hex literal (D-03): it silently opts out of three languages.
- **Never concatenate translated fragments.** Word order and case marking differ. Sentences
  that carry a name are whole keys per language — `greeting.namedMorning`, not a greeting
  with a name appended. Counts go through i18next plurals with `_one`/`_other`.
- **Token tables no longer carry copy.** `ThemeModeOptions`/`TextSizeOptions` are gone;
  `theme/appearance.ts` exports values only (`ThemeModes`, `TextSizes`) and
  `useAppearanceOptions()` labels them from `appearance.mode.*` / `appearance.size.*`.
- **Dates and numbers use `useLocale()`,** never `undefined` — the phone's locale is not
  necessarily the language on screen.
- **The translations are drafted, not reviewed.** They are consistent and idiomatic enough
  to demo, but no native speaker of Assamese, Bengali or Hindi has read them. Getting that
  review is outstanding work and is named in `progress.md`.

**The wordmark is transliterated, not translated.** `landing.wordmark` reads *स्मरण* /
*স্মরণ* / *স্মৰণ* — the same name D-11 fixed, written in the script the reader is reading.
Nothing becomes a different product name, and *Smaran* stays the name everywhere the
project is written about.

**No bundled fonts, deliberately.** Latin, Devanagari and the Bengali-Assamese script all
render from system fonts on both platforms, so `expo-font` is not needed yet. The first
language on a script the platform does not ship — Meitei Mayek for Manipuri, most likely —
brings a bundled face and a per-language `fontFamily` with it.

**Would change it if:** a catalogue grows large enough to matter to bundle size (it will
not, for text), or a language ships whose script needs a font that cannot be bundled.

---

## D-13 · 2026-08-29 · The reader edits their own name, number and photo — phone kept in metadata

**Decision.** `account/profile.tsx` is an editing screen. First name, last name and a phone
number are `TextField`s; the photo is picked from the library or taken with the camera
(`expo-image-picker`, added for this). All of it is drafted locally and committed by a
single "Save changes" button — `user.update()` for the names, `user.updateMetadata()` for
the number, `user.setProfileImage()` for the photo.

**The phone number is `unsafeMetadata.phone`, not a Clerk phone number.** Adding a real
phone number to a Clerk account means `createPhoneNumber` → SMS → read a six-digit code →
type it back before it expires. That is a timed memory task, and §2.3 says the app never
sets one. The number here is contact information, not a credential: nothing signs in with
it and nothing is sent to it. The saved value is displayed in preference to
`primaryPhoneNumber`, which is only ever a prefill for accounts that already have one.

**Why one Save rather than saving each field as it is edited.** A field that commits on
blur leaves no way to change your mind, and a half-typed number written to the account is
worse than no number. One button, one sentence of feedback under it, and a photo that is
visible in the preview but not sent until it is saved — so the picker can be opened, looked
at, and backed out of with nothing changed.

**Saving needs a signal, and that is allowed.** §2.1 is about the patient's daily flows —
reminders, games, contacts, voice. Correcting your own name is an account write; there is
nothing to do on-device but queue it, and there is no local store to queue into yet. A
failure says so in one warm sentence and leaves the draft on screen to try again. The
caught error is never inspected or logged: it carries the reader's own name and email
(§2.5), and the answer to the reader is the same sentence either way.

**Email stays read-only.** It is how the account signs in, and changing it is a
verification flow of the same shape as the phone one.

**Would change it if:** the API grows a patient profile of its own, at which point the
number (and probably the name) belong there with the local store in front of them, and
Clerk goes back to holding only what authentication needs.

---

## D-14 · 2026-08-29 · The API verifies Clerk tokens and owns no auth routes

**Decision.** `apps/api` authenticates with `clerk-backend-api`'s
`authenticate_request_async` and exposes **no authentication route of its own**. Sign-in,
sign-up, sign-out and refresh all happen in Clerk, driven by the clients; the backend only
ever asks "is this token valid, and who does it belong to". `src/features/auth/router.py`
keeps its health probe and nothing else, deliberately.

**Two guards, as decorators.** `@auth_required` and `@caregiver_required` in
`features/auth/decorators.py`, placed directly under the `@router.*` decorator.
`requires_auth` / `requires_caregiver` / `optional_auth` in `dependencies.py` are the same
checks in `Depends` form, for guarding a whole router at once — a decorator cannot do that —
alongside `CurrentUser` / `CurrentCaregiver` / `MaybeCurrentUser` annotations for a handler
that wants the caller as a parameter.

*(Amended 2026-08-31. The first version of this entry described three guards —
`@role_required` and `@admin_required` alongside `@auth_required` — and none of the code was
ever committed. What shipped is the two guards above. `require_roles(request, *roles)` in
`service.py` is the general form, as a function; wrap it if a second role ever needs a
decorator of its own.)*

**The checks are functions first, guards second.** Everything lives in
`features/auth/service.py` taking ordinary arguments — `authenticate` (caller or `None`,
never raises), `require_auth`, `require_caregiver`, `require_roles`, `roles_from_claims`,
`granted_roles`. The decorators and the dependencies are both thin wrappers over them, so a
service method, a background job or a script can run the same check with no route to hang a
decorator on. `AuthContext` (`schemas.py`) is the verified caller and holds nothing that did
not come out of the signed token; its `claims` field is `repr=False` so a session's claims
cannot reach a log line by accident (§2.5).

**How the decorator gets the request.** FastAPI reads a handler's signature to decide what
to inject, so the decorator rewrites it: if the handler does not already take a `Request`,
one is appended as a keyword-only parameter and stripped back off before the handler runs.
An `AuthContext` parameter goes the other way — removed from the signature FastAPI sees, so
it is not mistaken for a body field, then passed in with the verified caller. The upshot is
that path params, query params and response models all survive the wrapper untouched, and
neither injected parameter appears in the OpenAPI schema. Sync handlers are dispatched
through `run_in_threadpool` so they keep the threadpool treatment FastAPI would have given
them.

**Roles come from Postgres and from nowhere else.** `granted_roles(user_id)` reads the
`roles` table D-20 describes, and that is the only source. Clerk answers "who is this"; the
`roles` table answers "what may they do". **No claim in a token grants anything** — not
`org_role`, not a v2 `role`, not `roles` in metadata — so a misconfigured Clerk instance, a
stale JWT template, or anyone who talks Clerk's dashboard into stamping a role cannot widen
access to patient data (§2.5). Role authority stays in a table we own and can audit.

*(Amended 2026-08-31. The first version read roles out of four different token claims and
used the table only as a fallback. Both paths are gone; only the table is left.)*

**The role name is `CAREGIVER_ROLE` (default `caregiver`), not a literal**, so an instance
that names the role differently needs no code change. It is deliberately **not** prefixed
`CLERK_` — it names a value in our own column and Clerk knows nothing about it.

**`AuthContext` has no `roles` field and no `has_role` method.** It is an identity, not a
set of permissions. Asking what a caller may do is a query — `has_role(user_id, *names)` or
`is_caregiver(user_id)` in `service.py` — never an attribute read, because an attribute on a
token-derived object is exactly the thing that would quietly start trusting the token again.

**The cost is one query per role check.** A route that only needs `@auth_required` still
makes none. If that ever bites, the fix is a short-lived cache on `request.state`, not a
claim.

**`Request` is imported at runtime in `service.py`, not under `TYPE_CHECKING`.** The module
uses `from __future__ import annotations`, so FastAPI resolves a dependency's annotations
against its module globals — a `Request` it cannot resolve is silently read as a *query
parameter*, and every guarded route answers 422 instead of 401. Do not move that import.

**Failures say two things and no more.** 401 "You need to be signed in to do that.", 403
"You do not have access to this." Clerk's failure reason is never passed on: it is
diagnostic detail about someone's session (§2.5), and the caller can do nothing with it.

**Missing configuration is a boot failure, not a per-request one.** `CLERK_SECRET_KEY` is
required and non-empty, checked in the app lifespan. Without it every protected route would
answer 401 with no visible cause; failing at start with a message naming `.env.example` is
the cheaper mistake.

**`clerk_authorized_parties` is annotated `NoDecode`.** pydantic-settings JSON-decodes a
`list[str]` env value before any validator runs, so a plain comma-separated string — or an
empty one — raised a `SettingsError` at import. `NoDecode` hands the raw string to the
validator instead. Do not remove it.

**Would change it if:** the API needs to call Clerk's Backend API for user records (a
`Clerk` client and its lifecycle would then belong in `core/`), or machine-to-machine
tokens enter the picture, which needs `accepts_token` on `AuthenticateRequestOptions`.

---

## D-15 · 2026-08-29 · Settings look like the phone's settings; theme and text size are picked from pictures

**Decision.** The Account tab is laid out the way the platform's own settings app is: the
reader's row at the top (photo, name, email, chevron into `account/profile`), then cards of
plain rows — a tinted icon in a fixed-width column, the setting's name, and its current
answer underneath — with sign-out alone on a card of its own. The large portrait block and
the coloured icon tiles are gone. Appearance no longer offers its two settings as lists of
sentences: `PreviewChoice` (`components/ui/preview-choice.tsx`) draws each option as a
small picture with its name and a radio under it — three phone sketches for brightness
(light, dark, and a split one for "My phone"), three letters at their real sizes for text
size.

**Why.** Recognition over recall (§2.3) is not only about labels: a settings page that
already looks like every other settings page is understood before it is read, and a dark
phone next to a pale one is the answer to "always dark" rather than a sentence to decode.
The mode labels shortened to `My phone` / `Light` / `Dark` in all four catalogues to fit
under a card; the sentence each used to carry is still the row's `description`, read out as
the option's accessibility hint and shown in the Account summary line.

**What is preserved.** Every option is still spelled out in text, still a radio, and still
announced with `accessibilityRole="radio"` — the drawings are never the only cue, so the
control works for a colour-blind reader and under a screen reader unchanged. The tap still
marks locally and dispatches the repaint in a transition, as `ChoiceGroup` does.
`ChoiceGroup` stays: the Language screen needs names in their own scripts, not pictures.

**Would change it if:** a third dial arrives on Appearance and three pictures per row stop
fitting — the previews would then wrap to two columns rather than shrink further.

---

## D-16 · 2026-08-29 · Appearance is four raised cards; the highlight recolours `primary` only

**Decision.** The Appearance screen offers four dials on elevated cards (`SettingCard` —
tinted icon, heading, one line of plain explanation, then the control). **Theme** holds two
of them, each under its own quiet label (`SettingField`): brightness (`PreviewChoice`,
unchanged) and **highlight colour** (`ColorChoice` — six swatches). They share a card
because they are the same question asked twice — what colour is this app — and answering the
first almost always leads straight to the second. **Text size** (`StepSlider` — a slider
with three tapped stops) and **bold text** (`Toggle` — the platform switch) get a card each,
and a fourth holds the live sample.

**Highlight colour replaces the `primary` triple and nothing else.** `Highlights` in
`theme/colors.ts` holds six pairs of `{ primary, onPrimary, primaryMuted }`, one per scheme;
`themeColors(scheme, highlight)` merges the chosen pair over the base palette and caches the
result per pairing, and `useThemeColors()` is the only caller. `danger`, `warning`,
`success` and `accent` are untouched by design — no choice a reader makes here may leave an
SOS button looking like an ordinary one. All twelve palettes were contrast-tuned to the same
AAA bar as D-03: `primary` ≥7:1 on `surface`, on `background` and on its own `primaryMuted`,
and `onPrimary` ≥7:1 on `primary`, in both schemes. Blue is the default and is the base
palette's own primary, unchanged, so an existing install looks identical until it is asked
not to.

**`ThemeColors` widened from literal hexes to `string`.** A highlight swaps values in at
runtime, so the literal types the palette happens to be written in could not stay the
contract consumers see.

**Bold text is a separate dial from size**, and sets each weight in the type scale one step
heavier (`boldWeight` in `theme/typography.ts`) rather than jumping everything to 700, which
would flatten the difference between a heading and the paragraph under it. Size and weight
fix different problems and a reader who needs one often does not want the other.

**The text size slider never has to be dragged.** It looks like the slider every phone uses
for this — that is the point, it is recognised before it is read — but each of the three
stops is its own tap target a finger wide, because a drag is the one gesture a hand with a
tremor cannot reliably finish. The chosen stop is named in words under the track, and each
stop is still a `radio` to a screen reader, so D-15's guarantee holds: nothing on this
screen depends on seeing a picture, a colour, or where a thumb landed. This is the "slider
with no labels" that `theme/appearance.ts` warned against, with the labels put back.

**`NativeHost`'s seed colour now follows the highlight** rather than being a fixed constant.
The reason the seed was constant still stands — changing it rebuilds a Material 3 tonal
palette in every host on screen — but that now happens only when the reader picks a new
colour, which is rare, and not on every light/dark flip, which is not.

**Would change it if:** a fifth dial arrives — four raised cards is already the most a
screen this size can carry before the elevation stops meaning anything. A new dial should
join a card that already asks its question rather than open a fifth.

---

## D-17 · 2026-08-30 · Tailwind via Uniwind; the TypeScript tokens stay the source of truth

**Decision.** `apps/mobile` styles with Tailwind CSS 4 through **Uniwind** (`uniwind@1.11`,
from the Unistyles authors). It is a Metro plugin only — no Babel transform, no provider to
mount, and it works in Expo Go. `metro.config.js` wraps the Expo default config in
`withUniwindConfig`, pointing at `src/global.css` and writing `src/uniwind-types.d.ts`
(generated, gitignored — Metro rewrites it on every start, so a fresh clone must run the
bundler once before `tsc` is clean).

**The design tokens did not move into CSS. They are generated out of it.** `theme/colors.ts`,
`theme/layout.ts` and `theme/typography.ts` remain authoritative, and
`bun run --cwd apps/mobile theme:css` writes `src/theme/tokens.css` from them: `@theme` for
spacing, touch targets, radii, the type scale and the content width, and a
`@layer theme` / `@variant light|dark` pair for every colour token. Both files are committed.
Two hand-maintained copies of a palette drift, and a drifted palette is a contrast failure
nobody notices — this is the same argument as D-03, applied one layer down. `css-tokens.ts`
holds the one rule for what a token is called once it reaches CSS, so the generator and the
runtime can never disagree about a variable name.

**Naming is mechanical**, not re-invented: `surfaceRaised` → `--color-surface-raised` →
`bg-surface-raised`; `TextStyles.bodyLarge` → `--text-body-large` → `text-body-large`, which
carries the size, the line height *and* the weight the scale pairs with them. Touch targets
ride in the spacing namespace (`--spacing-touch-comfortable` → `min-h-touch-comfortable`)
because Tailwind v4 has no `--size-*` and `--spacing-*` is what `h-`, `w-` and `min-h-` read.
`className="p-lg bg-surface"` and `style={{ padding: Spacing.lg }}` are the same pixels, and
`UIScale` still moves both — after a regenerate.

**Three of the four appearance dials are runtime, so they are pushed as CSS variables.**
`useUniwindAppearance()` — called once, from the root layout — maps `themeMode` straight onto
`Uniwind.setTheme` (`system` is a theme name to Uniwind too, so the reader's choice passes
through unchanged), and writes the highlight's `primary` triple and the whole type scale at
the chosen size and weight over the generated variables with `updateCSSVariables`, for both
schemes. Tailwind compiles every utility down to `var(--token)`, so those overrides land
everywhere. This is what makes `bg-primary` and `text-body` in a className mean exactly what
`colors.primary` and `TextStyles.body` already mean in a `style` prop — otherwise Tailwind
would have quietly opted the app out of D-16's highlight and out of the reader's text size.

**Fonts are the one token left in TypeScript.** They are platform-branched (`theme/fonts.ts`,
split out of `typography.ts` so the generator can import the type scale without pulling in
`react-native`), which a static CSS variable cannot express. `font-*` utilities are therefore
not wired; web still reads the stacks declared in `global.css`.

**Nothing was migrated.** The existing screens and the UI kit still style with `StyleSheet`
and `useThemeColors`, and both approaches now resolve to the same tokens, so a screen can
move when there is a reason to touch it. §2.3 binds either way: a raw hex in a className
(`bg-[#fff]`) is exactly the violation a hex literal in a `StyleSheet` is.

**`apps/mobile/.vscode/settings.json` is new** — Tailwind IntelliSense has to be told about
the extra `*ClassName` props Uniwind adds, or the editor offers nothing inside them. It is
the first editor config in the repo; that was deliberate, not an oversight.

**Would change it if:** the app needed styling to run somewhere Metro does not — Uniwind's
whole design is that the bundler does the work. NativeWind was the alternative and is
slower, Babel-based, and further from this app's token model.

---

## D-18 · 2026-08-30 · Games live in a `games/` stack pushed over the tabs, reached from Today

**Decision.** Games are their own route group — `src/app/games/` with a `Stack` layout of its
own, exactly the shape `account/` already has: a list at `games/index.tsx`, one file per
game beside it (`games/matching.tsx`), and each screen carrying its own always-visible way
out — the list uses `Screen`'s labelled **Back** pill, a game in progress uses `GameFrame`'s
cross (D-19). The group is registered in the root layout under the same signed-in guard
as `(tabs)` and `account`. The only way in is a `GameCard` in a **Something to do** section
on Today.

**This answers `progress.md`'s open question.** Five labelled tabs is the ceiling D-06 set,
and a sixth would shrink every one of them. A game is also not a destination someone lands
on many times a day the way Today or Help is — it is something you go and do — so a card on
the screen the reader already starts on is both the honest shape and the one that leaves the
tab bar alone. Adding the second game is adding a file and a row on the list; the reader's
route to it does not change.

**The first game is Matching pairs** (`games/matching.tsx`, with `MemoryCard`, `MemoryBoard`
and `Symbols` in `src/components/games/`): a square grid of cards face down, two turned over
at a time, and the ones that match stay up. There is no timer on play, no turn counter shown, and
no way to lose — two cards that do not match turn back over and the board is exactly as it
was.

**The board opens face up.** Every card is seen before any of it has to be remembered. That
look is the only thing in the game that moves on a clock (about two seconds plus half a
second a pair, capped at nine), and while it runs a bar drains above the board and there is
nothing else on screen — see D-19. §2.3's "no time limits on any interaction" holds: the
preview is something shown, and the reader is not being asked to finish anything in time.

**Matched pairs stay on the board, tinted green, rather than being cleared away.** Cards
vanishing out from under a hand is exactly what makes this game hard for a reader with
dementia — the board they had started to learn would keep changing shape. Left in place, the
board is stable and the green squares are a visible record of what has already been found.

**Every board is square, and there are four: 4×4, 6×6, 8×8, 12×12** — sixteen, thirty-six,
sixty-four and a hundred and forty-four cards, so eight, eighteen, thirty-two and
seventy-two pairs. `LEVELS` carries only the width; the pairs are `columns² / 2`. Boards are
offered in order and only after the one before is finished, so nobody is dropped onto a
hundred and forty-four cards cold.

**The two big boards are honestly outsized for this reader, and are built anyway.** They
were asked for. What they cost is written down here rather than quietly designed away: at
twelve columns a card divides out at about 25pt on a phone, which is half the platform touch
floor, so `MemoryBoard` clamps every card at `TouchTarget.min` and lets the grid scroll
sideways instead of shrinking under it. Four by four and six by six fit across a phone at
full size; eight by eight and twelve by twelve scroll. A board you have to scroll is a board
you cannot hold in your head — that is a real cost of the size, not of the implementation,
and the smaller boards are unaffected.

**Difficulty is three dials, not one** — how many cards, how big the square, and which pool
of faces. `SymbolPools.plain` is two dozen things that share nothing, and it carries the two
small boards; `SymbolPools.wide` is all eighty-six and necessarily includes the look-alikes
— three round red fruits, six flowering things, two cups — so a big board is harder twice
over.

**The faces are emoji, and every one of them is named in the catalogues.** Emoji because
every phone already has them, they carry no words, and they are the same picture in all four
languages — no artwork to ship and nothing to translate. There are eighty-six of them
because twelve by twelve needs seventy-two distinct pairs in a single deal, and none is
newer than Unicode 11: a face the platform has never heard of draws as an empty box, and a
board of empty boxes is not a game. `games.matching.symbols.*` gives
each one a name per language, which is what a screen reader announces (otherwise it reads the
emoji's English CLDR name), so the picture is never the only cue. The symbol is sized as a
share of its card rather than from the type scale, because it is a picture and not type — a
face that filled a quarter of its card would be unreadable on the largest board.

**It is in memory only, and it does not adapt yet.** Nothing is persisted, because there is
still no local store to persist into (`progress.md` §1). The screen carries the TODO that
names what lands when it exists: one session row per board — cards, pairs, turns taken and
how long each turn was held — read by `adjustDifficulty` (D-07) to choose the **opening**
board from this reader's own history instead of always starting at four by four (D-08). Do not reach
for the network here; §2.1 binds.

**Would change it if:** games grow numerous or long enough to want their own tab after all,
which would mean re-opening D-06 rather than quietly adding a sixth destination.

## D-19 · 2026-08-30 · A game is a board, not a page: a bar for the preview, a dialog to finish, and a two-icon frame

**Decision.** Matching pairs' face-up preview shows a `ProgressBar` emptying over exactly the
preview's own duration and **no button at all**; the board turns over when the bar reaches
the end. Finishing a board opens a `Dialog` — a centred card over the dimmed board — with
confetti behind it, replacing the block of celebration text and buttons that used to push in
under the grid. The screen is framed by `GameFrame` rather than `Screen`, and a tap on a
third card no longer waits for the two already up.

**Why the button went.** It was the only control on screen during the one moment when the
only useful thing to do is look at the cards, and for this reader a button present is a
button that has to be decided about. A bar that visibly empties says the same thing the
button's label said — *this ends on its own, shortly* — without asking anything. Nothing is
lost that §2.3 protects: the preview never was a task with a deadline, and it still isn't.

**Two bars, never one relabelled.** The countdown and the pairs-found meter are separate
`ProgressBar` elements chosen by phase, and the countdown is keyed on the round so it
remounts full for each new board and only ever drains. A single bar that changed what it was
measuring halfway through a screen would be the most confusing thing on it.

**The bar *is* the clock.** `ProgressBar` gained a `durationMs` prop (and linear easing, so
a long travel reads as time passing rather than easing in and out); the screen hands it the
same `previewMs` the `setTimeout` uses. One number drives both, so the bar cannot finish
early or hang full while the cards are already face down.

**Why a dialog and not more page.** The board stays behind it exactly as it was finished —
coming back to a cleared screen would take away the thing the reader just did, and the green
squares are the record of it. The dialog has no corner ✕ and does not close on a tap beside
it: a tap that lands slightly wide should do nothing rather than quietly take the
congratulations away. The way out is one of three labelled buttons — bigger board, this
board again, finished — and Android's back gesture leaves the game.

**A game gets its own frame — `GameFrame`, not `Screen`.** `Screen` is the page: a large
title, a sentence under it saying what the page is for, and a labelled **Back** pill above
both. All three are right for something you read and wrong for something you are in the
middle of doing, so the game's prose is gone — the subtitle and the four level descriptions
were dropped from the catalogues, not just from the screen — and what is left is one short
bar: leave on the left, which board this is in the middle, settings on the right. The board
is then the screen, which is what it was competing with the words for.

**The two frame controls are icons with no word beside them, and that is a knowing exception
to §2.3.** A cross and a gear in the corners of something being played are about as
recognised as a picture gets; they sit in the same two corners for every game that follows;
both are full `TouchTarget.min` circles with a complete `accessibilityLabel`; and the only
alternative that keeps the rule — a word under each — puts three lines of text above a board
that needs the room. The rule holds everywhere else, including the game's own status line,
which is still the whole state of the play in a sentence. The settings gear opens the
reader's own Appearance screen: text size and colours are the settings someone actually
wants mid-game, and the game is still there when they come back.

**A tap on a third card does not wait for the pair already up.** The board used to be locked
while two cards were held for comparison, which meant a tap landing in that pause did
nothing at all — and a screen that has stopped listening is exactly what makes a reader tap
harder and then doubt themselves. Now the pending pair settles at once (kept if it matched,
turned back if it did not) and the new card starts the next turn. The timer that would have
settled it is cleaned up on the same state change, and `settle` is written so both paths
reaching it produce one outcome, never two.

**Confetti is `react-native-confetti-cannon`, wrapped.** The hand-rolled version was replaced
with the library: about the same amount of `Animated`, but maintained, and with no native
module of its own, so nothing needs rebuilding and nothing about it reaches the network
(§2.1). The `Confetti` wrapper in `components/ui` adds the two things the app cares about —
the paper is coloured from `primary`, `accent`, `success` and `warning` rather than the
library's stock palette, and `useReducedMotion` turns it off entirely rather than into a
gentler version, because the honest reduced form of falling paper is no falling paper.
`Dialog` takes it as a `backdrop` node, so the celebration is never the thing between the
reader and the words.

**Would change it if:** a reader is observed sitting through a long preview wanting out of
it — the answer then is a shorter preview, not a button back on the screen.

---

## D-20 · 2026-08-31 · The server stores no user record — a Clerk id is a text column

**Decision.** `apps/api` mirrors nothing about a person. Identity lives in Clerk, and every
column that points at one — `patients.user_id`, `patient_caregivers.caregiver_id`,
`memory_subjects.created_by` — holds Clerk's own user id. The only table keyed by a person
is `roles`, whose primary key *is* the Clerk id.

**Those columns are `VARCHAR(64)`, not `uuid`.** Clerk ids are opaque strings shaped like
`user_2ab...`. They were typed `uuid` and every one of them would have raised on the first
real insert. Nothing in the schema may type a person's id as a uuid; `_clerk_id()` in
`models.py` exists so there is one place to change if that ever stops being true.

**`roles.role` is not unique.** It was, which allowed exactly one caregiver in the whole
system. A role is held by many people; the row is a grant, not an enum.

**No foreign key from `patients.user_id` to `roles.id`.** A patient can exist before anyone
grants them a role, and under the PS's enrollment model a patient may have no Clerk account
at all — a caregiver provisions the device. The reference is deliberately unconstrained.

**Consequence.** There is no server-side name, email or avatar for a caregiver. A dashboard
that wants to show "added by Ritu" resolves the id through Clerk's Backend API at read
time, which is the trigger D-14 names for a `Clerk` client in `core/`.

**Would change it if:** the dashboard needs to filter or sort by a caregiver's name, which
cannot be done across an API boundary — a cached projection of id → display name would then
be worth the sync cost.

---

## D-21 · 2026-08-31 · The mobile app calls the API with a Clerk session token, fetched per call

**Decision.** `apps/mobile` reaches `apps/api` through one wrapper — `apiFetch` in
`src/lib/api.ts`, bound to the reader's session by `useApi()` in `src/hooks/use-api.ts`.
Every call carries `Authorization: Bearer <clerk session jwt>`, which is exactly what
`require_auth` on the server verifies (D-14). There is no login call, no API-issued token
and no refresh flow on the client, because the API owns no auth route.

**The token is asked for on every request and never held.** `getToken()` is called inside
the wrapper rather than read once into state or into a module variable. A Clerk session
token lives about a minute; the call to `getToken()` *is* the refresh. Caching it is the
obvious-looking optimisation that produces 401s a few minutes into every session, and
storing it anywhere is a credential on disk we did not need — Clerk's own `tokenCache`
already holds the only one that belongs there.

**`CLERK_AUTHORIZED_PARTIES` must stay empty while mobile is the only client.**
`core/config.py` passes it to Clerk as `authorized_parties`, which then requires the token's
`azp` claim to match one of the listed origins. A native Expo client has no web origin to
put there, so setting the variable for `apps/web`'s benefit silently 401s every phone. When
the dashboard lands, either leave it unset or make sure the value covers both clients.

**Two error types, because offline is not a refusal.** `ApiUnreachableError` means the
request never arrived — radio off, wrong host, timeout — and is retried on the next sync.
`ApiError` means the API answered and said no, and is not retried. Collapsing them loses the
distinction the sync queue is built on.

**A 401 never signs the reader out.** The patient authenticates once and stays signed in
(`AGENTS.md` §5); a refused call is dropped and tried again later. Nothing on a patient
screen may wait on any of this (§2.1) — `useApi` is for sign-in-time and sync-time reads.

**The dev base URL is derived, not configured.** A phone cannot reach the dev machine's
`localhost`, and the one address known to be reachable is the packager host the bundle
arrived over — `Constants.expoConfig.hostUri`, plus `:8080`. `EXPO_PUBLIC_API_URL` overrides
it and is what a build sets.

**Would change it if:** the enrollment flow (D-01, still open) gives a device its own
credential rather than a Clerk session — the wrapper is then the one place that changes.

---

## D-22 · 2026-08-31 · Game stats are a shared hook over a pure module, and the reader never sees them

**Decision.** Every game measures itself the same way, through two pieces:
`src/lib/game-stats.ts` — pure, no clock, no storage — turns a described run into a
`SessionStats`; `src/hooks/use-game-session.ts` owns the clock, times each attempt and hands
the closed session to `src/lib/game-history.ts`. A game calls `begin` when play starts,
`record(correct)` once per attempt, and `finish` or `abandon`. Matching pairs is wired to it.

`SessionStats` carries `accuracy` (of the attempts made, the share that were right),
`precision` (how close the run came to the fewest attempts the round could take, null when a
game has no such floor), `completion` (how much of the round was finished), `durationMs` and
`timeOnTaskMs`, `avgResponseMs` and `medianResponseMs`, `consistency` (one minus the
coefficient of variation of response times, null under two attempts), `longestStreak`, and
the raw `attempts` / `correct` / `total` counts.

**Why split it.** The engine's signature is frozen pure (D-07) and it will read these rows;
if the arithmetic that produces them reads a clock, neither half can be tested by handing it
numbers. The split keeps the impure part to about thirty lines.

**Raw counts are kept next to the ratios**, as `data-model.md` §1 requires. What "accuracy"
means will be argued about again; the facts underneath it should not have to be recollected.

**Consistency is a coefficient of variation, not a variance in milliseconds** — spread
measured against the reader's own mean. A slow, steady reader and a quick, steady one both
score near 1, which is the only way the number stays a personal one (§2.4).

**None of it is shown to the patient.** No percentage, no turn counter, no "you took 4:32"
under a finished board. §2.3 forbids anything that scolds and a score is exactly that; these
rows exist for the caregiver dashboard and for the adaptive engine. An abandoned board
records identically to a finished one, flagged `completed: false` and never penalised.

**The preview is not timed.** The session's clock starts when the cards turn over, so a long,
careful look at the board does not read afterwards as a slow start.

**Durations come off a monotonic clock** (`performance.now()`), placed against one `Date.now()`
taken at the start. A phone correcting its clock mid-board would otherwise record a run that
took minus twenty minutes.

**Consequences.** `game-history.ts` is an in-memory list that lives as long as the app is
open — the placeholder wearing the shape of the `game_session` table. Replacing it with
SQLite + Drizzle should not require editing either caller. The next game adds a
`useGameSession` call and nothing else.

**Would change it if:** a game turns up whose unit of work is not a right-or-wrong attempt —
a free recall or a spoken answer scored by degree. `Attempt.correct` would become a score,
and every derived ratio with it.

---

## D-23 · 2026-08-31 · The reader sees four lines after a board; every metric is `__DEV__` only

**Decision.** Finishing a board shows `GameSummary` inside the win dialog: **pairs found**,
**turns taken**, **the share of turns that were right**, and **roughly how long it took**.
Under `__DEV__` a second card, `GameStatsDetail`, prints every field of the `SessionStats`
row plus this launch's history for the game. `Dialog` gained a `details` slot for the card
and now scrolls its own content.

**Why four and no more.** The card sits above three buttons on a phone at a text size the
reader can double. A fifth line is what pushes "I have finished" off the bottom edge, and
`longestStreak`, response times and consistency are all in the row for the dashboard and the
engine to read (D-22) — they do not need to be on this card.

**They are facts, not a grade.** No pass mark, no target, no colour that turns a low number
into a warning, and nothing compared against anyone else (§2.4). The line that comes closest
to a score is the share of turns that found a pair, and it is labelled as what it literally
counts rather than as how well they did. §2.3 forbids anything that scolds; a number the
reader asked to see and can read plainly is not that, but a red one would be.

**Time is coarse on purpose** — seconds under a minute, whole minutes above it ("About four
minutes"). An exact figure invites beating it, and nothing in this game is timed. The precise
duration is in the row and in the developer card.

**The developer card is English literals**, the same exception the Settings developer row
takes (D-21): it is compiled out of a release build, so no reader can meet an untranslated
string from it. It is also the only place in the app that shows a raw metric as a metric.

**`Dialog` scrolls now.** A card carrying a summary and three buttons is taller than a small
phone at the largest text size, and a button pushed off the bottom edge would leave the
reader with no way out — the dialog has no other dismissal (it cannot be tapped away).

**Would change it if:** the four lines turn out to read as a report card in front of a real
reader. The fix is fewer lines, not smaller ones — and the metrics lose nothing, because the
row behind the card is unchanged.

---

## D-24 · 2026-09-01 · The device store is SQLite + Drizzle, opened synchronously, migrated by hand

**Decision.** `apps/mobile` has a local database. `expo-sqlite` holds the file,
`drizzle-orm` describes it. All nine device tables from `data-model.md` §1 exist:
`patient`, `device`, `game_session`, `session_event`, `reminder`, `reminder_event`,
`person`, `memory_item`, `sync_queue`.

- `src/db/schema.ts` — the tables, typed. The only place a column name is written in
  TypeScript.
- `src/db/migrations.ts` — the DDL, one string per version, applied in order.
- `src/db/client.ts` — opens `smaran.db` on first import, sets `WAL` and `foreign_keys`,
  migrates, ensures the `device` row, exports `db`.
- `src/db/device.ts` — the device identity and the `seq` counter.

`src/lib/game-history.ts` is now that table. `remember()` is an insert, `recentSessions()`
a query ordered by `ended_at desc`. **Neither caller changed** — `useGameSession` and
`GameStatsDetail` still call the same two functions with the same arguments, which is what
that module was built to make possible (D-22).

**Everything is synchronous.** `expo-sqlite` has a sync API and Drizzle's Expo driver is
built on it, so a read is a function call and not a promise. That is the whole reason the
seam held: `GameStatsDetail` asks for history while it renders, and making the store async
would have pushed a loading state up through every caller for a query that reads fifty rows
off local flash. There is no provider, no hook and no `isReady` flag.

**But the file is opened lazily, on first use — `db()` is a function, not a constant.**
Opening at module scope read better and was wrong: it put the open, the migration and the
device row on the import path of every screen that transitively reaches `src/db/`, so a
database that could not be opened *at all* took down expo-router, and every route in the app
reported nothing worse than "missing the required default export". Lazy, a store failure
costs the games screen and leaves Today, People, Memories and Settings working. It also
keeps the open off the splash-screen path. `open()` catches and rethrows with the actual
remedy, because the underlying failure — a development build made before `expo-sqlite` was
installed — surfaces as `undefined is not a function` from inside the native bridge and
names neither the cause nor the fix.

**`expo-sqlite` is a native module.** Installing it is not enough; the development build has
to be rebuilt (`bunx expo run:android` / `run:ios`) or it is not in the binary.

**Migrations are hand-written rather than generated by `drizzle-kit`.** The official Expo
path bundles generated SQL through a Babel plugin and a Metro resolver change. That is real
build-pipeline surgery on a bundler that currently works, two days before a demo, for a
schema that fits on one screen. `PRAGMA user_version` and a list of strings do the same job
with nothing between the source and the file — a fresh install runs every entry, an upgrade
runs the tail, and the whole run is one transaction so a migration interrupted mid-upgrade
leaves the file exactly as it was.

**The cost is that nothing checks the two halves agree.** `schema.ts` is what queries are
built from; `migrations.ts` is what actually exists on disk. The rules that keep them
honest: never edit a migration that has shipped, and every schema change is a new entry.
To verify a change, run the migrations into an in-memory SQLite and round-trip an insert
and a select through the Drizzle schema for each table it touched — a mismatched column
name fails loudly there. That is how this schema was checked.

**A session and its `sync_queue` entry are written in one transaction**, as
`data-model.md` §1 requires. A session without a queue entry is a silently lost sync and
nothing later would notice. `payload` is a JSON snapshot, not a pointer, so a retry sends
what the first attempt sent and draining never joins back to a row that may have been
pruned.

**`seq` is claimed with `UPDATE device SET next_seq = next_seq + 1 RETURNING next_seq`**,
inside the caller's transaction. One statement, so a number cannot be handed out twice —
it is half of the `(device_id, seq)` idempotency key the ingest endpoint upserts on (D-09),
and a duplicate there is two rounds the server would record as one.

**The table is not trimmed.** The in-memory version capped itself at fifty rows because an
unbounded array on a device that is never closed is a leak. A table is not, and pruning by
count would drop rows that had not synced yet. `recentSessions()` keeps the fifty-row
default as a *read* window — the engine wants recent, not lifetime (D-08) — and rows leave
when they have been acknowledged.

**`game_session` has more columns than `data-model.md` first listed.** `duration_ms`,
`time_on_task_ms`, `median_response_ms`, `precision`, `completion` and `longest_streak` are
stored because they are measured facts that cannot be recomputed from the counts, and
because storing them is what lets a row read back as exactly the `SessionStats` the game
produced. `data-model.md` has been updated to match.

**Would change it if:** the schema grows past what one person can hold in their head, or a
second device store appears — then `drizzle-kit generate` with the Babel and Metro wiring
earns its keep, and `migrations.ts` becomes the generated journal instead of a hand-written
list. Nothing above `src/db/` would have to change.

---

## D-25 · 2026-09-01 · Reminders are on-device, computed per day, and added from Today

**Decision.** Today draws the reader's real reminders out of the `reminder` table
(`src/lib/reminders.ts`, `src/hooks/use-reminders.ts`), and a button on that screen opens a
dialog that writes a new one. Marking one done writes a `reminder_event` and its
`sync_queue` entry in a single transaction, exactly as a game session does.

**A day's occurrences are computed, not stored.** A row per reminder per day would be a
table that grows forever and something to fill it — and there is nothing that may be
assumed to run in the background (`AGENTS.md` §2.2). `remindersFor(day)` reads the active
definitions, keeps the ones whose days mask includes that weekday, and works out `dueAt`
from the schedule at the moment the screen draws. Seven reminders and a weekday check cost
nothing.

**`schedule` is `HH:MM|1111111`** — a 24-hour local time and a seven-character days mask,
Sunday first — which is the "time-of-day plus a days mask" `data-model.md` §1 allows for.
A string rather than two columns because the server's definitions are rrule-ish and will
need somewhere to land. A schedule this build cannot parse is skipped, never guessed at.

**Definitions do not sync up; events do.** `SyncEntity` is `game_session | reminder_event`
and stays that way: `data-model.md` §4 has reminders as server-authoritative definitions
that devices *pull*. A reminder added on the phone is therefore local to that phone until
the dashboard owns the definitions, and that is the honest shape — what the caregiver needs
from the device is adherence, which is entirely in `reminder_event`.

**Nothing is scheduled with the OS.** `expo-notifications` is not installed, so
`reminder.notification_ids` stays `[]` and a reminder is something the reader *sees* on
Today rather than something the phone announces. Installing it is a separate change and
`lib/reminders.ts` is already the place it goes; no screen changes when it lands.

**Today is one card and one list, not a card per reminder.** The next thing to do is a
raised card with the time set in `display` and the screen's only filled button; everything
else is a grouped list of rows behind one edge, divided by hairlines
(`components/today/reminder-list.tsx`). Stacked cards spent most of the screen on the gaps
between them and made every reminder look equally urgent, which is the opposite of what
this screen is for.

**A done reminder stays on the page, quietly.** In the list, muted, with the time it was
done and a tick. Someone who cannot remember whether they took the tablet needs to be able
to look and see that they did — a row that vanished would leave exactly the doubt it was
there to settle. Only the next undone reminder can be marked, and it is the one with the
button, so the screen keeps one primary action (`AGENTS.md` §2.3).

**The time picker is four buttons, not a wheel.** `TimeField` steps the hour by one and the
minutes by five, both wrapping, because a spun wheel or a dragged dial is the one gesture a
hand with a tremor cannot reliably finish. The time is written out large in the reader's
language beside them.

**Every store call on Today is guarded.** `src/db` is a native module and a development
build made before it was installed cannot open the file at all (D-24). Today is the screen
the reader lands on and it is not allowed to be the screen a missing native module takes
down: a failure costs the reminders, leaves the greeting and the games alone, and hides the
add button rather than offering an action that would silently do nothing.

**Would change it if:** the dashboard starts sending definitions down — then `reminder`
becomes a synced-down table like `person`, the dialog becomes a caregiver-side screen, and
this module keeps the same two reads. Or reminders need to fire with the app closed, which
is `expo-notifications` and a scheduling pass over the same rows.

---

## D-26 · 2026-09-01 · The engine returns a rung *and* a reason code, and the reason is on the screen

**Decision.** `src/lib/adaptive.ts` — `adjustDifficulty(history, { current, rungs })` →
`{ difficulty, direction, reason }`. Pure, as D-07 froze it: the history arrives as an array
of `SessionStats`, the rung comes back, and nothing in the file reads a clock, a table or the
network. Matching pairs calls it twice, both times doing its own `recentSessions()` read —
once on the first render to pick the opening board, and once when a board is finished to pick
what to offer next.

**The reason is a code, not a sentence** — `easy | steady | hard | firstBoard | topBoard |
gentlest` — and the words live in the four locale catalogues under
`games.matching.reason.*`, one whole sentence per code per language (D-12). A pure function
must not know English, and the sentence has to be sayable four ways.

**Why the sentence is the point.** An engine that adapts silently is indistinguishable from
no engine, to a caregiver and to a judge alike. The dialog after a finished board now says
*why* the board it is offering is the board it is offering, immediately above the button that
takes it, and the sentence names the comparison out loud: this reader's own last few rounds
(§2.4). The button names the board — "Try the six by six board" — rather than a direction,
because a named board is something you can picture. That needed a lowercase in-sentence
`levels.<id>.phrase` beside the existing title-case `name`.

**The signature widened from D-07's `(recentSessions, current)`** to take `rungs` as well.
The engine clamps its own answer into the ladder, so a game never has to check whether the
rung it was handed exists — and the reason changes with the clamp (`topBoard`, `gentlest`)
rather than the copy promising a bigger board that isn't there.

**Every threshold is a margin, not a benchmark.** There is no target accuracy in the file and
no par time. `MARGIN` is how far from the *reader's own* recent mean a round has to land to
count as different; `BASELINE_WINDOW` is five earlier rounds, recent rather than lifetime, so
a good month in spring is not still setting the bar in autumn. The single exception is a
first-ever board, which has no earlier round to sit against and is judged against the board's
own arithmetic — the fewest turns it could have taken. That is a fact about the board, not
about a cohort (D-08).

**Pace can earn a bigger board and can never cost one.** A round that reads as ordinary but
was clearly quicker than their own recent median goes up; a slow round does not go down.
Nothing here is timed and §2.3 forbids treating slowness as a fault.

**An abandoned board needs no penalty.** It arrives with a low `completion` because less of
it was found, which is a fact about the round rather than a judgement about the reader.

**Would change it if:** a second game wants a ladder that is not a line of rungs, or there is
finally enough data to replace the rules with a model — which is the swap D-07 exists for,
and it touches this file only.

---

## D-27 · 2026-09-01 · The dashboard is a Clerk client too, and calls the API from the browser with the same bearer token

**Decision.** `apps/web` authenticates with Clerk against the *same* Clerk instance as
`apps/mobile` and `apps/api` — one instance, three clients (D-01). `ClerkProvider` wraps
`<html>` in the root layout, and `proxy.ts` holds the gate.

**It is `proxy.ts`, not `middleware.ts`.** Next.js 16 deprecated and renamed the file
convention; the app runs 16.3.3. If a future agent adds `middleware.ts` from memory, Next
will not run it and every dashboard route silently becomes public. The bundled docs at
`apps/web/node_modules/next/dist/docs/` are the authority here, not training data.

**The matcher lists what is *public*, not what is protected.** `/`, `/login(.*)`,
`/signup(.*)`, and the PWA manifest and icons. Everything else calls `auth.protect()`. This
is deliberate: every other screen is caregiver-facing patient data (§2.5), so a new route
that nobody remembered to list fails *closed* rather than open.

**Sign-in and sign-up are Clerk's prebuilt components, not the hand-built forms.** The two
pages previously rendered email/password inputs that submitted nothing — the login button
was a `<Link href="/dashboard">`. They are now `<SignIn>` / `<SignUp>` at catch-all routes
(`app/login/[[...rest]]/page.tsx`), which is what Clerk's multi-step flows require. The
page keeps its own logo, heading and sub-heading and hides Clerk's `header` element, so the
branding survives; `lib/clerk-appearance.ts` feeds Clerk the app's CSS custom properties
rather than literal colours, so the widget follows the light/dark switch with everything
else.

Note that Clerk v7 renamed the appearance variables: it is `colorForeground`,
`colorMutedForeground`, `colorInput` and `colorInputForeground` — **not** `colorText`,
`colorTextSecondary`, `colorInputBackground` or `colorInputText`, which are what most
examples online still show and which fail to type-check here.

**The API client is split in three, because the session is read differently on each side.**
`lib/api.ts` holds the transport and imports nothing from Clerk; `lib/api-server.ts`
exports `api()` for server components and actions (session from `auth()`); `hooks/use-api.ts`
exports `useApi()` for client components (session from `useAuth()`). Both hand their own
`getToken` to the same `apiFetch`. It is kept deliberately in step with
`apps/mobile/src/lib/api.ts` — same `ApiError` / `ApiUnreachableError` split, same
per-call token (D-21), same reading of FastAPI's `detail` body — so the two clients do not
drift into two different ideas of what a failed request means.

**The browser talks to `apps/api` directly, so the API needed CORS.** It had none: every
authenticated call from the dashboard is preflighted, and every one of them would have
failed. `main.py` now mounts `CORSMiddleware` from a new `CORS_ALLOW_ORIGINS` setting
(default `http://localhost:3000`). Origins are listed rather than wildcarded —
`allow_credentials` with `*` is rejected by browsers anyway, and a wildcard on an API
serving patient data is not what we want.

**This is the moment D-21 warned about.** `CLERK_AUTHORIZED_PARTIES` could stay empty while
mobile was the only client, because a native Expo client has no web origin to put in `azp`.
Now there are two clients with different answers. Either leave it unset, or set it to cover
**both** — a value listing only the dashboard's origin silently 401s every phone.

**What is not done.** Every screen still renders `lib/mock-data.ts`; the client exists and
nothing calls it yet. The header shows the real Clerk user, but Settings still renders the
mock caregiver. Deleting the mocks is the next task on this app, not part of this one.

---

## D-28 · 2026-09-01 · A new account claims its role once, from the client that created it

**Decision.** Roles live in the `roles` table and only there (D-20), and Clerk does not
write to it — so a brand-new account has an identity and no permissions at all. The client
that created the account is what tells the API which kind it is: `apps/web` calls
`POST /auth/caregiver-role` after a sign-up, `apps/mobile` calls `POST /auth/patient-role`
on the first session it holds for an account. `PATIENT_ROLE` (default `patient`) joins
`CAREGIVER_ROLE` in `core/config.py`, for the same reason — the name of a value in our own
column, never a literal in code.

**Both routes go through one function, `self_enroll(user_id, role)`, and it only grants to
an account holding nothing.** Self-enrolment is a claim made by the caller, so it is trusted
exactly once: an account that already holds a role is left alone and told `granted: false`.
Without that, `/auth/caregiver-role` is an escalation route — anyone holding a patient's
token could ask for the caregiver role and then read that patient's data through the
dashboard API (§2.5). Widening a role after the fact is a caregiver-side act and belongs on
a guarded route, not on an open one.

**It is idempotent, because the clients retry.** Asking twice for a role already held
answers `granted: true` and writes nothing. That is what lets both clients treat the call as
fire-and-forget rather than as a step that must not be missed.

**The dashboard puts it on a page, the phone does not.** `/welcome` is a real screen with a
visible failure and a "Try again" button: the API is a separate origin, it can be down when
an account is minutes old, and a new caregiver landing on a 403-ing dashboard would read it
as their account being broken. `SignUp` uses `forceRedirectUrl` rather than a fallback so
`NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` cannot route around it.

The phone gets the opposite treatment. `useRoleEnrolment()` runs from the root layout,
blocks nothing, shows nothing and says nothing when it fails — §2.1 forbids a patient screen
waiting on the network, and §2.3 forbids telling a reader about a failure they cannot act
on. The marker is written only on success, so a phone that was offline at sign-in asks again
next launch.

**The marker holds the Clerk user id, not a boolean.** A phone can be handed on or signed in
as somebody else; a bare "done" flag would leave the second person unenrolled forever.

**Mobile cannot tell sign-up from sign-in, and does not try.** The Account Portal hands back
a session either way without saying which it was, so the hook asks on the first session it
sees for a given user id. The endpoint's idempotence is what makes that safe.

**Would change it if:** enrolment ever needs to be something other than self-asserted — a
caregiver provisioning a patient's device, which the PS's enrollment model implies. That
grant comes from a caregiver-guarded route and would make the phone's call redundant, not
wrong.

---

## D-29 · 2026-09-01 · Clerk loads from a device resource cache, so the app opens with the radio off

**Decision.** `ClerkProvider` in `apps/mobile/src/app/_layout.tsx` is given
`__experimental_resourceCache={resourceCache}` from `@clerk/expo/resource-cache`, alongside
the token cache it already had.

**Why.** The token cache persists the client JWT; it does not let Clerk *start*. Without a
resource cache, `@clerk/expo` can only resolve its environment and client by calling Clerk's
API, so with no network `useAuth().isLoaded` never flips. The root gate holds the splash on
exactly that flag, so the app did not open offline at all — a §2.1 failure of the most
literal kind, on the one screen that has to work everywhere.

With the cache, Clerk restores the last known environment and client from secure storage,
`isLoaded` resolves from disk, and a retry loop refreshes both in the background once there
is a network again. Nothing on the reader's path waits on that retry.

**A first-ever launch offline still lands on `landing`.** There is no cached session to
restore, so Clerk loads dummy resources and reports signed out, which is the truth: an
account has to be created online once. Every launch after that opens straight into the app.

**The API is `__experimental_`.** That is Clerk's label, not a hedge on our part — it is the
only offline-load mechanism the SDK offers, and the alternative is an app that does not
start. If the option is renamed in a later `@clerk/expo`, follow the rename; do not drop it.

**Also.** `apiFetch` now treats a throwing `getToken()` as `ApiUnreachableError`. Refreshing
an expired session token is itself a call to Clerk, so offline it fails before our own API is
reached — the same "we could not ask" case, and callers already handle that one.

**Would change it if:** Clerk ships offline restore as a stable, default behaviour, at which
point the explicit option comes out.

---

## D-30 · 2026-09-01 · The second game is Find what is missing, and its hard mode swaps pictures for names

**Decision.** `apps/mobile/src/app/games/missing.tsx`, with `ItemGrid` and `MissingOptions`
in `src/components/games/`. A handful of things are shown under a draining bar; they go
away; the same things come back in a fresh order with one or two of them gone; and the
reader taps which one it was from a short list of options. Four rungs — 6, 9, 12 and 16
things, one missing on the first two and two on the last two — and every board is a
`game_session` row like any other (D-22, D-24).

**The point of the second game is the second ladder.** `progress.md` said the engine was
"the one game's ladder only, and there are no tests"; half of that is now answered. This
ladder is shaped nothing like Matching pairs' — it is not square, not a grid width, and its
hardest dial is not a size — and `adjustDifficulty` drove it without a line changing. Its
history is read narrowed to `gameId: "missing"`, so the two ladders never see each other:
being comfortable with a grid of cards says nothing about being comfortable with a list of
names, and averaging the two would be exactly the population-shaped mistake §2.4 forbids in
the small.

**Easy mode shows the things; hard mode shows their names.** That is the dial the game was
asked for and it is the interesting one. A picture is recognised on sight; a name has to be
turned back into a picture and then looked for on the board, which is a step further from
the board. It is also the only place in the app where a *word* is the harder rendering of
something, which is worth knowing when the fifth language lands.

**A picture option still announces its name to a screen reader** (`MissingOptions`). In
picture mode the word is not drawn — that is the whole difference between the modes — but
it is what `accessibilityLabel` carries, so the picture is never the only cue (§2.3).
Someone listening rather than looking gets the word in both modes, which means the two
modes differ in difficulty for a reader who can see, and not in whether the game can be
played at all.

**Decoys are things the board never showed, and getting this backwards made the game
trivial.** The first cut drew decoys from things still on the board, on the reasoning that
an unseen option could be dismissed without looking. That is exactly wrong: it meant every
option but one could be *found* sitting on the board in front of the reader, so the answer
fell out of a visual search and nothing had to be remembered at all — a spot-the-difference
wearing a memory game's clothes. Drawn from outside the deck, none of the options is on the
board: the right one has gone and the rest were never there, so the only way to tell them
apart is to recognise the one that was studied. Recognition, not recall, which is the right
demand to make of this reader (§2.3).

The things that went are still never offered as decoys to each other, and no decoy is used
twice on a board, so exactly one option per question is right and the reader is never right
in a way the game calls wrong. The invariant this puts on `LEVELS` — `items + missing *
(options - 1) <= pool` — is written down beside the table; the four boards need 8, 12, 18
and 24 against pools of 24, 24, 24 and 86.

**A thing that goes leaves a gap, and the gap is drawn with a question mark.** The answer
board is the same size as the study board with a dashed, accent-tinted tile where each
missing thing stood, rather than being quietly shorter — so the reader can see *how many*
went, and can see one come back into the hole it left. `MemoryCard` deliberately puts a
quiet emblem rather than a question mark on a face-down card, because nothing on that board
asks a question the reader can get wrong; here the board **is** the question, so the mark is
right. It is punctuation, identical in all four languages, so it is not a string literal
escaping the catalogues — the words are in `games.missing.gapItem`, which is what a screen
reader is given. The gap is the warm accent and not the danger red: something is missing,
which is the game, not something gone wrong.

**A named thing drops back into its own gap, in the success green, and stays.** The board
only ever gains, which is the same promise `MemoryCard` makes about a matched pair (D-18):
nothing vanishes out from under a reader who has started to learn the layout, and the grid
never changes size between the question and the answer.

**A wrong answer costs nothing and says nothing about the reader.** The option is tinted and
stays put as a record of what has been tried, tries are unlimited, and the status line says
what is true about the thing tapped — "Cat is still there" — never that the answer was
wrong. The option is not `disabled`, because a disabled control is announced as "dimmed",
which is not what happened; it simply does nothing (the same reasoning as `MemoryCard`).

**`ItemGrid` is a new component and not `MemoryBoard` with a flag.** The two are grids of
the same shape, but this one is made of pictures and that one is made of buttons: here the
board is the question and the answer is given elsewhere on the screen. Rendering these as
`Pressable`s to save a file would tell a screen reader there are sixteen buttons on the
board when there are none. The measured-width sizing is deliberately copied rather than
shared — it is fifteen lines, and the two have different clamps (this one has a maximum, so
three tiles on a tablet are not three enormous pictures).

**The known cost: the largest board and its options do not both fit on a small phone.**
Sixteen tiles at four columns is about 300pt of grid — and it stays that size all the way
through, since a gap holds its place — with five word options underneath adding another
180. `GameFrame` scrolls, so it is reachable, but a reader on the top rung may have
to scroll between the board and the answers — and comparing the two is the task. This is
written down rather than designed away, exactly as D-18 wrote down the 12×12 scroll: the
three lower rungs fit whole on every screen this app runs on, and the engine only ever
offers the top rung to someone the lower ones have been easy for.

**The symbol names moved from `games.matching.symbols.*` to `games.symbols.*`** in all four
catalogues. They are shared vocabulary, not one game's — `games.summary.*` was already that
shape. Both games read the same key, and a third will too.

**Would change it if:** the study phase turns out to need a "show me again" control. It does
not have one today, on the same reasoning as D-19's preview: during the look there is
nothing to decide, so there is no button to decide about.

---

## D-31 · 2026-09-01 · The app bar travels with the page; only the status bar strip is painted, and only once it has to be

**Decision.** `Screen`'s bar carries the back arrow, the title and subtitle, and the header
action **on one row** — leading, middle, trailing. The row itself has no background: it is
the first thing in the scroll content and it scrolls away with the rest of the page. What
keeps the clock readable is a separate strip pinned over `insets.top`, painted
`colors.surface` with a hairline under it, whose **opacity is driven by the scroll offset** —
nothing at the top of the page, fully opaque a little over one spacing step down
(`useScrollBackdrop`). `GameFrame` does exactly the same. The new `stickyHeader` prop extends
that strip down over the whole bar and holds the bar in place; it is off by default and the
account detail screens are the only ones that turn it on.

**The bug it fixes.** The bar and its `paddingTop: insets.top` used to live *inside* the
scroll view. A scroll container's top padding reserves the space once and then lets content
pass straight through it, so the clock and the battery ended up on top of moving body copy —
unreadable for a few hundred milliseconds on every drag, and worse in dark mode where the ink
is nearly the same value. Reserving the inset on a scroller only ever positions the first
frame correctly.

**Why the strip is not simply always on.** At the top of a page there is nothing under the
clock but the app's own canvas, so a bar drawn over it is a line across a screen that has no
seam in it — chrome charged for nothing, on the one screenful this reader is most likely to
be looking at. The moment anything scrolls up under the status bar that stops being true. So
the strip appears exactly when it is load-bearing and is gone the rest of the time, and
neither state is ever wrong for what is behind it.

**It animates opacity, not colour.** A colour interpolated to `transparent` travels through
black on the way, which shows as a grey bloom in light mode. A solid fill fading in does not.

**Why the bar itself scrolls away by default.** A pinned bar costs its own height on every
screen, and most screens here are short. The title is also not the thing being held onto: the
tab bar is the "where am I" answer inside the tabs, and it never moves. Where the page really
is a long list and the way out should not be several flicks above the reader — the account
detail screens — `stickyHeader` pins it, and the same fade then paints the whole bar rather
than just the strip.

**The back control is the arrow alone.** It was an arrow with the word "Back" beside it. On
one row with a title and an action the label pushed the title into wrapping on a small phone
in Assamese, and the arrow in a circle at the leading edge is the single most learnt shape in
mobile navigation — this is the same exception `GameFrame` already takes for its cross and
gear (D-19). The full label survives where it matters: `accessibilityLabel` is still
`common.goBack`, so a screen reader hears "Go back, button" exactly as before, and the target
is a full `TouchTarget.min` circle rather than a bare glyph.

**The title dropped from `title` to `heading`,** because it now shares a row rather than
owning one. It still wraps rather than truncating — no `numberOfLines`, no ellipsis anywhere
in the bar — so a long greeting grows the row instead of losing its second half. The subtitle
went to `body`, which keeps it clearly secondary without falling to `caption`, a variant the
type scale reserves for detail that is never essential.

**The bottom inset is painted flat, and only where nothing else paints it.** Inside the tabs
the tab bar sits in the layout flow and owns the inset (`withTabBar`, unchanged), so `Screen`
paints nothing. Outside it — account, games, not-found — a solid strip of `insets.bottom`
sits under the scroller, so a list ends at the gesture bar instead of running behind it. It
does not fade: unlike the top, there is always something under it.

**Landing is deliberately exempt.** Its art is meant to run edge to edge under a translucent
status bar, and it is the one screen that fixes its own ink (`OnArt`) instead of reading the
theme. It keeps its floating chrome and its own `StatusBar style="light"`.

**Would change it if:** the fade turns out to read as a flicker on a page that is only just
taller than the screen. The threshold is one constant in `useScrollBackdrop`, and the honest
fix would be to raise it rather than to pin every bar.

---

## D-32 · 2026-09-01 · Memory media goes straight to an S3 bucket; the database stores the key, the picture's name and its description

**Decision.** `memory_assets` in `apps/api/src/features/database/models.py`, plus the
`S3_MEMORIES_*` settings in `core/config.py` and `.env.example`. One row per object in the
bucket: `bucket` + `object_key` locate the bytes, `file_name` keeps the picture's name as
the caregiver knows it, `description` holds what they wrote about it, and `status` says
whether the object is actually there yet. The dashboard uploads with a presigned PUT
directly at the bucket and the phone reads back with a presigned GET, so **media never
passes through `apps/api`** — only the row describing it does.

**Why not store the photo in Postgres, or proxy it through the API.** Bytes in a row make
every query that touches the table drag them along, and the connection pool this API has is
sized for analytics rows, not for megabytes. Proxying is worse in the specific way that
matters here: an upload from a caregiver on an NER mobile connection can take minutes, and
each one would hold an API worker open for its whole duration. The bucket is built for
exactly this and the browser can talk to it directly.

**Why the row exists before the object does.** Minting the presigned URL is what writes the
row — there is nothing else to hang the key on. So a row can name bytes that never arrived,
and `status` is the difference between a memory and a promise. The phone must sync down
`ready` rows only; caching a `pending` one puts a broken image where a face should be, which
on this app's Memories tab is not a missing asset but a person the reader was expecting to
see.

**Why `object_key` is ours and `file_name` is theirs.** The key is generated: an uploaded
filename collides across patients, often carries the patient's own name — which then travels
in every URL, log line and error that names the object, exactly what §2.5 forbids — and can
hold characters that need escaping forever after. The caregiver's name for the picture is
still worth keeping, because it is what they will recognise it by in the dashboard and what
a download should save as. The two are different jobs and a single column does one of them
badly.

**Why the bucket name is a column and not just config.** A row written today has to resolve
after a migration to a different bucket or provider. Config says where *new* objects go; the
row says where *this* object went.

**Deletes are soft, and this is not optional.** Down-sync is watermark-based: a device asks
what changed since a timestamp, so a row that is simply deleted is a row it can never be
told about, and the picture stays on the phone forever. `is_active` going false is the only
signal that reaches it.

**Consequences.** The bucket needs CORS for the dashboard's origin (the browser PUTs at it
directly) and should stay private — `S3_MEMORIES_PUBLIC_BASE_URL` is left unset by default,
because a public object URL for a photograph of a named person with dementia is an
unauthenticated one that never expires. A `pending` row whose upload was abandoned is
litter; a sweep for old `pending` rows is owed, and does not exist yet.

**Would change it if:** the deployment ends up somewhere with no S3-compatible storage at
all. The seam is `bucket` + `object_key` — a different backing store keeps the columns and
changes only what mints the URLs.
## D-32 · 2026-09-01 · The server's synced tables mirror the device's, and the hypertable's keys carry `ended_at`

**Decision.** `apps/api/src/features/database/models.py` now holds a server-side table for
every device table that crosses the sync boundary: `devices`, `session_events`,
`reminders`, `reminder_events`, `people`, `memory_items`. The columns come from
`apps/mobile/src/db/schema.ts` — for `session_events`, from `SessionStats` field for field
— plus the two things a device does not store about itself, `patient_id` and `device_id`.
`patients` gained `enrolled_at` and `enrolled_by`. The device's `sync_queue` has no server
twin; it is bookkeeping about what is owed, and the server is who it is owed to.

**`session_events` is the server's copy of the device's `game_session`, not of its
`session_event`.** The name is `data-model.md` §2's and it is the sharpest trap in the
schema: on the phone, `session_event` is per-attempt detail that never leaves the device
unless a session is flagged for review (`AGENTS.md` §2.5). One row here is a whole round.
The docstring says so, because a reader who assumes otherwise will build the wrong ingest.
It is also not `game_sessions`, the older caregiver-authored activity record the dashboard
reads today — that table and `question_events` are untouched.

**The primary key is `(id, ended_at)` and the idempotency key is `(device_id, seq,
ended_at)`.** Timescale requires every unique index on a hypertable to include the
partitioning column, and `create_hypertable` refuses a table whose keys do not. Widening
them now costs a fatter index; widening them after the table has rows costs a rewrite of
the ingest path as well as the data. The upsert stays exact because a retry sends the
queued JSON snapshot byte for byte (D-24), so `ended_at` is as deterministic as the other
two columns.

**`reminder_events.reminder_id` is a plain uuid with no foreign key.** Every reminder today
is created on the phone (D-25) and nothing syncs a definition up, so a real event would
reference a row that does not exist here and the insert would be refused. An event is
evidence and must land regardless; the column is still a real id, so a join finds the
definition the day one arrives. **Do not "fix" this by adding the constraint** — it drops
adherence data on the floor.

**The down-sync tables carry `updated_at` and `deleted_at`.** `GET /sync/pull?since=` has
to tell a device that has been off for a week about a person who was removed as well as one
who was added, and a hard delete is silent to a watermark. `reminders`, `people` and
`memory_items` are therefore soft-deleted; the append-only streams are not, because nothing
ever removes a fact.

**No display name on `patients`, still.** `data-model.md` §2 lists one; D-20 says the server
mirrors nothing about a person and it wins. The device holds the name it greets the reader
with, and Clerk holds it for anyone with an account. `people.name` is not an exception — a
row there is a family member the caregiver typed in, not an account.

**Not built by this change:** no migrations (`create_all` still), no hypertable, no
continuous aggregate, and no endpoint writes any of these tables. This is the schema the
`/sync/*` routes in `api-contract.md` §2 are owed, and nothing more.

**Would change it if:** Timescale is dropped for plain Postgres, in which case the two
composite keys go back to `id` and `(device_id, seq)` and the ingest simplifies with them.

---

## D-33 · 2026-09-01 · Sync is an outbox the device drains, and a queue row leaves only on a server's answer

**Decision.** The two append-only streams now cross the boundary. `apps/api` gained
`src/features/sync/` — `POST /sync/sessions` and `POST /sync/reminder-events`, both
authenticated, both idempotent on `(device_id, seq)` (D-09) — and the phone gained
`src/db/queue.ts` (the outbox, as storage sees it), `src/lib/sync.ts` (the drain, the only
place in the app that sends anything anywhere) and `src/hooks/use-sync.ts`, mounted at the
root beside `useRoleEnrolment`. The device registers itself on its first successful call;
nobody provisions a `devices` row by hand.

**A queue row is deleted only on a response that accounts for it.** Not on a timeout, not
on a 5xx, not on a guess. The phone is holding the only copy of a round somebody actually
played, so every ambiguous outcome — no radio, an expired session, a server that is down,
a device nobody has enrolled yet — leaves the queue exactly as it was and stops the run.
This is the one rule the ingest contract in `api-contract.md` §2 states outright, and it is
why `apiFetch`'s split between `ApiUnreachableError` and `ApiError` (D-21) was worth having.

**The server accounts for every row in a batch, one row at a time.** A row it already has
is a **duplicate**, which is a success — that is what a retry is supposed to produce, and a
batch that is entirely duplicates means the last attempt landed and only the acknowledgement
was lost. A row it can never store comes back **named in `rejected`**, and the rest of the
batch still lands. That requires one insert per row inside its own savepoint: a multi-row
insert cannot say which row it choked on, and in Postgres one failed statement poisons the
surrounding transaction and takes down every row that had already succeeded — the
all-or-nothing outcome the contract exists to prevent. A batch is capped at 200 rows of a
few dozen bytes on a stream that arrives a few times a day, so the round trips are affordable
and the accounting is exact.

**A rejected row is dropped from the queue, and its `game_session` row is not touched.**
The queue is an outbox, not the record. Dropping an entry means "stop carrying this", never
"this did not happen" — which is what makes it safe, and why the drop is safe for a rejected
row and an accepted one alike. A row nobody will ever take, left at the head of the queue,
blocks every row behind it forever.

**422 is the only status the client ever gives up on**, and only after five attempts. It
means this build sent something the server cannot parse — a phone newer than the API it is
talking to — and no amount of waiting fixes it. Everything else is retried indefinitely,
because everything else is somebody else's problem and not the row's. The inbound schemas
are `extra="ignore"` for the same reason from the other side: a newer phone's unknown column
must not cost the server a batch of true rows.

**`device.last_synced_seq` is the lowest still-queued `seq` minus one**, computed on the
phone, and it decides nothing. The two streams share one counter, so a batch of sessions
says nothing about a reminder event numbered between them, and a watermark taken from a
response would over-report. The queue is what says what is owed; the watermark is what a
"last synced" line would read, and it must not be able to claim more than it knows. The
server returns `last_seq` too — the highest sequence it holds across both streams — and it
is diagnostic only.

**Triggered on app open and on return to the foreground, awaited by nothing** (§2.1, §2.2).
`useSync` sits next to a splash screen that lifts on Clerk and stored preferences and on
nothing else, throttled to one run per two minutes so a reader switching between the app and
a phone call does not drain the battery finding out there is nothing new. `sync()` never
rejects — every outcome it has is a returned value — because there is no caller for whom a
failed sync is exceptional.

**Not built by this change.** No down-sync: `GET /sync/pull?since=` has a schema behind it
(D-32) and no route, and the phone has nothing to apply one to yet — People and Memories are
still `EmptyState`, caching a photo to the filesystem needs a dependency the app does not
have, and who owns a reminder definition is unresolved while every reminder is device-created
(D-25). No Alembic still, so these tables appear on a fresh database and not on an existing
one. **And no connectivity trigger**: the natural third moment to drain is the radio coming
back, which needs `@react-native-community/netinfo` or `expo-network`, and adding a dependency
was out of scope here. Until one lands, a phone that regains signal while the app is open in
front of someone waits for the next time they leave and come back.

**Would change it if:** batches grow large enough that one insert per row costs real latency,
in which case the fast path becomes a multi-row insert with the per-row savepoint loop kept
as the fallback a failed batch retries through — the accounting the contract requires cannot
be dropped, only skipped when nothing goes wrong.

---

## D-34 · 2026-09-01 · Sync runs both ways: reminders are server-owned, and a reinstalled phone gets its history back

**Decision.** `GET /sync/pull?since=&restore=` completes the loop D-33 opened. Reminder
definitions are owned by the caregiver and pulled **down**; a phone that has lost its
storage pulls this reader's game history down with them. The dashboard gained the CRUD that
makes the first half meaningful — `GET`/`POST /dashboard/patients/{id}/reminders` and
`PATCH`/`DELETE .../{reminder_id}`. On the device: `remote_session` and
`device.last_pulled_at` (migration v2), `applyReminders()` in `lib/reminders.ts`,
`restoreSessions()` in `lib/game-history.ts`, and a `takeDown()` pass in `lib/sync.ts` that
runs after the push.

**Up first, then down, and a pull failure never costs a push.** What the device is holding
is the only copy of it; what the server is holding is backed up. So the push runs first and
the pull only runs if it got through, and neither can strand the other.

**Reminders are server-authoritative, so there is no merge and no conflict** (`data-model.md`
§3 rule 2). Whatever comes down replaces what the phone has. One owner is what buys that,
and it is the whole reason to resist letting both sides edit the same row.

**A retirement travels as a row, not as an absence.** `DELETE` is a soft delete setting
`deleted_at`, and the reminder comes down with `deleted: true`. A hard delete is invisible
to "what changed since Tuesday" — a phone that was switched off when the caregiver retired
something would go on showing it forever. This is the single reason the down-sync tables
carry `deleted_at` at all (D-32), and it is why the pull query has no `deleted_at IS NULL`
filter: the retired row is the one a stale device most needs.

**Deleting a reminder on the device cascades its `reminder_event` rows, and that is safe
only because the outbox holds snapshots.** `sync_queue.payload` is a JSON copy rather than a
pointer (D-33), so an acknowledgement that has not synced yet still syncs after its
definition is gone. If the queue ever becomes a pointer, this cascade starts destroying
adherence data.

**`notification_ids` is never overwritten by a pull.** It is this device's own scheduling
state — which OS notifications this reminder currently has booked — and the server does not
know it. When `expo-notifications` lands, an edit arriving here is exactly what has to
cancel and rebook them, reading that column to know what to cancel.

**Restored history lives in `remote_session`, a separate table with no `seq`.** A sequence
number belongs to the device that issued it, and these rounds were played on a phone that
no longer exists — or on this one, before it was wiped. They are read like history and
**never queued and never sent back up**; they are already on the server, which is where
they came from. A separate table rather than a nullable column or a flag on `game_session`
because SQLite cannot widen a `NOT NULL` column without rebuilding the table, and because
two tables cannot be confused by a query that forgets to check a flag. `recentSessions()`
merges both and dedupes by id, so **the adaptive engine never learns a reinstall happened**
— which is the point: the comparison is against this reader's own past (`AGENTS.md` §2.4),
and being handed a new phone is not an answer to that question.

**`restore=true` is asked exactly when `last_pulled_at` is null**, not when the session
table is empty. A reader who opens a fresh install offline and plays a round before it ever
syncs would answer "not empty" to the second question and stay without the months of
history that are sitting on the server.

**The watermark is the server's clock, echoed back.** `PullOut.synced_at` is read *before*
the queries and stored verbatim as `last_pulled_at`; the device sends it back as `since`. A
phone's own clock can be wrong by hours, and the cost is either a window of the caregiver's
changes silently skipped or the same ones re-sent forever. Reading the clock before the
queries rather than after is the same bug in miniature: a reminder edited mid-request would
otherwise carry an `updated_at` below the watermark and never arrive. The watermark moves
only after both collections have been written.

**Restores are capped at 200 rounds** — comfortably deeper than the fifty the engine reads,
and bounded so a patient with two years of play does not turn one reinstall into a
multi-megabyte response over 2G. `sessions_truncated` says when there was more; nothing asks
for the rest yet.

**Schedules and kinds are validated at the API door**, against the same `HH:MM|1111111`
pattern `parseSchedule` uses and the same four kinds the phone can draw. A string the device
cannot parse is a reminder it silently skips, and a caregiver would never find out — so it
is refused where somebody is still looking at a screen.

**Not built by this change.** **Reminder definitions do not sync up**: one added on the phone
(D-25) stays invisible on the dashboard. That is the honest consequence of rule 2 — the
device-created reminder is the stopgap, and the fix is for the phone's "add a reminder" to
POST to the caregiver endpoint rather than for both sides to own the table. People and
memories still do not come down, because nothing draws them and photo caching needs a
dependency the app does not have. Still no Alembic, which now blocks `reminders` on a
deployed database as well as the ingest tables.

**Would change it if:** the family wants to add reminders from the phone as a first-class
flow, at which point definitions need an up-stream and a real conflict rule — last-write-wins
on `updated_at` would be the cheap answer and it would quietly lose a caregiver's edit.

---

## D-35 · 2026-09-01 · Alembic owns the schema; `create_all` was building half a database

**Decision.** `apps/api/alembic/` exists, `alembic upgrade head` is how the schema changes,
and `init_db()` no longer calls `create_all`. It checks the database is reachable, checks
something has migrated it, and prints one line naming the command if nothing has. Task
targets: `db:migrate`, `db:current`, `db:history`, `db:revision`, `db:downgrade`, `db:stamp`.

**`create_all` was not merely "not running on an existing database" — it was doing something
worse, and `progress.md` had it wrong.** `Base.metadata.create_all` defaults to
`checkfirst=True`, so on a database that already exists it *does* create every missing
table. What it never does is add a column to a table that is already there. So D-32's new
tables did appear on the deployed database, and `patients.enrolled_at` / `enrolled_by` did
not — leaving a schema that looks complete and fails every sync call with
`column patients.enrolled_by does not exist`. A migration that silently half-applies is
worse than one that does not run, because nothing reports it and the failure surfaces
somewhere unrelated, hours later.

**`0001_baseline` is idempotent, and it is the only revision that ever should be.** It asks
the database what it already has and reconciles three real states: empty; built before the
synced tables were modelled; and built by `create_all` at a commit in between. Tables,
indexes and the two late columns are checked **separately** — a table that already exists
can still be missing an index added to the model after it was created, which the first
version of this migration got wrong and an autogenerate drift check caught. From 0001
onward, migrations are ordinary and assume they know their starting point.

**`db_auto_create` (default `false`) puts the old behaviour back** for a throwaway database
where a migration is more ceremony than the data is worth. It should stay off anywhere the
data matters, for the reason above.

**The URL is not in `alembic.ini`.** It is a credential (§2.5) and `env.py` reads it from
`core.config.settings`, so there is one place a database is configured for both the app and
its migrations and no way for them to drift. `env.py` uses the same async psycopg driver as
the app, so a dialect quirk cannot appear in one and not the other.

**Clerk's `getToken` is not referentially stable, and in this file that was a bug.** The
first cut listed it as an effect dependency; Clerk returns a new function every render, so
the effect re-ran every render, its own `setLink` caused the next render, and the phone
asked `/care/link` two or three times a second for as long as it was open. `getToken` is
now read through a ref and the effects depend on `userId` and the two Clerk booleans only —
the same fix applied to `useRoleEnrolment`, which had the identical shape and would POST
`/auth/patient-role` on every render until its marker was written. Anything else that takes
`getToken` from `useAuth` inside an effect wants the same treatment; `useSync` is safe only
because a two-minute guard swallows the repeats.

**Verified** against a throwaway Postgres in all three starting states: each converges on
the same 14 tables at revision 0001, an existing `patients` row survives with `enrolled_at`
backfilled to the migration's own clock, re-running applies nothing, and
`alembic revision --autogenerate` afterwards finds **no drift** in any of the three — which
is the real proof that the migration and the models agree. Both sync suites then pass on a
schema built by Alembic rather than by `create_all`.

**Would change it if:** the Timescale hypertable lands, which is a `SELECT
create_hypertable(...)` in a migration and must run before `session_events` has meaningful
data — it rewrites the table.

---

## D-36 · 2026-09-01 · A reminder made on the phone syncs up; the device may create one, and only create it

**Decision.** `addReminder()` now writes its `sync_queue` entry in the same transaction as
the row, `POST /sync/reminders` ingests the stream, and `reminder` joins `game_session` and
`reminder_event` in `SyncEntity`. A reminder the reader adds on their own phone now appears
on the caregiver's dashboard.

**This closes a gap D-34 shipped with and named.** Reminders synced down and never up, so
the one kind of reminder the family could not see was the kind the reader made themselves —
which is the kind they would most want to know about.

**The device may create a reminder. It may not change or retire one.** That single sentence
is what keeps `data-model.md` §3 rule 2 true while both ends can write: there is exactly one
moment the phone authors a definition, and it is the first. Everything after — edits,
switching off, retiring — is the caregiver's, and the phone takes what it is given (D-34).
So this stream carries creations only, and there is no second queue entry anywhere in
`lib/reminders.ts`.

**Ingest is `ON CONFLICT DO NOTHING`, and that is the design rather than an optimisation.**
The row's id is the device's own uuid, so a retried batch finds its own earlier row — but so
does a batch that has been sitting in the outbox since before the caregiver edited the
reminder. Upserting the payload would silently revert their change. A device retry is not a
reason to overturn a person's decision, so the first write wins and every later one is
counted as a duplicate. **Verified**: a stale batch replayed after a caregiver moved a
reminder from 21:00 to 20:00 left it at 20:00.

**No `(device_id, seq)` on this stream, and none needed.** `reminders` has no such columns:
a client-generated uuid is already unique, which makes the insert idempotent on its own.
`seq` still rides along, because it is what orders the outbox — it just is not the dedupe
key, and it is not counted in the ack's `last_seq` watermark either.

**Validation is `kind` and `schedule` only.** Both are checked against exactly what the
device can draw and `parseSchedule` can read, because a row that reached the caregiver's
screen with an unparseable schedule would be a reminder nobody can see is broken. There is
deliberately **no length cap on the copy**: the column is `Text`, and truncating what
somebody wrote for a person with dementia to satisfy a validator is not a trade worth
making.

**`created_by` holds the patient's own Clerk id**, which is factually who created it, and
is how the dashboard can tell a reminder the reader set from one the family set. A
person-shaped column holds a Clerk id and nothing else (D-20).

**`notification_ids` never leaves the phone.** What this device has booked with the OS is
local scheduling state; the server neither knows nor should know it (D-34).

**Still not done:** the phone cannot edit, switch off or delete a reminder — not a sync gap
but a missing screen, and the sync model above is what that screen would have to respect. A
reminder retired by the caregiver still cascades its local `reminder_event` rows on the
device; the queued snapshots survive it, so unsynced adherence still syncs (verified), and
that remains true only while `sync_queue.payload` is a snapshot rather than a pointer.

**Would change it if:** the phone gains real editing, at which point definitions become
genuinely two-way and need a conflict rule — `updated_at` last-write-wins is the cheap
answer and it would quietly lose a caregiver's edit, which is the outcome this decision
exists to prevent.

---

## D-37 · 2026-09-01 · A nine-digit Smaran id is how a caregiver gets linked, and the link starts `pending`

**Decision.** `roles.smaran_id` is an `INTEGER NOT NULL UNIQUE` filled from a Postgres
sequence, `smaran_id_seq`, starting at 100,000,000. `patient_caregivers` gains
`status` — `pending` · `active` · `revoked` — defaulting to `pending`. Both arrive in
`alembic/versions/0002_smaran_id_and_caregiver_status.py`.

**Why nine digits from a sequence.** The id exists to be read out loud: a patient (or the
family member holding their phone) says it, a caregiver types it in. That rules out uuids,
letters and anything case-sensitive. Starting at 100,000,000 means the first id is already
nine digits wide and none of them ever grows a digit, so every field, every label and every
validator can assume exactly nine. Postgres owns the counter because a sequence is the only
version of "next number" that two simultaneous sign-ups cannot both win; computing
`max + 1` in the service would hand out collisions under exactly the load a launch produces.
`INTEGER` is enough — the ceiling is 2,147,483,647, twice the largest nine-digit number.

**It lives on `roles`, not on `patients`.** `roles` is the one person-keyed table (D-20) and
its primary key is the Clerk user id, so one row is one account and the id is unique per
account without a second table to join. A patient with no Clerk account has no Smaran id,
which is correct: there is nobody to read one out.

**Why the link starts `pending`.** A number short enough to say over the phone is a number
that can be guessed or overheard, so it must not be a credential. Quoting somebody's Smaran
id creates a `pending` row and nothing more — no patient data is readable until an approval
moves it to `active`. `revoked` is a state rather than a delete, because who had access and
when it ended is exactly what a family may need to ask about later (§2.5).

**Not built yet.** This is schema only. No route issues, reads or validates a Smaran id, and
nothing moves a link out of `pending` — the approval step is a screen and an endpoint that
do not exist. Any code added later must check `status = 'active'` and not merely the row's
existence, or the pending state buys nothing.

**Would change it if:** ids ever needed to be unguessable, in which case the answer is a
longer random id *plus* the approval step, never the id alone.

---

## D-38 · 2026-09-01 · Setup asks for a caregiver's Smaran id before the app opens, and the answer is cached

**Decision.** A signed-in reader whose device does not know of an **active** caregiver link
lands on `src/app/setup.tsx` and nothing else. They type the nine-digit Smaran id of the
person who helps them, `POST /care/link` writes a `pending` row, and the screen becomes a
spinner until a caregiver accepts. `CareLinkProvider` (`hooks/use-care-link.tsx`) holds the
answer, caches it in the secure store under the Clerk user id, and the root gate reads
**that cache** — never the network. This is D-37's "not built yet" built.

**The cache is the gate; the network only corrects it.** Opening the app waits on a
key/value read that works with the radio off, so a phone linked in March opens in June in a
house with no signal exactly as it did the day it was set up (§2.1). The refresh that
follows is awaited by nobody: if it fails, the cached status stands and the reader is told
nothing.

**Setting up is the one reader-facing flow that genuinely needs a signal, and that is not a
§2.1 violation so much as the shape of the problem** — there is no way to learn that a
caregiver said yes without asking them. It happens once, next to the sign-in that also
needs a signal, and everything downstream of it is local. The alternative — letting an
unlinked phone into the app — is a phone with no reminders, no people to call, and a
`sync_queue` that 409s forever because nothing has a `patients` row to attribute it to.

**Setup is where a self-signed-up reader becomes a `patients` row.** `ensure_patient()` in
`features/care/service.py` creates it, writing nothing but the Clerk id. Before this, only
a caregiver creating a patient on the dashboard made that row, so a reader who signed
themselves in had every sync call refused with the 409 D-33 defined and no way at all to
resolve it. Creating it at a deliberate act rather than at sign-in keeps the row meaning
"somebody set this phone up".

**The caregiver's read path now filters on `status = 'active'`, and that was the load-bearing
half of this change.** Six queries in `features/dashboard/service.py` joined
`patient_caregivers` on `caregiver_id` alone. That was harmless while nothing created a
`pending` row; the moment a patient can create one by typing a number, it would have meant
that quoting somebody's Smaran id handed them a patient's data — the exact thing D-37's
`pending` state exists to prevent (§2.5). `LINK_ACTIVE` is defined once, in
`features/care/schemas.py`, so the write path and the read path cannot drift.

**`POST /care/requests/{id}` is the only thing that grants access**, and it is deliberately
a caregiver route: access is something a patient asked for and a caregiver agreed to, never
something either half arranged alone. `GET /care/requests` returns a link id, a patient id
and a status and nothing else — everything that would help a caregiver recognise the
patient sits *behind* the approval, not in front of it.

**The waiting screen polls every 15 seconds** while it is open in front of somebody, and
stops the moment the link is accepted. That is not background work and nothing depends on
it having run (§2.2) — the "Check again" button does the same thing, and closing the app
and reopening it does too.

**Idempotent by contract.** Asking twice for the same caregiver returns the request that
already exists rather than stacking up rows for somebody to answer one at a time. A
`revoked` link asked for again goes back to `pending`: ending access is not the same as
refusing to consider it a second time, and the caregiver still has to say yes.

**Clerk's `getToken` is not referentially stable, and in this file that was a bug.** The
first cut listed it as an effect dependency; Clerk returns a new function every render, so
the effect re-ran every render, its own `setLink` caused the next render, and the phone
asked `/care/link` two or three times a second for as long as it was open. `getToken` is
now read through a ref and the effects depend on `userId` and the two Clerk booleans only —
the same fix applied to `useRoleEnrolment`, which had the identical shape and would POST
`/auth/patient-role` on every render until its marker was written. Anything else that takes
`getToken` from `useAuth` inside an effect wants the same treatment; `useSync` is safe only
because a two-minute guard swallows the repeats.

**Verified** against a throwaway Postgres migrated by Alembic, at the service layer: an
unset-up phone reads `none`; an unknown number and a *patient's* own number are both 404s;
the request lands `pending` and creates the `patients` row; asking twice makes one row; a
pending link grants no dashboard access; the caregiver sees the request and another
caregiver sees neither it nor any way to approve it; approval flips both the phone's read
and the dashboard's; revoking ends access and can be asked for again; and a caregiver
account asking for a carer is a 403.

**Costs and what is not done.** There is no caregiver-side *screen* for any of this — the
approval is an endpoint, so the loop closes over HTTP but not yet in the dashboard UI. A
reader who cannot reach the API cannot complete setup, and the screen says so warmly rather
than pretending otherwise. `patient_caregivers` still has no timestamp, so requests come
back in no particular order; that is fine for a handful and wants a `requested_at` column
before it is not.

**Would change it if:** setup ever needed to work fully offline — the answer there is a
caregiver-provisioned phone, where the family sets the device up on their own account and
hands it over already linked, and the Smaran id flow stays as the path for a reader who
signed themselves in.

