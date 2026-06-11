package com.terra.app.domain

import com.terra.app.domain.model.Biome
import com.terra.app.domain.model.MealCategory
import com.terra.app.domain.model.Specialization
import com.terra.app.domain.model.VitasType

/**
 * All pure game-balance rules in one place. Nothing in here touches Android,
 * the database or the clock — everything is a function of its inputs.
 */
object GameRules {

    val MAX_DAILY_VITAS: Int = VitasType.entries.sumOf { it.cap } // 295

    /** Below 30% of a full day the planet suffers drought overnight. */
    val DROUGHT_THRESHOLD: Int = (MAX_DAILY_VITAS * 0.30f).toInt()

    /** Evening nudge fires only if the day is still under 40%. */
    val EVENING_NUDGE_THRESHOLD: Int = (MAX_DAILY_VITAS * 0.40f).toInt()

    const val DROUGHT_PENALTY_PERCENT = 2f
    const val STREAK_BONUS_DAYS = 7
    const val STREAK_BONUS_MULTIPLIER = 1.2f
    const val SPECIALIZATION_MULTIPLIER = 1.25f
    const val WONDER_STREAK_DAYS = 30
    const val FREEZE_DAYS_PER_MONTH = 3

    /** How much Vitas one percent of biome growth costs. */
    const val VITAS_PER_GROWTH_PERCENT = 12

    /** Spending into a biome whose affinity matches the dominant Vitas type is more efficient. */
    const val AFFINITY_EFFICIENCY = 1.2f

    /** A biome stage spans 20% of the growth meter; stages run 0..5. */
    const val PERCENT_PER_STAGE = 20
    const val MAX_STAGE = 5

    // ---- Vitas generation ----------------------------------------------------

    fun multiplierFor(type: VitasType, specialization: Specialization, currentStreak: Int): Float {
        var m = 1f
        if (specialization.boostedType == type) m *= SPECIALIZATION_MULTIPLIER
        if (currentStreak >= STREAK_BONUS_DAYS) m *= STREAK_BONUS_MULTIPLIER
        return m
    }

    /** 1000 steps = 10 units, capped at 150/day. */
    fun movementVitas(steps: Long, multiplier: Float = 1f): Int =
        ((steps / 100f) * multiplier).toInt().coerceIn(0, VitasType.MOVEMENT.cap)

    /** 7–9h = 40, 6–7h = 25, under 6h = 5, no data = 0. Oversleeping past 9h earns 30. */
    fun restVitas(sleepMinutes: Long, multiplier: Float = 1f): Int {
        if (sleepMinutes <= 0) return 0
        val hours = sleepMinutes / 60f
        val base = when {
            hours in 7f..9f -> 40
            hours > 9f -> 30
            hours >= 6f -> 25
            else -> 5
        }
        return (base * multiplier).toInt().coerceIn(0, VitasType.REST.cap)
    }

    /** Healthy = 15, neutral = 8, junk = 2 per logged meal, capped at 45/day. */
    fun nourishmentVitas(meals: List<MealCategory>, multiplier: Float = 1f): Int =
        (meals.sumOf { it.points } * multiplier).toInt().coerceIn(0, VitasType.NOURISHMENT.cap)

    /** 20 minutes of exercise = 30 units, capped at 60/day. */
    fun growthVitas(exerciseMinutes: Long, multiplier: Float = 1f): Int =
        (exerciseMinutes * 1.5f * multiplier).toInt().coerceIn(0, VitasType.GROWTH.cap)

    // ---- World progression ---------------------------------------------------

    fun stageFor(growthMeter: Float): Int =
        (growthMeter / PERCENT_PER_STAGE).toInt().coerceIn(0, MAX_STAGE)

    /** Planet Era from the sum of all biome stages. Eras run 1..10. */
    fun eraFor(stagesSum: Int): Int = ((stagesSum / 6) + 1).coerceIn(1, 10)

    data class UnlockRequirement(
        val previous: Biome,
        val growthPercent: Float,
        val requiresGrowthDominant: Boolean = false,
    )

    /** Sequential unlock chain. Steppe has no requirement — it starts unlocked. */
    fun unlockRequirement(biome: Biome): UnlockRequirement? = when (biome) {
        Biome.STEPPE -> null
        Biome.FOREST -> UnlockRequirement(Biome.STEPPE, 60f)
        Biome.MOUNTAINS -> UnlockRequirement(Biome.FOREST, 50f, requiresGrowthDominant = true)
        Biome.COASTLINE -> UnlockRequirement(Biome.MOUNTAINS, 40f)
        Biome.TUNDRA -> UnlockRequirement(Biome.COASTLINE, 50f)
        Biome.VOLCANIC -> UnlockRequirement(Biome.TUNDRA, 60f)
    }

    /** Journal copy generated when a biome reaches stages 1..5. */
    fun stageDescription(biome: Biome, stage: Int): String {
        val texts = when (biome) {
            Biome.STEPPE -> listOf(
                "The first grass tufts break through the dust",
                "Rolling green hills spread across the Steppe",
                "Wildflowers bloom across the meadows",
                "A herd of deer now grazes the Steppe",
                "Golden light settles — butterflies dance over the grass",
            )
            Biome.FOREST -> listOf(
                "Tiny saplings take root",
                "Young trees reach for the sky",
                "The canopy closes into a dense forest",
                "A stream appeared in the Forest",
                "Ancient trees tower — fireflies glow at dusk",
            )
            Biome.MOUNTAINS -> listOf(
                "Bare rock rises from the plains",
                "Snow caps the high peaks",
                "Waterfalls cascade down the cliffs",
                "Eagles circle the summits",
                "Mountain ruins discovered",
            )
            Biome.COASTLINE -> listOf(
                "Dry sand meets the new sea",
                "Waves roll onto the shore",
                "Tide pools shimmer between the rocks",
                "Seabirds wheel over the coast",
                "A coral reef glows beneath the water",
            )
            Biome.TUNDRA -> listOf(
                "A frozen plain stretches north",
                "Frost flowers etch the ice",
                "An arctic fox leaves the first tracks",
                "The aurora borealis ripples overhead",
                "The tundra hums with quiet life",
            )
            Biome.VOLCANIC -> listOf(
                "Black lava rock cools by the sea",
                "Steam vents hiss from the ground",
                "Tropical trees take hold in the ash",
                "Rare birds arrive on the islands",
                "The islands bloom into a hidden paradise",
            )
        }
        return texts[(stage - 1).coerceIn(0, 4)]
    }
}
