import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    role: mysqlEnum("role", ["user", "buyer", "seller", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({
    emailIdx: index("users_email_idx").on(table.email),
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    imageUrl: varchar("imageUrl", { length: 512 }),
    parentId: int("parentId"),
    sortOrder: int("sortOrder").default(0).notNull(),
    active: int("active").default(1).notNull(),
  },
  table => ({
    slugUnique: uniqueIndex("categories_slug_unique").on(table.slug),
    activeOrderIdx: index("categories_active_order_idx").on(table.active, table.sortOrder),
  }),
);

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    shortDescription: varchar("shortDescription", { length: 500 }),
    description: text("description"),
    brand: varchar("brand", { length: 80 }).default("ShoeHub").notNull(),
    categoryId: int("categoryId"),
    status: mysqlEnum("status", ["active", "draft", "archived"]).default("active").notNull(),
    featured: int("featured").default(0).notNull(),
    tags: text("tags"),
    seoTitle: varchar("seoTitle", { length: 160 }),
    seoDescription: varchar("seoDescription", { length: 320 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    slugUnique: uniqueIndex("products_slug_unique").on(table.slug),
    catalogIdx: index("products_catalog_idx").on(table.status, table.categoryId, table.featured),
    createdIdx: index("products_created_idx").on(table.createdAt),
  }),
);

export const productImages = mysqlTable(
  "productImages",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull(),
    url: varchar("url", { length: 512 }).notNull(),
    alt: varchar("alt", { length: 255 }).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
  },
  table => ({
    productOrderIdx: index("product_images_product_order_idx").on(table.productId, table.sortOrder),
  }),
);

export const productVariants = mysqlTable(
  "productVariants",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    size: varchar("size", { length: 16 }).notNull(),
    color: varchar("color", { length: 50 }).notNull(),
    price: int("price").notNull(),
    compareAtPrice: int("compareAtPrice"),
    active: int("active").default(1).notNull(),
  },
  table => ({
    skuUnique: uniqueIndex("product_variants_sku_unique").on(table.sku),
    productIdx: index("product_variants_product_idx").on(table.productId, table.active),
  }),
);

export const inventory = mysqlTable(
  "inventory",
  {
    id: int("id").autoincrement().primaryKey(),
    variantId: int("variantId").notNull(),
    onHand: int("onHand").default(0).notNull(),
    reserved: int("reserved").default(0).notNull(),
    lowStockThreshold: int("lowStockThreshold").default(3).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    variantUnique: uniqueIndex("inventory_variant_unique").on(table.variantId),
    stockIdx: index("inventory_stock_idx").on(table.onHand, table.reserved),
  }),
);

export const carts = mysqlTable(
  "carts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    guestKey: varchar("guestKey", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    guestKeyUnique: uniqueIndex("carts_guest_key_unique").on(table.guestKey),
    userIdx: index("carts_user_idx").on(table.userId),
  }),
);

export const cartItems = mysqlTable(
  "cartItems",
  {
    id: int("id").autoincrement().primaryKey(),
    cartId: int("cartId").notNull(),
    variantId: int("variantId").notNull(),
    quantity: int("quantity").notNull(),
    priceSnapshot: int("priceSnapshot").notNull(),
  },
  table => ({
    cartVariantUnique: uniqueIndex("cart_items_variant_unique").on(table.cartId, table.variantId),
  }),
);

export const addresses = mysqlTable(
  "addresses",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    recipientName: varchar("recipientName", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    addressLine: varchar("addressLine", { length: 255 }).notNull(),
    ward: varchar("ward", { length: 120 }),
    district: varchar("district", { length: 120 }),
    province: varchar("province", { length: 120 }).notNull(),
    isDefault: int("isDefault").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("addresses_user_idx").on(table.userId, table.isDefault),
  }),
);

export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    orderNumber: varchar("orderNumber", { length: 40 }).notNull(),
    userId: int("userId"),
    guestEmail: varchar("guestEmail", { length: 320 }),
    recipientName: varchar("recipientName", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    addressLine: varchar("addressLine", { length: 255 }).notNull(),
    ward: varchar("ward", { length: 120 }),
    district: varchar("district", { length: 120 }),
    province: varchar("province", { length: 120 }).notNull(),
    subtotal: int("subtotal").notNull(),
    shippingFee: int("shippingFee").notNull(),
    discount: int("discount").default(0).notNull(),
    total: int("total").notNull(),
    couponCode: varchar("couponCode", { length: 64 }),
    orderStatus: mysqlEnum("orderStatus", ["pending", "confirmed", "packing", "shipping", "completed", "cancelled", "refunded"]).default("pending").notNull(),
    paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
    paymentMethod: mysqlEnum("paymentMethod", ["cod", "manual", "vnpay", "momo", "stripe"]).default("cod").notNull(),
    fulfillmentMethod: mysqlEnum("fulfillmentMethod", ["delivery", "pickup"]).default("delivery").notNull(),
    mapsUrl: varchar("mapsUrl", { length: 500 }),
    idempotencyKey: varchar("idempotencyKey", { length: 100 }).notNull(),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    orderNumberUnique: uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    idempotencyUnique: uniqueIndex("orders_idempotency_unique").on(table.idempotencyKey),
    userIdx: index("orders_user_idx").on(table.userId, table.createdAt),
    statusIdx: index("orders_status_idx").on(table.orderStatus, table.createdAt),
  }),
);

export const paymentTransactions = mysqlTable(
  "paymentTransactions",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId").notNull(),
    provider: mysqlEnum("provider", ["vnpay", "momo"]).notNull(),
    providerOrderId: varchar("providerOrderId", { length: 100 }).notNull(),
    providerTransactionId: varchar("providerTransactionId", { length: 120 }),
    amount: int("amount").notNull(),
    status: mysqlEnum("status", ["created", "pending", "paid", "failed", "refunded"]).default("created").notNull(),
    responseCode: varchar("responseCode", { length: 32 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    paidAt: timestamp("paidAt"),
  },
  table => ({
    providerOrderUnique: uniqueIndex("payment_provider_order_unique").on(table.provider, table.providerOrderId),
    orderIdx: index("payment_order_idx").on(table.orderId, table.createdAt),
    statusIdx: index("payment_status_idx").on(table.status, table.createdAt),
  }),
);

export const orderEvents = mysqlTable(
  "orderEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId").notNull(),
    orderStatus: mysqlEnum("orderStatus", ["pending", "confirmed", "packing", "shipping", "completed", "cancelled", "refunded"]).notNull(),
    paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded"]).notNull(),
    message: varchar("message", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    orderTimeIdx: index("order_events_order_time_idx").on(table.orderId, table.createdAt),
  }),
);

export const orderItems = mysqlTable(
  "orderItems",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId").notNull(),
    variantId: int("variantId"),
    productNameSnapshot: varchar("productNameSnapshot", { length: 200 }).notNull(),
    skuSnapshot: varchar("skuSnapshot", { length: 64 }).notNull(),
    size: varchar("size", { length: 16 }).notNull(),
    color: varchar("color", { length: 50 }).notNull(),
    unitPrice: int("unitPrice").notNull(),
    quantity: int("quantity").notNull(),
  },
  table => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
  }),
);

export const coupons = mysqlTable(
  "coupons",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    type: mysqlEnum("type", ["percent", "fixed"]).notNull(),
    value: int("value").notNull(),
    minSubtotal: int("minSubtotal").default(0).notNull(),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    usageLimit: int("usageLimit"),
    usageCount: int("usageCount").default(0).notNull(),
    active: int("active").default(1).notNull(),
  },
  table => ({
    codeUnique: uniqueIndex("coupons_code_unique").on(table.code),
    activeIdx: index("coupons_active_idx").on(table.active, table.endsAt),
  }),
);

export const couponUsages = mysqlTable(
  "couponUsages",
  {
    id: int("id").autoincrement().primaryKey(),
    couponId: int("couponId").notNull(),
    orderId: int("orderId").notNull(),
    userId: int("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    couponOrderUnique: uniqueIndex("coupon_usages_order_unique").on(table.couponId, table.orderId),
  }),
);

export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorId: int("actorId"),
    action: varchar("action", { length: 120 }).notNull(),
    entity: varchar("entity", { length: 80 }).notNull(),
    entityId: varchar("entityId", { length: 80 }),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    actorIdx: index("audit_logs_actor_idx").on(table.actorId, table.createdAt),
    entityIdx: index("audit_logs_entity_idx").on(table.entity, table.entityId),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type InsertOrder = typeof orders.$inferInsert;

// Re-export selected query helpers for modules that already import from schema in tooling.
export { and, asc, desc, eq, gte, inArray, like, lte, or, sql };
