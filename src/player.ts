import { computed, ref } from "vue";
import { IPlayerAdditionLang } from "./types";

export const usePlayer = () => {
  const l = ref<string>(localStorage.getItem("player-lang") || "ru");

  const TRANSLATES = ref<IPlayerAdditionLang>({
    ru: {
      quality: "Качество",
      audioTrack: "Аудиодорожки",
      captions: "Субтитры",
      auto: "Автонастройка",
      Back: "Назад",
      off: "Отк",
      NotFound: "Нет данных",
      Cancel: "Отменить",
      Save: "Сахранить",
    },
    uz: {
      quality: "Sifat",
      audioTrack: "Audiotreklar",
      auto: "Avtosozlama",
      captions: "Subtitrlar",
      Back: "Orqaga",
      off: "O'chirish",
      NotFound: "Ma'lumot topilmadi",
      Cancel: "Bekor qilish",
      Save: "Saqlash",
    },
  });
  const updateSettings = (lang: string, langList: IPlayerAdditionLang) => {
    if (langList && Object.keys(langList).length > 0) {
      localStorage.setItem("langs", JSON.stringify(langList));
    }
    if (lang) {
      localStorage.setItem("player-lang", lang);
    }
    TRANSLATES.value = {
      ...TRANSLATES.value,
      ...langList,
    };
  };

  const activeLang = computed(() => {
    if (l.value) {
      console.log(l.value);
      return TRANSLATES.value[l.value];
    }
    return TRANSLATES.value["ru"];
  });

  const secondsToHms = (d: number) => {
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor((d % 3600) % 60);
    if (h !== 0) {
      return (
        ("0" + h).slice(-2) +
        ":" +
        ("0" + m).slice(-2) +
        ":" +
        ("0" + s).slice(-2)
      );
    } else {
      return ("0" + m).slice(-2) + ":" + ("0" + s).slice(-2);
    }
  };

  const isMobile = {
    Android: function () {
      return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function () {
      return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function () {
      return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function () {
      return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function () {
      return (
        navigator.userAgent.match(/IEMobile/i) ||
        navigator.userAgent.match(/WPDesktop/i)
      );
    },
    any: function () {
      return (
        isMobile.Android() ||
        isMobile.BlackBerry() ||
        isMobile.iOS() ||
        isMobile.Opera() ||
        isMobile.Windows() ||
        window.matchMedia("(pointer: coarse)").matches
      );
    },
  };

  const playBackList = [
    {
      speed: "0,5",
    },
    {
      speed: "0,75",
    },
    {
      speed: "1x",
    },
    {
      speed: "1,25",
    },
    {
      speed: "1,5",
    },
  ];

  return {
    secondsToHms,
    isMobile,
    playBackList,
    TRANSLATES,
    activeLang,
    updateSettings,
    l,
  };
};
