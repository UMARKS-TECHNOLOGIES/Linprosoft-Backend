import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/environment";
import { randomUUID } from "crypto";

/**
 * JWT helper utilities
 * - generateAccessToken: short-lived token used for API auth
 * - generateRefreshToken: long-lived token used to obtain new access tokens
 * - verifyToken: verifies a token (works for both access and refresh tokens)
 */

/**
 * Generate access token (short-lived)
 * @param payload - JWT payload
 * @returns Signed JWT token
 */
export const generateAccessToken = (payload: object) => {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.ACCESS_TOKEN_EXPIRES_SECONDS}s` });
};

/**
 * Generate refresh token (long-lived)
 * @param payload - JWT payload (typically { id, email, role })
 * @returns Promise that resolves to signed JWT token
 */
export const generateRefreshToken = async (payload: object) => {
    // Add JWT ID (jti) and issued at (iat) fields
    const tokenId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload = {
        ...payload,
        jti: tokenId,
        iat: now
    };

    return new Promise<string>((resolve, reject) => {
        jwt.sign(
            tokenPayload,
            env.REFRESH_TOKEN_SECRET,
            { expiresIn: `${env.REFRESH_TOKEN_EXPIRES_DAYS}d` },
            (err, token) => {
                if (err) reject(err);
                else resolve(token);
            }
        );
    });
};

/**
 * Verify token
 * @param token - JWT token to verify
 * @param secret - Secret to verify with (defaults to JWT_SECRET)
 * @returns Decoded payload if valid
 */
export const verifyToken = (token: string, secret: string = env.JWT_SECRET): string | JwtPayload => {
    return jwt.verify(token, secret);
};

// Keep the original functions for backward compatibility
export const createAccessToken = generateAccessToken;
export const createRefreshToken = generateRefreshToken;
export const verifyAccessToken = (token: string) => verifyToken(token, env.JWT_SECRET);
export const verifyRefreshToken = (token: string) => verifyToken(token, env.REFRESH_TOKEN_SECRET);