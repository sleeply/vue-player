import { I18n, I18nOptions, createI18n } from "vue-i18n";
import { Ref, WritableComputedRef, nextTick } from "vue";
import { SUPPORT_LOCALES } from "@/utils/constants";

export const DEFAULT_LOCALE = "ru";

export function getBrowserLocale(options = {}) {
  const defaultOptions = { countryCodeOnly: true };
  const opt = { ...defaultOptions, ...options };

  try {
    if (SUPPORT_LOCALES.includes(window.location.pathname.substring(1, 3))) {
      return window.location.pathname.substring(1, 3);
    }
    const navigatorLocale =
      navigator?.languages !== undefined ? navigator.languages[0] : navigator.language;
    if (!navigatorLocale) {
      return process.env.VUE_APP_I18N_FALLBACK_LOCALE || DEFAULT_LOCALE;
    }
    const trimmedLocale = opt.countryCodeOnly
      ? navigatorLocale?.trim().split(/-|_/)[0]
      : navigatorLocale?.trim();

    if (!SUPPORT_LOCALES.includes(trimmedLocale)) {
      return process.env.VUE_APP_I18N_FALLBACK_LOCALE || DEFAULT_LOCALE;
    }
    return trimmedLocale;
  } catch {
    return process.env.VUE_APP_I18N_FALLBACK_LOCALE || DEFAULT_LOCALE;
  }
}

export async function loadLocaleMessages(i18n: I18n, locale: string) {
  const messages = await import(`./locales/${locale}.json`);

  i18n.global.setLocaleMessage(locale, messages);

  return nextTick();
}

function ruPlur(choice: number, choicesLength: number) {
  if (choice === 0) {
    return 0;
  }

  const teen = choice > 10 && choice < 20;
  const endsWithOne = choice % 10 === 1;
  if (!teen && endsWithOne) {
    return 1;
  }
  if (!teen && choice % 10 >= 2 && choice % 10 <= 4) {
    return 2;
  }

  return choicesLength < 4 ? 2 : 3;
}

export function setupI18n(
  options: any = {
    locale: getBrowserLocale(),
    legacy: false,
    globalInjection: true,
    silentTranslationWarn: true,
    pluralizationRules: {
      ru: ruPlur
    },
    datetimeFormats: {
      en: {
        long: {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      },
      ru: {
        long: {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      },
      uz: {
        long: {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      }
    },
    numberFormats: {
      en: {
        currency: {
          style: "currency",
          currency: "USD"
        }
      },
      ru: {
        currency: {
          style: "currency",
          currency: "RUB"
        }
      },
      uz: {
        currency: {
          style: "currency",
          currency: "UZS",
          currencyDisplay: "symbol"
        }
      }
    }
  }
) {
  const i18n = createI18n(options);
  loadLocaleMessages(i18n, options.locale);
  setI18nLanguage(i18n, options.locale);
  return i18n;
}

export function setI18nLanguage(i18n: any, locale: string) {
  if (i18n.mode === "legacy") {
    i18n.global.locale = locale;
  } else {
    i18n.global.locale.value = locale;
  }
  /**
   * NOTE:
   * If you need to specify the language setting for headers, such as the `fetch` API, set it here.
   * The following is an example for axios.
   *
   * axios.defaults.headers.common['Accept-Language'] = locale
   */
  try {
    document.querySelector("html")?.setAttribute("lang", locale);
  } catch {
    console.log();
  }
}

export const i18n = setupI18n();
