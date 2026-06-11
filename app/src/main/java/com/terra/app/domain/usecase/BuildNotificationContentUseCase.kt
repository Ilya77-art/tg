package com.terra.app.domain.usecase

import com.terra.app.domain.GameRules
import com.terra.app.domain.model.DailyVitas
import com.terra.app.domain.model.VitasType
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.repository.VitasRepository
import com.terra.app.domain.repository.WorldRepository
import java.time.LocalDate
import javax.inject.Inject

data class NotificationContent(val title: String, val body: String)

/**
 * Builds the two daily planet-care messages. Both frame everything as caring
 * for the planet — never as a fitness obligation. Returns null when nothing
 * should be sent.
 */
class BuildNotificationContentUseCase @Inject constructor(
    private val userRepository: UserRepository,
    private val vitasRepository: VitasRepository,
    private val worldRepository: WorldRepository,
) {
    suspend fun morning(): NotificationContent? {
        val profile = userRepository.getProfile() ?: return null
        if (!profile.notificationsEnabled) return null
        val frontier = worldRepository.getBiomes()
            .filter { it.isUnlocked }
            .maxByOrNull { it.biome.ordinal } ?: return null
        val yesterday = vitasRepository.getDay(LocalDate.now().minusDays(1))
            ?: DailyVitas(LocalDate.now().minusDays(1))
        val missing = VitasType.entries.minByOrNull { yesterday.unitsFor(it) / it.cap.toFloat() }
            ?: VitasType.MOVEMENT
        return NotificationContent(
            title = "${profile.planetName} is waiting",
            body = "The ${frontier.biome.title} needs ${missing.title} today",
        )
    }

    suspend fun evening(): NotificationContent? {
        val profile = userRepository.getProfile() ?: return null
        if (!profile.notificationsEnabled) return null
        val today = LocalDate.now()
        if (profile.lastFreezeDate == today) return null
        val daily = vitasRepository.getDay(today) ?: DailyVitas(today)
        if (daily.totalUnits >= GameRules.EVENING_NUDGE_THRESHOLD) return null
        val frontier = worldRepository.getBiomes()
            .filter { it.isUnlocked }
            .maxByOrNull { it.biome.ordinal } ?: return null
        // 1 movement unit = 100 steps; offer an achievable evening walk.
        val deficit = GameRules.DROUGHT_THRESHOLD - daily.totalUnits
        val stepsNeeded = (deficit.coerceAtLeast(10) * 100L)
        return NotificationContent(
            title = "The drought is coming",
            body = "An evening walk of about $stepsNeeded steps would save the ${frontier.biome.title.lowercase()}",
        )
    }
}
