import { z } from "zod";

export const joinWaitlistSchema = z.object({
  email: z.string().email("A valid email address is required"),
});

export type JoinWaitlistBody = z.infer<typeof joinWaitlistSchema>;
