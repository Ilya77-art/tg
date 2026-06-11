package com.terra.app.domain.usecase

import com.terra.app.domain.GameRules
import com.terra.app.domain.model.DailyVitas
import com.terra.app.domain.model.VitasType
import com.terra.app.domain.repository.HealthRepository
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.repository.VitasRepository
import java.time.LocalDate
import javax.inject.Inject

/**
 * Pulls today's health summary, converts it to Vitas and stores the daily
 * aggregate. Only aggregates are persisted — never raw health records.
 */
class SyncHealthDataUseCase @Inject constructor(
    private val userRepository: UserRepository,
    private val vitasRepository: VitasRepository,
    private val healthRepository: HealthRepository,
) {
    suspend operator fun invoke(date: LocalDate = LocalDate.now()) {
        val profile = userRepository.getProfile() ?: return
        val snapshot = healthRepository.snapshot(date)
        val meals = vitasRepository.getMeals(date).map { it.category }

        fun mult(type: VitasType) =
            GameRules.multiplierFor(type, profile.specialization, profile.currentStreak)

        vitasRepository.upsert(
            DailyVitas(
                date = date,
                movementUnits = GameRules.movementVitas(snapshot.steps, mult(VitasType.MOVEMENT)),
                restUnits = GameRules.restVitas(snapshot.sleepMinutes, mult(VitasType.REST)),
                nourishmentUnits = GameRules.nourishmentVitas(meals, mult(VitasType.NOURISHMENT)),
                growthUnits = GameRules.growthVitas(snapshot.exerciseMinutes, mult(VitasType.GROWTH)),
            )
        )
    }
}
