# royalmassage.i11ume.com

Исходники приложения, задеплоенного отдельным проектом Netlify `nadimassage`
(site_id `d27c5e1b-090e-4f63-82e0-441ef6296a7a`).

Проект НЕ подключён к этому репозиторию: он был выложен вручную загрузкой
папки. Файлы здесь лежат как источник правды и история изменений.

Порядок работы: правим здесь, коммитим, затем вручную перетаскиваем папку
в Netlify (Deploys → Drag and drop) либо переносим приложение на автодеплой,
см. ниже.

DNS: CNAME `royalmassage` → `nadimassage.netlify.app`, Cloudflare, DNS only.
Запись была потеряна при переезде с GoDaddy и восстановлена 17.08.2026.

## Перенос на автодеплой (не сделано)

1. Положить содержимое в `public/royalmassage/` этого репозитория
2. Добавить `royalmassage.i11ume.com` как domain alias проекта `illumenew`
3. В `netlify.toml` добавить host-редирект по образцу `deck.i11ume.com`
4. Переключить CNAME на `illumenew.netlify.app`
5. Удалить проект `nadimassage`

## Зависимости

Telegram Web App SDK и шрифт Raleway подключаются с внешних CDN.
Локальный ресурс один: `massage.jpg`.
