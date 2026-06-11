package com.terra.app.data.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.terra.app.domain.usecase.ApplyNightlyGrowthUseCase
import com.terra.app.domain.usecase.BuildNotificationContentUseCase
import com.terra.app.domain.usecase.SyncHealthDataUseCase
import com.terra.app.notifications.TerraNotifications
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/** Hourly: pull health data and refresh today's Vitas. */
@HiltWorker
class HealthSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val syncHealthData: SyncHealthDataUseCase,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result = try {
        syncHealthData()
        Result.success()
    } catch (_: Exception) {
        Result.retry()
    }

    companion object {
        const val NAME = "terra_health_sync"
    }
}

/** 3am: spend yesterday's Vitas on world growth, apply drought/streaks. */
@HiltWorker
class NightlyGrowthWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val syncHealthData: SyncHealthDataUseCase,
    private val applyNightlyGrowth: ApplyNightlyGrowthUseCase,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result = try {
        // Final sync for yesterday before settling the books.
        syncHealthData(java.time.LocalDate.now().minusDays(1))
        applyNightlyGrowth()
        Result.success()
    } catch (_: Exception) {
        Result.retry()
    }

    companion object {
        const val NAME = "terra_nightly_growth"
    }
}

/** 8am / 7pm planet-care notifications. */
@HiltWorker
class DailyNotificationWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val buildContent: BuildNotificationContentUseCase,
    private val syncHealthData: SyncHealthDataUseCase,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val isMorning = inputData.getBoolean(KEY_IS_MORNING, true)
        return try {
            val content = if (isMorning) {
                buildContent.morning()
            } else {
                syncHealthData() // make the <40% check current
                buildContent.evening()
            }
            content?.let {
                TerraNotifications.send(applicationContext, if (isMorning) 1 else 2, it)
            }
            Result.success()
        } catch (_: Exception) {
            Result.failure()
        }
    }

    companion object {
        const val KEY_IS_MORNING = "is_morning"
        const val NAME_MORNING = "terra_notification_morning"
        const val NAME_EVENING = "terra_notification_evening"
    }
}
