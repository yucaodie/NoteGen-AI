'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { useEffect, useState } from 'react';
import zhMessages from '@/messages/zh.json';
import zhCommonMessages from '@/messages/common/zh.json';
import {
  DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  loadMessagesWithFallback,
  normalizeLocale,
  type SupportedLocale,
} from '@/i18n/config';

const DEFAULT_MESSAGES: AbstractIntlMessages = {
  ...zhMessages,
  common: zhCommonMessages,
};

export function NextIntlProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<AbstractIntlMessages>(DEFAULT_MESSAGES);
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    const savedLocale = normalizeLocale(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    setLocale(savedLocale);

    loadMessagesWithFallback(savedLocale).then((loadedMessages) => {
      setMessages(loadedMessages);
    }).catch((error) => {
      console.error(`Failed to load messages for locale: ${savedLocale}`, error);

      if (savedLocale !== DEFAULT_LOCALE) {
        setLocale(DEFAULT_LOCALE);
        void loadMessagesWithFallback(DEFAULT_LOCALE).then((msgs) => {
          setMessages(msgs);
        });
      }
    });
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
