import enMessages from '../locales/en.json';
import zhCNMessages from '../locales/zh-CN.json';
import zhTWMessages from '../locales/zh-TW.json';

import { defaultLocale, type Locale } from './config';

export type MessageSchema = typeof zhCNMessages;

const messagesByLocale: Record<Locale, MessageSchema> = {
  'zh-CN': zhCNMessages,
  'zh-TW': zhTWMessages,
  en: enMessages,
};

export function getMessages(locale: Locale): MessageSchema {
  return messagesByLocale[locale] ?? messagesByLocale[defaultLocale];
}
