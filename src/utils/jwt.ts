import jwt from "jsonwebtoken";
import { env } from "../config/environment";

/**
 * JWT helper utilities
 * - createAccessToken: short-lived token used for API auth
 * - createRefreshToken: long-lived token used to obtain new access tokens
 */

export const createAccessToken = (payload: object) => {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.ACCESS_TOKEN_EXPIRES_SECONDS}s` });
};

export const createRefreshToken = (payload: object) => {
    // express cookie expects maxAge in ms when setting cookies
    return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: `${env.REFRESH_TOKEN_EXPIRES_DAYS}d` });
};

export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, env.JWT_SECRET);
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
};
