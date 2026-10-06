CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipientName` varchar(120) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`addressLine` varchar(255) NOT NULL,
	`ward` varchar(120),
	`district` varchar(120),
	`province` varchar(120) NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`action` varchar(120) NOT NULL,
	`entity` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cartItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cartId` int NOT NULL,
	`variantId` int NOT NULL,
	`quantity` int NOT NULL,
	`priceSnapshot` int NOT NULL,
	CONSTRAINT `cartItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_items_variant_unique` UNIQUE(`cartId`,`variantId`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`guestKey` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_guest_key_unique` UNIQUE(`guestKey`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`imageUrl` varchar(512),
	`parentId` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` int NOT NULL DEFAULT 1,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `couponUsages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`orderId` int NOT NULL,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `couponUsages_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_usages_order_unique` UNIQUE(`couponId`,`orderId`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`type` enum('percent','fixed') NOT NULL,
	`value` int NOT NULL,
	`minSubtotal` int NOT NULL DEFAULT 0,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`usageLimit` int,
	`usageCount` int NOT NULL DEFAULT 0,
	`active` int NOT NULL DEFAULT 1,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`variantId` int NOT NULL,
	`onHand` int NOT NULL DEFAULT 0,
	`reserved` int NOT NULL DEFAULT 0,
	`lowStockThreshold` int NOT NULL DEFAULT 3,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_variant_unique` UNIQUE(`variantId`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`variantId` int,
	`productNameSnapshot` varchar(200) NOT NULL,
	`skuSnapshot` varchar(64) NOT NULL,
	`size` varchar(16) NOT NULL,
	`color` varchar(50) NOT NULL,
	`unitPrice` int NOT NULL,
	`quantity` int NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(40) NOT NULL,
	`userId` int,
	`guestEmail` varchar(320),
	`recipientName` varchar(120) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`addressLine` varchar(255) NOT NULL,
	`ward` varchar(120),
	`district` varchar(120),
	`province` varchar(120) NOT NULL,
	`subtotal` int NOT NULL,
	`shippingFee` int NOT NULL,
	`discount` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`couponCode` varchar(64),
	`orderStatus` enum('pending','confirmed','packing','shipping','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`paymentMethod` enum('cod','manual','stripe') NOT NULL DEFAULT 'cod',
	`idempotencyKey` varchar(100) NOT NULL,
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`orderNumber`),
	CONSTRAINT `orders_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `productImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`url` varchar(512) NOT NULL,
	`alt` varchar(255) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `productImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productVariants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`sku` varchar(64) NOT NULL,
	`size` varchar(16) NOT NULL,
	`color` varchar(50) NOT NULL,
	`price` int NOT NULL,
	`compareAtPrice` int,
	`active` int NOT NULL DEFAULT 1,
	CONSTRAINT `productVariants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variants_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`name` varchar(200) NOT NULL,
	`shortDescription` varchar(500),
	`description` text,
	`brand` varchar(80) NOT NULL DEFAULT 'ShoeHub',
	`categoryId` int,
	`status` enum('active','draft','archived') NOT NULL DEFAULT 'active',
	`featured` int NOT NULL DEFAULT 0,
	`tags` text,
	`seoTitle` varchar(160),
	`seoDescription` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `addresses_user_idx` ON `addresses` (`userId`,`isDefault`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `auditLogs` (`actorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `auditLogs` (`entity`,`entityId`);--> statement-breakpoint
CREATE INDEX `carts_user_idx` ON `carts` (`userId`);--> statement-breakpoint
CREATE INDEX `categories_active_order_idx` ON `categories` (`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `coupons_active_idx` ON `coupons` (`active`,`endsAt`);--> statement-breakpoint
CREATE INDEX `inventory_stock_idx` ON `inventory` (`onHand`,`reserved`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `orderItems` (`orderId`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`orderStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `product_images_product_order_idx` ON `productImages` (`productId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `productVariants` (`productId`,`active`);--> statement-breakpoint
CREATE INDEX `products_catalog_idx` ON `products` (`status`,`categoryId`,`featured`);--> statement-breakpoint
CREATE INDEX `products_created_idx` ON `products` (`createdAt`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);