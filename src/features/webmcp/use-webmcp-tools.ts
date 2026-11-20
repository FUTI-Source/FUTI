'use client';

import { useEffect, useRef } from 'react';

import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';

type ToolTextResult = { content: Array<{ type: 'text'; text: string }> };

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<ToolTextResult>;
}

interface ModelContextLike {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void>;
}

function getModelContext(): ModelContextLike | null {
  if (typeof document === 'undefined') return null;
  const context =
    (document as Document & { modelContext?: ModelContextLike }).modelContext ??
    (navigator as Navigator & { modelContext?: ModelContextLike }).modelContext;
  return context && typeof context.registerTool === 'function' ? context : null;
}

/**
 * 向支持 WebMCP 的浏览器注册本站工具。
 * 仅 Chrome/Edge 的 origin trial 或开启测试 flag 的环境生效，其余浏览器静默跳过。
 */
export function useWebMcpTools(onOpenContactForm: () => void) {
  const openContactRef = useRef(onOpenContactForm);

  useEffect(() => {
    openContactRef.current = onOpenContactForm;
  });

  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext) return;

    const controller = new AbortController();

    const tools: WebMcpTool[] = [
      {
        name: 'get_profile',
        description:
          'Return the site owner profile: name, role, site URL and contact email.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: 'FUTI',
                fullName: '张文涛',
                role: 'Full Stack Developer',
                site: SITE_URL,
                email: CONTACT_EMAIL,
                language: 'zh-CN',
              }),
            },
          ],
        }),
      },
      {
        name: 'open_contact_form',
        description:
          'Open the contact form dialog so the visitor can write a message to the site owner. Only opens the form; nothing is sent until the visitor submits it.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          openContactRef.current();
          return {
            content: [
              {
                type: 'text',
                text: 'Contact form opened. Ask the visitor to review and submit it.',
              },
            ],
          };
        },
      },
    ];

    for (const tool of tools) {
      // 权限策略拒绝或页面卸载时不抛错，页面功能不受影响。
      void modelContext.registerTool(tool, { signal: controller.signal }).catch(() => {});
    }

    return () => controller.abort();
  }, []);
}
