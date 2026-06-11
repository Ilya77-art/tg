package com.terra.app.domain.usecase

import com.terra.app.domain.model.Biome
import com.terra.app.domain.model.BiomeState
import com.terra.app.domain.model.EventType
import com.terra.app.domain.model.PlanetEvent
import com.terra.app.domain.model.Specialization
import com.terra.app.domain.model.TerraCompanion
import com.terra.app.domain.model.UserProfile
import com.terra.app.domain.repository.CompanionRepository
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.repository.WorldRepository
import java.time.LocalDate
import javax.inject.Inject

class CompleteOnboardingUseCase @Inject constructor(
    private val userRepository: UserRepository,
    private val worldRepository: WorldRepository,
    private val companionRepository: CompanionRepository,
    private val companionCatalog: List<@JvmSuppressWildcards TerraCompanion>,
) {
    suspend operator fun invoke(
        pioneerName: String,
        planetName: String,
        specialization: Specialization,
        avatarColorIndex: Int,
    ) {
        userRepository.saveProfile(
            UserProfile(
                pioneerName = pioneerName.trim(),
                planetName = planetName.trim(),
                specialization = specialization,
                avatarColorIndex = avatarColorIndex,
            )
        )
        worldRepository.insertBiomes(
            Biome.entries.map { biome ->
                BiomeState(biome = biome, isUnlocked = biome == Biome.STEPPE)
            }
        )
        companionRepository.seedIfEmpty(companionCatalog)
        worldRepository.addEvent(
            PlanetEvent(
                date = LocalDate.now(),
                biome = Biome.STEPPE,
                eventType = EventType.LANDING,
                description = "$pioneerName landed on $planetName. The Steppe lies quiet, waiting to grow",
            )
        )
    }
}
