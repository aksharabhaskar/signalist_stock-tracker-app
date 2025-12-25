import {inngest} from "@/lib/inngest/client";
import {NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT} from "@/lib/inngest/prompts";
import {sendNewsSummaryEmail, sendWelcomeEmail} from "@/lib/nodemailer";
import {getAllUsersForNewsEmail} from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";

// Type definitions
type UserForNewsEmail = {
    id: string;
    email: string;
    name: string;
};

type MarketNewsArticle = {
    headline: string;
    summary?: string;
    description?: string;
    url: string;
    [key: string]: any;
};

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created'},
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.openai({ model: 'gpt-4o-mini' }),
            body: {
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            }
        } as any)

        await step.run('send-welcome-email', async () => {
            const message = response.choices?.[0]?.message?.content;
            const introText = message || 'Thanks for joining Signalist. You now have the tools to track markets and make smarter moves.'

            const { data: { email, name } } = event;

            return await sendWelcomeEmail({ email, name, intro: introText });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary' },
    [ { event: 'app/send.daily.summary' }, { cron: '*/2 * * * *' } ],
    async ({ step }) => {
        // Step #1: Get all users for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsEmail)

        if(!users || users.length === 0) return { success: false, message: 'No users found for news email' };

        // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
        const results = await step.run('fetch-user-news', async () => {
            const perUser: Array<{ user: UserForNewsEmail; articles: MarketNewsArticle[] }> = [];
            for (const user of users as UserForNewsEmail[]) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let articles = await getNews(symbols);
                    // Enforce max 2 articles per user (reduced to fit token limit)
                    articles = (articles || []).slice(0, 2);
                    // If still empty, fallback to general
                    if (!articles || articles.length === 0) {
                        articles = await getNews();
                        articles = (articles || []).slice(0, 2);
                    }
                    perUser.push({ user, articles });
                } catch (e) {
                    console.error('daily-news: error preparing user news', user.email, e);
                    perUser.push({ user, articles: [] });
                }
            }
            return perUser;
        });

        // Step #3: Summarize news via AI - PARALLELIZED with minimal data
        const summaryPromises = results.map(async ({ user, articles }) => {
            if (!articles || articles.length === 0) {
                console.log(`No articles for ${user.email}, skipping`);
                return null;
            }

            try {
                // CRITICAL: Only send minimal data - just headlines and URLs
                const minimalArticles = articles.map(a => ({
                    headline: a.headline,
                    url: a.url
                }));

                console.log(`Summarizing for ${user.email}, ${articles.length} articles`);

                const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(minimalArticles));

                const response = await step.ai.infer(`summarize-news-${user.email}`, {
                    model: step.ai.models.openai({ model: 'gpt-4o-mini' }),
                    body: {
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        max_tokens: 2048,
                        temperature: 0.7
                    }
                } as any);

                const newsContent = response.choices?.[0]?.message?.content || 'No market news.';

                console.log(`✅ Successfully summarized for ${user.email}`);
                return { user, newsContent };
            } catch (e) {
                const error = e as any;
                console.error(`❌ Failed to summarize for ${user.email}:`);
                console.error('Error message:', error?.message);
                console.error('Error name:', error?.name);
                console.error('Full error:', JSON.stringify(error, null, 2));
                console.error('Prompt length:', prompt.length);
                console.error('Articles count:', articles.length);
                // Fallback: simple list
                const fallback = articles.map(a =>
                    `<div style="margin: 15px 0; padding: 15px; background: #212328; border-radius: 8px;">
                        <strong style="color: #FDD458;">${a.headline}</strong><br>
                        <a href="${a.url}" style="color: #FDD458; font-size: 14px;">Read more →</a>
                    </div>`
                ).join('');
                return { user, newsContent: fallback };
            }
        });

        const userNewsSummaries = (await Promise.all(summaryPromises))
            .filter(Boolean) as { user: UserForNewsEmail; newsContent: string }[];

        // Step #4: Send the emails
        await step.run('send-news-emails', async () => {
            await Promise.all(
                userNewsSummaries.map(async ({ user, newsContent}) => {
                    if(!newsContent) return false;

                    try {
                        await sendNewsSummaryEmail({
                            email: user.email,
                            date: getFormattedTodayDate(),
                            newsContent
                        });
                        console.log(`📧 Sent email to ${user.email}`);
                        return true;
                    } catch (error) {
                        console.error(`Failed to send email to ${user.email}:`, error);
                        return false;
                    }
                })
            )
        })

        return { success: true, message: `Daily news summary sent to ${userNewsSummaries.length} users` }
    }
)