import { type ReactNode, useMemo, useState } from 'react'
import { type GestureResponderEvent, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { colors, fonts } from '@/theme/tokens'
import { linearScale, niceTicks } from './scale'

export interface ChartPoint {
  x: number
  y: number | null
}

export interface ChartSeries {
  id: string
  color: string
  points: ChartPoint[]
  strokeWidth?: number
  opacity?: number
  dashed?: boolean
  /** Optional per-point markers (e.g. tyre compound). */
  markers?: Array<{ x: number; y: number; color: string; hollow?: boolean }>
}

interface LineChartProps {
  series: ChartSeries[]
  height?: number
  yDomain?: [number, number]
  yTicks?: number[]
  invertY?: boolean
  yFormat?: (value: number) => string
  xFormat?: (value: number) => string
  /** Horizontal reference line, e.g. 0 for a gap chart. */
  baseline?: number
  /** Shaded vertical bands, e.g. pit laps. */
  bands?: Array<{ from: number; to: number; color: string }>
  renderInspector?: (x: number) => ReactNode
  emptyLabel?: string
}

const PADDING = { top: 12, right: 16, bottom: 28, left: 64 }

/**
 * Responsive SVG line chart for web and native.
 * Drag / tap on the plot to inspect a lap (responder system works on both).
 */
export function LineChart({
  series,
  height = 280,
  yDomain,
  yTicks,
  invertY = false,
  yFormat = (v) => v.toFixed(1),
  xFormat = (v) => String(v),
  baseline,
  bands = [],
  renderInspector,
  emptyLabel = 'Pas de données',
}: LineChartProps) {
  const [width, setWidth] = useState(0)
  const [activeX, setActiveX] = useState<number | null>(null)

  const geometry = useMemo(() => {
    const xs = series.flatMap((s) => s.points.map((p) => p.x))
    const ys = series.flatMap((s) => s.points.flatMap((p) => (p.y === null ? [] : [p.y])))
    if (xs.length === 0 || ys.length === 0 || width === 0) return null
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    let [yMin, yMax] = yDomain ?? [Math.min(...ys), Math.max(...ys)]
    if (!yDomain) {
      const pad = (yMax - yMin) * 0.08 || 1
      yMin -= pad
      yMax += pad
    }
    const plotW = width - PADDING.left - PADDING.right
    const plotH = height - PADDING.top - PADDING.bottom
    const sx = linearScale([xMin, xMax], [PADDING.left, PADDING.left + plotW])
    const sy = linearScale(
      [yMin, yMax],
      invertY ? [PADDING.top, PADDING.top + plotH] : [PADDING.top + plotH, PADDING.top],
    )
    return { xMin, xMax, yMin, yMax, plotW, plotH, sx, sy }
  }, [series, width, height, yDomain, invertY])

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)

  const inspect = (event: GestureResponderEvent) => {
    if (!geometry) return
    const { locationX } = event.nativeEvent
    const ratio = (locationX - PADDING.left) / geometry.plotW
    const x = Math.round(geometry.xMin + ratio * (geometry.xMax - geometry.xMin))
    setActiveX(Math.min(geometry.xMax, Math.max(geometry.xMin, x)))
  }

  if (series.every((s) => s.points.every((p) => p.y === null))) {
    return <Text style={styles.empty}>{emptyLabel}</Text>
  }

  return (
    <View>
      <View
        onLayout={onLayout}
        style={{ height }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={inspect}
        onResponderMove={inspect}
      >
        {geometry ? (
          <Svg width={width} height={height}>
            <Defs>
              <ClipPath id="plot">
                <Rect x={PADDING.left} y={PADDING.top} width={geometry.plotW} height={geometry.plotH} />
              </ClipPath>
            </Defs>

            {bands.map((band) => (
              <Rect
                key={`${band.from}-${band.to}`}
                x={geometry.sx(band.from - 0.5)}
                y={PADDING.top}
                width={Math.max(2, geometry.sx(band.to + 0.5) - geometry.sx(band.from - 0.5))}
                height={geometry.plotH}
                fill={band.color}
              />
            ))}

            {(yTicks ?? niceTicks(geometry.yMin, geometry.yMax, 5)).map((tick) => (
              <G key={`y-${tick}`}>
                <Line
                  x1={PADDING.left}
                  x2={PADDING.left + geometry.plotW}
                  y1={geometry.sy(tick)}
                  y2={geometry.sy(tick)}
                  stroke={colors.grid}
                  strokeWidth={1}
                />
                <SvgText
                  x={PADDING.left - 8}
                  y={geometry.sy(tick) + 4}
                  fill={colors.textDim}
                  fontSize={11}
                  fontFamily={fonts.mono}
                  textAnchor="end"
                >
                  {yFormat(tick)}
                </SvgText>
              </G>
            ))}

            {niceTicks(geometry.xMin, geometry.xMax, Math.max(2, Math.floor(geometry.plotW / 70))).map(
              (tick) => (
                <SvgText
                  key={`x-${tick}`}
                  x={geometry.sx(tick)}
                  y={height - 8}
                  fill={colors.textDim}
                  fontSize={11}
                  fontFamily={fonts.mono}
                  textAnchor="middle"
                >
                  {xFormat(tick)}
                </SvgText>
              ),
            )}

            {baseline !== undefined && baseline >= geometry.yMin && baseline <= geometry.yMax ? (
              <Line
                x1={PADDING.left}
                x2={PADDING.left + geometry.plotW}
                y1={geometry.sy(baseline)}
                y2={geometry.sy(baseline)}
                stroke={colors.borderStrong}
                strokeWidth={1.5}
              />
            ) : null}

            <G clipPath="url(#plot)">
              {series.map((s) => (
                <G key={s.id} opacity={s.opacity ?? 1}>
                  <Path
                    d={toPath(s.points, geometry.sx, geometry.sy)}
                    stroke={s.color}
                    strokeWidth={s.strokeWidth ?? 2}
                    strokeDasharray={s.dashed ? '6 4' : undefined}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {s.markers?.map((m) => (
                    <Circle
                      key={`${s.id}-${m.x}`}
                      cx={geometry.sx(m.x)}
                      cy={geometry.sy(m.y)}
                      r={3.2}
                      fill={m.hollow ? colors.bg : m.color}
                      stroke={m.color}
                      strokeWidth={1.5}
                    />
                  ))}
                </G>
              ))}
            </G>

            {activeX !== null ? (
              <Line
                x1={geometry.sx(activeX)}
                x2={geometry.sx(activeX)}
                y1={PADDING.top}
                y2={PADDING.top + geometry.plotH}
                stroke={colors.textMuted}
                strokeDasharray="3 3"
              />
            ) : null}
          </Svg>
        ) : null}
      </View>
      {renderInspector ? (
        <View style={styles.inspector}>
          {activeX !== null ? (
            renderInspector(activeX)
          ) : (
            <Text style={styles.hint}>Glissez sur le graphique pour inspecter un tour</Text>
          )}
        </View>
      ) : null}
    </View>
  )
}

/** Builds an SVG path, breaking the line where data is missing. */
function toPath(points: ChartPoint[], sx: (v: number) => number, sy: (v: number) => number): string {
  let d = ''
  let penDown = false
  for (const point of [...points].sort((a, b) => a.x - b.x)) {
    if (point.y === null) {
      penDown = false
      continue
    }
    d += `${penDown ? 'L' : 'M'}${sx(point.x).toFixed(1)},${sy(point.y).toFixed(1)}`
    penDown = true
  }
  return d
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontFamily: fonts.body, padding: 24, textAlign: 'center' },
  inspector: {
    minHeight: 28,
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  hint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
})
