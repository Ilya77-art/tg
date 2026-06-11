package com.terra.app.presentation.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.terra.app.domain.model.Specialization
import com.terra.app.domain.usecase.CompleteOnboardingUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingUiState(
    val step: Int = 0,
    val planetName: String = "",
    val pioneerName: String = "",
    val avatarColorIndex: Int = 0,
    val specialization: Specialization? = null,
    val healthPermissionsRequested: Boolean = false,
    val isComplete: Boolean = false,
) {
    val canProceed: Boolean
        get() = when (step) {
            0 -> planetName.isNotBlank()
            1 -> pioneerName.isNotBlank()
            2 -> specialization != null
            else -> true
        }
}

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val completeOnboarding: CompleteOnboardingUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    fun setPlanetName(name: String) = _uiState.update { it.copy(planetName = name) }
    fun setPioneerName(name: String) = _uiState.update { it.copy(pioneerName = name) }
    fun setAvatarColor(index: Int) = _uiState.update { it.copy(avatarColorIndex = index) }
    fun setSpecialization(spec: Specialization) = _uiState.update { it.copy(specialization = spec) }
    fun markHealthPermissionsRequested() = _uiState.update { it.copy(healthPermissionsRequested = true) }

    fun next() {
        val state = _uiState.value
        if (!state.canProceed) return
        if (state.step < 4) {
            _uiState.update { it.copy(step = it.step + 1) }
        }
    }

    fun back() {
        if (_uiState.value.step > 0) _uiState.update { it.copy(step = it.step - 1) }
    }

    fun finish() {
        val state = _uiState.value
        val specialization = state.specialization ?: return
        viewModelScope.launch {
            completeOnboarding(
                pioneerName = state.pioneerName,
                planetName = state.planetName,
                specialization = specialization,
                avatarColorIndex = state.avatarColorIndex,
            )
            _uiState.update { it.copy(isComplete = true) }
        }
    }

    private inline fun MutableStateFlow<OnboardingUiState>.update(transform: (OnboardingUiState) -> OnboardingUiState) {
        value = transform(value)
    }
}
