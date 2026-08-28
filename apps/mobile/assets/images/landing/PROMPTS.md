# Landing art

Four full-screen photographs, one per page of the landing story, plus the scrim
that is drawn over them.

The four slide files here are **placeholders** — dark colour fields with light
pooling low in the frame, generated from the palette so the screen looks
finished while the real photography is made. Replacing one is a straight file
swap: same name, same folder, nothing in the code changes.

`scrim.png` is not art. It is an 8 × 1024 alpha ramp stretched over the whole
screen: dark at the top under the headline, near-clear across the middle, dark
again at the bottom under the controls. Leave it alone unless the type stops
clearing contrast.

## Specification (applies to all four)

- **Aspect / size:** 9:19.5 portrait — a phone screen. 1170 × 2532 px minimum.
- **Format:** ship WebP at quality 93. These are photographs, and PNG costs
  roughly 13× the bytes for no visible gain — the four slides are ~510 KB as
  WebP against 6.6 MB as PNG, and WebP is quicker to decode at launch, where all
  four pages mount at once. Quality 93 rather than the usual 80: the art is
  low-key, and shadow blocking is the one artefact that would show. Keep the
  lossless original in `_masters/` (git-ignored, never bundled — nothing
  requires it) and re-encode from there rather than from a previous export.
- **Composition — the important one.** The art is full-bleed, with white type
  over it:
  - The **top 45%** must stay dark, quiet and near-empty. The kicker, headline
    and supporting line are set there. Nothing with detail, nothing bright, no
    faces, no horizon line.
  - The **subject sits in the lower two-thirds**, roughly centred, and is where
    all the light in the frame is.
  - The **bottom 18%** is under the controls — keep it dark and free of detail.
  - The art drifts ±48 px horizontally as the page is swiped, so leave ~8% of
    dead margin on the left and right edges.
- **Exposure:** low-key throughout. Deep shadow across most of the frame with
  one soft pool of light on the subject — the way a lamp lights a room at dusk.
  Overall image should read as dark; nothing near white except the light source
  falloff itself. This is what lets white type sit on it at 7:1.
- **Style:** warm, editorial, photographic. The same treatment across all four,
  so the set reads as one evening rather than four stock photos. No collage, no
  flat vector look, no 3D render sheen, no HDR.
- **Light:** one soft directional source, warm — late lamp light or last
  daylight. Gentle falloff, slight film grain, shallow depth of field with the
  background dissolving. No harsh speculars, no lens flare.
- **Palette:** pull from the app tokens. Deep blue `#094A95` / `#0B3A72`, warm
  amber `#F3B267` / `#803B06`, soft green `#7FD8A0` / `#13592E`. Muted and
  desaturated, sitting on near-black.
- **People:** older adults, 65+, shown with dignity and agency — never frail,
  never being managed, never in a clinical setting. Mixed ethnicities across the
  set. Faces relaxed, unposed, mid-moment, and never looking at the lens.
- **Absolutely no text, letters, numbers, logos, watermarks, UI elements, or
  phone/tablet screens anywhere in the image.**

## `today.png` — "Your day, one thing at a time"

> Low-key photograph of a kitchen table at dusk, lit by one warm lamp just out
> of frame to the left. On the table: a single ceramic mug, a folded paper note,
> a pair of reading glasses. The light pools tightly around them in the lower
> two-thirds of the frame; everything above falls away into deep blue-black
> shadow with no detail. Shot slightly from above, shallow depth of field, warm
> amber light against cool blue shade. Calm and uncluttered — three objects at
> most, a sense of one thing at a time. Palette of deep blue `#0B3A72` and warm
> amber `#F3B267` on near-black. Soft film grain. No text, no numbers, no clock
> faces, no screens.

## `people.png` — "The people who matter, always close"

> Low-key photograph of an older woman in her seventies laughing with a younger
> relative beside her, heads inclined toward each other, lit by one soft warm
> source from the left. They sit in the lower two-thirds of the frame; the room
> above and behind them falls into deep blue-black shadow with no detail. Waist
> up, respectful middle distance, shallow depth of field. Genuine unposed warmth
> — caught mid-laugh, neither of them looking at the lens. Palette of deep blue
> `#094A95` and soft green `#7FD8A0` on near-black, warm amber on the skin. Soft
> film grain. No text, no phones, no screens, no clinical setting.

## `memories.png` — "Memories, kept where you can find them"

> Low-key photograph of old printed photographs scattered on a warm wooden
> surface, one held lightly between the fingers of an older hand entering from
> the lower edge. A single warm lamp rakes across from the right, lighting the
> photographs in the lower two-thirds and leaving the top of the frame in deep
> brown-black shadow. The photographs' own contents are soft and out of focus —
> impressions of faces rather than legible images. Nostalgic but not sepia:
> colour, just softened. Palette of warm amber `#F3B267` and deep brown
> `#4A2A14` on near-black. Soft film grain. No text, no dates written on the
> photos, no screens.

## `help.png` — "Help, the moment you need it"

> Low-key photograph of an older hand held gently in a younger one, resting on a
> knitted blanket in soft green and blue tones. Close crop, the hands in the
> lower two-thirds of the frame under one soft warm light from the upper left,
> the room above dissolving into deep green-black shadow. Reassurance and
> steadiness rather than urgency: no red, no medical equipment, no emergency
> imagery, no alarm. Palette of soft green `#7FD8A0` and deep green `#13592E` on
> near-black. Soft film grain. No text, no phones, no screens, no clinical
> setting.
