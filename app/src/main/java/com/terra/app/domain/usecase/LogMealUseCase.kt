package com.terra.app.domain.usecase

import com.terra.app.domain.model.MealCategory
import com.terra.app.domain.model.MealSlot
import com.terra.app.domain.repository.VitasRepository
import java.time.LocalDate
import javax.inject.Inject

class LogMealUseCase @Inject constructor(
    private val vitasRepository: VitasRepository,
    private val syncHealthData: SyncHealthDataUseCase,
) {
    suspend operator fun invoke(slot: MealSlot, category: MealCategory, date: LocalDate = LocalDate.now()) {
        vitasRepository.logMeal(date, slot, category)
        // Recompute today's Vitas so nourishment shows up immediately.
        syncHealthData(date)
    }
}
