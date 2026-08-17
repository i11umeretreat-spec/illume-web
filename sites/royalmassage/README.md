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

## Автодеплой подключён

Рабочая копия лежит в `public/royalmassage/`, деплоится вместе с основным
проектом `illumenew` при пуше в `main`. Хост-редирект прописан в `netlify.toml`.

Правки вносить в `public/royalmassage/`, эта папка (`sites/`) остаётся
как архив первоначальной ручной выкладки.

Осталось сделать руками:
1. Добавить `royalmassage.i11ume.com` domain alias проекта `illumenew`
2. Переключить CNAME `royalmassage` на `illumenew.netlify.app` в Cloudflare
3. После проверки удалить проект `nadimassage`

## Зависимости

Telegram Web App SDK и шрифт Raleway подключаются с внешних CDN.
Локальный ресурс один: `massage.jpg`.
