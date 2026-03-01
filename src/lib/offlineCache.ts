/**
 * Offline cache utility — saves/loads data to localStorage
 * so the dashboard can display profile, links, and analytics without internet.
 */

const KEYS = {
    profile: "linkhub_profile",
    links: "linkhub_links",
    analytics: "linkhub_analytics",
} as const;

// ── Profile ──────────────────────────────────────────────

export function cacheProfile(profile: unknown) {
    try {
        localStorage.setItem(KEYS.profile, JSON.stringify(profile));
    } catch {
        // Storage full or unavailable — silently ignore
    }
}

export function getCachedProfile<T>(): T | null {
    try {
        const raw = localStorage.getItem(KEYS.profile);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

// ── Links ────────────────────────────────────────────────

export function cacheLinks(links: unknown[]) {
    try {
        localStorage.setItem(KEYS.links, JSON.stringify(links));
    } catch {
        // silently ignore
    }
}

export function getCachedLinks<T>(): T[] | null {
    try {
        const raw = localStorage.getItem(KEYS.links);
        return raw ? (JSON.parse(raw) as T[]) : null;
    } catch {
        return null;
    }
}

// ── Analytics ────────────────────────────────────────────

export interface CachedAnalytics {
    totalViews: number;
    totalClicks: number;
}

export function cacheAnalytics(analytics: CachedAnalytics) {
    try {
        localStorage.setItem(KEYS.analytics, JSON.stringify(analytics));
    } catch {
        // silently ignore
    }
}

export function getCachedAnalytics(): CachedAnalytics | null {
    try {
        const raw = localStorage.getItem(KEYS.analytics);
        return raw ? (JSON.parse(raw) as CachedAnalytics) : null;
    } catch {
        return null;
    }
}
