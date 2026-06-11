package com.terra.app.domain.model

import java.time.LocalDate

/** The four energies a Pioneer generates through daily life. */
enum class VitasType(val title: String, val cap: Int) {
    MOVEMENT("Vitas of Movement", 150),
    REST("Vitas of Rest", 40),
    NOURISHMENT("Vitas of Nourishment", 45),
    GROWTH("Vitas of Growth", 60),
}

enum class Specialization(val title: String, val boostedType: VitasType, val description: String) {
    NATURALIST("Naturalist", VitasType.MOVEMENT, "Walks the world. +25% Vitas of Movement."),
    FARMER("Farmer", VitasType.NOURISHMENT, "Tends the soil. +25% Vitas of Nourishment."),
    ARCHITECT("Architect", VitasType.GROWTH, "Builds with strength. +25% Vitas of Growth."),
    GUARDIAN("Guardian", VitasType.REST, "Keeps the night watch. +25% Vitas of Rest."),
}

enum class MealSlot(val title: String) { BREAKFAST("Breakfast"), LUNCH("Lunch"), DINNER("Dinner") }

enum class MealCategory(val title: String, val points: Int) {
    HEALTHY("Healthy", 15),
    NEUTRAL("Neutral", 8),
    JUNK("Junk", 2),
}

/** The six biomes, in unlock order. Ordinal is used as the stable biome id. */
enum class Biome(val title: String, val affinity: VitasType) {
    STEPPE("Steppe", VitasType.MOVEMENT),
    FOREST("Forest", VitasType.REST),
    MOUNTAINS("Mountains", VitasType.GROWTH),
    COASTLINE("Coastline", VitasType.MOVEMENT),
    TUNDRA("Tundra", VitasType.REST),
    VOLCANIC("Volcanic Islands", VitasType.GROWTH),
}

data class DailyVitas(
    val date: LocalDate,
    val movementUnits: Int = 0,
    val restUnits: Int = 0,
    val nourishmentUnits: Int = 0,
    val growthUnits: Int = 0,
) {
    val totalUnits: Int get() = movementUnits + restUnits + nourishmentUnits + growthUnits

    fun unitsFor(type: VitasType): Int = when (type) {
        VitasType.MOVEMENT -> movementUnits
        VitasType.REST -> restUnits
        VitasType.NOURISHMENT -> nourishmentUnits
        VitasType.GROWTH -> growthUnits
    }
}

data class BiomeState(
    val biome: Biome,
    val stage: Int = 0,
    val growthMeter: Float = 0f,
    val totalVitasInvested: Int = 0,
    val isUnlocked: Boolean = false,
    val hasWonder: Boolean = false,
)

enum class EventType { LANDING, BIOME_UNLOCKED, STAGE_UP, DROUGHT, WONDER, COMPANION, ERA_UP }

data class PlanetEvent(
    val id: Long = 0,
    val date: LocalDate,
    val biome: Biome?,
    val eventType: EventType,
    val description: String,
)

/** How a companion creature is discovered. Encoded as a string in the database. */
sealed class UnlockCondition {
    data class BiomeStage(val biome: Biome, val stage: Int) : UnlockCondition()
    data class Streak(val days: Int) : UnlockCondition()
    data class Era(val era: Int) : UnlockCondition()

    fun encode(): String = when (this) {
        is BiomeStage -> "STAGE:${biome.name}:$stage"
        is Streak -> "STREAK:$days"
        is Era -> "ERA:$era"
    }

    fun describe(): String = when (this) {
        is BiomeStage -> "${biome.title} reached stage $stage"
        is Streak -> "$days-day streak"
        is Era -> "Planet reached Era $era"
    }

    companion object {
        fun decode(raw: String): UnlockCondition {
            val parts = raw.split(":")
            return when (parts[0]) {
                "STAGE" -> BiomeStage(Biome.valueOf(parts[1]), parts[2].toInt())
                "STREAK" -> Streak(parts[1].toInt())
                "ERA" -> Era(parts[1].toInt())
                else -> error("Unknown unlock condition: $raw")
            }
        }
    }
}

/** Silhouette archetype used by the Canvas creature renderer. */
enum class CreatureShape { QUADRUPED, FOX, BIRD, OWL, HARE, BUTTERFLY, MARINE, CRAB }

data class TerraCompanion(
    val id: Int,
    val name: String,
    val biome: Biome,
    val unlockCondition: UnlockCondition,
    val hint: String,
    val shape: CreatureShape,
    val isUnlocked: Boolean = false,
    val discoveredDate: LocalDate? = null,
)

data class UserProfile(
    val pioneerName: String,
    val planetName: String,
    val specialization: Specialization,
    val avatarColorIndex: Int,
    val currentEra: Int = 1,
    val freezeDaysUsed: Int = 0,
    val freezeMonth: String = "",
    val lastFreezeDate: LocalDate? = null,
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val vitasPool: Int = 0,
    val notificationsEnabled: Boolean = true,
    val demoMode: Boolean = false,
    val lastProcessedDate: LocalDate? = null,
)

data class NutritionLog(
    val id: Long = 0,
    val date: LocalDate,
    val slot: MealSlot,
    val category: MealCategory,
)

data class HealthSnapshot(
    val steps: Long = 0,
    val sleepMinutes: Long = 0,
    val exerciseMinutes: Long = 0,
)

enum class HealthAvailability { AVAILABLE, NOT_INSTALLED, NOT_SUPPORTED }
