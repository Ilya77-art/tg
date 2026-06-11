package com.terra.app.data.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.terra.app.domain.model.HealthAvailability
import com.terra.app.domain.model.HealthSnapshot
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.random.Random

/**
 * Thin wrapper around the Health Connect client. Reads are aggregated to one
 * daily summary; raw records are never stored.
 */
@Singleton
class HealthConnectSource @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val requiredPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(NutritionRecord::class),
    )

    fun availability(): HealthAvailability = when (HealthConnectClient.getSdkStatus(context)) {
        HealthConnectClient.SDK_AVAILABLE -> HealthAvailability.AVAILABLE
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> HealthAvailability.NOT_INSTALLED
        else -> HealthAvailability.NOT_SUPPORTED
    }

    private fun client(): HealthConnectClient = HealthConnectClient.getOrCreate(context)

    suspend fun grantedPermissions(): Set<String> = try {
        client().permissionController.getGrantedPermissions()
    } catch (_: Exception) {
        emptySet()
    }

    suspend fun snapshot(date: LocalDate): HealthSnapshot {
        val zone = ZoneId.systemDefault()
        val dayStart = date.atStartOfDay(zone).toInstant()
        val dayEnd = minOf(Instant.now(), date.plusDays(1).atStartOfDay(zone).toInstant())
        val client = client()

        val steps = client.aggregate(
            AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(dayStart, dayEnd),
            )
        )[StepsRecord.COUNT_TOTAL] ?: 0L

        // Last night's sleep: sessions ending today, searched from yesterday evening.
        val sleepSearchStart = date.minusDays(1).atTime(LocalTime.of(18, 0)).atZone(zone).toInstant()
        val sleepMinutes = client.readRecords(
            ReadRecordsRequest(
                recordType = SleepSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(sleepSearchStart, dayEnd),
            )
        ).records
            .filter { it.endTime >= dayStart }
            .sumOf { Duration.between(it.startTime, it.endTime).toMinutes() }

        val exerciseMinutes = client.readRecords(
            ReadRecordsRequest(
                recordType = ExerciseSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(dayStart, dayEnd),
            )
        ).records
            .sumOf { Duration.between(it.startTime, it.endTime).toMinutes() }

        return HealthSnapshot(steps = steps, sleepMinutes = sleepMinutes, exerciseMinutes = exerciseMinutes)
    }
}

/**
 * Deterministic demo data, keyed by date, used when Health Connect is
 * unavailable or demo mode is enabled — lets the whole game loop run on an
 * emulator with no health provider.
 */
object MockHealthSource {
    fun snapshot(date: LocalDate): HealthSnapshot {
        val rng = Random(date.toEpochDay())
        return HealthSnapshot(
            steps = 4000L + rng.nextLong(10_000),
            sleepMinutes = 330L + rng.nextLong(210), // 5.5h .. 9h
            exerciseMinutes = listOf(0L, 0L, 25L, 45L).random(rng),
        )
    }
}
