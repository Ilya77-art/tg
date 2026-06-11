package com.terra.app.presentation.planet

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import com.terra.app.domain.model.Biome
import com.terra.app.domain.model.BiomeState
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.random.Random

private const val SEGMENT_SWEEP = 60f
private const val FIRST_SEGMENT_START = -90f

/**
 * The living planet: a full circle split into six 60° biome wedges, each
 * rendered in layered 2D according to its current stage. Subtle elements
 * (fireflies, waves, aurora, steam) animate on an infinite transition.
 */
@Composable
fun PlanetCanvas(
    biomes: List<BiomeState>,
    isNight: Boolean,
    modifier: Modifier = Modifier,
    onBiomeTap: (Biome) -> Unit = {},
) {
    val transition = rememberInfiniteTransition(label = "planet")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(6_000, easing = LinearEasing), RepeatMode.Restart),
        label = "phase",
    )

    Canvas(
        modifier = modifier.pointerInput(Unit) {
            detectTapGestures { tap ->
                val center = Offset(size.width / 2f, size.height / 2f)
                val radius = minOf(size.width, size.height) / 2f * 0.92f
                val dx = tap.x - center.x
                val dy = tap.y - center.y
                if (hypot(dx, dy) <= radius) {
                    val angle = Math.toDegrees(atan2(dy, dx).toDouble()).toFloat()
                    val normalized = (angle - FIRST_SEGMENT_START + 360f) % 360f
                    val index = (normalized / SEGMENT_SWEEP).toInt().coerceIn(0, 5)
                    onBiomeTap(Biome.entries[index])
                }
            }
        }
    ) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = minOf(size.width, size.height) / 2f * 0.92f

        // Atmosphere halo
        drawCircle(
            color = Color(0xFF7EC8E3).copy(alpha = if (isNight) 0.15f else 0.3f),
            radius = radius * 1.04f,
            center = center,
            style = Stroke(width = radius * 0.03f),
        )

        biomes.sortedBy { it.biome.ordinal }.forEach { state ->
            drawBiomeSegment(state, center, radius, phase, isNight)
        }

        // Inner sea at the planet's heart
        drawCircle(Color(0xFF24557E).night(isNight), radius * 0.3f, center)
        drawCircle(
            color = Color(0xFF7EC8E3).copy(alpha = 0.4f),
            radius = radius * 0.3f,
            center = center,
            style = Stroke(width = radius * 0.012f),
        )
    }
}

private fun DrawScope.drawBiomeSegment(
    state: BiomeState,
    center: Offset,
    radius: Float,
    phase: Float,
    night: Boolean,
) {
    val start = FIRST_SEGMENT_START + state.biome.ordinal * SEGMENT_SWEEP
    val wedge = wedgePath(center, radius, start)

    if (!state.isUnlocked) {
        drawPath(wedge, Color(0xFF1C2530).night(night))
        // Faint mist dots over undiscovered land
        spots(state.biome.ordinal * 97, 5, start, radius * 0.4f, radius * 0.85f).forEach {
            drawCircle(Color.White.copy(alpha = 0.05f), radius * 0.03f, polar(center, it.angle, it.dist))
        }
        drawSegmentBorder(center, radius, start)
        return
    }

    clipPath(wedge) {
        when (state.biome) {
            Biome.STEPPE -> drawSteppe(state.stage, center, radius, start, phase, night)
            Biome.FOREST -> drawForest(state.stage, center, radius, start, phase, night)
            Biome.MOUNTAINS -> drawMountains(state.stage, center, radius, start, phase, night)
            Biome.COASTLINE -> drawCoastline(state.stage, center, radius, start, phase, night)
            Biome.TUNDRA -> drawTundra(state.stage, center, radius, start, phase, night)
            Biome.VOLCANIC -> drawVolcanic(state.stage, center, radius, start, phase, night)
        }
        if (state.hasWonder) drawWonder(center, radius, start, night)
    }
    drawSegmentBorder(center, radius, start)
}

// ---- Biome renderers -------------------------------------------------------

private fun DrawScope.drawSteppe(
    stage: Int, center: Offset, r: Float, start: Float, phase: Float, night: Boolean,
) {
    val base = lerp(Color(0xFF9B7B4F), Color(0xFF7BA05B), stage / 5f).night(night)
    drawPath(wedgePath(center, r, start), base)

    if (stage >= 2) {
        // Rolling hills: soft darker mounds at mid radius
        spots(11, 3, start, r * 0.5f, r * 0.7f).forEach {
            val p = polar(center, it.angle, it.dist)
            drawOval(
                color = Color(0xFF6B9148).night(night),
                topLeft = Offset(p.x - r * 0.09f, p.y - r * 0.035f),
                size = Size(r * 0.18f, r * 0.07f),
            )
        }
    }
    if (stage >= 1) {
        // Scattered grass tufts
        spots(12, 14, start, r * 0.38f, r * 0.88f).forEach {
            val p = polar(center, it.angle, it.dist)
            drawRect(
                color = Color(0xFF4C7A3A).night(night),
                topLeft = Offset(p.x - r * 0.004f, p.y - r * 0.018f),
                size = Size(r * 0.008f, r * 0.018f),
            )
        }
    }
    if (stage >= 3) {
        // Wildflowers
        val petals = listOf(Color(0xFFE57FB3), Color(0xFFF2D16B), Color(0xFFF5F1E6))
        spots(13, 10, start, r * 0.4f, r * 0.85f).forEachIndexed { i, s ->
            drawCircle(petals[i % petals.size].night(night), r * 0.009f, polar(center, s.angle, s.dist))
        }
    }
    if (stage >= 4) {
        // Grazing deer silhouettes
        spots(14, 2, start, r * 0.55f, r * 0.75f).forEach {
            drawDeer(polar(center, it.angle, it.dist), r * 0.05f, Color(0xFF4A3422).night(night))
        }
    }
    if (stage >= 5) {
        // Golden sunset wash + fluttering butterflies
        drawPath(wedgePath(center, r, start), Color(0xFFE8C36A).copy(alpha = 0.16f))
        spots(15, 3, start, r * 0.45f, r * 0.8f).forEachIndexed { i, s ->
            val flutter = sin((phase + i * 0.33f) * 2f * Math.PI).toFloat() * r * 0.012f
            val p = polar(center, s.angle, s.dist) + Offset(0f, flutter)
            drawCircle(Color(0xFFE89E3D), r * 0.007f, p + Offset(-r * 0.006f, 0f))
            drawCircle(Color(0xFFE89E3D), r * 0.007f, p + Offset(r * 0.006f, 0f))
        }
    }
}

private fun DrawScope.drawForest(
    stage: Int, center: Offset, r: Float, start: Float, phase: Float, night: Boolean,
) {
    val base = lerp(Color(0xFF8A6240), Color(0xFF2F6B3E), stage / 5f).night(night)
    drawPath(wedgePath(center, r, start), base)
    val trunk = Color(0xFF5B4226).night(night)

    if (stage == 1) {
        // Saplings: thin stems with tiny oval tops
        spots(21, 10, start, r * 0.4f, r * 0.85f).forEach {
            val p = polar(center, it.angle, it.dist)
            drawLine(trunk, p, p - Offset(0f, r * 0.028f), strokeWidth = r * 0.005f)
            drawOval(
                color = Color(0xFF7BBF6A).night(night),
                topLeft = Offset(p.x - r * 0.011f, p.y - r * 0.045f),
                size = Size(r * 0.022f, r * 0.02f),
            )
        }
    }
    if (stage >= 2) {
        // Young trees with round canopies
        spots(22, 8, start, r * 0.42f, r * 0.85f).forEach {
            val p = polar(center, it.angle, it.dist)
            drawLine(trunk, p, p - Offset(0f, r * 0.05f), strokeWidth = r * 0.01f)
            drawCircle(Color(0xFF4E8C4A).night(night), r * 0.028f, p - Offset(0f, r * 0.062f))
        }
    }
    if (stage >= 3) {
        // Dense overlapping canopy
        spots(23, 12, start, r * 0.38f, r * 0.88f).forEach {
            drawCircle(Color(0xFF3A6B36).night(night), r * 0.034f, polar(center, it.angle, it.dist))
        }
    }
    if (stage >= 4) {
        // A stream winding from the inner sea to the rim, shimmering gently
        val stream = Path().apply {
            val a = start + 30f
            moveTo(polar(center, a - 8f, r * 0.31f).x, polar(center, a - 8f, r * 0.31f).y)
            cubicTo(
                polar(center, a + 14f, r * 0.5f).x, polar(center, a + 14f, r * 0.5f).y,
                polar(center, a - 16f, r * 0.7f).x, polar(center, a - 16f, r * 0.7f).y,
                polar(center, a + 4f, r * 0.96f).x, polar(center, a + 4f, r * 0.96f).y,
            )
        }
        val shimmer = 0.65f + 0.2f * sin(phase * 2f * Math.PI).toFloat()
        drawPath(stream, Color(0xFF5FA8D3).copy(alpha = shimmer), style = Stroke(width = r * 0.022f))
    }
    if (stage >= 5) {
        // Ancient trees
        spots(25, 3, start, r * 0.5f, r * 0.75f).forEach {
            val p = polar(center, it.angle, it.dist)
            drawLine(trunk, p, p - Offset(0f, r * 0.09f), strokeWidth = r * 0.02f)
            drawCircle(Color(0xFF2C5429).night(night), r * 0.05f, p - Offset(0f, r * 0.11f))
        }
        // Blinking fireflies
        spots(26, 6, start, r * 0.4f, r * 0.85f).forEachIndexed { i, s ->
            val blink = (sin((phase * 2f + i * 0.37f) * 2f * Math.PI).toFloat() * 0.5f + 0.5f)
            drawCircle(
                Color(0xFFFFF3A6).copy(alpha = blink * 0.9f),
                r * 0.006f,
                polar(center, s.angle, s.dist),
            )
        }
    }
}

private fun DrawScope.drawMountains(
    stage: Int, center: Offset, r: Float, start: Float, phase: Float, night: Boolean,
) {
    drawPath(wedgePath(center, r, start), Color(0xFF6E6E78).night(night))
    val peaks = spots(31, 3, start, r * 0.5f, r * 0.75f)

    peaks.forEach { s ->
        val p = polar(center, s.angle, s.dist)
        val h = r * 0.12f
        val peak = Path().apply {
            moveTo(p.x - h * 0.7f, p.y)
            lineTo(p.x, p.y - h)
            lineTo(p.x + h * 0.7f, p.y)
            close()
        }
        drawPath(peak, Color(0xFF4D4D57).night(night))
        if (stage >= 2) {
            val cap = Path().apply {
                moveTo(p.x - h * 0.22f, p.y - h * 0.68f)
                lineTo(p.x, p.y - h)
                lineTo(p.x + h * 0.22f, p.y - h * 0.68f)
                close()
            }
            drawPath(cap, Color(0xFFF2F5F7).night(night))
        }
        if (stage >= 3) {
            drawLine(
                Color(0xFF8FD0E8).copy(alpha = 0.8f),
                Offset(p.x + h * 0.15f, p.y - h * 0.5f),
                Offset(p.x + h * 0.3f, p.y),
                strokeWidth = r * 0.008f,
            )
        }
    }
    if (stage >= 4) {
        // Circling eagles: simple "v" wings
        spots(32, 2, start, r * 0.45f, r * 0.6f).forEachIndexed { i, s ->
            val drift = sin((phase + i * 0.5f) * 2f * Math.PI).toFloat() * 3f
            val p = polar(center, s.angle + drift, s.dist)
            val w = r * 0.018f
            drawLine(Color(0xFF2B2B33).night(night), p, p + Offset(-w, -w * 0.6f), strokeWidth = r * 0.004f)
            drawLine(Color(0xFF2B2B33).night(night), p, p + Offset(w, -w * 0.6f), strokeWidth = r * 0.004f)
        }
    }
    if (stage >= 5) {
        // Ancient ruins: columns and a fallen lintel
        val p = polar(center, start + 30f, r * 0.82f)
        val col = Color(0xFFCBC4B4).night(night)
        for (i in -1..1) {
            drawRect(
                col,
                topLeft = Offset(p.x + i * r * 0.025f - r * 0.005f, p.y - r * 0.035f),
                size = Size(r * 0.01f, r * 0.035f),
            )
        }
        drawRect(col, topLeft = Offset(p.x - r * 0.033f, p.y - r * 0.043f), size = Size(r * 0.066f, r * 0.008f))
    }
}

private fun DrawScope.drawCoastline(
    stage: Int, center: Offset, r: Float, start: Float, phase: Float, night: Boolean,
) {
    drawPath(wedgePath(center, r, start), Color(0xFFD9B382).night(night))
    // The outer band is sea
    clipPath(wedgePath(center, r, start)) {
        drawCircle(
            Color(0xFF3D7EA6).night(night),
            r,
            center,
            style = Stroke(width = r * 0.36f),
        )
    }
    if (stage >= 2) {
        // Rolling waves: arcs that breathe in and out
        for (i in 0..2) {
            val swell = sin((phase + i * 0.3f) * 2f * Math.PI).toFloat() * r * 0.012f
            val d = r * (0.78f + i * 0.055f) + swell
            val arc = Path().apply {
                arcTo(Rect(center - Offset(d, d), Size(d * 2, d * 2)), start + 8f, 44f, true)
            }
            drawPath(arc, Color(0xFFBFE3F2).copy(alpha = 0.7f), style = Stroke(width = r * 0.006f))
        }
    }
    if (stage >= 3) {
        // Tide pools on the wet sand
        spots(41, 3, start, r * 0.62f, r * 0.72f).forEach {
            drawCircle(Color(0xFF6FB3CF).night(night), r * 0.016f, polar(center, it.angle, it.dist))
        }
    }
    if (stage >= 4) {
        // Seabirds
        spots(42, 3, start, r * 0.4f, r * 0.6f).forEach {
            val p = polar(center, it.angle, it.dist)
            val w = r * 0.014f
            drawLine(Color(0xFFF5F1E6).night(night), p, p + Offset(-w, -w * 0.5f), strokeWidth = r * 0.004f)
            drawLine(Color(0xFFF5F1E6).night(night), p, p + Offset(w, -w * 0.5f), strokeWidth = r * 0.004f)
        }
    }
    if (stage >= 5) {
        // Coral reef glowing beneath the water
        val corals = listOf(Color(0xFFE57FB3), Color(0xFFF2945B), Color(0xFF9C7BC4))
        spots(43, 8, start, r * 0.86f, r * 0.95f).forEachIndexed { i, s ->
            drawCircle(corals[i % corals.size].copy(alpha = 0.85f), r * 0.011f, polar(center, s.angle, s.dist))
        }
    }
}

private fun DrawScope.drawTundra(
    stage: Int, center: Offset, r: Float, start: Float, phase: Float, night: Boolean,
) {
    drawPath(wedgePath(center, r, start), Color(0xFFC9D8E0).night(night))

    if (stage >= 2) {
        // Frost flowers: six-pointed asterisks
        spots(51, 7, start, r * 0.4f, r * 0.85f).forEach {
            val p = polar(center, it.angle, it.dist)
            val l = r * 0.014f
            for (k in 0..2) {
                val a = Math.toRadians((k * 60).toDouble())
                val d = Offset((l * cos(a)).toFloat(), (l * sin(a)).toFloat())
                drawLine(Color(0xFF9FC4DB).night(night), p - d, p + d, strokeWidth = r * 0.004f)
            }
        }
    }
    if (stage >= 3) {
        // Arctic fox: compact white silhouette
        val p = polar(center, start + 22f, r * 0.6f)
        val s = r * 0.035f
        drawOval(
            Color(0xFFF5F8FA).night(night),
            topLeft = Offset(p.x - s, p.y - s * 0.5f),
            size = Size(s * 2f, s),
        )
        drawCircle(Color(0xFFF5F8FA).night(night), s * 0.4f, p + Offset(s * 0.95f, -s * 0.35f))
        // ears
        drawLine(Color(0xFFF5F8FA).night(night), p + Offset(s * 0.8f, -s * 0.6f), p + Offset(s * 0.7f, -s * 0.95f), strokeWidth = r * 0.005f)
        drawLine(Color(0xFFF5F8FA).night(night), p + Offset(s * 1.1f, -s * 0.6f), p + Offset(s * 1.2f, -s * 0.95f), strokeWidth = r * 0.005f)
        // bushy tail
        drawOval(
            Color(0xFFF5F8FA).night(night),
            topLeft = Offset(p.x - s * 1.7f, p.y - s * 0.45f),
            size = Size(s * 0.9f, s * 0.55f),
        )
    }
    if (stage >= 4) {
        // Aurora borealis: drifting translucent ribbons
        for (i in 0..1) {
            val sway = sin((phase + i * 0.5f) * 2f * Math.PI).toFloat() * 5f
            val d = r * (0.78f + i * 0.09f)
            val arc = Path().apply {
                arcTo(Rect(center - Offset(d, d), Size(d * 2, d * 2)), start + 6f + sway, 48f, true)
            }
            val color = if (i == 0) Color(0xFF6FE3B0) else Color(0xFFA98FE3)
            drawPath(arc, color.copy(alpha = 0.4f), style = Stroke(width = r * 0.028f))
        }
    }
    if (stage >= 5) {
        spots(52, 5, start, r * 0.4f, r * 0.8f).forEach {
            drawCircle(Color(0xFFFFFFFF).copy(alpha = 0.5f), r * 0.006f, polar(center, it.angle, it.dist))
        }
    }
}

private fun DrawScope.drawVolcanic(
    stage: Int, center: Offset, r: Float, start: Float, phase: Float, night: Boolean,
) {
    drawPath(wedgePath(center, r, start), Color(0xFF35302E).night(night))

    if (stage >= 1) {
        // Glowing lava cracks
        spots(61, 4, start, r * 0.45f, r * 0.8f).forEach {
            val p = polar(center, it.angle, it.dist)
            val crack = Path().apply {
                moveTo(p.x - r * 0.025f, p.y)
                lineTo(p.x - r * 0.005f, p.y + r * 0.012f)
                lineTo(p.x + r * 0.012f, p.y - r * 0.008f)
                lineTo(p.x + r * 0.028f, p.y + r * 0.006f)
            }
            drawPath(crack, Color(0xFFE8642C), style = Stroke(width = r * 0.005f))
        }
    }
    if (stage >= 2) {
        // Steam vents: puffs rising and fading
        spots(62, 3, start, r * 0.5f, r * 0.7f).forEachIndexed { i, s ->
            val t = ((phase + i * 0.33f) % 1f)
            val p = polar(center, s.angle, s.dist) - Offset(0f, t * r * 0.06f)
            drawCircle(Color(0xFFBFBFBF).copy(alpha = (1f - t) * 0.5f), r * 0.014f * (0.6f + t), p)
        }
    }
    if (stage >= 3) {
        // Tropical palms
        spots(63, 4, start, r * 0.55f, r * 0.85f).forEach {
            val p = polar(center, it.angle, it.dist)
            drawLine(Color(0xFF6B4A2B).night(night), p, p - Offset(r * 0.008f, r * 0.05f), strokeWidth = r * 0.008f)
            val top = p - Offset(r * 0.008f, r * 0.05f)
            for (k in 0..3) {
                val a = Math.toRadians((200 + k * 47).toDouble())
                val tip = top + Offset((r * 0.03f * cos(a)).toFloat(), (r * 0.03f * sin(a)).toFloat())
                drawLine(Color(0xFF3F8C3F).night(night), top, tip, strokeWidth = r * 0.006f)
            }
        }
    }
    if (stage >= 4) {
        // Rare birds: bright flashes among the trees
        val plumage = listOf(Color(0xFFE84C6E), Color(0xFF3FB8C9))
        spots(64, 2, start, r * 0.45f, r * 0.65f).forEachIndexed { i, s ->
            val p = polar(center, s.angle, s.dist)
            val w = r * 0.014f
            drawLine(plumage[i % 2], p, p + Offset(-w, -w * 0.6f), strokeWidth = r * 0.005f)
            drawLine(plumage[i % 2], p, p + Offset(w, -w * 0.6f), strokeWidth = r * 0.005f)
        }
    }
    if (stage >= 5) {
        drawPath(wedgePath(center, r, start), Color(0xFF3F8C3F).copy(alpha = 0.12f))
    }
}

private fun DrawScope.drawDeer(p: Offset, s: Float, color: Color) {
    drawOval(color, topLeft = Offset(p.x - s, p.y - s * 0.5f), size = Size(s * 2f, s))
    drawCircle(color, s * 0.35f, p + Offset(s * 1.1f, -s * 0.7f))
    // legs
    for (i in 0..3) {
        val x = p.x - s * 0.7f + i * s * 0.45f
        drawLine(color, Offset(x, p.y + s * 0.3f), Offset(x, p.y + s * 0.95f), strokeWidth = s * 0.12f)
    }
    // antlers
    drawLine(color, p + Offset(s * 1.0f, -s * 1.0f), p + Offset(s * 0.8f, -s * 1.5f), strokeWidth = s * 0.1f)
    drawLine(color, p + Offset(s * 1.2f, -s * 1.0f), p + Offset(s * 1.4f, -s * 1.5f), strokeWidth = s * 0.1f)
}

private fun DrawScope.drawWonder(center: Offset, r: Float, start: Float, night: Boolean) {
    // A golden obelisk landmark
    val p = polar(center, start + 30f, r * 0.45f)
    val h = r * 0.06f
    val obelisk = Path().apply {
        moveTo(p.x - h * 0.18f, p.y)
        lineTo(p.x, p.y - h)
        lineTo(p.x + h * 0.18f, p.y)
        close()
    }
    drawPath(obelisk, Color(0xFFE8C36A).night(night))
    drawCircle(Color(0xFFFFF3A6).copy(alpha = 0.35f), h * 0.6f, p - Offset(0f, h))
}

// ---- Geometry helpers ------------------------------------------------------

private fun wedgePath(center: Offset, radius: Float, startAngle: Float): Path = Path().apply {
    moveTo(center.x, center.y)
    arcTo(
        rect = Rect(center - Offset(radius, radius), Size(radius * 2, radius * 2)),
        startAngleDegrees = startAngle,
        sweepAngleDegrees = SEGMENT_SWEEP,
        forceMoveTo = false,
    )
    close()
}

private fun DrawScope.drawSegmentBorder(center: Offset, radius: Float, startAngle: Float) {
    val edge = polar(center, startAngle, radius)
    drawLine(Color.Black.copy(alpha = 0.25f), center, edge, strokeWidth = radius * 0.006f)
}

private fun polar(center: Offset, angleDeg: Float, dist: Float): Offset {
    val rad = Math.toRadians(angleDeg.toDouble())
    return Offset(center.x + (dist * cos(rad)).toFloat(), center.y + (dist * sin(rad)).toFloat())
}

private data class Spot(val angle: Float, val dist: Float)

/** Deterministic pseudo-random placements inside a wedge, stable across frames. */
private fun spots(seed: Int, count: Int, startAngle: Float, minDist: Float, maxDist: Float): List<Spot> {
    val rng = Random(seed)
    return List(count) {
        Spot(
            angle = startAngle + 8f + rng.nextFloat() * (SEGMENT_SWEEP - 16f),
            dist = minDist + rng.nextFloat() * (maxDist - minDist),
        )
    }
}

private fun Color.night(isNight: Boolean): Color =
    if (isNight) lerp(this, Color(0xFF06101C), 0.45f) else this
