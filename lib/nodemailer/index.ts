import nodemailer from "nodemailer";
import { WELCOME_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE } from "@/lib/nodemailer/templates";

interface WelcomeEmailData {
    email: string;
    name: string;
    intro: string;
}

// Use your existing environment variable
const BASE_URL = process.env.better_auth_url || "https://signalist.app";

// Helper function to apply URL replacements
function applyUrlReplacements(template: string) {
    return template
        .replaceAll("https://stock-market-dev.vercel.app/", `${BASE_URL}/`)
        .replaceAll("https://stock-market-dev.vercel.app", `${BASE_URL}`)
        .replaceAll("https://signalist.app/", `${BASE_URL}/`)
        .replaceAll("https://signalist.app", `${BASE_URL}`)
        .replaceAll('href="/"', `href="${BASE_URL}/"`);
}

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    },
});

export const sendWelcomeEmail = async (
    { email, name, intro }: WelcomeEmailData
) => {
    // First replace content placeholders (using replaceAll instead of replace)
    let htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replaceAll("{{name}}", name)
        .replaceAll("{{intro}}", intro);
    
    // Then apply URL replacements
    htmlTemplate = applyUrlReplacements(htmlTemplate);

    const mailOptions = {
        from: `"Signalist" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject: `Welcome to Signalist - your stock market toolkit is ready`,
        text: "Thanks for joining Signalist",
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
};

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
) => {
    // First replace content placeholders (using replaceAll instead of replace)
    let htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replaceAll("{{date}}", date)
        .replaceAll("{{newsContent}}", newsContent);
    
    // Then apply URL replacements
    htmlTemplate = applyUrlReplacements(htmlTemplate);

    const mailOptions = {
        from: `"Signalist News" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject: `Market News Summary Today - ${date}`,
        text: "Today's market news summary from Signalist",
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
};
