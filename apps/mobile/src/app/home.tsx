import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { VideoView, useVideoPlayer } from 'expo-video'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useState } from 'react'
import { curatedPexelsVideos } from '../config/curatedPexelsVideos'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { OpimusMenu } from '../components/OpimusMenu'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'
import { borderRadius, spacing } from '../theme/spacing'

const PEXELS_KEY = process.env.EXPO_PUBLIC_PEXELS_API_KEY
const VIDEO_DURATION_MS = 10000
const CROSSFADE_MS = 600
const FADE_OUT_MS = 2000
const FADE_IN_MS = 600

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

async function fetchDisplayName(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', userId)
    .single()
  return data?.display_name ?? null
}

function bestFile(v: any): string | null {
  const files: any[] = v.video_files ?? []
  const hd = files.find((f: any) => f.quality === 'hd' && f.width <= 1280)
  const sd = files.find((f: any) => f.quality === 'sd')
  return (hd ?? sd)?.link ?? null
}

async function fetchVideoById(id: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.pexels.com/videos/videos/${id}`, {
      headers: { Authorization: PEXELS_KEY! },
    })
    if (!res.ok) return null
    return bestFile(await res.json())
  } catch {
    return null
  }
}

async function fetchPexelsVideos(countryName: string): Promise<string[]> {
  if (!PEXELS_KEY) return []

  // 1. Check for curated IDs (country-specific first, then global)
  const countryIds = curatedPexelsVideos.byCountry[countryName] ?? []
  const globalIds = curatedPexelsVideos.global
  const curatedIds = [...new Set([...countryIds, ...globalIds])]

  if (curatedIds.length > 0) {
    // Fetch curated videos by ID and return them directly
    const urls = (await Promise.all(curatedIds.map(fetchVideoById)))
      .filter((url): url is string => url !== null)
    if (urls.length > 0) {
      for (let i = urls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [urls[i], urls[j]] = [urls[j], urls[i]]
      }
      return urls
    }
  }

  // 2. Fall back to search queries
  const queries = [
    `${countryName} scenic`,
    `${countryName} landscape`,
    `${countryName} nature`,
    `${countryName} travel`,
  ]
  try {
    const results = await Promise.all(
      queries.map(async (q) => {
        const res = await fetch(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=6`,
          { headers: { Authorization: PEXELS_KEY! } },
        )
        if (!res.ok) return []
        const json = await res.json()
        return (json.videos ?? []).flatMap((v: any) => {
          const link = bestFile(v)
          return link ? [link] : []
        })
      }),
    )
    const seen = new Set<string>()
    const combined: string[] = []
    for (const urls of results) {
      for (const url of urls) {
        if (!seen.has(url)) { seen.add(url); combined.push(url) }
      }
    }
    // Shuffle so each session surfaces a different mix
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]]
    }
    return combined.slice(0, 8)
  } catch {
    return []
  }
}

type Slot = 'A' | 'B'

export default function HomeScreen() {
  const { session } = useAuthStore()
  const userId = session?.user?.id
  const [lastCountry, setLastCountry] = useState<{ code: string; name: string } | null>(null)

  // ── Double-buffer players ──
  // playerA and playerB alternate: one plays, the other silently preloads the next clip.
  const playerA = useVideoPlayer(null, (p) => { p.muted = true; p.loop = false })
  const playerB = useVideoPlayer(null, (p) => { p.muted = true; p.loop = false })
  const opacityA = useRef(new Animated.Value(1)).current
  const opacityB = useRef(new Animated.Value(0)).current
  const activeSlot = useRef<Slot>('A')
  const videoIndexRef = useRef(0)

  function playerFor(slot: Slot) { return slot === 'A' ? playerA : playerB }
  function opacityFor(slot: Slot) { return slot === 'A' ? opacityA : opacityB }
  function other(slot: Slot): Slot { return slot === 'A' ? 'B' : 'A' }

  // Re-read last searched country every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('lastSearchedCountry').then((raw) => {
        if (!raw) return
        const parsed = JSON.parse(raw)
        setLastCountry((prev) => (!prev || prev.code !== parsed.code ? parsed : prev))
      })
    }, []),
  )

  const { data: displayName } = useQuery({
    queryKey: ['displayName', userId],
    queryFn: () => fetchDisplayName(userId!),
    enabled: !!userId,
  })

  const { data: videoUrls = [] } = useQuery({
    queryKey: ['pexelsVideos', lastCountry?.name],
    queryFn: () => fetchPexelsVideos(lastCountry!.name),
    enabled: !!lastCountry && !!PEXELS_KEY,
  })

  // Load first video into A, preload second into B
  useEffect(() => {
    if (videoUrls.length === 0) return
    opacityA.setValue(1)
    opacityB.setValue(0)
    activeSlot.current = 'A'
    videoIndexRef.current = 0
    playerA.loop = videoUrls.length === 1
    playerA.replace({ uri: videoUrls[0] })
    playerA.play()
    if (videoUrls.length > 1) {
      playerB.replace({ uri: videoUrls[1] })
      // Don't play — just buffer
    }
  }, [videoUrls]) // eslint-disable-line

  // Cycle: cross-fade to pre-buffered next clip, then preload the one after
  useEffect(() => {
    if (videoUrls.length <= 1) return

    const timer = setInterval(() => {
      const cur = activeSlot.current
      const curIdx = videoIndexRef.current
      const nextIdx = (curIdx + 1) % videoUrls.length
      const afterNextIdx = (nextIdx + 1) % videoUrls.length
      const next = other(cur)

      videoIndexRef.current = nextIdx
      activeSlot.current = next

      if (nextIdx === 0) {
        // ── End of all clips: fade to black, then restart ──
        Animated.parallel([
          Animated.timing(opacityA, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }),
          Animated.timing(opacityB, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }),
        ]).start(() => {
          activeSlot.current = 'A'
          videoIndexRef.current = 0
          playerA.replace({ uri: videoUrls[0] })
          playerA.play()
          Animated.timing(opacityA, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true }).start()
          opacityB.setValue(0)
          if (videoUrls.length > 1) playerB.replace({ uri: videoUrls[1] })
        })
      } else {
        // ── Normal switch: next clip was already buffered, cross-fade in ──
        playerFor(next).play()
        Animated.timing(opacityFor(next), {
          toValue: 1, duration: CROSSFADE_MS, useNativeDriver: true,
        }).start(() => {
          Animated.timing(opacityFor(cur), {
            toValue: 0, duration: 300, useNativeDriver: true,
          }).start(() => {
            // Preload the clip after next into the now-hidden slot
            playerFor(cur).replace({ uri: videoUrls[afterNextIdx] })
          })
        })
      }
    }, VIDEO_DURATION_MS)

    return () => clearInterval(timer)
  }, [videoUrls]) // eslint-disable-line

  // Pause both when leaving, resume active when returning
  useFocusEffect(
    useCallback(() => {
      if (videoUrls.length > 0) playerFor(activeSlot.current).play()
      return () => { playerA.pause(); playerB.pause() }
    }, [videoUrls, playerA, playerB]), // eslint-disable-line
  )

  const resolvedName =
    displayName ??
    session?.user?.user_metadata?.full_name ??
    session?.user?.email?.split('@')[0] ??
    'there'
  const firstName = resolvedName.split(' ')[0]
  const hasVideo = videoUrls.length > 0

  return (
    <SafeAreaView
      style={[styles.safeArea, hasVideo && styles.safeAreaDark]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>

          {/* Double-buffered video layers */}
          {hasVideo && (
            <>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
                <VideoView player={playerA} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
                <VideoView player={playerB} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
              </Animated.View>
              <View style={styles.videoOverlay} />
            </>
          )}

          {/* Opimus menu */}
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.opimusBlock}>
              <OpimusMenu tint="light" />
              <Text style={styles.tagline}>carrying your health forward</Text>
            </View>
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>
            {getGreeting()},{'\n'}{firstName}.
          </Text>
        </View>

        {/* ── White content panel ── */}
        <View style={styles.body}>

          <TouchableOpacity
            style={styles.planCard}
            onPress={() => router.navigate('/(tabs)/(search)')}
            activeOpacity={0.85}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardIcon}>🌍</Text>
              <View style={[styles.badge, styles.badgeGreen]}>
                <Text style={[styles.badgeText, styles.badgeTextGreen]}>Available</Text>
              </View>
            </View>
            <Text style={styles.planCardTitle}>Plan for Vaccinations</Text>
            <Text style={styles.cardBody}>
              Find out which vaccines you need for your next destination and build your health plan before you go.
            </Text>
            <Text style={styles.planCardCta}>Get started →</Text>
          </TouchableOpacity>

          <View style={styles.comingCard}>
            <View style={styles.comingCardInner}>
              <Text style={styles.cardIconSmall}>💊</Text>
              <View style={styles.comingCardText}>
                <Text style={styles.comingCardTitle}>
                  Reimagining health with AI and digitization
                </Text>
              </View>
              <View style={[styles.badge, styles.badgeAmber]}>
                <Text style={[styles.badgeText, styles.badgeTextAmber]}>In the works</Text>
              </View>
            </View>
          </View>

          <Text style={styles.footerNote}>
            Always consult a travel health professional{'\n'}for personalized advice.
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  safeAreaDark: { backgroundColor: '#000' },
  scrollContent: { flexGrow: 1 },
  header: {
    height: 280,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 48,
    backgroundColor: colors.primary,
    justifyContent: 'flex-end',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'absolute',
    top: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
  },
  opimusBlock: { alignItems: 'flex-end', gap: 3 },
  tagline: { ...typography.caption, color: 'rgba(255,255,255,0.6)', textAlign: 'right', fontStyle: 'italic' },
  greeting: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', lineHeight: 34 },
  body: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -spacing.xl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardIcon: { fontSize: 36 },
  cardIconSmall: { fontSize: 22 },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { ...typography.caption, fontWeight: '700' },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeTextGreen: { color: '#2E7D32' },
  badgeAmber: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFCC80' },
  badgeTextAmber: { color: '#E65100' },
  cardBody: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  planCardTitle: { ...typography.h2, color: colors.textPrimary },
  planCardCta: { ...typography.bodySmall, color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
  comingCard: {
    backgroundColor: '#FFF9F4',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDDCBA',
  },
  comingCardInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  comingCardText: { flex: 1 },
  comingCardTitle: { ...typography.bodySmall, fontWeight: '600', color: colors.textSecondary },
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    lineHeight: 18,
  },
})
