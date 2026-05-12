import './FloorPlan.css'

export const LANE_PAIRS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11]]

const PAIR_GROUPS = [
  { id: 'C', pairs: [[1, 2], [3, 4]] },
  { id: 'B', pairs: [[5, 6], [7, 8]] },
  { id: 'A', pairs: [[9, 10], [11]] },
]

const LANE_H = 22
const CANAL_H = 3
const SINGLE_LANE_H = LANE_H + CANAL_H * 2
const BALL_RETURN_H = 10
const PAIR_GAP = 16
const GROUP_GAP = 28
const MESA_W = 48
const APPROACH_W = 60
const PISTA_W = 200
const PIN_MACHINE_W = 40
const TOTAL_LANE_W = MESA_W + APPROACH_W + PISTA_W + PIN_MACHINE_W
const AMENITIES_W = 130
const LANES_START_X = AMENITIES_W + 16
const LANES_START_Y = 20
const BOTTOM_AREA_H = 46

function computeLanePositions() {
  const pos = {}
  let y = LANES_START_Y
  PAIR_GROUPS.forEach((group, gi) => {
    if (gi > 0) y += GROUP_GAP
    group.pairs.forEach((pair, pi) => {
      if (pi > 0) y += PAIR_GAP
      pair.forEach((lane, li) => {
        if (li > 0) y += BALL_RETURN_H
        pos[lane] = y
        y += SINGLE_LANE_H
      })
    })
  })
  return pos
}

const POS = computeLanePositions()

const GROUP_RANGES = PAIR_GROUPS.map(group => {
  const allLanes = group.pairs.flat()
  const top = POS[allLanes[0]]
  const bottom = POS[allLanes[allLanes.length - 1]] + SINGLE_LANE_H
  return { top, bottom, height: bottom - top }
})

const TOTAL_LANES_H = POS[11] + SINGLE_LANE_H - LANES_START_Y
const SVG_W = LANES_START_X + TOTAL_LANE_W + 20
const SVG_H = LANES_START_Y + TOTAL_LANES_H + 16 + BOTTOM_AREA_H + 10
const BOTTOM_Y = LANES_START_Y + TOTAL_LANES_H + 16

export default function FloorPlan({
  selectedPistas = [],
  onTogglePista,
  blockedLanes = [],
  reservedLanes = [],
  hiddenLanes = [],
  footerHint,
  readOnly = false,
}) {

  function renderLane(laneNum) {
    if (hiddenLanes.includes(laneNum)) return null
    const y = POS[laneNum]
    const isSelected = selectedPistas.includes(laneNum)
    const isBlocked = blockedLanes.includes(laneNum)
    const isReserved = reservedLanes.includes(laneNum) && !isBlocked
    const notClickable = readOnly || isBlocked || isReserved

    const approachX = LANES_START_X + MESA_W
    const pistaX = approachX + APPROACH_W
    const pinX = pistaX + PISTA_W
    const canalTopY = y
    const laneBodyY = y + CANAL_H
    const canalBotY = y + CANAL_H + LANE_H

    return (
      <g
        key={laneNum}
        className={`fp-lane ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''} ${isReserved ? 'reserved' : ''}`}
        onClick={() => { if (!readOnly && !isBlocked && !isReserved) onTogglePista?.(laneNum) }}
        role="button"
        tabIndex={0}
        aria-disabled={notClickable}
        aria-label={`Pista ${laneNum}${isBlocked ? ' (bloqueada administrativamente)' : isReserved ? ' (reservada por cliente)' : ''}`}
      >
        {/* Approach */}
        <rect x={approachX} y={y} width={APPROACH_W} height={SINGLE_LANE_H} rx="1" className="fp-approach" />
        <text x={approachX + APPROACH_W / 2} y={y + SINGLE_LANE_H / 2 + 1} className="fp-approach-text">
          APROX.
        </text>

        {/* Top canal */}
        <rect x={pistaX} y={canalTopY} width={PISTA_W} height={CANAL_H} rx="0.5" className="fp-canal" />
        {/* Lane surface */}
        <rect x={pistaX} y={laneBodyY} width={PISTA_W} height={LANE_H} className="fp-pista" />
        {/* Bottom canal */}
        <rect x={pistaX} y={canalBotY} width={PISTA_W} height={CANAL_H} rx="0.5" className="fp-canal" />

        {/* Lane markings */}
        {[0.15, 0.35, 0.55, 0.75].map((pct, i) => (
          <circle key={i} cx={pistaX + PISTA_W * pct} cy={laneBodyY + LANE_H / 2} r="1.2" className="fp-lane-dot" />
        ))}

        {/* Foul line */}
        <line x1={pistaX + 2} y1={canalTopY} x2={pistaX + 2} y2={canalBotY + CANAL_H} className="fp-foul-line" />

        {/* Pin machine */}
        <rect x={pinX} y={y} width={PIN_MACHINE_W} height={SINGLE_LANE_H} rx="2" className="fp-pin-machine" />
        <g transform={`translate(${pinX + PIN_MACHINE_W / 2}, ${y + SINGLE_LANE_H / 2})`}>
          {[
            [0, -5],
            [-3, -0.5], [3, -0.5],
            [-6, 4], [0, 4], [6, 4],
          ].map(([px, py], pi) => (
            <circle key={pi} cx={px} cy={py} r="1.4" className="fp-pin-dot" />
          ))}
        </g>

        {/* PISTA label */}
        <text x={pistaX + PISTA_W / 2} y={laneBodyY + LANE_H / 2 + 1} className="fp-pista-label">
          PISTA {laneNum}
        </text>

        {/* Selection highlight */}
        {isSelected && (
          <rect
            x={approachX - 2} y={y - 2}
            width={APPROACH_W + PISTA_W + PIN_MACHINE_W + 4} height={SINGLE_LANE_H + 4}
            className="fp-selection-glow" rx="3"
          />
        )}

        {/* Selection badge */}
        {isSelected && (
          <g transform={`translate(${pistaX + PISTA_W / 2}, ${laneBodyY + LANE_H / 2})`}>
            <circle r="9" className="fp-sel-badge" />
            <text className="fp-sel-badge-text" dy="1">{laneNum}</text>
          </g>
        )}
      </g>
    )
  }

  function renderPairMesa(pair) {
    const firstY = POS[pair[0]]
    const lastY = POS[pair[pair.length - 1]]
    const topY = firstY - 1
    const height = (lastY + SINGLE_LANE_H) - firstY + 2
    const centerY = topY + height / 2
    const cx = LANES_START_X + (MESA_W - 2) / 2
    const anySelected = pair.some(l => selectedPistas.includes(l))

    return (
      <g key={`mesa-${pair[0]}`} className={`fp-pair-mesa ${anySelected ? 'selected' : ''}`}>
        <rect x={LANES_START_X} y={topY} width={MESA_W - 2} height={height} rx="4" className="fp-mesa" />
        {pair.length === 2 ? (
          <>
            <text x={cx} y={centerY - 13} className="fp-mesa-num">{pair[0]}</text>
            <line x1={LANES_START_X + 8} y1={centerY - 4} x2={LANES_START_X + MESA_W - 10} y2={centerY - 4} className="fp-mesa-divider" />
            <text x={cx} y={centerY + 2} className="fp-mesa-label">MESA</text>
            <line x1={LANES_START_X + 8} y1={centerY + 7} x2={LANES_START_X + MESA_W - 10} y2={centerY + 7} className="fp-mesa-divider" />
            <text x={cx} y={centerY + 18} className="fp-mesa-num">{pair[1]}</text>
          </>
        ) : (
          <>
            <text x={cx} y={centerY - 2} className="fp-mesa-num">{pair[0]}</text>
            <text x={cx} y={centerY + 9} className="fp-mesa-label">Mesa</text>
          </>
        )}
      </g>
    )
  }

  function renderBallReturn(pair) {
    if (pair.length < 2) return null
    const y = POS[pair[0]] + SINGLE_LANE_H
    const x = LANES_START_X + MESA_W
    const w = APPROACH_W + PISTA_W + PIN_MACHINE_W
    const boxW = 56
    const boxH = BALL_RETURN_H - 2
    const boxX = x + 4
    const boxY = y + 1

    return (
      <g key={`return-${pair[0]}`} className="fp-ball-return-group">
        <rect x={x} y={y} width={w} height={BALL_RETURN_H} rx="1" className="fp-ball-return" />
        {/* Cuadro de retorno con bolas */}
        <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="3" className="fp-return-box" />
        <circle cx={boxX + 12} cy={y + BALL_RETURN_H / 2} r="3" className="fp-return-ball" />
        <circle cx={boxX + 24} cy={y + BALL_RETURN_H / 2} r="3" className="fp-return-ball" />
        <text x={boxX + 40} y={y + BALL_RETURN_H / 2 + 1} className="fp-return-box-label">RET.</text>
        {/* Texto central */}
        <text x={x + w / 2} y={y + BALL_RETURN_H / 2 + 1} className="fp-return-label">RETORNO DE BOLAS</text>
      </g>
    )
  }

  const sep1Y = (GROUP_RANGES[0].bottom + GROUP_RANGES[1].top) / 2
  const sep2Y = (GROUP_RANGES[1].bottom + GROUP_RANGES[2].top) / 2

  return (
    <div className={`fp-wrapper${readOnly ? ' fp-wrapper-readonly' : ''}`}>
      <div className="fp-legend">
        <span className="fp-legend-item">
          <span className="fp-legend-dot fp-legend-available" />
          Disponible
        </span>
        {!readOnly && (
          <span className="fp-legend-item">
            <span className="fp-legend-dot fp-legend-selected" />
            Seleccionada
          </span>
        )}
        {(blockedLanes.length > 0 || readOnly) && (
          <span className="fp-legend-item">
            <span className="fp-legend-dot fp-legend-blocked" />
            Bloqueada (admin)
          </span>
        )}
        {(reservedLanes.length > 0 || readOnly) && (
          <span className="fp-legend-item">
            <span className="fp-legend-dot fp-legend-reserved" />
            Reservada / apartada
          </span>
        )}
      </div>

      <div className="fp-scroll">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="fp-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="selGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="woodH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5a4020" />
              <stop offset="30%" stopColor="#6b4c28" />
              <stop offset="70%" stopColor="#5e4222" />
              <stop offset="100%" stopColor="#4d3518" />
            </linearGradient>
            <linearGradient id="woodSelH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7a3525" />
              <stop offset="50%" stopColor="#8a4030" />
              <stop offset="100%" stopColor="#7a3525" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width={SVG_W} height={SVG_H} rx="10" className="fp-bg" />

          {/* === LEFT SIDE AMENITIES === */}
          <rect x="10" y="10" width={AMENITIES_W - 10} height={GROUP_RANGES[0].height + 10} rx="6" className="fp-amenity-box" />
          <text x={10 + (AMENITIES_W - 10) / 2} y="26" className="fp-amenity-title">RESTAURANTE</text>
          {[0, 1, 2].map(row =>
            [0, 1].map(col => (
              <rect
                key={`t${row}${col}`}
                x={20 + col * 52}
                y={36 + row * 28}
                width={40}
                height={18}
                rx="3"
                className="fp-table"
              />
            ))
          )}

          <rect x={AMENITIES_W - 35} y="10" width="30" height={GROUP_RANGES[0].height + 10} rx="4" className="fp-amenity-box fp-banos" />
          <text
            x={AMENITIES_W - 20}
            y={10 + (GROUP_RANGES[0].height + 10) / 2}
            className="fp-amenity-vert"
            transform={`rotate(-90, ${AMENITIES_W - 20}, ${10 + (GROUP_RANGES[0].height + 10) / 2})`}
          >
            BAÑOS
          </text>

          <g>
            <rect x="16" y={GROUP_RANGES[1].top - 4} width={AMENITIES_W - 28} height={GROUP_RANGES[1].height + 8} rx="6" className="fp-amenity-box" />
            <ellipse
              cx={16 + (AMENITIES_W - 28) / 2}
              cy={GROUP_RANGES[1].top + GROUP_RANGES[1].height / 2}
              rx="38"
              ry="22"
              className="fp-isla"
            />
            <text x={16 + (AMENITIES_W - 28) / 2} y={GROUP_RANGES[1].top + GROUP_RANGES[1].height / 2 - 4} className="fp-isla-text">ISLA</text>
            <text x={16 + (AMENITIES_W - 28) / 2} y={GROUP_RANGES[1].top + GROUP_RANGES[1].height / 2 + 8} className="fp-isla-text">BEBIDAS</text>
          </g>

          <g>
            <rect x="16" y={GROUP_RANGES[2].top - 4} width={AMENITIES_W - 28} height={GROUP_RANGES[2].height + 8} rx="6" className="fp-amenity-box" />
            {[0, 1, 2].map(i => (
              <rect
                key={`s${i}`}
                x="28"
                y={GROUP_RANGES[2].top + 6 + i * 34}
                width="34"
                height="20"
                rx="3"
                className="fp-table"
              />
            ))}
          </g>

          {/* === GROUP SEPARATORS === */}
          <line x1={LANES_START_X} y1={sep1Y} x2={LANES_START_X + TOTAL_LANE_W} y2={sep1Y} className="fp-separator" />
          <line x1={LANES_START_X} y1={sep2Y} x2={LANES_START_X + TOTAL_LANE_W} y2={sep2Y} className="fp-separator" />

          {/* === PAIR MESAS & BALL RETURNS === */}
          {LANE_PAIRS.map(pair => (
            <g key={`pair-${pair[0]}`}>
              {renderPairMesa(pair)}
              {renderBallReturn(pair)}
            </g>
          ))}

          {/* === LANES === */}
          {PAIR_GROUPS.map(group => group.pairs.flat().map(num => renderLane(num)))}

          {/* === PIN MACHINES LABEL === */}
          <text
            x={LANES_START_X + TOTAL_LANE_W - PIN_MACHINE_W / 2}
            y={LANES_START_Y - 6}
            className="fp-zone-label"
          >
            MÁQUINAS DE PINES
          </text>

          {/* === BOTTOM BAR === */}
          <rect x="10" y={BOTTOM_Y} width={SVG_W - 20} height={BOTTOM_AREA_H} rx="6" className="fp-bottom-bar" />
          {[
            { label: 'PUESTO DE PAGO' },
            { label: 'ZAPATOS' },
            { label: 'ESTANTERÍA' },
            { label: 'ENTRADA' },
          ].map((item, i) => {
            const itemW = (SVG_W - 40) / 4
            return (
              <g key={i}>
                <rect x={15 + i * itemW} y={BOTTOM_Y + 4} width={itemW - 6} height={BOTTOM_AREA_H - 8} rx="4" className="fp-bottom-item" />
                <text x={15 + i * itemW + (itemW - 6) / 2} y={BOTTOM_Y + BOTTOM_AREA_H / 2 + 2} className="fp-bottom-text">
                  {item.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <p className="fp-hint">
        <i className="fas fa-hand-pointer" />{' '}
        {footerHint || 'Haz clic en las pistas para seleccionarlas (puedes elegir varias)'}
      </p>
    </div>
  )
}
