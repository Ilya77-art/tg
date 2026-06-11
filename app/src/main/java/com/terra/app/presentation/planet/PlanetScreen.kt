package com.terra.app.presentation.planet

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.terra.app.domain.model.Biome
import com.terra.app.domain.model.VitasType
import com.terra.app.presentation.theme.GrowthColor
import com.terra.app.presentation.theme.MovementColor
import com.terra.app.presentation.theme.NourishmentColor
import com.terra.app.presentation.theme.RestColor
import com.terra.app.presentation.theme.TerraNight
import java.time.LocalTime

val VitasType.color: Color
    get() = when (this) {
        VitasType.MOVEMENT -> MovementColor
        VitasType.REST -> RestColor
        VitasType.NOURISHMENT -> NourishmentColor
        VitasType.GROWTH -> GrowthColor
    }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanetScreen(viewModel: PlanetViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var selectedBiome by remember { mutableStateOf<Biome?>(null) }

    val hour = LocalTime.now().hour
    val isNight = hour < 6 || hour >= 20

    Box(
        Modifier
            .fillMaxSize()
            .background(if (isNight) TerraNight else MaterialTheme.colorScheme.background)
    ) {
        PlanetCanvas(
            biomes = state.biomes,
            isNight = isNight,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 120.dp),
            onBiomeTap = { selectedBiome = it },
        )

        // Era badge
        Surface(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 16.dp),
            shape = RoundedCornerShape(50),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.9f),
        ) {
            Text(
                text = "Era ${state.era} · ${state.planetName}",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        // Today's Vitas summary
        Card(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(12.dp),
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Today's Vitas", style = MaterialTheme.typography.titleSmall)
                VitasType.entries.forEach { type ->
                    val value = state.today.unitsFor(type)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            type.title.removePrefix("Vitas of "),
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.width(96.dp),
                        )
                        LinearProgressIndicator(
                            progress = { (value / type.cap.toFloat()).coerceIn(0f, 1f) },
                            color = type.color,
                            modifier = Modifier
                                .weight(1f)
                                .height(8.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("$value/${type.cap}", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }

        selectedBiome?.let { biome ->
            val biomeState = state.biomes.firstOrNull { it.biome == biome }
            ModalBottomSheet(onDismissRequest = { selectedBiome = null }) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(biome.title, style = MaterialTheme.typography.headlineSmall)
                    if (biomeState == null || !biomeState.isUnlocked) {
                        Text(
                            "This land is still hidden in mist. Keep growing earlier biomes to reveal it.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    } else {
                        Text("Stage ${biomeState.stage} of 5", style = MaterialTheme.typography.titleMedium)
                        LinearProgressIndicator(
                            progress = { biomeState.growthMeter / 100f },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(10.dp),
                        )
                        Text(
                            "Growth ${biomeState.growthMeter.toInt()}% · " +
                                "${biomeState.totalVitasInvested} Vitas invested",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(
                            "Thrives on ${biome.affinity.title}",
                            style = MaterialTheme.typography.bodySmall,
                            color = biome.affinity.color,
                        )
                        if (biomeState.hasWonder) {
                            Text("A Wonder stands here ✦", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}
