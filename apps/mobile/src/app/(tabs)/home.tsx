import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { VideoView, useVideoPlayer } from 'expo-video'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { curatedPexelsVideos } from '../../config/curatedPexelsVideos'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { OpimusMenu } from '../../components/OpimusMenu'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { borderRadius, spacing } from '../../theme/spacing'

const PEXELS_KEY = process.env.EXPO_PUBLIC_PEXELS_API_KEY
const VIDEO_DURATION_MS = 8000

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

/** Pick the best file URL from a Pexels video object. */
function bestFileUrl(v: any): string | null {
  const files: any[] = v.video_files ?? []
  const hd = files.find((f: any) => f.quality === 'hd' && f.width <= 1280)
  const sd = files.find((f: any) => f.quality === 'sd')
  const best = hd ?? sd
  return best ? (best.link as string) : null
}

/** Fetch a single Pexels video by its numeric ID. Returns null on failure. */
async function fetchVideoById(id: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.pexels.com/videos/videos/${id}`, {
      headers: { Authorization: PEXELS_KEY! },
    })
    if (!res.ok) return null
    return bestFileUrl(await res.json())
  } catch {
    return null
  }
}

async function fetchPexelsVideos(countryName: string): Promise<string[]> {
  if (!PEXELS_KEY) return []

  // 1. Collect curated IDs for this country (country-specific + global, deduped)
  const countryIds = curatedPexelsVideos.byCountry[countryName] ?? []
  const globalIds = curatedPexelsVideos.global
  const curatedIds = [...new Set([...countryIds, ...globalIds])]

  // 2. Fetch curated videos by ID in parallel
  const curatedUrls = (
    await Promise.all(curatedIds.map((id) => fetchVideoById(id)))
  ).filter((url): url is string => url !== null)

  // If curated list already fills the 5-video budget, skip the search entirely
  if (curatedUrls.length >= 5) return curatedUrls.slice(0, 5)

  // 3. Fill remaining slots with Pexels search results
  const remaining = 5 - curatedUrls.length
  const query = encodeURIComponent(`${countryName} travel scenic`)
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${query}&per_page=${remaining}&orientation=portrait`,
      { headers: { Authorization: PEXELS_KEY } },
    )
    if (!res.ok) return curatedUrls
    const json = await res.json()
    const searchUrls = (json.videos ?? [])
      .flatMap((v: any) => {
        const url = bestFileUrl(v)
        return url ? [url] : []
      })
      .slice(0, remaining) as string[]

    return [...curatedUrls, ...searchUrls]
  } catch {
    return curatedUrls
  }
}

export default function HomeScreen() {
  const { session } = useAuthStore()
  const userId = session?.user?.id

  const [lastCountry, setLastCountry] = useState<{ code: string; name: string } | null>(null)
  const [videoIndex, setVideoIndex] = useState(0)

  // Load most recently searched country from storage
  useEffect(() => {
    AsyncStorage.getItem('lastSearchedCountry').then((raw) => {
      if (raw) setLastCountry(JSON.parse(raw))
    })
  }, [])

  const { data: displayName } = useQuery({
    queryKey: ['displayName', userId],
    queryFn: () => fetchDisplayName(userId!),
    enabled: !!userId,
  })

  const { data: videoUrls = [] } = useQuery({
    queryKey: ['pexelsVideos', lastCountry?.name],
    queryFn: () => fetchPexelsVideos(lastCountry!.name),
    enabled: !!lastCountry && !!PEXELS_KEY,
    staleTime: 1000 * 60 * 60, // 1 hour — don't re-fetch on every visit
  })

  const player = useVideoPlayer(null, (p) => {
    p.muted = true
    p.loop = false
  })

  // Load first video when URLs arrive
  useEffect(() => {
    if (videoUrls.length === 0) return
    setVideoIndex(0)
    player.replace({ uri: videoUrls[0] })
    player.play()
  }, [videoUrls]) // eslint-disable-line

  // Cycle through clips every VIDEO_DURATION_MS
  useEffect(() => {
    if (videoUrls.length < 2) return
    const timer = setInterval(() => {
      setVideoIndex((prev) => {
        const next = (prev + 1) % videoUrls.length
        player.replace({ uri: videoUrls[next] })
        player.play()
        return next
      })
    }, VIDEO_DURATION_MS)
    return () => clearInterval(timer)
  }, [videoUrls]) // eslint-disable-line

  // Pause when screen loses focus, resume when it regains it
  useFocusEffect(
    useCallback(() => {
      if (videoUrls.length > 0) player.play()
      return () => player.pause()
    }, [videoUrls, player]),
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header with optional video background ── */}
        <View style={styles.header}>
          {hasVideo && (
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
            />
          )}

          {/* Dark overlay — always present when video plays */}
          {hasVideo && <View style={styles.videoOverlay} />}

          {/* Top row: Opimus menu */}
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.opimusBlock}>
              <OpimusMenu tint="light" />
              <Text style={styles.tagline}>Your health travels with you.</Text>
            </View>
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>
            {getGreeting()},{'\n'}{firstName}.
          </Text>

          {/* Destination label when video is playing */}
          {hasVideo && lastCountry && (
            <Text style={styles.nowPlaying}>
              📍 {lastCountry.name}
            </Text>
          )}
        </View>

        {/* ── White content panel ── */}
        <View style={styles.body}>

          {/* Plan card */}
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

          {/* Coming soon card — compact */}
          <View style={styles.comingCard}>
            <View style={styles.comingCardInner}>
              <Text style={styles.cardIconSmall}>💊</Text>
              <View style={styles.comingCardText}>
                <Text style={styles.comingCardTitle}>
                  Reimagining health with AI and digitization
                </Text>
              </View>
              <View style={[styles.badge, styles.badgeAmber]}>
                <Text style={[styles.badgeText, styles.badgeTextAmber]}>Soon</Text>
              </View>
            </View>
          </View>

          {/* Footer note */}
          <Text style={styles.footerNote}>
            Always consult a travel health professional for personalized advice.
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

  // ── Header ──
  header: {
    height: 280,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
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
  opimusBlock: {
    alignItems: 'flex-end',
    gap: 3,
  },
  tagline: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  greeting: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 44,
  },
  nowPlaying: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },

  // ── White body ──
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

  // ── Shared card pieces ──
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardIcon: { fontSize: 36 },
  cardIconSmall: { fontSize: 22 },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { ...typography.caption, fontWeight: '700' },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeTextGreen: { color: '#2E7D32' },
  badgeAmber: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFCC80' },
  badgeTextAmber: { color: '#E65100' },
  cardBody: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },

  // ── Plan card ──
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
  planCardCta: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },

  // ── Coming soon card — compact single row ──
  comingCard: {
    backgroundColor: '#FFF9F4',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDDCBA',
  },
  comingCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  comingCardText: { flex: 1 },
  comingCardTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // ── Footer note ──
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    lineHeight: 18,
  },
})
