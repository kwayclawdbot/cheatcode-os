CREATE TABLE `coach_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`tradingStyle` varchar(64),
	`yearsExperience` varchar(32),
	`specialties` json DEFAULT ('[]'),
	`bio` text,
	`socialLinks` json DEFAULT ('{}'),
	`sampleContent` text,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coach_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feed_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postType` enum('trade_idea','pnl_share','market_take','chart_post') NOT NULL,
	`body` text,
	`ticker` varchar(16),
	`direction` enum('bullish','bearish','neutral'),
	`entryPrice` float,
	`targetPrice` float,
	`stopPrice` float,
	`timeframe` varchar(32),
	`outcome` enum('open','win','loss','breakeven') DEFAULT 'open',
	`outcomePrice` float,
	`outcomeAt` timestamp,
	`pnlAmount` float,
	`pnlPercent` float,
	`screenshotUrl` text,
	`brokerVerified` boolean DEFAULT false,
	`likeCount` int NOT NULL DEFAULT 0,
	`commentCount` int NOT NULL DEFAULT 0,
	`repostCount` int NOT NULL DEFAULT 0,
	`bookmarkCount` int NOT NULL DEFAULT 0,
	`kaiScore` int,
	`kaiOneLiner` text,
	`bullishVotes` int NOT NULL DEFAULT 0,
	`bearishVotes` int NOT NULL DEFAULT 0,
	`tags` json DEFAULT ('[]'),
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feed_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ticker` varchar(16) NOT NULL,
	`direction` enum('long','short') NOT NULL,
	`entryPrice` float NOT NULL,
	`exitPrice` float,
	`stopPrice` float,
	`targetPrice` float,
	`positionSize` float,
	`pnlAmount` float,
	`pnlPercent` float,
	`outcome` enum('win','loss','breakeven','open') DEFAULT 'open',
	`setupType` varchar(64),
	`preTradeThesis` text,
	`exitReason` varchar(128),
	`postTradeReflection` text,
	`emotionalState` varchar(32),
	`ruleViolations` json DEFAULT ('[]'),
	`kaiAnalysis` text,
	`entryChartUrl` text,
	`exitChartUrl` text,
	`entryDate` timestamp,
	`exitDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learn_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pathId` varchar(64) NOT NULL,
	`lessonId` varchar(64) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`quizPassed` boolean NOT NULL DEFAULT false,
	`quizScore` int,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learn_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_streaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastLoginDate` varchar(10),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `login_streaks_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_streaks_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `post_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`parentId` int,
	`body` text NOT NULL,
	`likeCount` int NOT NULL DEFAULT 0,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`type` enum('like','bookmark','repost','bullish_vote','bearish_vote') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`handle` varchar(64),
	`bio` text,
	`avatarUrl` text,
	`bannerUrl` text,
	`assetClasses` json DEFAULT ('[]'),
	`tradingStyle` varchar(64),
	`experienceYears` varchar(32),
	`xp` int NOT NULL DEFAULT 0,
	`level` varchar(32) NOT NULL DEFAULT 'Rookie',
	`totalTrades` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`followerCount` int NOT NULL DEFAULT 0,
	`followingCount` int NOT NULL DEFAULT 0,
	`isCoach` boolean NOT NULL DEFAULT false,
	`isVerified` boolean NOT NULL DEFAULT false,
	`brokerConnected` boolean NOT NULL DEFAULT false,
	`watchlist` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `profiles_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`badge` varchar(64) NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `xp_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`refId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `xp_log_id` PRIMARY KEY(`id`)
);
