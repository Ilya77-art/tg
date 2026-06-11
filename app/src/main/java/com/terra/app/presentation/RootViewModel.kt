package com.terra.app.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.terra.app.domain.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

sealed interface RootUiState {
    data object Loading : RootUiState
    data object NeedsOnboarding : RootUiState
    data object Ready : RootUiState
}

@HiltViewModel
class RootViewModel @Inject constructor(
    userRepository: UserRepository,
) : ViewModel() {

    val uiState: StateFlow<RootUiState> = userRepository.observeProfile()
        .map { profile -> if (profile == null) RootUiState.NeedsOnboarding else RootUiState.Ready }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RootUiState.Loading)
}
