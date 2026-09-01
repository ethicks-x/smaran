# Capability coverage — SIH26003

The nine required capabilities from the problem statement, mapped to code and owner. This
is the grading rubric; check any feature request against it.

**✅ done · 🟡 partial · ⬜ not started**

| # | Required capability | Status | Where it lives / what's missing | Owner |
|---|---|---|---|---|
| 1 | Interactive cognitive games — memory, attention, routine recall, pattern/object recognition, emotional engagement | ⬜ | **No game code at all.** `recall.tsx` is a name warm-up, not a game. The Memories tab covers the emotional-engagement strand but is an empty shell, and People lost its tab to Games (`decisions.md` D-41) without a replacement home | Rupam |
| 2 | AI/ML-driven adaptive difficulty | ⬜ | Design frozen (`architecture.md` §6, D-07): pure module, rules in v1, model later behind the same signature. No code; blocked on §1 and local storage | Rupam |
| 3 | Multilingual, voice-assisted interaction | ⬜ | Every string is hardcoded English; no TTS. Both are hard requirements and both get more expensive the more screens exist | Sinchan |
| 4 | Culturally familiar themes, visuals, sounds, regional language | 🟡 | Palette, type scale and warm plain-language copy are done and genuinely elder-tuned. Every string is now translated into Hindi, Bengali and Assamese and switchable offline (`decisions.md` D-12) — translations still need native review. No regional imagery or sounds yet | Sinchan / Ananya |
| 5 | Reminders — medicine, hydration, activities, appointments | ⬜ | `account/notifications.tsx` *describes* the behaviour; nothing schedules anything. `expo-notifications` not installed. Schema drafted (`data-model.md` §1) | Arif |
| 6 | Caregiver / health-worker dashboards | ⬜ | `apps/web` is unmodified `create-next-app`. Endpoints designed (`api-contract.md` §2) but not built | Sukamal |
| 7 | Offline functionality | 🟡 | The **architecture** is offline-first and every screen renders without a network. But there is no local database, so nothing is actually *persisted* offline. This is the single biggest gap between the pitch and the code | Arif |
| 8 | Simple, elderly-friendly mobile/tablet UI | ✅ | The strongest part of the build: AAA-contrast palette, 18pt type floor, 48pt+ touch targets, one global size dial, labelled always-visible tabs, one primary action per screen, no time limits, warm plain copy | Sinchan / Arif |
| 9 | Analytics dashboard · caregiver alerting · offline sync · secure patient data · accessible UX | 🟡 | Accessible UX ✅. Alerting has a UI shell (`Help`, hardcoded contact). Analytics ⬜, sync ⬜, secure data handling ⬜ (no auth on the API, no data to secure yet) | all |

---

## Reading of the state

**One capability is genuinely done (8).** Two are partial in a way that flatters the code —
(4) is elder-friendly but not yet NER-specific, and (7) has the right architecture with none
of the persistence that would make it true.

**Six are not started, including the two the problem statement leads with.** Games (1) and
adaptive difficulty (2) are the centrepiece; both are blocked on local storage, which blocks
(7) as well.

## The critical path

```
local SQLite + Drizzle  ──▶  one game end-to-end  ──▶  adaptive engine
        │                            │
        └──▶ reminders (5)           └──▶ sync (7,9) ──▶ dashboard (6,9)

i18n + TTS (3,4) run in parallel and should start early — they get more expensive
with every screen added.
```

Ordered work is in `progress.md` §Next.
