package com.terra.app.presentation.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.PermissionController
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.terra.app.R
import com.terra.app.domain.model.HealthAvailability

@Composable
fun SettingsScreen(viewModel: SettingsViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract(),
    ) { viewModel.refreshPermissions() }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineSmall)

        SettingsCard("Health Connect") {
            val statusText = when (state.availability) {
                HealthAvailability.AVAILABLE ->
                    if (state.permissionsGranted) "Connected — all permissions granted"
                    else "Available — permissions needed"
                HealthAvailability.NOT_INSTALLED -> "Health Connect app needs an update or install"
                HealthAvailability.NOT_SUPPORTED -> "Not supported on this device"
            }
            Text(statusText, style = MaterialTheme.typography.bodyMedium)
            if (state.availability == HealthAvailability.AVAILABLE && !state.permissionsGranted) {
                Button(onClick = { permissionLauncher.launch(viewModel.requiredPermissions) }) {
                    Text("Grant permissions")
                }
            }
            ToggleRow(
                title = "Demo data",
                subtitle = "Use generated activity data (for testing without Health Connect)",
                checked = state.profile?.demoMode == true,
                onToggle = viewModel::setDemoMode,
            )
        }

        SettingsCard("Freeze days") {
            Text(
                "Pause planet decay without penalty. ${state.freezeDaysLeft} of 3 left this month.",
                style = MaterialTheme.typography.bodyMedium,
            )
            ToggleRow(
                title = "Freeze today ❄",
                subtitle = "No drought tonight, streak preserved",
                checked = state.isFreezeToday,
                onToggle = { viewModel.toggleFreeze() },
            )
            if (state.freezeLimitMessage && !state.isFreezeToday) {
                Text(
                    "All freeze days used this month — they refill on the 1st.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }

        SettingsCard("Notifications") {
            ToggleRow(
                title = "Planet care reminders",
                subtitle = "At most two gentle nudges per day (8am and 7pm)",
                checked = state.profile?.notificationsEnabled == true,
                onToggle = viewModel::setNotificationsEnabled,
            )
        }

        SettingsCard("About") {
            Text(
                "Terra v1.0 — a lifestyle RPG where your real-world activity " +
                    "terraforms a living planet.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                stringResource(R.string.health_rationale_body),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            state.profile?.let {
                Text(
                    "Pioneer ${it.pioneerName} · ${it.specialization.title} · " +
                        "Planet ${it.planetName} · Longest streak ${it.longestStreak} days",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun SettingsCard(title: String, content: @Composable () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            content()
        }
    }
}

@Composable
private fun ToggleRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onToggle: (Boolean) -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
        }
        Spacer(Modifier.padding(4.dp))
        Switch(checked = checked, onCheckedChange = onToggle)
    }
}
