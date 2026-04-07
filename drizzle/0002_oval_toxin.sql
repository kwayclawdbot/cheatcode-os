ALTER TABLE `coach_applications` MODIFY COLUMN `specialties` json;--> statement-breakpoint
ALTER TABLE `coach_applications` MODIFY COLUMN `socialLinks` json;--> statement-breakpoint
ALTER TABLE `feed_posts` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `journal_entries` MODIFY COLUMN `ruleViolations` json;--> statement-breakpoint
ALTER TABLE `profiles` MODIFY COLUMN `assetClasses` json;--> statement-breakpoint
ALTER TABLE `profiles` MODIFY COLUMN `watchlist` json;