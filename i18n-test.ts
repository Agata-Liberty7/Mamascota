const { I18n } = require("i18n-js");

const i18n = new I18n({
  en: { hello: "Hello" },
  es: { hello: "¡Hola!" }
});

i18n.enableFallback = true;
i18n.locale = "en";

console.log("=== TEST i18n ===");
console.log(i18n);
console.log("typeof i18n:", typeof i18n);
console.log("typeof i18n.t:", typeof i18n.t);
console.log("Test translate:", i18n.t("hello"));
