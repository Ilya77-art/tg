package com.terra.app.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.terra.app.domain.GameRules
import com.terra.app.domain.model.HealthAvailability
import com.terra.app.domain.model.UserProfile
import com.terra.app.domain.repository.HealthRepository
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.usecase.SyncHealthDataUseCase
import com.terra.app.domain.usecase.ToggleFreezeUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class SettingsUiState(
    val profile: UserProfile? = null,
    val availability: HealthAvailability = HealthAvailability.NOT_SUPPORTED,
    val permissionsGranted: Boolean = false,
    val isFreezeToday: Boolean = false,
    val freezeDaysLeft: Int = GameRules.FREEZE_DAYS_PER_MONTH,
    val freezeLimitMessage: Boolean = false,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val healthRepository: HealthRepository,
    private val toggleFreezeUseCase: ToggleFreezeUseCase,
    private val syncHealthData: SyncHealthDataUseCase,
) : ViewModel() {

    val requiredPermissions: Set<String> get() = healthRepository.requiredPermissions

    private val permissionsGranted = MutableStateFlow(false)
    private val freezeLimitHit = MutableStateFlow(false)

    val uiState: StateFlow<SettingsUiState> = combine(
        userRepository.observeProfile(),
        permissionsGranted.asStateFlow(),
        freezeLimitHit.asStateFlow(),
    ) { profile, granted, limitHit ->
        val today = LocalDate.now()
        val month = "%04d-%02d".format(today.year, today.monthValue)
        val used = if (profile?.freezeMonth == month) profile.freezeDaysUsed else 0
        SettingsUiState(
            profile = profile,
            availability = healthRepository.availability(),
            permissionsGranted = granted,
            isFreezeToday = profile?.lastFreezeDate == today,
            freezeDaysLeft = (GameRules.FREEZE_DAYS_PER_MONTH - used).coerceAtLeast(0),
            freezeLimitMessage = limitHit,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SettingsUiState())

    init {
        refreshPermissions()
    }

    fun refreshPermissions() {
        viewModelScope.launch {
            permissionsGranted.value = runCatching { healthRepository.hasAllPermissions() }
                .getOrDefault(false)
            runCatching { syncHealthData() }
        }
    }

    fun toggleFreeze() {
        viewModelScope.launch {
            freezeLimitHit.value = !toggleFreezeUseCase()
        }
    }

    fun setNotificationsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            userRepository.getProfile()?.let {
                userRepository.saveProfile(it.copy(notificationsEnabled = enabled))
            }
        }
    }

    fun setDemoMode(enabled: Boolean) {
        viewModelScope.launch {
            userRepository.getProfile()?.let {
                userRepository.saveProfile(it.copy(demoMode = enabled))
            }
            runCatching { syncHealthData() }
        }
    }
}
