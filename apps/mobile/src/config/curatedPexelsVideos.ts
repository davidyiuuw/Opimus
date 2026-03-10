/**
 * Curated Pexels video IDs shown in the home-screen background.
 *
 * How to find an ID:
 *   1. Open any video on https://www.pexels.com/videos/
 *   2. The number in the URL is the video ID, e.g.
 *      pexels.com/video/aerial-view-of-paris-1739010  →  id: 1739010
 *
 * Structure
 * ---------
 * `byCountry`  — keyed by the country name exactly as stored in AsyncStorage
 *                ("lastSearchedCountry" → name field).  When the user's last
 *                destination matches a key here, these IDs are fetched first
 *                and prepended to any search results.
 *
 * `global`     — shown for any country that has no curated entry, again
 *                prepended before the search results.  Leave empty [] if you
 *                prefer to rely on search for unknown destinations.
 *
 * Tips
 * ----
 * - You can mix per-country and global IDs freely.
 * - Duplicate IDs across global and byCountry are deduplicated automatically.
 * - The combined list is capped at 5 videos (same limit as the search path).
 */

export const curatedPexelsVideos: {
  byCountry: Record<string, number[]>
  global: number[]
} = {
  byCountry: {
    // Example — replace / extend with real Pexels video IDs:
    // France: [1739010, 3571264],
    // Japan: [3571815, 2169880],
    // Thailand: [1658967],
  },

  // Shown for any country without a specific entry.
  // Example: global: [2169880, 3571264],
  global: [],
}
