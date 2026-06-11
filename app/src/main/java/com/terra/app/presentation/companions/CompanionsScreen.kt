package com.terra.app.presentation.companions

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.terra.app.domain.model.CreatureShape
import com.terra.app.domain.model.TerraCompanion
import com.terra.app.domain.repository.CompanionRepository
import com.terra.app.presentation.theme.TerraGreen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class CompanionsViewModel @Inject constructor(
    companionRepository: CompanionRepository,
) : ViewModel() {
    val companions: StateFlow<List<TerraCompanion>> = companionRepository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}

@Composable
fun CompanionsScreen(viewModel: CompanionsViewModel = hiltViewModel()) {
    val companions by viewModel.companions.collectAsStateWithLifecycle()
    val discovered = companions.count { it.isUnlocked }

    Column(Modifier.fillMaxSize()) {
        Text(
            "Companions · $discovered/${companions.size} discovered",
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(12.dp),
        )
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(companions, key = { it.id }) { companion ->
                CompanionCard(companion)
            }
        }
    }
}

@Composable
private fun CompanionCard(companion: TerraCompanion) {
    Card {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            CreatureSilhouette(
                shape = companion.shape,
                color = if (companion.isUnlocked) TerraGreen else Color(0xFF2A2F36),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(72.dp),
            )
            Text(
                if (companion.isUnlocked) companion.name else "???",
                style = MaterialTheme.typography.titleSmall,
                textAlign = TextAlign.Center,
            )
            Text(
                companion.biome.title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
            Text(
                if (companion.isUnlocked) companion.unlockCondition.describe() else companion.hint,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
            )
        }
    }
}

/** Simple layered-shape silhouettes per creature archetype. */
@Composable
fun CreatureSilhouette(shape: CreatureShape, color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val c = Offset(size.width / 2f, size.height / 2f)
        val s = minOf(size.width, size.height) / 2f * 0.7f
        when (shape) {
            CreatureShape.QUADRUPED -> {
                drawOval(color, topLeft = c - Offset(s, s * 0.4f), size = Size(s * 2f, s * 0.8f))
                drawCircle(color, s * 0.3f, c + Offset(s * 1.05f, -s * 0.5f))
                for (i in 0..3) {
                    val x = c.x - s * 0.7f + i * s * 0.45f
                    drawLine(color, Offset(x, c.y + s * 0.2f), Offset(x, c.y + s * 0.9f), strokeWidth = s * 0.12f)
                }
            }
            CreatureShape.FOX -> {
                drawOval(color, topLeft = c - Offset(s * 0.9f, s * 0.35f), size = Size(s * 1.8f, s * 0.7f))
                drawCircle(color, s * 0.32f, c + Offset(s * 0.95f, -s * 0.4f))
                // pointed ears
                drawLine(color, c + Offset(s * 0.8f, -s * 0.6f), c + Offset(s * 0.7f, -s * 1.05f), strokeWidth = s * 0.14f)
                drawLine(color, c + Offset(s * 1.1f, -s * 0.6f), c + Offset(s * 1.2f, -s * 1.05f), strokeWidth = s * 0.14f)
                // bushy tail
                drawOval(color, topLeft = c + Offset(-s * 1.7f, -s * 0.3f), size = Size(s * 0.9f, s * 0.5f))
            }
            CreatureShape.BIRD -> {
                drawOval(color, topLeft = c - Offset(s * 0.5f, s * 0.35f), size = Size(s, s * 0.7f))
                drawCircle(color, s * 0.22f, c + Offset(s * 0.5f, -s * 0.45f))
                // spread wing
                drawLine(color, c, c + Offset(-s * 0.9f, -s * 0.7f), strokeWidth = s * 0.2f)
                // beak
                drawLine(color, c + Offset(s * 0.68f, -s * 0.45f), c + Offset(s * 0.95f, -s * 0.4f), strokeWidth = s * 0.1f)
            }
            CreatureShape.OWL -> {
                drawOval(color, topLeft = c - Offset(s * 0.5f, s * 0.7f), size = Size(s, s * 1.4f))
                // ear tufts
                drawLine(color, c + Offset(-s * 0.3f, -s * 0.65f), c + Offset(-s * 0.45f, -s * 1.0f), strokeWidth = s * 0.14f)
                drawLine(color, c + Offset(s * 0.3f, -s * 0.65f), c + Offset(s * 0.45f, -s * 1.0f), strokeWidth = s * 0.14f)
            }
            CreatureShape.HARE -> {
                drawOval(color, topLeft = c - Offset(s * 0.55f, s * 0.3f), size = Size(s * 1.1f, s * 0.8f))
                drawCircle(color, s * 0.28f, c + Offset(s * 0.55f, -s * 0.4f))
                // long ears
                drawOval(color, topLeft = c + Offset(s * 0.3f, -s * 1.3f), size = Size(s * 0.18f, s * 0.9f))
                drawOval(color, topLeft = c + Offset(s * 0.55f, -s * 1.3f), size = Size(s * 0.18f, s * 0.9f))
            }
            CreatureShape.BUTTERFLY -> {
                drawOval(color, topLeft = c - Offset(s * 0.08f, s * 0.5f), size = Size(s * 0.16f, s))
                drawCircle(color, s * 0.45f, c + Offset(-s * 0.45f, -s * 0.25f))
                drawCircle(color, s * 0.45f, c + Offset(s * 0.45f, -s * 0.25f))
                drawCircle(color, s * 0.32f, c + Offset(-s * 0.38f, s * 0.3f))
                drawCircle(color, s * 0.32f, c + Offset(s * 0.38f, s * 0.3f))
            }
            CreatureShape.MARINE -> {
                drawOval(color, topLeft = c - Offset(s, s * 0.35f), size = Size(s * 2f, s * 0.7f))
                // tail fin
                val tail = androidx.compose.ui.graphics.Path().apply {
                    moveTo(c.x - s * 0.95f, c.y)
                    lineTo(c.x - s * 1.4f, c.y - s * 0.45f)
                    lineTo(c.x - s * 1.4f, c.y + s * 0.45f)
                    close()
                }
                drawPath(tail, color)
                // dorsal fin
                val fin = androidx.compose.ui.graphics.Path().apply {
                    moveTo(c.x - s * 0.1f, c.y - s * 0.3f)
                    lineTo(c.x + s * 0.15f, c.y - s * 0.75f)
                    lineTo(c.x + s * 0.35f, c.y - s * 0.3f)
                    close()
                }
                drawPath(fin, color)
            }
            CreatureShape.CRAB -> {
                drawOval(color, topLeft = c - Offset(s * 0.7f, s * 0.4f), size = Size(s * 1.4f, s * 0.8f))
                // claws
                drawCircle(color, s * 0.25f, c + Offset(-s * 0.9f, -s * 0.5f))
                drawCircle(color, s * 0.25f, c + Offset(s * 0.9f, -s * 0.5f))
                // legs
                for (i in 0..2) {
                    val dy = -s * 0.1f + i * s * 0.25f
                    drawLine(color, c + Offset(-s * 0.65f, dy), c + Offset(-s * 1.15f, dy + s * 0.3f), strokeWidth = s * 0.08f)
                    drawLine(color, c + Offset(s * 0.65f, dy), c + Offset(s * 1.15f, dy + s * 0.3f), strokeWidth = s * 0.08f)
                }
            }
        }
    }
}
