"use server";

import { getDateRange, validateArticle, formatArticle } from "@/lib/utils";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

interface FormattedArticle {
    id: string | number;
    headline: string;
    summary: string;
    url: string;
    datetime: number;
    source: string;
    image?: string;
    category?: string;
    related?: string;
}

async function fetchJSON<T>(url: string, revalidateSeconds?: number): Promise<T> {
    const options: RequestInit = revalidateSeconds
        ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
        : { cache: "no-store" };

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export async function getNews(symbols?: string[]): Promise<FormattedArticle[]> {
    try {
        if (!FINNHUB_API_KEY) {
            throw new Error("FINNHUB_API_KEY is not configured");
        }

        const { from, to } = getDateRange(5); // Last 5 days

        // If symbols exist, fetch company news
        if (symbols && symbols.length > 0) {
            const cleanedSymbols = symbols
                .map(s => s.trim().toUpperCase())
                .filter(s => s.length > 0)
                .slice(0, 10); // Limit to 10 symbols max

            if (cleanedSymbols.length === 0) {
                // Fallback to general news
                return getGeneralNews(from, to);
            }

            const allArticles: FormattedArticle[] = [];
            const maxRounds = 6;

            // Round-robin through symbols
            for (let round = 0; round < maxRounds; round++) {
                const symbolIndex = round % cleanedSymbols.length;
                const symbol = cleanedSymbols[symbolIndex];

                try {
                    const url = `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
                    const articles = await fetchJSON<RawNewsArticle[]>(url);

                    // Take one valid article from this symbol
                    const validArticle = articles.find(validateArticle);

                    if (validArticle) {
                        const formatted = formatArticle(validArticle, true, symbol, round);
                        // Check if not already added
                        if (!allArticles.some(a => a.id === formatted.id)) {
                            allArticles.push(formatted);
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching news for ${symbol}:`, error);
                    continue;
                }

                if (allArticles.length >= 6) break;
            }

            // Sort by datetime descending
            allArticles.sort((a, b) => b.datetime - a.datetime);

            // If we got articles, return them
            if (allArticles.length > 0) {
                return allArticles.slice(0, 6);
            }

            // Fallback to general news if no company news found
            return getGeneralNews(from, to);
        }

        // No symbols provided, fetch general market news
        return getGeneralNews(from, to);

    } catch (error) {
        console.error("Error in getNews:", error);
        throw new Error("Failed to fetch news");
    }
}

async function getGeneralNews(from: string, to: string): Promise<FormattedArticle[]> {
    try {
        const url = `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
        const articles = await fetchJSON<RawNewsArticle[]>(url);

        // Deduplicate by id, url, and headline
        const seen = new Set<string>();
        const uniqueArticles: FormattedArticle[] = [];

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];

            if (!validateArticle(article)) continue;

            const key = `${article.id || ''}-${article.url}-${article.headline}`;

            if (!seen.has(key)) {
                seen.add(key);
                uniqueArticles.push(formatArticle(article, false, undefined, i));
            }

            if (uniqueArticles.length >= 6) break;
        }

        return uniqueArticles;

    } catch (error) {
        console.error("Error fetching general news:", error);
        throw new Error("Failed to fetch general news");
    }
}