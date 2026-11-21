'use client';

import { useEffect, useRef } from 'react';

import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';
import { trackEvent } from '@/utils/umami';

type ToolTextResult = { content: Array<{ type: 'text'; text: string }> };

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<ToolTextResult>;
}

interface WebMcpToolInfo extends WebMcpTool {
  origin?: string;
}

interface ModelContextLike {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void>;
  getTools?: () => Promise<WebMcpToolInfo[]>;
  executeTool?: (tool: WebMcpToolInfo, args?: Record<string, unknown>) => Promise<unknown>;
}

function getModelContext(): ModelContextLike | null {
  if (typeof document === 'undefined') return null;
  const context =
    (document as Document & { modelContext?: ModelContextLike }).modelContext ??
    (navigator as Navigator & { modelContext?: ModelContextLike }).modelContext;
  return context && typeof context.registerTool === 'function' ? context : null;
}

/**
 * 开发环境调试入口：在控制台用 __webmcp.list() / __webmcp.call(name, args) 手动调用工具。
 * 生产构建时 process.env.NODE_ENV 被内联为 production，整段逻辑会被移除。
 */
function exposeDebugApi(modelContext: ModelContextLike | null) {
  const requireContext = () => {
    if (!modelContext) throw new Error('当前浏览器不支持 WebMCP（document.modelContext 不可用）');
    if (typeof modelContext.getTools !== 'function' || typeof modelContext.executeTool !== 'function') {
      throw new Error('当前浏览器未实现 getTools() / executeTool()');
    }
    return modelContext as Required<Pick<ModelContextLike, 'getTools' | 'executeTool'>>;
  };

  const api = {
    available: Boolean(modelContext),
    list: () => requireContext().getTools(),
    call: async (name: string, args: Record<string, unknown> = {}) => {
      const context = requireContext();
      const tools = await context.getTools();
      const tool = tools.find((item) => item.name === name);
      if (!tool) {
        throw new Error(`未找到工具：${name}，可用：${tools.map((item) => item.name).join(', ') || '无'}`);
      }
      return context.executeTool(tool, args);
    },
  };

  const target = window as unknown as { __webmcp?: typeof api };
  target.__webmcp = api;

  return () => {
    delete target.__webmcp;
  };
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
    const controller = new AbortController();

    const tools: WebMcpTool[] = [
      {
        name: 'get_profile',
        description:
          'Return the site owner profile: name, role, site URL and contact email.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          trackEvent('webmcp-tool', { tool: 'get_profile' });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  name: '张文涛',
                  fullName: '张文涛',
                  role: 'Full Stack Developer',
                  site: SITE_URL,
                  email: CONTACT_EMAIL,
                  language: 'zh-CN',
                }),
              },
            ],
          };
        },
      },
      {
        name: 'open_contact_form',
        description:
          'Open the contact form dialog so the visitor can write a message to the site owner. Only opens the form; nothing is sent until the visitor submits it.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          trackEvent('webmcp-tool', { tool: 'open_contact_form' });
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

    if (modelContext) {
      for (const tool of tools) {
        // 权限策略拒绝或页面卸载时不抛错，页面功能不受影响。
        void modelContext.registerTool(tool, { signal: controller.signal }).catch(() => {});
      }
    }

    const cleanupDebug =
      process.env.NODE_ENV === 'production' ? undefined : exposeDebugApi(modelContext);

    return () => {
      controller.abort();
      cleanupDebug?.();
    };
  }, []);
}
