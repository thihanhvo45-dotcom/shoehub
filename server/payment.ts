import crypto from "node:crypto";
import { nanoid } from "nanoid";

export type OnlineProvider = "vnpay" | "momo";

function required(name: string) {
  return process.env[name]?.trim() || "";
}

function publicOrigin() {
  return required("PUBLIC_ORIGIN").replace(/\/$/, "");
}

export function paymentProviderStatus() {
  return {
    vnpay: Boolean(required("VNPAY_TMN_CODE") && required("VNPAY_HASH_SECRET") && publicOrigin()),
    momo: Boolean(required("MOMO_PARTNER_CODE") && required("MOMO_ACCESS_KEY") && required("MOMO_SECRET_KEY") && publicOrigin()),
  };
}

function formatVnPayDate(date = new Date()) {
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}${pad(local.getUTCSeconds())}`;
}

function encodeVnPay(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function canonicalVnPay(params: Record<string, string>) {
  return Object.keys(params)
    .filter(key => params[key] !== "" && params[key] !== undefined)
    .sort()
    .map(key => `${key}=${encodeVnPay(params[key])}`)
    .join("&");
}

function hmacSha512(secret: string, value: string) {
  return crypto.createHmac("sha512", secret).update(value, "utf8").digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function buildVnpayPaymentUrl(input: { orderNumber: string; amount: number; ipAddress?: string }) {
  const tmnCode = required("VNPAY_TMN_CODE");
  const secret = required("VNPAY_HASH_SECRET");
  const origin = publicOrigin();
  if (!tmnCode || !secret || !origin) throw new Error("VNPay chưa được cấu hình đầy đủ");
  const createdAt = new Date();
  const expireAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(Math.round(input.amount) * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: input.orderNumber,
    vnp_OrderInfo: `Thanh toan don ${input.orderNumber}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: `${origin}/api/payments/vnpay/return`,
    vnp_IpAddr: input.ipAddress || "127.0.0.1",
    vnp_CreateDate: formatVnPayDate(createdAt),
    vnp_ExpireDate: formatVnPayDate(expireAt),
  };
  const query = canonicalVnPay(params);
  const signature = hmacSha512(secret, query);
  const baseUrl = required("VNPAY_PAYMENT_URL") || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  return `${baseUrl}?${query}&vnp_SecureHash=${signature}`;
}

export function verifyVnpayReturn(input: Record<string, string>) {
  const secureHash = input.vnp_SecureHash || "";
  const values = Object.fromEntries(Object.entries(input).filter(([key]) => key !== "vnp_SecureHash" && key !== "vnp_SecureHashType"));
  const expected = hmacSha512(required("VNPAY_HASH_SECRET"), canonicalVnPay(values));
  return {
    valid: Boolean(secureHash) && safeEqual(secureHash.toLowerCase(), expected.toLowerCase()),
    success: input.vnp_ResponseCode === "00" && input.vnp_TransactionStatus === "00",
    orderNumber: input.vnp_TxnRef || "",
    providerTransactionId: input.vnp_TransactionNo || "",
    responseCode: input.vnp_ResponseCode || "99",
    amount: Math.round(Number(input.vnp_Amount || 0) / 100),
  };
}

function hmacSha256(secret: string, value: string) {
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

export async function buildMomoPayment(input: { orderNumber: string; amount: number; recipientName: string; phone: string; email?: string }) {
  const partnerCode = required("MOMO_PARTNER_CODE");
  const accessKey = required("MOMO_ACCESS_KEY");
  const secretKey = required("MOMO_SECRET_KEY");
  const origin = publicOrigin();
  if (!partnerCode || !accessKey || !secretKey || !origin) throw new Error("MoMo chưa được cấu hình đầy đủ");
  const requestId = `${input.orderNumber}-${nanoid(8)}`.replace(/[^a-zA-Z0-9-]/g, "");
  const extraData = Buffer.from(JSON.stringify({ orderNumber: input.orderNumber })).toString("base64");
  const request = {
    partnerCode,
    partnerName: required("MOMO_PARTNER_NAME") || "ShoeHub",
    storeId: required("MOMO_STORE_ID") || partnerCode,
    requestId,
    amount: String(Math.round(input.amount)),
    orderId: input.orderNumber,
    orderInfo: `Thanh toan don ${input.orderNumber}`,
    redirectUrl: `${origin}/api/payments/momo/return`,
    ipnUrl: `${origin}/api/payments/momo/ipn`,
    lang: "vi",
    autoCapture: true,
    requestType: required("MOMO_REQUEST_TYPE") || "captureWallet",
    extraData,
    userInfo: { name: input.recipientName, phoneNumber: input.phone, email: input.email || "customer@example.com" },
  };
  const rawSignature = `accessKey=${accessKey}&amount=${request.amount}&extraData=${request.extraData}&ipnUrl=${request.ipnUrl}&orderId=${request.orderId}&orderInfo=${request.orderInfo}&partnerCode=${request.partnerCode}&redirectUrl=${request.redirectUrl}&requestId=${request.requestId}&requestType=${request.requestType}`;
  const response = await fetch(required("MOMO_API_URL") || "https://test-payment.momo.vn/v2/gateway/api/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, signature: hmacSha256(secretKey, rawSignature) }),
  });
  if (!response.ok) throw new Error("MoMo không phản hồi yêu cầu thanh toán");
  const payload = await response.json() as { resultCode?: number; message?: string; payUrl?: string; transId?: string; requestId?: string };
  if (payload.resultCode !== 0 || !payload.payUrl) throw new Error(payload.message || "Không tạo được liên kết MoMo");
  return { paymentUrl: payload.payUrl, providerOrderId: input.orderNumber, providerTransactionId: payload.transId || payload.requestId || requestId, responseCode: String(payload.resultCode) };
}

export function verifyMomoIpn(input: Record<string, unknown>) {
  const stringValue = (key: string) => String(input[key] ?? "");
  const rawSignature = `accessKey=${required("MOMO_ACCESS_KEY")}&amount=${stringValue("amount")}&callbackToken=${stringValue("callbackToken")}&extraData=${stringValue("extraData")}&message=${stringValue("message")}&orderId=${stringValue("orderId")}&orderInfo=${stringValue("orderInfo")}&orderType=${stringValue("orderType")}&partnerClientId=${stringValue("partnerClientId")}&partnerCode=${stringValue("partnerCode")}&payType=${stringValue("payType")}&requestId=${stringValue("requestId")}&responseTime=${stringValue("responseTime")}&resultCode=${stringValue("resultCode")}&transId=${stringValue("transId")}`;
  const expected = hmacSha256(required("MOMO_SECRET_KEY"), rawSignature);
  const actual = stringValue("signature");
  return {
    valid: Boolean(actual) && safeEqual(actual, expected),
    success: Number(input.resultCode) === 0,
    orderNumber: stringValue("orderId"),
    providerTransactionId: stringValue("transId"),
    responseCode: stringValue("resultCode") || "99",
    amount: Number(input.amount || 0),
  };
}
