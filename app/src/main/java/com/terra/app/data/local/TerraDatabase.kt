package com.terra.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.terra.app.data.local.dao.BiomeStateDao
import com.terra.app.data.local.dao.CompanionDao
import com.terra.app.data.local.dao.DailyVitasDao
import com.terra.app.data.local.dao.NutritionLogDao
import com.terra.app.data.local.dao.PlanetEventDao
import com.terra.app.data.local.dao.UserProfileDao
import com.terra.app.data.local.entity.BiomeStateEntity
import com.terra.app.data.local.entity.CompanionEntity
import com.terra.app.data.local.entity.DailyVitasEntity
import com.terra.app.data.local.entity.NutritionLogEntity
import com.terra.app.data.local.entity.PlanetEventEntity
import com.terra.app.data.local.entity.UserProfileEntity

@Database(
    entities = [
        DailyVitasEntity::class,
        BiomeStateEntity::class,
        PlanetEventEntity::class,
        CompanionEntity::class,
        UserProfileEntity::class,
        NutritionLogEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class TerraDatabase : RoomDatabase() {
    abstract fun dailyVitasDao(): DailyVitasDao
    abstract fun biomeStateDao(): BiomeStateDao
    abstract fun planetEventDao(): PlanetEventDao
    abstract fun companionDao(): CompanionDao
    abstract fun userProfileDao(): UserProfileDao
    abstract fun nutritionLogDao(): NutritionLogDao

    companion object {
        const val NAME = "terra.db"

        /** v2 added Wonder landmarks to biomes (30-day streak reward). */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "ALTER TABLE biome_state ADD COLUMN hasWonder INTEGER NOT NULL DEFAULT 0"
                )
            }
        }

        val ALL_MIGRATIONS = arrayOf(MIGRATION_1_2)
    }
}
