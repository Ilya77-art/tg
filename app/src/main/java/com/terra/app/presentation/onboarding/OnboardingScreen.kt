package com.terra.app.presentation.onboarding

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberInfiniteTransition
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.PermissionController
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.terra.app.domain.model.Specialization
import com.terra.app.presentation.planet.PlanetCanvas
import com.terra.app.presentation.theme.AvatarColors
import com.terra.app.presentation.theme.TerraNight
import com.terra.app.domain.model.Biome
import com.terra.app.domain.model.BiomeState

@Composable
fun OnboardingScreen(viewModel: OnboardingViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract(),
    ) { viewModel.markHealthPermissionsRequested() }

    Column(
        Modifier
            .fillMaxSize()
            .padding(24.dp),
    ) {
        StepIndicator(step = state.step, total = 5)
        Spacer(Modifier.height(24.dp))

        Box(Modifier.weight(1f)) {
            when (state.step) {
                0 -> PlanetNameStep(state.planetName, viewModel::setPlanetName)
                1 -> PioneerStep(state.pioneerName, state.avatarColorIndex, viewModel::setPioneerName, viewModel::setAvatarColor)
                2 -> SpecializationStep(state.specialization, viewModel::setSpecialization)
                3 -> HealthConnectStep(
                    onRequest = {
                        runCatching { permissionLauncher.launch(healthPermissionSet()) }
                    },
                )
                4 -> LandingStep(planetName = state.planetName, pioneerName = state.pioneerName)
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            if (state.step in 1..4) {
                TextButton(onClick = viewModel::back) { Text("Back") }
            } else {
                Spacer(Modifier.size(1.dp))
            }
            Button(
                onClick = { if (state.step == 4) viewModel.finish() else viewModel.next() },
                enabled = state.canProceed,
            ) {
                Text(if (state.step == 4) "Begin" else "Next")
            }
        }
    }
}

private fun healthPermissionSet(): Set<String> = setOf(
    androidx.health.connect.client.permission.HealthPermission.getReadPermission(
        androidx.health.connect.client.records.StepsRecord::class
    ),
    androidx.health.connect.client.permission.HealthPermission.getReadPermission(
        androidx.health.connect.client.records.SleepSessionRecord::class
    ),
    androidx.health.connect.client.permission.HealthPermission.getReadPermission(
        androidx.health.connect.client.records.ExerciseSessionRecord::class
    ),
    androidx.health.connect.client.permission.HealthPermission.getReadPermission(
        androidx.health.connect.client.records.NutritionRecord::class
    ),
)

@Composable
private fun StepIndicator(step: Int, total: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(total) { i ->
            Box(
                Modifier
                    .height(4.dp)
                    .weight(1f)
                    .clip(RoundedCornerShape(2.dp))
                    .background(
                        if (i <= step) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surfaceVariant
                    )
            )
        }
    }
}

@Composable
private fun StepTitle(title: String, subtitle: String) {
    Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
    Spacer(Modifier.height(8.dp))
    Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f))
    Spacer(Modifier.height(24.dp))
}

@Composable
private fun PlanetNameStep(name: String, onChange: (String) -> Unit) {
    Column {
        StepTitle("Name your planet", "Your planet is empty for now — but it's waiting for you.")
        OutlinedTextField(
            value = name,
            onValueChange = onChange,
            label = { Text("Planet name") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
    }
}

@Composable
private fun PioneerStep(
    name: String,
    colorIndex: Int,
    onNameChange: (String) -> Unit,
    onColorChange: (Int) -> Unit,
) {
    Column {
        StepTitle("Who's landing?", "Tell us your name and pick a color for your Pioneer.")
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text("Pioneer name") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        Spacer(Modifier.height(24.dp))
        Text("Avatar color", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AvatarColors.forEachIndexed { index, color ->
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(color)
                        .border(
                            width = if (index == colorIndex) 3.dp else 0.dp,
                            color = MaterialTheme.colorScheme.onBackground,
                            shape = CircleShape,
                        )
                        .clickable { onColorChange(index) }
                )
            }
        }
    }
}

@Composable
private fun SpecializationStep(selected: Specialization?, onSelect: (Specialization) -> Unit) {
    Column {
        StepTitle("Choose your specialization", "This gives a permanent +25% boost to one Vitas type.")
        Specialization.entries.forEach { spec ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
                    .clickable { onSelect(spec) },
                colors = androidx.compose.material3.CardDefaults.cardColors(
                    containerColor = if (spec == selected) MaterialTheme.colorScheme.primaryContainer
                    else MaterialTheme.colorScheme.surface,
                ),
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(spec.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(spec.description, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun HealthConnectStep(onRequest: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        StepTitle("Connect your activity", "Terra reads your steps, sleep, exercise and meals to grow your planet — read-only, summarized on your device, never shared.")
        Box(
            Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center,
        ) {
            HealthIllustration()
        }
        Spacer(Modifier.height(24.dp))
        Button(onClick = onRequest, modifier = Modifier.fillMaxWidth()) {
            Text("Connect Health Connect")
        }
        Spacer(Modifier.height(8.dp))
        Text(
            "You can change this anytime in Settings.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun HealthIllustration() {
    val transition = rememberInfiniteTransition(label = "pulse")
    val pulse by transition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing), RepeatMode.Reverse),
        label = "pulse",
    )
    Canvas(Modifier.size(120.dp)) {
        val c = Offset(size.width / 2f, size.height / 2f)
        drawCircle(Color(0xFF6FBF73).copy(alpha = 0.25f), size.minDimension / 2f * pulse, c)
        drawCircle(Color(0xFF6FBF73), size.minDimension / 4f, c)
        // simple heartbeat line
        val path = androidx.compose.ui.graphics.Path().apply {
            moveTo(c.x - size.width * 0.3f, c.y)
            lineTo(c.x - size.width * 0.1f, c.y)
            lineTo(c.x - size.width * 0.02f, c.y - size.height * 0.18f)
            lineTo(c.x + size.width * 0.06f, c.y + size.height * 0.18f)
            lineTo(c.x + size.width * 0.16f, c.y)
            lineTo(c.x + size.width * 0.3f, c.y)
        }
        drawPath(path, Color.White, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 6f))
    }
}

@Composable
private fun LandingStep(planetName: String, pioneerName: String) {
    val anim = remember { Animatable(0f) }
    LaunchedEffect(Unit) { anim.animateTo(1f, animationSpec = tween(1800)) }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        StepTitle("Touchdown", "$pioneerName has landed on $planetName. The Steppe lies quiet — your first steps will wake it.")
        Box(
            Modifier
                .fillMaxWidth()
                .height(280.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(TerraNight),
        ) {
            PlanetCanvas(
                biomes = listOf(BiomeState(biome = Biome.STEPPE, isUnlocked = true, growthMeter = 0f)),
                isNight = false,
                modifier = Modifier.fillMaxSize(),
            )
            // Pioneer descending into the Steppe
            Canvas(Modifier.fillMaxSize()) {
                val target = Offset(size.width * 0.5f, size.height * 0.55f)
                val start = Offset(size.width * 0.5f, -40f)
                val pos = Offset(
                    start.x + (target.x - start.x) * anim.value,
                    start.y + (target.y - start.y) * anim.value,
                )
                drawCircle(Color.White, radius = 8f, center = pos)
                drawCircle(Color(0xFF6FBF73), radius = 14f * anim.value, center = target, alpha = 0.4f)
            }
        }
    }
}
