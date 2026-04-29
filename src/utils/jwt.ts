import jwt from "jsonwebtoken";

/**
 * JWT helper utilities
 * - createAccessToken: short-lived token used for API auth
 * - createRefreshToken: long-lived token used to obtain new access tokens
 */

const getNumberEnv = (key: string, fallback: number) => {
    const v = process.env[key];
    if (!v) return fallback;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const createAccessToken = (payload: object) => {
    const expiresIn = getNumberEnv("ACCESS_TOKEN_EXPIRES_SECONDS", 1800); // default 30m
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: `${expiresIn}s` });
};

export const createRefreshToken = (payload: object) => {
    const days = getNumberEnv("REFRESH_TOKEN_EXPIRES_DAYS", 7);
    // express cookie expects maxAge in ms when setting cookies
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: `${days}d` });
};

export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, process.env.JWT_SECRET!);
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!);
};