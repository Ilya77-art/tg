package com.terra.app.data.worker

import android.content.Context
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit

object WorkScheduler {

    fun scheduleAll(context: Context) {
        val wm = WorkManager.getInstance(context)

        wm.enqueueUniquePeriodicWork(
            HealthSyncWorker.NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<HealthSyncWorker>(1, TimeUnit.HOURS).build(),
        )

        wm.enqueueUniquePeriodicWork(
            NightlyGrowthWorker.NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<NightlyGrowthWorker>(24, TimeUnit.HOURS)
                .setInitialDelay(delayUntil(LocalTime.of(3, 0)))
                .build(),
        )

        wm.enqueueUniquePeriodicWork(
            DailyNotificationWorker.NAME_MORNING,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<DailyNotificationWorker>(24, TimeUnit.HOURS)
                .setInitialDelay(delayUntil(LocalTime.of(8, 0)))
                .setInputData(
                    Data.Builder().putBoolean(DailyNotificationWorker.KEY_IS_MORNING, true).build()
                )
                .build(),
        )

        wm.enqueueUniquePeriodicWork(
            DailyNotificationWorker.NAME_EVENING,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<DailyNotificationWorker>(24, TimeUnit.HOURS)
                .setInitialDelay(delayUntil(LocalTime.of(19, 0)))
                .setInputData(
                    Data.Builder().putBoolean(DailyNotificationWorker.KEY_IS_MORNING, false).build()
                )
                .build(),
        )
    }

    private fun delayUntil(target: LocalTime): Duration {
        val now = LocalDateTime.now()
        var next = now.toLocalDate().atTime(target)
        if (!next.isAfter(now)) next = next.plusDays(1)
        return Duration.between(now, next)
    }
}
