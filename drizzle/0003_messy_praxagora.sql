CREATE TABLE `orderEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderStatus` enum('pending','confirmed','packing','shipping','completed','cancelled','refunded') NOT NULL,
	`paymentStatus` enum('pending','paid','failed','refunded') NOT NULL,
	`message` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`provider` enum('vnpay','momo') NOT NULL,
	`providerOrderId` varchar(100) NOT NULL,
	`providerTransactionId` varchar(120),
	`amount` int NOT NULL,
	`status` enum('created','pending','paid','failed','refunded') NOT NULL DEFAULT 'created',
	`responseCode` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`paidAt` timestamp,
	CONSTRAINT `paymentTransactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_provider_order_unique` UNIQUE(`provider`,`providerOrderId`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` enum('cod','manual','vnpay','momo','stripe') NOT NULL DEFAULT 'cod';--> statement-breakpoint
CREATE INDEX `order_events_order_time_idx` ON `orderEvents` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_order_idx` ON `paymentTransactions` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_status_idx` ON `paymentTransactions` (`status`,`createdAt`);