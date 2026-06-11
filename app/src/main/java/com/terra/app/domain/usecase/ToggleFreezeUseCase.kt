package com.terra.app.domain.usecase

import com.terra.app.domain.GameRules
import com.terra.app.domain.repository.UserRepository
import java.time.LocalDate
import javax.inject.Inject

/**
 * Toggles today as a freeze day (max 3 per calendar month). Returns false if
 * the monthly allowance is spent.
 */
class ToggleFreezeUseCase @Inject constructor(
    private val userRepository: UserRepository,
) {
    suspend operator fun invoke(): Boolean {
        val profile = userRepository.getProfile() ?: return false
        val today = LocalDate.now()
        val month = "%04d-%02d".format(today.year, today.monthValue)
        val usedThisMonth = if (profile.freezeMonth == month) profile.freezeDaysUsed else 0

        if (profile.lastFreezeDate == today) {
            userRepository.saveProfile(
                profile.copy(
                    lastFreezeDate = null,
                    freezeMonth = month,
                    freezeDaysUsed = (usedThisMonth - 1).coerceAtLeast(0),
                )
            )
            return true
        }
        if (usedThisMonth >= GameRules.FREEZE_DAYS_PER_MONTH) return false
        userRepository.saveProfile(
            profile.copy(
                lastFreezeDate = today,
                freezeMonth = month,
                freezeDaysUsed = usedThisMonth + 1,
            )
        )
        return true
    }
}
