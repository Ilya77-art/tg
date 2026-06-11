package com.terra.app.di

import android.content.Context
import androidx.room.Room
import com.terra.app.data.local.CompanionCatalog
import com.terra.app.data.local.TerraDatabase
import com.terra.app.data.local.dao.BiomeStateDao
import com.terra.app.data.local.dao.CompanionDao
import com.terra.app.data.local.dao.DailyVitasDao
import com.terra.app.data.local.dao.NutritionLogDao
import com.terra.app.data.local.dao.PlanetEventDao
import com.terra.app.data.local.dao.UserProfileDao
import com.terra.app.domain.model.TerraCompanion
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): TerraDatabase =
        Room.databaseBuilder(context, TerraDatabase::class.java, TerraDatabase.NAME)
            .addMigrations(*TerraDatabase.ALL_MIGRATIONS)
            .build()

    @Provides fun provideDailyVitasDao(db: TerraDatabase): DailyVitasDao = db.dailyVitasDao()
    @Provides fun provideBiomeStateDao(db: TerraDatabase): BiomeStateDao = db.biomeStateDao()
    @Provides fun providePlanetEventDao(db: TerraDatabase): PlanetEventDao = db.planetEventDao()
    @Provides fun provideCompanionDao(db: TerraDatabase): CompanionDao = db.companionDao()
    @Provides fun provideUserProfileDao(db: TerraDatabase): UserProfileDao = db.userProfileDao()
    @Provides fun provideNutritionLogDao(db: TerraDatabase): NutritionLogDao = db.nutritionLogDao()

    @Provides
    fun provideCompanionCatalog(): List<TerraCompanion> = CompanionCatalog.all
}
