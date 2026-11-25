/** 打赏金额与 PayPal 档位（公开信息）。凭据走环境变量。 */

/** 单笔最小金额（元），与 zod 校验、支付网关下限一致 */
export const DONATION_MIN_AMOUNT = 1;
/** 单笔最大金额（元） */
export const DONATION_MAX_AMOUNT = 10000;
/** 订单标题 */
export const DONATION_SUBJECT = '打赏支持';

/** PayPal 收款币种 */
export const PAYPAL_CURRENCY = 'USD';
/** PayPal 单笔最小金额，与 zod 校验一致 */
export const PAYPAL_MIN_AMOUNT = 1;
/** PayPal 单笔最大金额 */
export const PAYPAL_MAX_AMOUNT = 500;
