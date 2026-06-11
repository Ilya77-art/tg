package com.terra.app.di

import com.terra.app.data.repository.CompanionRepositoryImpl
import com.terra.app.data.repository.HealthRepositoryImpl
import com.terra.app.data.repository.UserRepositoryImpl
import com.terra.app.data.repository.VitasRepositoryImpl
import com.terra.app.data.repository.WorldRepositoryImpl
import com.terra.app.domain.repository.CompanionRepository
import com.terra.app.domain.repository.HealthRepository
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.repository.VitasRepository
import com.terra.app.domain.repository.WorldRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds abstract fun bindUserRepository(impl: UserRepositoryImpl): UserRepository
    @Binds abstract fun bindVitasRepository(impl: VitasRepositoryImpl): VitasRepository
    @Binds abstract fun bindWorldRepository(impl: WorldRepositoryImpl): WorldRepository
    @Binds abstract fun bindCompanionRepository(impl: CompanionRepositoryImpl): CompanionRepository
    @Binds abstract fun bindHealthRepository(impl: HealthRepositoryImpl): HealthRepository
}
