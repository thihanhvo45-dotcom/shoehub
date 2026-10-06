import type { CatalogProduct } from "../../../server/commerce";

export type { CatalogProduct };

export type CartLine = {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
};

export const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

const CART_KEY = "shoehub-cart-v1";

export function loadCart(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("shoehub-cart-updated"));
}

export function addToCart(line: CartLine) {
  const current = loadCart();
  const existing = current.find(item => item.variantId === line.variantId);
  if (existing) existing.quantity = Math.min(20, existing.quantity + line.quantity);
  else current.push(line);
  saveCart(current);
  return current;
}

export function updateCartQuantity(variantId: number, quantity: number) {
  const next = loadCart().map(line => line.variantId === variantId ? { ...line, quantity: Math.max(0, Math.min(20, quantity)) } : line).filter(line => line.quantity > 0);
  saveCart(next);
  return next;
}

export function removeFromCart(variantId: number) {
  return updateCartQuantity(variantId, 0);
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function newIdempotencyKey() {
  return `checkout-${crypto.randomUUID()}`;
}
