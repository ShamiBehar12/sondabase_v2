import type { PrismaClient } from "@prisma/client";

export const tableMap = {
  avatar_templates: "avatarTemplate",
  certificate_approvals: "certificateApproval",
  certificate_rejections: "certificateRejection",
  certificates: "certificate",
  content_attachments: "contentAttachment",
  content_audit_logs: "contentAuditLog",
  content_items: "contentItem",
  content_notifications: "contentNotification",
  content_reviews: "contentReview",
  content_types: "contentType",
  professional_certificates: "professionalCertificate",
  profiles: "profile",
  success_stories: "successStory",
  success_story_approvals: "successStoryApproval",
  success_story_rejections: "successStoryRejection",
  tags: "tag",
  user_roles: "userRole",
  users: "user",
} as const;

export type TableName = keyof typeof tableMap;

export function delegateFor(prisma: PrismaClient, table: TableName) {
  return prisma[tableMap[table]];
}
