package com.terra.app.data.repository

import com.terra.app.data.health.HealthConnectSource
import com.terra.app.data.health.MockHealthSource
import com.terra.app.data.local.dao.BiomeStateDao
import com.terra.app.data.local.dao.CompanionDao
import com.terra.app.data.local.dao.DailyVitasDao
import com.terra.app.data.local.dao.NutritionLogDao
import com.terra.app.data.local.dao.PlanetEventDao
import com.terra.app.data.local.dao.UserProfileDao
import com.terra.app.data.local.entity.NutritionLogEntity
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
import com.terra.app.domain.repository.CompanionRepository
import com.terra.app.domain.repository.HealthRepository
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.repository.VitasRepository
import com.terra.app.domain.repository.WorldRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepositoryImpl @Inject constructor(
    private val dao: UserProfileDao,
) : UserRepository {
    override fun observeProfile(): Flow<UserProfile?> = dao.observe().map { it?.toDomain() }
    override suspend fun getProfile(): UserProfile? = dao.get()?.toDomain()
    override suspend fun saveProfile(profile: UserProfile) = dao.upsert(profile.toEntity())
}

@Singleton
class VitasRepositoryImpl @Inject constructor(
    private val vitasDao: DailyVitasDao,
    private val nutritionDao: NutritionLogDao,
) : VitasRepository {
    override fun observeDay(date: LocalDate): Flow<DailyVitas?> =
        vitasDao.observeDay(date.toString()).map { it?.toDomain() }

    override suspend fun getDay(date: LocalDate): DailyVitas? =
        vitasDao.getDay(date.toString())?.toDomain()

    override suspend fun upsert(daily: DailyVitas) = vitasDao.upsert(daily.toEntity())

    override fun observeRange(from: LocalDate, to: LocalDate): Flow<List<DailyVitas>> =
        vitasDao.observeRange(from.toString(), to.toString()).map { list -> list.map { it.toDomain() } }

    override suspend fun getRange(from: LocalDate, to: LocalDate): List<DailyVitas> =
        vitasDao.getRange(from.toString(), to.toString()).map { it.toDomain() }

    override fun observeMeals(date: LocalDate): Flow<List<NutritionLog>> =
        nutritionDao.observeForDate(date.toString()).map { list -> list.map { it.toDomain() } }

    override suspend fun getMeals(date: LocalDate): List<NutritionLog> =
        nutritionDao.getForDate(date.toString()).map { it.toDomain() }

    override suspend fun logMeal(date: LocalDate, slot: MealSlot, category: MealCategory) {
        // One entry per slot per day; re-logging replaces the earlier choice.
        nutritionDao.deleteSlot(date.toString(), slot.name)
        nutritionDao.insert(
            NutritionLogEntity(date = date.toString(), mealSlot = slot.name, category = category.name)
        )
    }
}

@Singleton
class WorldRepositoryImpl @Inject constructor(
    private val biomeDao: BiomeStateDao,
    private val eventDao: PlanetEventDao,
) : WorldRepository {
    override fun observeBiomes(): Flow<List<BiomeState>> =
        biomeDao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun getBiomes(): List<BiomeState> = biomeDao.getAll().map { it.toDomain() }

    override suspend fun updateBiome(state: BiomeState) = biomeDao.upsert(state.toEntity())

    override suspend fun insertBiomes(states: List<BiomeState>) =
        biomeDao.insertAll(states.map { it.toEntity() })

    override fun observeEvents(): Flow<List<PlanetEvent>> =
        eventDao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun addEvent(event: PlanetEvent) = eventDao.insert(event.toEntity())
}

@Singleton
class CompanionRepositoryImpl @Inject constructor(
    private val dao: CompanionDao,
) : CompanionRepository {
    override fun observeAll(): Flow<List<TerraCompanion>> =
        dao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun getAll(): List<TerraCompanion> = dao.getAll().map { it.toDomain() }

    override suspend fun unlock(id: Int, date: LocalDate) = dao.unlock(id, date.toString())

    override suspend fun seedIfEmpty(companions: List<TerraCompanion>) {
        if (dao.count() == 0) dao.insertAll(companions.map { it.toEntity() })
    }
}

@Singleton
class HealthRepositoryImpl @Inject constructor(
    private val healthConnect: HealthConnectSource,
    private val userDao: UserProfileDao,
) : HealthRepository {
    override fun availability(): HealthAvailability = healthConnect.availability()

    override val requiredPermissions: Set<String> get() = healthConnect.requiredPermissions

    override suspend fun grantedPermissions(): Set<String> = healthConnect.grantedPermissions()

    override suspend fun hasAllPermissions(): Boolean =
        grantedPermissions().containsAll(requiredPermissions)

    override suspend fun snapshot(date: LocalDate): HealthSnapshot {
        val demoMode = userDao.get()?.demoMode == true
        if (demoMode) return MockHealthSource.snapshot(date)
        if (availability() != HealthAvailability.AVAILABLE) return HealthSnapshot()
        return try {
            if (hasAllPermissions()) healthConnect.snapshot(date) else HealthSnapshot()
        } catch (_: Exception) {
            // Health Connect hiccup: degrade gracefully, sync again next hour.
            HealthSnapshot()
        }
    }
}
