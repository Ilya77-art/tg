package com.terra.app.domain.repository

import com.terra.app.domain.model.BiomeState
import com.terra.app.domain.model.DailyVitas
import com.terra.app.domain.model.HealthAvailability
import com.terra.app.domain.model.HealthSnapshot
import com.terra.app.domain.model.MealCategory
import com.terra.app.domain.model.MealSlot
import com.terra.app.domain.model.NutritionLog
import com.terra.app.domain.model.PlanetEvent
import com.terra.app.domain.model.TerraCompanion
import com.terra.app.domain.model.UserProfile
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

interface UserRepository {
    fun observeProfile(): Flow<UserProfile?>
    suspend fun getProfile(): UserProfile?
    suspend fun saveProfile(profile: UserProfile)
}

interface VitasRepository {
    fun observeDay(date: LocalDate): Flow<DailyVitas?>
    suspend fun getDay(date: LocalDate): DailyVitas?
    suspend fun upsert(daily: DailyVitas)
    fun observeRange(from: LocalDate, to: LocalDate): Flow<List<DailyVitas>>
    suspend fun getRange(from: LocalDate, to: LocalDate): List<DailyVitas>

    fun observeMeals(date: LocalDate): Flow<List<NutritionLog>>
    suspend fun getMeals(date: LocalDate): List<NutritionLog>
    suspend fun logMeal(date: LocalDate, slot: MealSlot, category: MealCategory)
}

interface WorldRepository {
    fun observeBiomes(): Flow<List<BiomeState>>
    suspend fun getBiomes(): List<BiomeState>
    suspend fun updateBiome(state: BiomeState)
    suspend fun insertBiomes(states: List<BiomeState>)

    fun observeEvents(): Flow<List<PlanetEvent>>
    suspend fun addEvent(event: PlanetEvent)
}

interface CompanionRepository {
    fun observeAll(): Flow<List<TerraCompanion>>
    suspend fun getAll(): List<TerraCompanion>
    suspend fun unlock(id: Int, date: LocalDate)
    suspend fun seedIfEmpty(companions: List<TerraCompanion>)
}

interface HealthRepository {
    fun availability(): HealthAvailability
    val requiredPermissions: Set<String>
    suspend fun grantedPermissions(): Set<String>
    suspend fun hasAllPermissions(): Boolean
    /** Steps / sleep / exercise for one day; falls back to demo data or zeros. */
    suspend fun snapshot(date: LocalDate): HealthSnapshot
}
