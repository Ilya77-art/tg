package com.terra.app.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Earthy, planet-care palette.
val TerraGreen = Color(0xFF4C9A5F)
val TerraDeepGreen = Color(0xFF2F6B3E)
val TerraSky = Color(0xFF7EC8E3)
val TerraSand = Color(0xFFD9B382)
val TerraSoil = Color(0xFF8A6240)
val TerraNight = Color(0xFF0B1B2A)
val TerraGold = Color(0xFFE8C36A)

// One color per Vitas type, used in bars and charts.
val MovementColor = Color(0xFF6FBF73)
val RestColor = Color(0xFF7E9CD8)
val NourishmentColor = Color(0xFFE3A857)
val GrowthColor = Color(0xFFC96567)

val AvatarColors = listOf(
    Color(0xFF6FBF73), Color(0xFF7E9CD8), Color(0xFFE3A857),
    Color(0xFFC96567), Color(0xFF9C7BC4), Color(0xFF55B8A8),
)

private val DarkScheme = darkColorScheme(
    primary = TerraGreen,
    onPrimary = Color.White,
    secondary = TerraSky,
    background = TerraNight,
    surface = Color(0xFF132638),
    surfaceVariant = Color(0xFF1B3349),
    onBackground = Color(0xFFE6EEF2),
    onSurface = Color(0xFFE6EEF2),
)

private val LightScheme = lightColorScheme(
    primary = TerraDeepGreen,
    onPrimary = Color.White,
    secondary = TerraSky,
    background = Color(0xFFF3F7F0),
    surface = Color.White,
    surfaceVariant = Color(0xFFE3EBDD),
    onBackground = Color(0xFF1B2B22),
    onSurface = Color(0xFF1B2B22),
)

@Composable
fun TerraTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkScheme else LightScheme,
        content = content,
    )
}
