package com.terra.app.presentation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.terra.app.presentation.activity.ActivityScreen
import com.terra.app.presentation.companions.CompanionsScreen
import com.terra.app.presentation.journal.JournalScreen
import com.terra.app.presentation.onboarding.OnboardingScreen
import com.terra.app.presentation.planet.PlanetScreen
import com.terra.app.presentation.settings.SettingsScreen

sealed class TerraDestination(val route: String, val label: String, val icon: ImageVector) {
    data object Planet : TerraDestination("planet", "Planet", Icons.Filled.Public)
    data object Activity : TerraDestination("activity", "Vitas", Icons.Filled.FavoriteBorder)
    data object Journal : TerraDestination("journal", "Journal", Icons.Filled.AutoStories)
    data object Companions : TerraDestination("companions", "Companions", Icons.Filled.Pets)
    data object Settings : TerraDestination("settings", "Settings", Icons.Filled.Settings)

    companion object {
        val bottomBar = listOf(Planet, Activity, Journal, Companions, Settings)
    }
}

@Composable
fun TerraRoot(viewModel: RootViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    when (state) {
        RootUiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        RootUiState.NeedsOnboarding -> OnboardingScreen()
        RootUiState.Ready -> MainScaffold()
    }
}

@Composable
private fun MainScaffold() {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentDestination = backStack?.destination

    Scaffold(
        bottomBar = {
            NavigationBar {
                TerraDestination.bottomBar.forEach { dest ->
                    NavigationBarItem(
                        selected = currentDestination?.hierarchy?.any { it.route == dest.route } == true,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(dest.icon, contentDescription = dest.label) },
                        label = { Text(dest.label) },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = TerraDestination.Planet.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(TerraDestination.Planet.route) { PlanetScreen() }
            composable(TerraDestination.Activity.route) { ActivityScreen() }
            composable(TerraDestination.Journal.route) { JournalScreen() }
            composable(TerraDestination.Companions.route) { CompanionsScreen() }
            composable(TerraDestination.Settings.route) { SettingsScreen() }
        }
    }
}
