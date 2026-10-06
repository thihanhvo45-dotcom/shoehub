ALTER TABLE `orders` ADD `fulfillmentMethod` enum('delivery','pickup') DEFAULT 'delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `mapsUrl` varchar(500);