import { logger } from '@/lib/logger';
import { notifyOwner, truncateBarkBody } from '@/lib/notify';
import { SITE_NAME, SITE_URL } from '@/lib/site';

import type { ContactRequest, ContactResponse } from '../types';

/**
 * 留言通知：Webhook 是主通道，投递失败必须让接口返回失败，
 * 否则访客看到「提交成功」而站长什么也没收到；Bark 只是补充提醒，失败记日志。
 */
export async function sendContactNotice(dto: ContactRequest): Promise<ContactResponse> {
  const { webhookError, barkError } = await notifyOwner({
    event: {
      type: 'contact',
      title: '收到一条新的留言',
      site: { name: SITE_NAME, url: SITE_URL },
      name: dto.name,
      email: dto.email,
      content: dto.content,
      timestamp: new Date().toISOString(),
    },
    bark: {
      title: `网站留言 · ${dto.name}`,
      subtitle: dto.email,
      body: truncateBarkBody(dto.content) || '（无内容）',
      group: '网站留言',
      level: 'timeSensitive',
    },
  });

  if (barkError) logger.warn('[contact] Bark 推送失败', barkError);
  if (webhookError) throw new Error(webhookError);

  return { success: true };
}
