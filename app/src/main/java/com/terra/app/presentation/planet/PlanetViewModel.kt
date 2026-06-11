package com.terra.app.presentation.planet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.terra.app.domain.model.BiomeState
import com.terra.app.domain.model.DailyVitas
import com.terra.app.domain.repository.UserRepository
import com.terra.app.domain.repository.VitasRepository
import com.terra.app.domain.repository.WorldRepository
import com.terra.app.domain.usecase.SyncHealthDataUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class PlanetUiState(
    val planetName: String = "",
    val era: Int = 1,
    val biomes: List<BiomeState> = emptyList(),
    val today: DailyVitas = DailyVitas(LocalDate.now()),
)

@HiltViewModel
class PlanetViewModel @Inject constructor(
    worldRepository: WorldRepository,
    vitasRepository: VitasRepository,
    userRepository: UserRepository,
    private val syncHealthData: SyncHealthDataUseCase,
) : ViewModel() {

    val uiState: StateFlow<PlanetUiState> = combine(
        worldRepository.observeBiomes(),
        vitasRepository.observeDay(LocalDate.now()),
        userRepository.observeProfile(),
    ) { biomes, today, profile ->
        PlanetUiState(
            planetName = profile?.planetName.orEmpty(),
            era = profile?.currentEra ?: 1,
            biomes = biomes,
            today = today ?: DailyVitas(LocalDate.now()),
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), PlanetUiState())

    init {
        // Refresh today's Vitas whenever the planet comes into view.
        viewModelScope.launch {
            runCatching { syncHealthData() }
        }
    }
}
