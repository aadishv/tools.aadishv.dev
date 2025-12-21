import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  addComment: { kind: "fixed window", rate: 1, period: MINUTE },
});

const secret = process.env.HCAPTCHA_SECRET;

export const getComments = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();
  },
});
export const addCommentInternal = internalMutation({
  args: { slug: v.string(), body: v.string() },
  handler: async (ctx, { slug, body }) => {
    await ctx.db.insert("comments", {
      slug,
      body: body.trim(),
    });
  },
});
export const addComment = action({
  args: { slug: v.string(), body: v.string(), token: v.string() },
  handler: async (ctx, { body, token, slug }) => {
    if (body.trim() === "") {
      return { error: "Haha nice try smh" as const };
    }
    if (body.trim().length > 200) {
      return { error: "Bro are you writing an essay?" as const };
    }
    const { ok } = await rateLimiter.limit(ctx, "addComment");
    if (!ok) {
      return { error: "Bruh are you botting, slow down bro" as const };
    }
    const payload = {
      secret,
      response: token,
    };
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload as any),
    });

    const responseData = (await response.json()) as { success: boolean };
    if (!responseData.success) {
      return { error: "You're giving robot ngl" as const };
    }
    await ctx.runMutation(internal.comments.addCommentInternal, {
      slug,
      body: body.trim(),
    });
    return null;
  },
});
