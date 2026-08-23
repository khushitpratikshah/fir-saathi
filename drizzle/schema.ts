import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import type { StructuredDraft } from "../shared/firSaathi";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 32 }).notNull().unique(),
  language: mysqlEnum("language", ["en", "hi", "gu"]).notNull(),
  status: mysqlEnum("status", ["draft", "needs_citizen_confirmation", "ready_for_review", "returned", "verified"]).default("draft").notNull(),
  consentAt: timestamp("consentAt"),
  citizenConfirmedAt: timestamp("citizenConfirmedAt"),
  sourceTranscript: text("sourceTranscript").notNull(),
  draftJson: json("draftJson").$type<StructuredDraft>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("complaints_status_idx").on(table.status), index("complaints_created_idx").on(table.createdAt)]);

export const complaintFields = mysqlTable("complaintFields", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  fieldKey: varchar("fieldKey", { length: 80 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  value: text("value").notNull(),
  source: mysqlEnum("source", ["source_statement", "assistant_draft", "officer_correction"]).notNull(),
  confidence: mysqlEnum("confidence", ["high", "medium", "low", "manual"]).notNull(),
  verificationState: mysqlEnum("verificationState", ["unverified", "citizen_confirmed", "officer_verified"]).default("unverified").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("complaint_fields_unique").on(table.complaintId, table.fieldKey), index("complaint_fields_complaint_idx").on(table.complaintId)]);

export const audioEvidence = mysqlTable("audioEvidence", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  mimeType: varchar("mimeType", { length: 100 }),
  byteSize: int("byteSize"),
  sha256: varchar("sha256", { length: 64 }),
  encryptionMetadata: json("encryptionMetadata").$type<{ algorithm?: string; iv?: string; encrypted?: boolean }>(),
  tamperStatus: mysqlEnum("tamperStatus", ["not_checked", "match", "mismatch", "unavailable"]).default("not_checked").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audio_evidence_complaint_idx").on(table.complaintId)]);

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  actorLabel: varchar("actorLabel", { length: 120 }).notNull(),
  actorRole: mysqlEnum("actorRole", ["citizen", "constable", "system"]).notNull(),
  eventType: mysqlEnum("eventType", ["created", "transcribed", "drafted", "citizen_confirmed", "field_corrected", "returned", "verified", "evidence_checked"]).notNull(),
  fieldKey: varchar("fieldKey", { length: 80 }),
  previousValue: text("previousValue"),
  newValue: text("newValue"),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_events_complaint_idx").on(table.complaintId, table.createdAt)]);

export const bnsReferences = mysqlTable("bnsReferences", {
  id: int("id").autoincrement().primaryKey(),
  sectionCode: varchar("sectionCode", { length: 40 }).notNull().unique(),
  title: varchar("title", { length: 240 }).notNull(),
  summary: text("summary").notNull(),
  sourceLabel: varchar("sourceLabel", { length: 255 }).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["demo_only", "unverified", "verified"]).default("demo_only").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Complaint = typeof complaints.$inferSelect;
