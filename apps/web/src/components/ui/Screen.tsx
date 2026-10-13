import { Link } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, maxContentWidth, space } from '@/theme/tokens'

export interface Crumb {
  label: string
  href?: string
}

/** Page shell: sticky top bar with breadcrumbs, centred content column. */
export function Screen({ children, crumbs = [] }: { children: ReactNode; crumbs?: Crumb[] }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + space.md }]}>
        <View style={styles.topBarInner}>
          <Link href="/" asChild>
            <Pressable accessibilityRole="link" style={styles.brand}>
              <View style={styles.logo}>
                <View style={styles.logoStripe} />
              </View>
              <Text style={styles.brandText}>PITWALL</Text>
            </Pressable>
          </Link>
          <View style={styles.crumbs}>
            {crumbs.map((crumb) => (
              <View key={`${crumb.href ?? 'current'}-${crumb.label}`} style={styles.crumbItem}>
                <Text style={styles.crumbSeparator}>/</Text>
                {crumb.href ? (
                  <Link href={crumb.href as never} style={styles.crumbLink}>
                    {crumb.label}
                  </Link>
                ) : (
                  <Text style={styles.crumbCurrent} numberOfLines={1}>
                    {crumb.label}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxxl }]}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(11, 13, 18, 0.92)',
    paddingBottom: space.md,
    paddingHorizontal: space.lg,
  },
  topBarInner: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.accent,
    overflow: 'hidden',
    transform: [{ skewX: '-12deg' }],
  },
  logoStripe: { position: 'absolute', right: 5, top: 0, bottom: 0, width: 4, backgroundColor: colors.text },
  brandText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 3,
  },
  crumbs: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, flexWrap: 'wrap' },
  crumbItem: { flexDirection: 'row', alignItems: 'center' },
  crumbSeparator: { color: colors.textDim, marginHorizontal: space.sm, fontFamily: fonts.body },
  crumbLink: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  crumbCurrent: { color: colors.text, fontFamily: fonts.body, fontSize: 14, fontWeight: '600' },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.xl },
  content: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', gap: space.xl },
})
