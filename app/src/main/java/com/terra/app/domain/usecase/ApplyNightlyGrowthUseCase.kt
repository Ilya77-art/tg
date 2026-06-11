package com.terra.app.domain.usecase

import com.terra.app.domain.GameRules
import com.terra.app.domain.model.Biome
import com.terra.app.domain.model.BiomeState
import com.terra.app.domain.model.DailyVitas
import com.terra.app.domain.model.EventType
import com.terra.app.domain.model.PlanetEvent
import com.terra.app.domain.model.UnlockCondition
import com.terra.app.domain.model.VitasType
import com.terra.app.domain.repository.CompanionRepository
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.repository.VitasRepository
import com.terra.app.domain.repository.WorldRepository
import java.time.LocalDate
import javax.inject.Inject
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

/**
 * The 3am terraforming pass. Takes yesterday's Vitas, applies drought or
 * streak effects, spends the accumulated pool on biome growth, unlocks
 * biomes/stages/companions and writes journal events. Idempotent per day.
 */
class ApplyNightlyGrowthUseCase @Inject constructor(
    private val userRepository: UserRepository,
    private val vitasRepository: VitasRepository,
    private val worldRepository: WorldRepository,
    private val companionRepository: CompanionRepository,
) {
    suspend operator fun invoke(dayToProcess: LocalDate = LocalDate.now().minusDays(1)) {
        val profile = userRepository.getProfile() ?: return
        val last = profile.lastProcessedDate
        if (last != null && !dayToProcess.isAfter(last)) return

        val daily = vitasRepository.getDay(dayToProcess) ?: DailyVitas(dayToProcess)
        val biomes = worldRepository.getBiomes()
            .sortedBy { it.biome.ordinal }
            .toMutableList()

        val isFreezeDay = profile.lastFreezeDate == dayToProcess
        val dayKept = daily.totalUnits >= GameRules.DROUGHT_THRESHOLD || isFreezeDay

        // --- Streak ---
        val streak = if (dayKept) profile.currentStreak + 1 else 0
        val longest = max(profile.longestStreak, streak)

        // --- Drought: meters shrink, but a reached stage is never lost ---
        if (!dayKept) {
            for (i in biomes.indices) {
                val b = biomes[i]
                if (!b.isUnlocked) continue
                val floor = b.stage * GameRules.PERCENT_PER_STAGE.toFloat()
                biomes[i] = b.copy(
                    growthMeter = max(floor, b.growthMeter - GameRules.DROUGHT_PENALTY_PERCENT)
                )
            }
            worldRepository.addEvent(
                PlanetEvent(
                    date = dayToProcess, biome = null, eventType = EventType.DROUGHT,
                    description = "A dry wind passed over the planet — the land waits for more Vitas",
                )
            )
        }

        // --- Dominant Vitas type over the last 7 days (normalized by caps) ---
        val week = vitasRepository.getRange(dayToProcess.minusDays(6), dayToProcess)
        val dominant = VitasType.entries.maxByOrNull { type ->
            week.sumOf { it.unitsFor(type) } / type.cap.toFloat()
        } ?: VitasType.MOVEMENT

        // --- Spend the pool on growth ---
        var pool = profile.vitasPool + daily.totalUnits
        while (pool >= GameRules.VITAS_PER_GROWTH_PERCENT) {
            unlockEligibleBiomes(biomes, dominant, dayToProcess)
            // Always nurture the most needy unlocked biome so early biomes finish too.
            val idx = biomes.indices
                .filter { biomes[it].isUnlocked && biomes[it].growthMeter < 100f }
                .minByOrNull { biomes[it].growthMeter }
                ?: break
            val b = biomes[idx]
            val efficiency =
                if (b.biome.affinity == dominant) GameRules.AFFINITY_EFFICIENCY else 1f
            val affordablePercent = (pool.toFloat() / GameRules.VITAS_PER_GROWTH_PERCENT) * efficiency
            val percent = min(affordablePercent, 100f - b.growthMeter)
            if (percent <= 0f) break
            val cost = ceil(percent / efficiency * GameRules.VITAS_PER_GROWTH_PERCENT)
                .toInt().coerceIn(1, pool)
            pool -= cost
            biomes[idx] = b.copy(
                growthMeter = min(100f, b.growthMeter + percent),
                totalVitasInvested = b.totalVitasInvested + cost,
            )
        }
        unlockEligibleBiomes(biomes, dominant, dayToProcess)

        // --- Stage ups + journal entries ---
        for (i in biomes.indices) {
            val b = biomes[i]
            val newStage = GameRules.stageFor(b.growthMeter)
            if (newStage > b.stage) {
                for (s in (b.stage + 1)..newStage) {
                    worldRepository.addEvent(
                        PlanetEvent(
                            date = dayToProcess, biome = b.biome, eventType = EventType.STAGE_UP,
                            description = GameRules.stageDescription(b.biome, s),
                        )
                    )
                }
                biomes[i] = b.copy(stage = newStage)
            }
        }

        // --- 30-day streak Wonder in the frontier biome ---
        if (dayKept && streak > 0 && streak % GameRules.WONDER_STREAK_DAYS == 0) {
            val idx = biomes.indexOfLast { it.isUnlocked && !it.hasWonder }
            if (idx >= 0) {
                val b = biomes[idx]
                biomes[idx] = b.copy(hasWonder = true)
                worldRepository.addEvent(
                    PlanetEvent(
                        date = dayToProcess, biome = b.biome, eventType = EventType.WONDER,
                        description = "A Wonder rises in the ${b.biome.title} — a monument to $streak days of care",
                    )
                )
            }
        }

        // --- Era ---
        val era = GameRules.eraFor(biomes.sumOf { it.stage })
        if (era > profile.currentEra) {
            worldRepository.addEvent(
                PlanetEvent(
                    date = dayToProcess, biome = null, eventType = EventType.ERA_UP,
                    description = "The planet has entered Era $era",
                )
            )
        }

        // --- Companion discoveries ---
        for (companion in companionRepository.getAll().filter { !it.isUnlocked }) {
            val met = when (val c = companion.unlockCondition) {
                is UnlockCondition.BiomeStage ->
                    biomes.first { it.biome == c.biome }.let { it.isUnlocked && it.stage >= c.stage }
                is UnlockCondition.Streak -> streak >= c.days
                is UnlockCondition.Era -> era >= c.era
            }
            if (met) {
                companionRepository.unlock(companion.id, dayToProcess)
                worldRepository.addEvent(
                    PlanetEvent(
                        date = dayToProcess, biome = companion.biome, eventType = EventType.COMPANION,
                        description = "${companion.name} now lives in the ${companion.biome.title}",
                    )
                )
            }
        }

        biomes.forEach { worldRepository.updateBiome(it) }
        userRepository.saveProfile(
            profile.copy(
                currentStreak = streak,
                longestStreak = longest,
                vitasPool = pool,
                currentEra = max(era, profile.currentEra),
                lastProcessedDate = dayToProcess,
            )
        )
    }

    private suspend fun unlockEligibleBiomes(
        biomes: MutableList<BiomeState>,
        dominant: VitasType,
        date: LocalDate,
    ) {
        for (i in biomes.indices) {
            val b = biomes[i]
            if (b.isUnlocked) continue
            val req = GameRules.unlockRequirement(b.biome) ?: continue
            val prev = biomes.first { it.biome == req.previous }
            val dominantOk = !req.requiresGrowthDominant || dominant == VitasType.GROWTH
            if (prev.isUnlocked && prev.growthMeter >= req.growthPercent && dominantOk) {
                biomes[i] = b.copy(isUnlocked = true)
                worldRepository.addEvent(
                    PlanetEvent(
                        date = date, biome = b.biome, eventType = EventType.BIOME_UNLOCKED,
                        description = "A new land emerges: the ${b.biome.title}",
                    )
                )
            }
        }
    }
}
