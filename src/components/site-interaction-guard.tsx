'use client';

import { useEffect } from 'react';

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable=""]';
const BLOCKED_PAGE_EVENTS = [
  'copy',
  'cut',
  'paste',
  'contextmenu',
  'selectstart',
  'dragstart',
  'drop',
] as const;

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;

export const SiteInteractionGuard = () => {
  useEffect(() => {
    const preventPageInteraction = (event: Event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };

    const preventClipboardShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const isClipboardShortcut =
        (event.ctrlKey || event.metaKey) &&
        ['a', 'c', 'x', 'v'].includes(key);
      const isInsertShortcut =
        event.key === 'Insert' && (event.ctrlKey || event.shiftKey);

      if (isClipboardShortcut || isInsertShortcut) {
        event.preventDefault();
      }
    };

    BLOCKED_PAGE_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, preventPageInteraction, true);
    });
    document.addEventListener('keydown', preventClipboardShortcut, true);

    return () => {
      BLOCKED_PAGE_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, preventPageInteraction, true);
      });
      document.removeEventListener('keydown', preventClipboardShortcut, true);
    };
  }, []);

  return null;
};
