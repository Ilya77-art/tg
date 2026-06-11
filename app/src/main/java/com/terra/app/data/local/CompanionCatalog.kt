package com.terra.app.data.local

import com.terra.app.domain.model.Biome
import com.terra.app.domain.model.CreatureShape
import com.terra.app.domain.model.TerraCompanion
import com.terra.app.domain.model.UnlockCondition

/** The 20 creatures a Pioneer can discover across the six biomes. */
object CompanionCatalog {

    val all: List<TerraCompanion> = listOf(
        // Steppe
        companion(1, "Field Mouse", Biome.STEPPE, UnlockCondition.BiomeStage(Biome.STEPPE, 1),
            "Something small rustles in the first grass...", CreatureShape.HARE),
        companion(2, "Meadow Hare", Biome.STEPPE, UnlockCondition.BiomeStage(Biome.STEPPE, 2),
            "Long ears wait beyond the rolling hills", CreatureShape.HARE),
        companion(3, "Steppe Deer", Biome.STEPPE, UnlockCondition.BiomeStage(Biome.STEPPE, 4),
            "Grow the Steppe until herds can graze", CreatureShape.QUADRUPED),
        companion(4, "Monarch Butterfly", Biome.STEPPE, UnlockCondition.BiomeStage(Biome.STEPPE, 5),
            "Appears when the Steppe turns golden", CreatureShape.BUTTERFLY),
        // Forest
        companion(5, "Hedgehog", Biome.FOREST, UnlockCondition.BiomeStage(Biome.FOREST, 1),
            "Curls up under the very first saplings", CreatureShape.HARE),
        companion(6, "Red Fox", Biome.FOREST, UnlockCondition.Streak(7),
            "Keep a 7-day streak and a sly visitor arrives", CreatureShape.FOX),
        companion(7, "Horned Owl", Biome.FOREST, UnlockCondition.BiomeStage(Biome.FOREST, 3),
            "Needs a dense canopy to nest in", CreatureShape.OWL),
        companion(8, "River Otter", Biome.FOREST, UnlockCondition.BiomeStage(Biome.FOREST, 4),
            "Waits for a stream to play in", CreatureShape.MARINE),
        companion(9, "Firefly Queen", Biome.FOREST, UnlockCondition.BiomeStage(Biome.FOREST, 5),
            "Lights up only among ancient trees", CreatureShape.BUTTERFLY),
        // Mountains
        companion(10, "Ibex", Biome.MOUNTAINS, UnlockCondition.BiomeStage(Biome.MOUNTAINS, 2),
            "Climbs the peaks once snow settles", CreatureShape.QUADRUPED),
        companion(11, "Golden Eagle", Biome.MOUNTAINS, UnlockCondition.BiomeStage(Biome.MOUNTAINS, 4),
            "Soars where waterfalls roar", CreatureShape.BIRD),
        companion(12, "Snow Leopard", Biome.MOUNTAINS, UnlockCondition.Streak(14),
            "Only the most devoted Pioneers glimpse it — 14-day streak", CreatureShape.FOX),
        // Coastline
        companion(13, "Sand Crab", Biome.COASTLINE, UnlockCondition.BiomeStage(Biome.COASTLINE, 1),
            "Scuttles across the first dry sand", CreatureShape.CRAB),
        companion(14, "Silver Gull", Biome.COASTLINE, UnlockCondition.BiomeStage(Biome.COASTLINE, 4),
            "Arrives with the other seabirds", CreatureShape.BIRD),
        companion(15, "Sea Turtle", Biome.COASTLINE, UnlockCondition.BiomeStage(Biome.COASTLINE, 5),
            "Swims in once the reef glows", CreatureShape.MARINE),
        // Tundra
        companion(16, "Arctic Fox", Biome.TUNDRA, UnlockCondition.BiomeStage(Biome.TUNDRA, 3),
            "Leaves tracks across the frost", CreatureShape.FOX),
        companion(17, "Snowy Owl", Biome.TUNDRA, UnlockCondition.BiomeStage(Biome.TUNDRA, 4),
            "Hunts beneath the aurora", CreatureShape.OWL),
        companion(18, "Reindeer", Biome.TUNDRA, UnlockCondition.Streak(21),
            "A 21-day streak calls the herd north", CreatureShape.QUADRUPED),
        // Volcanic Islands
        companion(19, "Lava Crab", Biome.VOLCANIC, UnlockCondition.BiomeStage(Biome.VOLCANIC, 2),
            "Basks beside the steam vents", CreatureShape.CRAB),
        companion(20, "Paradise Bird", Biome.VOLCANIC, UnlockCondition.Era(4),
            "Appears only on a planet of Era 4", CreatureShape.BIRD),
    )

    private fun companion(
        id: Int,
        name: String,
        biome: Biome,
        condition: UnlockCondition,
        hint: String,
        shape: CreatureShape,
    ) = TerraCompanion(
        id = id, name = name, biome = biome,
        unlockCondition = condition, hint = hint, shape = shape,
    )
}
