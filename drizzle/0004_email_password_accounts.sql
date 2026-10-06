ALTER TABLE `users` MODIFY COLUMN `role` enum('user','buyer','seller','admin') NOT NULL DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255) NULL AFTER `loginMethod`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
