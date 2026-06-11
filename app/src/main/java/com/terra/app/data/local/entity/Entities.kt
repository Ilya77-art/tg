package com.terra.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Dates are stored as ISO-8601 strings (yyyy-MM-dd) throughout. */

@Entity(tableName = "daily_vitas")
data class DailyVitasEntity(
    @PrimaryKey val date: String,
    val movementUnits: Int,
    val restUnits: Int,
    val nourishmentUnits: Int,
    val growthUnits: Int,
    val totalUnits: Int,
)

@Entity(tableName = "biome_state")
data class BiomeStateEntity(
    @PrimaryKey val biomeId: Int,
    val stage: Int,
    val growthMeter: Float,
    val totalVitasInvested: Int,
    val isUnlocked: Boolean,
    val hasWonder: Boolean = false,
)

@Entity(tableName = "planet_event")
data class PlanetEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String,
    val biomeId: Int?,
    val eventType: String,
    val description: String,
)

@Entity(tableName = "companion")
data class CompanionEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val biomeId: Int,
    val unlockCondition: String,
    val hint: String,
    val shape: String,
    val isUnlocked: Boolean,
    val discoveredDate: String?,
)

@Entity(tableName = "user_profile")
data class UserProfileEntity(
    @PrimaryKey val pioneerId: Int = 1,
    val pioneerName: String,
    val planetName: String,
    val specialization: String,
    val avatarColorIndex: Int,
    val currentEra: Int,
    val freezeDaysUsed: Int,
    val freezeMonth: String,
    val lastFreezeDate: String?,
    val currentStreak: Int,
    val longestStreak: Int,
    val vitasPool: Int,
    val notificationsEnabled: Boolean,
    val demoMode: Boolean,
    val lastProcessedDate: String?,
)

@Entity(tableName = "nutrition_log")
data class NutritionLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String,
    val mealSlot: String,
    val category: String,
)
