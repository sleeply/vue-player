import { createPinia } from "pinia";
import { createSSRApp, createApp } from "vue";
import App from "./App.vue";
import createRouter from "@/app/config/router/index";
import { i18n } from "@/app/config/i18n/index";
import type { Ii18nRoute } from "./../types.d";

export function buildApp() {
  const app = process.env.VITE_SSR ? createSSRApp(App) : createApp(App);
  const pinia = createPinia();
  const router = createRouter();

  const i18nRoute = (to: Ii18nRoute) => {
    return {
      ...to,
      name: `${i18n.global.locale.value || i18n.global.locale}_${to.name}`,
    };
  };

  app.config.globalProperties.$i18nRoute = i18nRoute;

  app.use(pinia);
  app.use(i18n);
  app.use(router);

  return { app, router, pinia };
}
