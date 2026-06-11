package com.terra.app.data.repository

import com.terra.app.data.local.entity.BiomeStateEntity
import com.terra.app.data.local.entity.CompanionEntity
import com.terra.app.data.local.entity.DailyVitasEntity
import com.terra.app.data.local.entity.NutritionLogEntity
import com.terra.app.data.local.entity.PlanetEventEntity
import com.terra.app.data.local.entity.UserProfileEntity
import com.terra.app.domain.model.Biome
import com.terra.app.domain.model.BiomeState
import com.terra.app.domain.model.CreatureShape
import com.terra.app.domain.model.DailyVitas
import com.terra.app.domain.model.EventType
import com.terra.app.domain.model.MealCategory
import com.terra.app.domain.model.MealSlot
import com.terra.app.domain.model.NutritionLog
import com.terra.app.domain.model.PlanetEvent
import com.terra.app.domain.model.Specialization
import com.terra.app.domain.model.TerraCompanion
import com.terra.app.domain.model.UnlockCondition
import com.terra.app.domain.model.UserProfile
import java.time.LocalDate

fun DailyVitasEntity.toDomain() = DailyVitas(
    date = LocalDate.parse(date),
    movementUnits = movementUnits,
    restUnits = restUnits,
    nourishmentUnits = nourishmentUnits,
    growthUnits = growthUnits,
)

fun DailyVitas.toEntity() = DailyVitasEntity(
    date = date.toString(),
    movementUnits = movementUnits,
    restUnits = restUnits,
    nourishmentUnits = nourishmentUnits,
    growthUnits = growthUnits,
    totalUnits = totalUnits,
)

fun BiomeStateEntity.toDomain() = BiomeState(
    biome = Biome.entries[biomeId],
    stage = stage,
    growthMeter = growthMeter,
    totalVitasInvested = totalVitasInvested,
    isUnlocked = isUnlocked,
    hasWonder = hasWonder,
)

fun BiomeState.toEntity() = BiomeStateEntity(
    biomeId = biome.ordinal,
    stage = stage,
    growthMeter = growthMeter,
    totalVitasInvested = totalVitasInvested,
    isUnlocked = isUnlocked,
    hasWonder = hasWonder,
)

fun PlanetEventEntity.toDomain() = PlanetEvent(
    id = id,
    date = LocalDate.parse(date),
    biome = biomeId?.let { Biome.entries[it] },
    eventType = EventType.valueOf(eventType),
    description = description,
)

fun PlanetEvent.toEntity() = PlanetEventEntity(
    id = id,
    date = date.toString(),
    biomeId = biome?.ordinal,
    eventType = eventType.name,
    description = description,
)

fun CompanionEntity.toDomain() = TerraCompanion(
    id = id,
    name = name,
    biome = Biome.entries[biomeId],
    unlockCondition = UnlockCondition.decode(unlockCondition),
    hint = hint,
    shape = CreatureShape.valueOf(shape),
    isUnlocked = isUnlocked,
    discoveredDate = discoveredDate?.let(LocalDate::parse),
)

fun TerraCompanion.toEntity() = CompanionEntity(
    id = id,
    name = name,
    biomeId = biome.ordinal,
    unlockCondition = unlockCondition.encode(),
    hint = hint,
    shape = shape.name,
    isUnlocked = isUnlocked,
    discoveredDate = discoveredDate?.toString(),
)

fun UserProfileEntity.toDomain() = UserProfile(
    pioneerName = pioneerName,
    planetName = planetName,
    specialization = Specialization.valueOf(specialization),
    avatarColorIndex = avatarColorIndex,
    currentEra = currentEra,
    freezeDaysUsed = freezeDaysUsed,
    freezeMonth = freezeMonth,
    lastFreezeDate = lastFreezeDate?.let(LocalDate::parse),
    currentStreak = currentStreak,
    longestStreak = longestStreak,
    vitasPool = vitasPool,
    notificationsEnabled = notificationsEnabled,
    demoMode = demoMode,
    lastProcessedDate = lastProcessedDate?.let(LocalDate::parse),
)

fun UserProfile.toEntity() = UserProfileEntity(
    pioneerName = pioneerName,
    planetName = planetName,
    specialization = specialization.name,
    avatarColorIndex = avatarColorIndex,
    currentEra = currentEra,
    freezeDaysUsed = freezeDaysUsed,
    freezeMonth = freezeMonth,
    lastFreezeDate = lastFreezeDate?.toString(),
    currentStreak = currentStreak,
    longestStreak = longestStreak,
    vitasPool = vitasPool,
    notificationsEnabled = notificationsEnabled,
    demoMode = demoMode,
    lastProcessedDate = lastProcessedDate?.toString(),
)

fun NutritionLogEntity.toDomain() = NutritionLog(
    id = id,
    date = LocalDate.parse(date),
    slot = MealSlot.valueOf(mealSlot),
    category = MealCategory.valueOf(category),
)
