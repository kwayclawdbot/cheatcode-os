CREATE TABLE `video_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`avatarInitials` varchar(4) NOT NULL,
	`avatarColor` varchar(16) NOT NULL,
	`body` text NOT NULL,
	`replyToId` int,
	`likeCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `video_comments_id` PRIMARY KEY(`id`)
);
