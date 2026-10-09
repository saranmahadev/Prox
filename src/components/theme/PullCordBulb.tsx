import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'
import { useUiStore } from '../../state/useUiStore'

/**
 * Pull-cord bulb theme toggle.
 *
 * Legacy's version "swung" via two canned CSS keyframe animations - a
 * fixed 5s sine loop for idle sway, and a fixed scripted curve for the
 * post-toggle "kick" - replayed identically no matter how it was
 * triggered. Only the vertical pull-down distance was real physics (a
 * damped 1D spring). That mismatch (a scripted swing bolted onto a
 * physical stretch) is what reads as unnatural.
 *
 * This version models the whole thing as two coupled, continuously
 * integrated damped oscillators instead:
 *  - `angle`: a real pendulum (the bulb swinging side to side about its
 *    mount), using the actual sin(angle) restoring force, not a linear
 *    approximation, so larger swings ease near the top the way a real
 *    weight on a cord does
 *  - `stretch`: a spring (the cord elongating when pulled down)
 * Both run continuously, including a slow, smoothed "wind" term (an
 * Ornstein-Uhlenbeck-style random walk, not raw per-frame noise - raw
 * noise reads as jitter, a slowly-drifting bias reads as air currents)
 * so it's never perfectly still but also never on a fixed loop. Drags
 * manipulate angle/stretch directly; releases hand off real velocity
 * (a smoothed average of recent pointer samples, not just the last
 * frame's delta, so the handoff from "held" to "free" doesn't jump) into
 * the free simulation - a fast flick swings harder than a slow drag to
 * the same position, and a plain click/keyboard toggle gives a modest
 * randomized-direction kick that decays through the same physics rather
 * than a canned curve.
 *
 * The period is tuned to ~1.2s (a real cord this length swings roughly
 * once a second, not several times a second - the first version's
 * stiffness constant was about 8x too high, which is what made it feel
 * like a tight toy spring instead of a heavy hanging lamp).
 */

const ANGLE_STIFFNESS = 0.0076 // tuned for a ~1.2s swing period at 60fps
const ANGLE_DAMPING = 0.993 // several visible swings before settling (~6-7s)
const STRETCH_STIFFNESS = 0.16
const STRETCH_DAMPING = 0.85
const WIND_DAMPING = 0.985 // how persistent the ambient "wind" bias is frame to frame
const WIND_JITTER = 0.00035 // how much the wind can shift per frame - deliberately tiny
const MAX_DRAG_ANGLE = 24 // degrees, while actively dragging sideways
const MAX_DRAG_X = 40 // px of horizontal drag mapped to MAX_DRAG_ANGLE
const MAX_PULL = 30 // px of vertical drag
const FIRE_PULL_THRESHOLD = 12 // px - pulling the cord down past this fires the toggle
const CLICK_TUG = 22 // px - the stretch a plain click/keyboard tug simulates
const FLICK_TO_ANGVEL = 2.4 // px/ms horizontal release velocity -> deg/frame angular velocity
const FLICK_TO_STRETCHVEL = 6 // px/ms vertical release velocity -> px/frame stretch velocity
const VELOCITY_SMOOTHING = 0.35 // EMA weight for new samples when tracking release velocity
const SETTLE_EPS = 0.015

interface DragState {
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastT: number
  vx: number
  vy: number
  moved: boolean
}

export function PullCordBulb() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const swingRef = useRef<SVGGElement>(null)
  const cordRef = useRef<SVGPathElement>(null)
  const handleRef = useRef<SVGRectElement>(null)

  const physics = useRef({ angle: 0, angVel: 0, stretch: 0, stretchVel: 0, wind: 0 })
  const drag = useRef<DragState | null>(null)
  const reduceMotion = useRef(false)

  // Keep a stable callback the rAF loop can call without stale-closure issues.
  const toggleThemeRef = useRef(toggleTheme)
  toggleThemeRef.current = toggleTheme

  useEffect(() => {
    reduceMotion.current = matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  function render() {
    const { angle, stretch } = physics.current
    if (swingRef.current) swingRef.current.style.transform = `rotate(${angle}deg)`
    if (cordRef.current) cordRef.current.setAttribute('d', `M37 26 H52 V${116 + stretch}`)
    if (handleRef.current) handleRef.current.setAttribute('y', String(116 + stretch))
  }

  function kick(strength = 1) {
    // Sized so the resulting swing amplitude lands around 8-12 degrees at
    // strength=1 - a visible nudge, not a wild spin (amplitude ~= angVel /
    // angular frequency, and the frequency is deliberately low now).
    const dir = Math.random() > 0.5 ? 1 : -1
    physics.current.angVel += dir * (0.65 + Math.random() * 0.25) * strength
    physics.current.stretchVel += 2.2 * strength
  }

  useEffect(() => {
    if (reduceMotion.current) {
      render()
      return
    }
    let raf = 0
    const step = () => {
      const p = physics.current
      if (!drag.current) {
        // Slowly-drifting ambient bias (not fresh noise every frame) -
        // reads as faint air currents rather than vibration.
        p.wind = p.wind * WIND_DAMPING + (Math.random() - 0.5) * WIND_JITTER

        const angleRad = (p.angle * Math.PI) / 180
        const restoring = -ANGLE_STIFFNESS * Math.sin(angleRad) * (180 / Math.PI)
        p.angVel = (p.angVel + restoring + p.wind) * ANGLE_DAMPING
        p.angle += p.angVel

        const stretchAccel = -STRETCH_STIFFNESS * p.stretch
        p.stretchVel = (p.stretchVel + stretchAccel) * STRETCH_DAMPING
        p.stretch += p.stretchVel

        if (Math.abs(p.angle) < SETTLE_EPS && Math.abs(p.angVel) < SETTLE_EPS) {
          p.angle = 0
          p.angVel = 0
        }
        if (Math.abs(p.stretch) < SETTLE_EPS && Math.abs(p.stretchVel) < SETTLE_EPS) {
          p.stretch = 0
          p.stretchVel = 0
        }
        render()
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!(e.target as Element).closest?.('.hit')) return
    drag.current = { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, lastT: performance.now(), vx: 0, vy: 0, moved: false }
    physics.current.angVel = 0
    physics.current.stretchVel = 0
    buttonRef.current?.classList.add('dragging')
    try {
      svgRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // ignore - pointer capture is best-effort
    }
    e.preventDefault()
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current
    if (!d) return
    const dx = Math.max(-MAX_DRAG_X, Math.min(MAX_DRAG_X, e.clientX - d.startX))
    const dy = Math.max(0, Math.min(MAX_PULL, e.clientY - d.startY))
    if (Math.hypot(dx, dy) > 3) d.moved = true

    if (reduceMotion.current) {
      physics.current.stretch = dy
    } else {
      physics.current.angle = (dx / MAX_DRAG_X) * MAX_DRAG_ANGLE
      physics.current.stretch = dy
      const t = performance.now()
      const dt = t - d.lastT
      if (dt > 0) {
        // Smoothed (EMA) rather than the raw last-frame delta, so a brief
        // pause right before release doesn't zero out an otherwise fast
        // flick, and the handoff into free physics doesn't jump.
        const rawVx = (e.clientX - d.lastX) / dt
        const rawVy = (e.clientY - d.lastY) / dt
        d.vx = d.vx * (1 - VELOCITY_SMOOTHING) + rawVx * VELOCITY_SMOOTHING
        d.vy = d.vy * (1 - VELOCITY_SMOOTHING) + rawVy * VELOCITY_SMOOTHING
      }
      d.lastX = e.clientX
      d.lastY = e.clientY
      d.lastT = t
    }
    render()
  }

  function release(cancelled: boolean) {
    const d = drag.current
    if (!d) return
    drag.current = null
    buttonRef.current?.classList.remove('dragging')

    const fire = !cancelled && (!d.moved || physics.current.stretch > FIRE_PULL_THRESHOLD)
    if (!d.moved) physics.current.stretch = CLICK_TUG

    if (!reduceMotion.current) {
      physics.current.angVel += d.vx * FLICK_TO_ANGVEL
      physics.current.stretchVel += Math.max(0, d.vy) * FLICK_TO_STRETCHVEL
    }
    if (fire) {
      toggleThemeRef.current()
      if (!reduceMotion.current) kick(0.6)
    }
    if (reduceMotion.current) {
      physics.current.stretch = 0
      render()
    }
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // Keyboard activation (Enter/Space) arrives as a click with detail 0 and
    // never goes through the pointer handlers above.
    if (e.detail !== 0) return
    physics.current.stretch = CLICK_TUG
    toggleThemeRef.current()
    if (!reduceMotion.current) kick(0.8)
    else render()
  }

  const dark = theme === 'dark' || (theme === null && matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <button
      ref={buttonRef}
      className="bulb"
      role="switch"
      aria-checked={!dark}
      aria-label="Toggle light, pull the cord"
      onClick={handleClick}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 60 150"
        aria-hidden="true"
        focusable="false"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => release(false)}
        onPointerCancel={() => release(true)}
      >
        <g className="swing" ref={swingRef}>
          <circle className="glow" cx="30" cy="72" r="46" />
          <line className="wire" x1="30" y1="0" x2="30" y2="20" />
          <path className="cord" ref={cordRef} d="M37 26 H52 V116" />
          <rect className="hit holder" x="23" y="19" width="14" height="11" rx="2.5" />
          <g className="hit base">
            <path fill="var(--surface2)" stroke="var(--border2)" strokeWidth="1" d="M24.5 30 H35.5 L36 46 Q36 49 33 49 H27 Q24 49 24 46 Z" />
            <path className="ridge" d="M24.5 34.5 H35.5 M24.3 38.5 H35.7 M24.2 42.5 H35.8" />
          </g>
          <path className="hit glass" d="M25.5 48 C25.5 55 14 57 14 71 C14 84 22 92 30 92 C38 92 46 84 46 71 C46 57 34.5 55 34.5 48 Z" />
          <path className="support" d="M28.2 49 V63 M31.8 49 V63 M28.2 63 Q30 67 31.8 63" />
          <rect className="hit pad" x="42" y="104" width="20" height="44" fill="transparent" />
          <rect className="hit handle" ref={handleRef} x="49" y="116" width="6" height="13" rx="3" />
        </g>
      </svg>
    </button>
  )
}
