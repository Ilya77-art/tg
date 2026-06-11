package com.terra.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.terra.app.data.local.entity.BiomeStateEntity
import com.terra.app.data.local.entity.CompanionEntity
import com.terra.app.data.local.entity.DailyVitasEntity
import com.terra.app.data.local.entity.NutritionLogEntity
import com.terra.app.data.local.entity.PlanetEventEntity
import com.terra.app.data.local.entity.UserProfileEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DailyVitasDao {
    @Query("SELECT * FROM daily_vitas WHERE date = :date")
    fun observeDay(date: String): Flow<DailyVitasEntity?>

    @Query("SELECT * FROM daily_vitas WHERE date = :date")
    suspend fun getDay(date: String): DailyVitasEntity?

    @Query("SELECT * FROM daily_vitas WHERE date BETWEEN :from AND :to ORDER BY date")
    fun observeRange(from: String, to: String): Flow<List<DailyVitasEntity>>

    @Query("SELECT * FROM daily_vitas WHERE date BETWEEN :from AND :to ORDER BY date")
    suspend fun getRange(from: String, to: String): List<DailyVitasEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: DailyVitasEntity)
}

@Dao
interface BiomeStateDao {
    @Query("SELECT * FROM biome_state ORDER BY biomeId")
    fun observeAll(): Flow<List<BiomeStateEntity>>

    @Query("SELECT * FROM biome_state ORDER BY biomeId")
    suspend fun getAll(): List<BiomeStateEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: BiomeStateEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(entities: List<BiomeStateEntity>)
}

@Dao
interface PlanetEventDao {
    @Query("SELECT * FROM planet_event ORDER BY date DESC, id DESC")
    fun observeAll(): Flow<List<PlanetEventEntity>>

    @Insert
    suspend fun insert(entity: PlanetEventEntity)
}

@Dao
interface CompanionDao {
    @Query("SELECT * FROM companion ORDER BY biomeId, id")
    fun observeAll(): Flow<List<CompanionEntity>>

    @Query("SELECT * FROM companion ORDER BY biomeId, id")
    suspend fun getAll(): List<CompanionEntity>

    @Query("UPDATE companion SET isUnlocked = 1, discoveredDate = :date WHERE id = :id")
    suspend fun unlock(id: Int, date: String)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(entities: List<CompanionEntity>)

    @Query("SELECT COUNT(*) FROM companion")
    suspend fun count(): Int
}

@Dao
interface UserProfileDao {
    @Query("SELECT * FROM user_profile WHERE pioneerId = 1")
    fun observe(): Flow<UserProfileEntity?>

    @Query("SELECT * FROM user_profile WHERE pioneerId = 1")
    suspend fun get(): UserProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: UserProfileEntity)
}

@Dao
interface NutritionLogDao {
    @Query("SELECT * FROM nutrition_log WHERE date = :date")
    fun observeForDate(date: String): Flow<List<NutritionLogEntity>>

    @Query("SELECT * FROM nutrition_log WHERE date = :date")
    suspend fun getForDate(date: String): List<NutritionLogEntity>

    @Query("DELETE FROM nutrition_log WHERE date = :date AND mealSlot = :slot")
    suspend fun deleteSlot(date: String, slot: String)

    @Insert
    suspend fun insert(entity: NutritionLogEntity)
}
