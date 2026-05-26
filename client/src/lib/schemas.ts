import { z } from "zod";

export const auditUrlSchema = z.object({
  url: z.string().url("Must be a valid URL").min(1, "URL is required"),
  force: z.boolean(),
});

export const keywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(100, "Keyword too long"),
  notes: z.string().optional(),
});

export const contentGenSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(100),
  targetUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const rankCheckSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  currentPosition: z.number().optional(),
});

export type AuditUrlInput = z.infer<typeof auditUrlSchema>;
export type KeywordInput = z.infer<typeof keywordSchema>;
export type ContentGenInput = z.infer<typeof contentGenSchema>;
export type RankCheckInput = z.infer<typeof rankCheckSchema>;
