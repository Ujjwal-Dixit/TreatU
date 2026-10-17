import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

const LINE = Colors.primary;
const LEAF = '#BFDDB8';
const LEAF_LIGHT = '#E3F0DF';
const SKY_LINE = '#C9CDD2';
const TINT = '#EEF6EC';

/** "TreatU — For Restaurants —" lockup (replaces the mock's FlipDine one). */
export function PartnerWordmark() {
  return (
    <View style={styles.wordmark}>
      <View style={styles.wordmarkRow}>
        <AppText style={styles.wordmarkText}>TreatU</AppText>
        <View style={styles.wordmarkDot} />
      </View>
      <View style={styles.taglineRow}>
        <View style={styles.taglineRule} />
        <AppText variant="body" style={styles.tagline}>
          For Restaurants
        </AppText>
        <View style={styles.taglineRule} />
      </View>
    </View>
  );
}

/** Line-art storefront with awning, café tables, trees and skyline. */
export function StorefrontIllustration({ width = 320 }: { width?: number }) {
  const height = width * (150 / 320);
  return (
    <Svg width={width} height={height} viewBox="0 0 320 150">
      {/* soft background blob */}
      <Path d="M70 135 C 60 70, 120 30, 175 40 C 230 50, 280 60, 285 110 C 288 130, 270 138, 250 140 Z" fill={TINT} />

      {/* clouds */}
      <Path d="M58 52 h22 a6 6 0 0 0 -8 -8 a8 8 0 0 0 -14 8 z" fill="none" stroke={SKY_LINE} strokeWidth={1.2} />
      <Path d="M130 30 h16 a5 5 0 0 0 -6 -6 a6 6 0 0 0 -10 6 z" fill="none" stroke={SKY_LINE} strokeWidth={1.2} />
      <Path d="M205 50 h16 a5 5 0 0 0 -6 -6 a6 6 0 0 0 -10 6 z" fill="none" stroke={SKY_LINE} strokeWidth={1.2} />

      {/* left building */}
      <Rect x={74} y={64} width={30} height={76} fill="none" stroke={SKY_LINE} strokeWidth={1.2} />
      <Rect x={80} y={56} width={18} height={8} fill="none" stroke={SKY_LINE} strokeWidth={1.2} />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <Rect
            key={`l${row}${col}`}
            x={79 + col * 8}
            y={72 + row * 10}
            width={4}
            height={5}
            fill="none"
            stroke={SKY_LINE}
            strokeWidth={1}
          />
        )),
      )}

      {/* right tall building */}
      <Rect x={244} y={24} width={30} height={116} fill="none" stroke={SKY_LINE} strokeWidth={1.2} />
      <Rect x={250} y={14} width={16} height={10} fill="none" stroke={SKY_LINE} strokeWidth={1.2} />
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2].map((col) => (
          <Rect
            key={`r${row}${col}`}
            x={249 + col * 8}
            y={32 + row * 12}
            width={4}
            height={6}
            fill="none"
            stroke={SKY_LINE}
            strokeWidth={1}
          />
        )),
      )}

      {/* trees */}
      <Tree x={50} />
      <Tree x={286} />

      {/* store body */}
      <Rect x={125} y={78} width={74} height={62} fill="#FFFFFF" stroke={LINE} strokeWidth={1.6} />
      {/* awning: stripes + scalloped edge */}
      <Path d="M118 70 L206 70 L199 58 L125 58 Z" fill="#FFFFFF" stroke={LINE} strokeWidth={1.6} strokeLinejoin="round" />
      <Rect x={127} y={50} width={70} height={8} rx={2} fill="#FFFFFF" stroke={LINE} strokeWidth={1.6} />
      {[0, 2, 4, 6].map((i) => (
        <Path
          key={`stripe${i}`}
          d={`M${118 + i * 11} 70 L${129 + i * 11} 70 L${125 + (i + 1) * 9.25} 58 L${125 + i * 9.25} 58 Z`}
          fill={LINE}
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Path
          key={`scallop${i}`}
          d={`M${118 + i * 11} 70 a5.5 5.5 0 0 0 11 0`}
          fill={i % 2 === 0 ? LINE : '#FFFFFF'}
          stroke={LINE}
          strokeWidth={1.4}
        />
      ))}
      {/* door + window */}
      <Rect x={134} y={104} width={20} height={36} fill="none" stroke={LINE} strokeWidth={1.4} />
      <Circle cx={150} cy={123} r={1.2} fill={LINE} />
      <Rect x={162} y={96} width={28} height={20} fill="none" stroke={LINE} strokeWidth={1.4} />

      {/* café tables + chairs */}
      <CafeSet x={96} />
      <CafeSet x={212} />

      {/* ground */}
      <Line x1={28} y1={140} x2={300} y2={140} stroke={LINE} strokeWidth={1.4} />
    </Svg>
  );
}

function Tree({ x }: { x: number }) {
  return (
    <G>
      <Path d={`M${x} 140 L${x} 108`} stroke={LINE} strokeWidth={1.2} />
      <Path
        d={`M${x} 92 c -9 0 -11 10 -9 16 c 2 6 16 6 18 0 c 2 -6 0 -16 -9 -16 z`}
        fill={LEAF}
        stroke="#9CC994"
        strokeWidth={1}
      />
      <Path d={`M${x} 118 l -5 -5 M${x} 112 l 5 -5`} stroke={LINE} strokeWidth={1} />
      <Path d={`M${x - 8} 140 a 8 3 0 0 1 16 0`} fill={LEAF_LIGHT} />
    </G>
  );
}

function CafeSet({ x }: { x: number }) {
  return (
    <G stroke={LINE} strokeWidth={1.2} fill="none">
      {/* table */}
      <Line x1={x} y1={124} x2={x + 16} y2={124} />
      <Line x1={x + 8} y1={124} x2={x + 8} y2={140} />
      {/* left chair */}
      <Path d={`M${x - 8} 114 L${x - 8} 140 M${x - 8} 128 L${x - 2} 128 L${x - 2} 140`} />
      {/* right chair */}
      <Path d={`M${x + 24} 114 L${x + 24} 140 M${x + 24} 128 L${x + 18} 128 L${x + 18} 140`} />
    </G>
  );
}

/** Scalloped green seal with a check, ringed by confetti — "Your offer is live!". */
export function SuccessBadge({ size = 220 }: { size?: number }) {
  const lobes = 12;
  const cx = 110;
  const cy = 95;
  const points = Array.from({ length: lobes * 2 }, (_, i) => {
    const angle = (Math.PI * i) / lobes - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 44;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  const confetti: { x: number; y: number; w: number; h: number; rot: number; color: string }[] = [
    { x: 40, y: 20, w: 12, h: 5, rot: 30, color: '#F5B731' },
    { x: 102, y: 2, w: 7, h: 7, rot: 45, color: '#3BA3B5' },
    { x: 165, y: 18, w: 12, h: 5, rot: -40, color: '#13A04A' },
    { x: 190, y: 62, w: 11, h: 5, rot: 20, color: '#F5B731' },
    { x: 182, y: 120, w: 10, h: 5, rot: 45, color: '#E8707A' },
    { x: 150, y: 140, w: 7, h: 5, rot: -50, color: '#F5B731' },
    { x: 54, y: 70, w: 7, h: 6, rot: -40, color: '#3BA3B5' },
    { x: 22, y: 104, w: 12, h: 5, rot: -20, color: '#3BA3B5' },
    { x: 56, y: 146, w: 7, h: 6, rot: 30, color: '#E8707A' },
  ];

  return (
    <Svg width={size} height={size * (170 / 220)} viewBox="0 0 220 170">
      {confetti.map((c, i) => (
        <Rect
          key={i}
          x={c.x}
          y={c.y}
          width={c.w}
          height={c.h}
          rx={1.5}
          fill={c.color}
          transform={`rotate(${c.rot} ${c.x + c.w / 2} ${c.y + c.h / 2})`}
        />
      ))}
      {/* sparkle */}
      <Path d="M168 90 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill="#DADFE3" />
      <Path
        d={`M${points.split(' ').join(' L')} Z`}
        fill="#118A3E"
        stroke="#118A3E"
        strokeWidth={10}
        strokeLinejoin="round"
      />
      <Path
        d={`M${cx - 18} ${cy + 1} L${cx - 5} ${cy + 14} L${cx + 20} ${cy - 12}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GoogleG({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wordmark: { alignItems: 'center', gap: Spacing.one },
  wordmarkRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wordmarkText: {
    fontSize: 54,
    lineHeight: 62,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1.5,
    color: Colors.primary,
  },
  wordmarkDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F2A93B',
    marginLeft: 2,
    marginTop: 6,
  },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  taglineRule: { width: 36, height: 1.5, backgroundColor: Colors.primary },
  tagline: { fontSize: 18, color: Colors.text },
});
