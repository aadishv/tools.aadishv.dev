import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  comments: defineTable({
    slug: v.string(),
    body: v.string(),
  }).index("by_slug", ["slug"]),
});
