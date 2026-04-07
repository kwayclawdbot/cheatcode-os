CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`avatarInitials` varchar(4) NOT NULL,
	`avatarColor` varchar(16) NOT NULL,
	`badge` varchar(32),
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
