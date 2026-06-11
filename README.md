# Terra

Terra is a lifestyle RPG: your real-world activity terraforms a living planet.
Walk, sleep, eat well, and exercise — and watch the Steppe turn green, forests
grow, rivers fill, and animals arrive. Terra never talks about weight loss,
calories, or BMI. It only talks about your planet.

## Tech stack

- Kotlin, MVVM + Clean Architecture (`data/`, `domain/`, `presentation/`, `di/`)
- Jetpack Compose + Compose Navigation
- Hilt for dependency injection
- Room for local persistence
- Health Connect (`androidx.health.connect`) for steps, sleep, exercise, nutrition
- WorkManager for hourly health sync, nightly world growth, and notifications
- Custom Canvas drawing for the planet, charts, and creature silhouettes

Min SDK 26 (Android 8.0), target/compile SDK 35.

## Project structure

```
app/src/main/java/com/terra/app/
├── data/
│   ├── health/        HealthConnectSource (+ MockHealthSource fallback)
│   ├── local/          Room database, DAOs, entities, companion catalog
│   ├── repository/      Repository implementations + entity<->domain mappers
│   └── worker/          WorkManager workers + scheduler
├── domain/
│   ├── model/           Plain Kotlin domain models
│   ├── usecase/         Business logic (Vitas sync, nightly growth, onboarding...)
│   ├── GameRules.kt      All game-balance constants and formulas
│   └── repository/       Repository interfaces
├── di/                   Hilt modules
└── presentation/
    ├── onboarding/       5-step onboarding flow
    ├── planet/           Planet Canvas + home screen
    ├── activity/         Vitas cards, weekly charts, meal logger
    ├── journal/          Planet event timeline
    ├── companions/        Creature grid + Canvas silhouettes
    ├── settings/          Health Connect, freeze days, notifications
    └── theme/             Compose theme & palette
```

## Building

1. Open the project root in Android Studio (Ladybird/Koala or newer).
2. Let Gradle sync — it will generate the wrapper JAR automatically on first
   sync if it's missing (or run `gradle wrapper --gradle-version 8.9` once
   you have network access).
3. Run on a device or emulator with **Android 9.0 (API 28) or newer**
   recommended for Health Connect (older devices fall back to demo data,
   see below).

## Health Connect setup (for testing on a device)

Health Connect ships as a separate app on most devices.

1. Install **Health Connect** from the Play Store (on Android 14+ it's
   built into Settings > Health Connect).
2. Launch Terra and complete onboarding. On the "Connect your activity"
   step, tap **Connect Health Connect** and grant the four read permissions
   (Steps, Sleep, Exercise, Nutrition).
3. To populate test data, write some sample records into Health Connect using
   another fitness app (Google Fit sync, Samsung Health, or any app that
   writes `StepsRecord` / `SleepSessionRecord` / `ExerciseSessionRecord`), or
   use Health Connect's own debug tooling.
4. Terra polls Health Connect once an hour via WorkManager
   (`HealthSyncWorker`). To see immediate results while testing, open the
   **Activity** tab — Terra also re-syncs whenever the Planet screen or
   Settings screen is opened.
5. The nightly growth pass runs at **3:00 AM** (`NightlyGrowthWorker`). It
   converts the previous day's Vitas into biome growth, unlocks new biomes,
   advances stages, writes Journal entries, and may unlock companions or a
   Wonder.

### No Health Connect / emulator testing

If Health Connect isn't available (emulator, unsupported device, or
permissions denied), Terra falls back gracefully:

- `HealthRepository.snapshot()` returns zeros so the app never crashes.
- Toggle **Demo data** in Settings to use deterministic mock activity data
  (`MockHealthSource`) — this lets you exercise the full Vitas → growth →
  journal → companions loop without any health provider.

### Speeding up testing of the nightly job

`NightlyGrowthWorker` and the two notification workers are scheduled with
`ExistingPeriodicWorkPolicy.KEEP` at 3am / 8am / 7pm. For quick manual testing
during development, trigger `ApplyNightlyGrowthUseCase` from a debug entry
point, use `adb shell cmd jobscheduler` against the WorkManager job, or
temporarily change the scheduled times in `WorkScheduler.kt`.

## Game rules at a glance

All formulas live in `domain/GameRules.kt`:

- **Vitas of Movement**: 1000 steps = 10 units, capped at 150/day
- **Vitas of Rest**: 7–9h sleep = 40, 6–7h = 25, <6h = 5, capped at 40/day
- **Vitas of Nourishment**: healthy meal = 15, neutral = 8, junk = 2, capped at 45/day
- **Vitas of Growth**: 20 min exercise = 30 units, capped at 60/day
- **Specialization** gives +25% to one Vitas type permanently
- **7-day streak** gives +20% to all Vitas types for that week
- **Drought**: total daily Vitas below 30% of max (235) costs unlocked biomes
  2% growth overnight, unless a freeze day is active (max 3/month)
- **30-day streak** unlocks a Wonder in the most advanced unlocked biome
- **Planet Era** = (sum of all biome stages ÷ 6) + 1, capped at 10

## What Terra deliberately does not do

No calorie counting, no weight tracking, no BMI calculator, no diet plans,
no "lose X kg" messaging, and no leaderboards. Activity is always framed as
caring for your planet.
