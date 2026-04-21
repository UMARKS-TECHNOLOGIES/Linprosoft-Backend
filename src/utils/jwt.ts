import jwt from "jsonwebtoken"

export const signToken = (payload: object) => {
    return jwt.sign(
        payload,
        process.env.JWT_SECRET!,
        { expiresIn: "30m" }
    )
}