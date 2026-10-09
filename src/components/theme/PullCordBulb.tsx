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
 *  - `angle`: a pendulum (the bulb swinging side to side about its mount)
 *  - `stretch`: a spring (the cord elongating when pulled down)
 * Both are driven by the same rAF loop at all times, including a tiny
 * random forcing term so it never looks like a fixed loop at rest. Drags
 * manipulate angle/stretch directly; releases hand off real velocity
 * (estimated from recent pointer samples) into the free simulation, so a
 * fast flick swings harder than a slow drag to the same position, and a
 * plain click/keyboard toggle gives a believable randomized-direction
 * kick that decays through the same physics rather than a canned curve.
 */

const ANGLE_STIFFNESS = 0.06
const ANGLE_DAMPING = 0.985
const STRETCH_STIFFNESS = 0.22
const STRETCH_DAMPING = 0.82
const AMBIENT_TORQUE = 0.01 // tiny random perturbation each frame - keeps it quietly "alive" at rest
const MAX_DRAG_ANGLE = 26 // degrees, while actively dragging sideways
const MAX_DRAG_X = 40 // px of horizontal drag mapped to MAX_DRAG_ANGLE
const MAX_PULL = 30 // px of vertical drag
const FIRE_PULL_THRESHOLD = 12 // px - pulling the cord down past this fires the toggle
const CLICK_TUG = 22 // px - the stretch a plain click/keyboard tug simulates
const FLICK_TO_ANGVEL = 10 // px/ms horizontal release velocity -> deg/frame angular velocity
const FLICK_TO_STRETCHVEL = 6 // px/ms vertical release velocity -> px/frame stretch velocity
const SETTLE_EPS = 0.02

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

  const physics = useRef({ angle: 0, angVel: 0, stretch: 0, stretchVel: 0 })
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
    const dir = Math.random() > 0.5 ? 1 : -1
    physics.current.angVel += dir * (3.2 + Math.random() * 1.4) * strength
    physics.current.stretchVel += 2.5 * strength
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
        const ambient = (Math.random() - 0.5) * AMBIENT_TORQUE
        const angAccel = -ANGLE_STIFFNESS * p.angle + ambient
        p.angVel = (p.angVel + angAccel) * ANGLE_DAMPING
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
        d.vx = (e.clientX - d.lastX) / dt
        d.vy = (e.clientY - d.lastY) / dt
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
        <defs>
          <radialGradient id="bulbGlow">
            <stop offset="0" stopColor="#ffe27a" stopOpacity=".85" />
            <stop offset="1" stopColor="#ffe27a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bulbFill" cx=".38" cy=".35" r=".75">
            <stop offset="0" stopColor="#fff6c4" />
            <stop offset="1" stopColor="#ffc83d" />
          </radialGradient>
          <linearGradient id="bulbBase" x1="0" x2="1">
            <stop offset="0" stopColor="#8d8d8d" />
            <stop offset=".45" stopColor="#d9d9d9" />
            <stop offset="1" stopColor="#7c7c7c" />
          </linearGradient>
        </defs>
        <g className="swing" ref={swingRef}>
          <circle className="glow" cx="30" cy="72" r="46" fill="url(#bulbGlow)" />
          <line className="wire" x1="30" y1="0" x2="30" y2="20" />
          <path className="cord" ref={cordRef} d="M37 26 H52 V116" />
          <rect className="hit holder" x="23" y="19" width="14" height="11" rx="2.5" />
          <g className="hit base">
            <path d="M24.5 30 H35.5 L36 46 Q36 49 33 49 H27 Q24 49 24 46 Z" fill="url(#bulbBase)" />
            <path className="ridge" d="M24.5 34.5 H35.5 M24.3 38.5 H35.7 M24.2 42.5 H35.8" />
          </g>
          <path className="hit glass" d="M25.5 48 C25.5 55 14 57 14 71 C14 84 22 92 30 92 C38 92 46 84 46 71 C46 57 34.5 55 34.5 48 Z" />
          <path className="support" d="M28.2 49 V63 M31.8 49 V63 M28.2 63 Q30 67 31.8 63" />
          <path className="shine" d="M20 70 C20 64 23 60 27.5 58.5" />
          <rect className="hit pad" x="42" y="104" width="20" height="44" fill="transparent" />
          <rect className="hit handle" ref={handleRef} x="49" y="116" width="6" height="13" rx="3" />
        </g>
      </svg>
    </button>
  )
}
