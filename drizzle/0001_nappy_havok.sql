CREATE TABLE `audioEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`storageKey` varchar(512),
	`mimeType` varchar(100),
	`byteSize` int,
	`sha256` varchar(64),
	`encryptionMetadata` json,
	`tamperStatus` enum('not_checked','match','mismatch','unavailable') NOT NULL DEFAULT 'not_checked',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audioEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`actorLabel` varchar(120) NOT NULL,
	`actorRole` enum('citizen','constable','system') NOT NULL,
	`eventType` enum('created','transcribed','drafted','citizen_confirmed','field_corrected','returned','verified','evidence_checked') NOT NULL,
	`fieldKey` varchar(80),
	`previousValue` text,
	`newValue` text,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bnsReferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionCode` varchar(40) NOT NULL,
	`title` varchar(240) NOT NULL,
	`summary` text NOT NULL,
	`sourceLabel` varchar(255) NOT NULL,
	`verificationStatus` enum('demo_only','unverified','verified') NOT NULL DEFAULT 'demo_only',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bnsReferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `bnsReferences_sectionCode_unique` UNIQUE(`sectionCode`)
);
--> statement-breakpoint
CREATE TABLE `complaintFields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`fieldKey` varchar(80) NOT NULL,
	`label` varchar(160) NOT NULL,
	`value` text NOT NULL,
	`source` enum('source_statement','assistant_draft','officer_correction') NOT NULL,
	`confidence` enum('high','medium','low','manual') NOT NULL,
	`verificationState` enum('unverified','citizen_confirmed','officer_verified') NOT NULL DEFAULT 'unverified',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaintFields_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaint_fields_unique` UNIQUE(`complaintId`,`fieldKey`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`language` enum('en','hi','gu') NOT NULL,
	`status` enum('draft','needs_citizen_confirmation','ready_for_review','returned','verified') NOT NULL DEFAULT 'draft',
	`consentAt` timestamp,
	`citizenConfirmedAt` timestamp,
	`sourceTranscript` text NOT NULL,
	`draftJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaints_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE INDEX `audio_evidence_complaint_idx` ON `audioEvidence` (`complaintId`);--> statement-breakpoint
CREATE INDEX `audit_events_complaint_idx` ON `auditEvents` (`complaintId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `complaint_fields_complaint_idx` ON `complaintFields` (`complaintId`);--> statement-breakpoint
CREATE INDEX `complaints_status_idx` ON `complaints` (`status`);--> statement-breakpoint
CREATE INDEX `complaints_created_idx` ON `complaints` (`createdAt`);