import { notifyOwner } from '@/server/notify';
import { SITE_NAME, SITE_URL } from '@/config/site';

import type { ContactRequest, ContactResponse } from '../types';

/**
 * 留言通知：Webhook 是主通道，投递失败必须让接口返回失败，
 * 否则访客看到「提交成功」而站长什么也没收到。
 */
export async function sendContactNotice(dto: ContactRequest): Promise<ContactResponse> {
  const { webhookError } = await notifyOwner({
    event: {
      type: 'contact',
      title: '收到一条新的留言',
      site: { name: SITE_NAME, url: SITE_URL },
      name: dto.name,
      email: dto.email,
      content: dto.content,
      timestamp: new Date().toISOString(),
    },
  });

  if (webhookError) throw new Error(webhookError);

  return { success: true };
}
