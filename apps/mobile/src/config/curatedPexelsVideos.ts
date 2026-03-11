/**
 * Curated Pexels video IDs for the home-screen background.
 *
 * How to find a video ID:
 *   1. Open any video on https://www.pexels.com/videos/
 *   2. The number in the URL is the ID, e.g.
 *      pexels.com/video/aerial-view-of-costa-rica-3571264  →  id: 3571264
 *
 * Structure
 * ---------
 * `byCountry`  — keyed by the country name exactly as it appears after
 *                searching (e.g. "Costa Rica", "France", "Japan").
 *                When the user's last destination matches a key here,
 *                these videos are used instead of the search queries.
 *
 * `global`     — used for any country that has no curated entry.
 *                Leave as [] to fall back to search queries for unknown countries.
 */

export const curatedPexelsVideos: {
  byCountry: Record<string, number[]>
  global: number[]
} = {
  byCountry: {
    'Costa Rica': [7722579, 8545189, 11934554, 4280455, 8921025, 3986257, 6981342, 2932301],
  },

  // Shown for any country without a specific entry.
  // Leave empty to use search queries instead.
  global: [],
}
