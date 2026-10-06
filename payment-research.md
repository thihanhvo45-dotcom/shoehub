# Payment integration references

## MoMo Developers
- One-time payment API: https://developers.momo.vn/v3/docs/payment/api/credit/onetime/
- Payment Gateway overview: https://developers.momo.vn/v3/docs/payment/guides/payment-with-aio/
- Observed contract: POST `/v2/gateway/api/create`; request includes `partnerCode`, `accessKey`, `requestId`, `amount`, `orderId`, `orderInfo`, `redirectUrl`, `ipnUrl`, `requestType`, `extraData`, `signature`; docs specify HMAC-SHA256 for create signature and IPN result signature. IPN is server-to-server and must be acknowledged HTTP 200.

## VNPay
- VNPay.js payment URL guide: https://vnpay.js.org/en/create-payment-url
- VNPay official docs linked from the guide: https://sandbox.vnpayment.vn/apis/
- Observed contract: payment URL includes `vnp_Version`, `vnp_Command`, `vnp_TmnCode`, `vnp_Amount` (VND amount multiplied by 100 in the URL), `vnp_TxnRef`, `vnp_OrderInfo`, `vnp_ReturnUrl`, `vnp_CreateDate`, `vnp_ExpireDate`, and `vnp_SecureHash`; callback signature is verified over sorted query parameters.

These sources were consulted on 2026-10-01. Merchant credentials, callback domain and live/sandbox choice remain owner configuration.
