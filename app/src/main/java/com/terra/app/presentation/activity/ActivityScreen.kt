package com.terra.app.presentation.activity

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.terra.app.domain.model.MealCategory
import com.terra.app.domain.model.MealSlot
import com.terra.app.domain.model.VitasType
import com.terra.app.presentation.planet.color
import com.terra.app.presentation.theme.TerraSky

@Composable
fun ActivityScreen(viewModel: ActivityViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Today's energy", style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.weight(1f))
                if (state.isFreezeToday) {
                    Icon(Icons.Filled.AcUnit, contentDescription = "Freeze day active", tint = TerraSky)
                }
                if (state.globalStreak > 0) {
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "${state.globalStreak}-day streak",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
        items(state.cards, key = { it.type.name }) { card ->
            VitasCard(
                card = card,
                mealSection = if (card.type == VitasType.NOURISHMENT) {
                    { MealLogger(state.meals, viewModel::logMeal) }
                } else {
                    null
                },
            )
        }
    }
}

@Composable
private fun VitasCard(card: VitasCardState, mealSection: (@Composable () -> Unit)?) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(card.type.title, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.weight(1f))
                if (card.streak > 0) {
                    Text(
                        "🔥 ${card.streak}d",
                        style = MaterialTheme.typography.labelLarge,
                        color = card.type.color,
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${card.todayValue}",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = card.type.color,
                )
                Text(
                    " / ${card.type.cap}",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                )
            }
            LinearProgressIndicator(
                progress = { (card.todayValue / card.type.cap.toFloat()).coerceIn(0f, 1f) },
                color = card.type.color,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp),
            )
            WeekBarChart(values = card.history, cap = card.type.cap, color = card.type.color)
            mealSection?.invoke()
        }
    }
}

/** Last-7-days mini chart drawn on a raw Canvas. */
@Composable
private fun WeekBarChart(values: List<Int>, cap: Int, color: Color) {
    Canvas(
        Modifier
            .fillMaxWidth()
            .height(48.dp)
    ) {
        val n = values.size
        if (n == 0) return@Canvas
        val gap = size.width * 0.02f
        val barWidth = (size.width - gap * (n - 1)) / n
        values.forEachIndexed { i, v ->
            val fraction = (v / cap.toFloat()).coerceIn(0f, 1f)
            val barHeight = size.height * fraction
            // Track behind the bar
            drawRect(
                color = color.copy(alpha = 0.15f),
                topLeft = Offset(i * (barWidth + gap), 0f),
                size = Size(barWidth, size.height),
            )
            drawRect(
                color = color,
                topLeft = Offset(i * (barWidth + gap), size.height - barHeight),
                size = Size(barWidth, barHeight),
            )
        }
    }
}

@Composable
private fun MealLogger(
    meals: Map<MealSlot, MealCategory?>,
    onLog: (MealSlot, MealCategory) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        MealSlot.entries.forEach { slot ->
            Text(slot.title, style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MealCategory.entries.forEach { category ->
                    FilterChip(
                        selected = meals[slot] == category,
                        onClick = { onLog(slot, category) },
                        label = { Text(category.title) },
                    )
                }
            }
        }
    }
}
