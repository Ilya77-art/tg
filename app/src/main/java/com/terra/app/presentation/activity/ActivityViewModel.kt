package com.terra.app.presentation.activity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.terra.app.domain.GameRules
import com.terra.app.domain.model.DailyVitas
import com.terra.app.domain.model.MealCategory
import com.terra.app.domain.model.MealSlot
import com.terra.app.domain.model.VitasType
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.repository.VitasRepository
import com.terra.app.domain.usecase.LogMealUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class VitasCardState(
    val type: VitasType,
    val todayValue: Int = 0,
    /** Last 7 days, oldest first. */
    val history: List<Int> = List(7) { 0 },
    /** Consecutive days at or above 50% of the daily cap. */
    val streak: Int = 0,
)

data class ActivityUiState(
    val cards: List<VitasCardState> = VitasType.entries.map { VitasCardState(it) },
    val meals: Map<MealSlot, MealCategory?> = MealSlot.entries.associateWith { null },
    val isFreezeToday: Boolean = false,
    val globalStreak: Int = 0,
)

@HiltViewModel
class ActivityViewModel @Inject constructor(
    vitasRepository: VitasRepository,
    userRepository: UserRepository,
    private val logMealUseCase: LogMealUseCase,
) : ViewModel() {

    private val today: LocalDate = LocalDate.now()

    val uiState: StateFlow<ActivityUiState> = combine(
        vitasRepository.observeRange(today.minusDays(29), today),
        vitasRepository.observeMeals(today),
        userRepository.observeProfile(),
    ) { range, meals, profile ->
        val byDate = range.associateBy { it.date }
        ActivityUiState(
            cards = VitasType.entries.map { type ->
                VitasCardState(
                    type = type,
                    todayValue = byDate[today]?.unitsFor(type) ?: 0,
                    history = (6 downTo 0).map { back ->
                        byDate[today.minusDays(back.toLong())]?.unitsFor(type) ?: 0
                    },
                    streak = streakFor(type, byDate),
                )
            },
            meals = MealSlot.entries.associateWith { slot ->
                meals.firstOrNull { it.slot == slot }?.category
            },
            isFreezeToday = profile?.lastFreezeDate == today,
            globalStreak = profile?.currentStreak ?: 0,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ActivityUiState())

    private fun streakFor(type: VitasType, byDate: Map<LocalDate, DailyVitas>): Int {
        val half = type.cap / 2
        var streak = 0
        // Today only counts if already above 50%; otherwise start from yesterday.
        var day = if ((byDate[today]?.unitsFor(type) ?: 0) >= half) today else today.minusDays(1)
        while ((byDate[day]?.unitsFor(type) ?: 0) >= half) {
            streak++
            day = day.minusDays(1)
        }
        return streak
    }

    fun logMeal(slot: MealSlot, category: MealCategory) {
        viewModelScope.launch {
            runCatching { logMealUseCase(slot, category) }
        }
    }
}
