# Публичная витрина SubGuard

Статическая витрина опубликована на GitHub Pages:
[https://aydenxvi.github.io/subguard/](https://aydenxvi.github.io/subguard/).
Она открывается по HTTPS без VPS,
домена, банковской карты и работающего домашнего компьютера. GitHub Pages
отдаёт только собранные HTML/CSS/JavaScript; серверная часть там не работает.

Откройте адрес и нажмите синюю кнопку «Открыть витрину». Можно пройти по
разделам, открыть формы, создать и изменить вымышленные записи, посмотреть
графики, импортировать учебный CSV и переключить язык. Действия сохраняются
только в `sessionStorage` текущей вкладки браузера. «Сбросить демо» возвращает
исходные примеры. Другие посетители этих изменений не видят.

Кнопка «Посмотреть бота» открывает интерактивный пример команд `/start`, `/app`, `/help`,
`/stop` и `/reminders`. Можно отправить команды и перейти в интерфейс приложения.
Прямая ссылка на этот сценарий:
[https://aydenxvi.github.io/subguard/#bot](https://aydenxvi.github.io/subguard/#bot).
Это **симуляция в браузере**, а не настоящий аккаунт Telegram и не фактически
отправленные сообщения.

Скриншоты для портфолио: [стартовая страница](screenshots/showcase-landing-ru.png),
[симуляция бота](screenshots/showcase-bot-simulation-ru.png),
[десктопное приложение](screenshots/showcase-desktop-ru.png),
[мобильное приложение](screenshots/showcase-mobile-ru.png). Они созданы из
публичной статической сборки с вымышленными данными; их можно повторить командой
`npm run capture:showcase` при запущенном локальном preview.

Это демонстрация интерфейса, а не онлайн-версия продукта. Нет PostgreSQL,
входа через Telegram, отправки уведомлений, серверной проверки или хранения
данных между устройствами. Не вводите в витрину настоящие финансовые данные.
Полное приложение и его тесты остаются в этом же репозитории.

## Локальная проверка

В каталоге `frontend`:

```sh
npm ci
npm test
VITE_SHOWCASE=true npm run build
VITE_SHOWCASE=true npx vite preview --host 127.0.0.1 --port 4173
```

Откройте `http://127.0.0.1:4173/subguard/`. Для браузерных тестов установите
Chromium через `npx playwright install --with-deps chromium` и выполните
`npx playwright test -c playwright.showcase.config.ts` при запущенном preview.

Файл `.github/workflows/showcase.yml` собирает и проверяет витрину, затем
публикует `frontend/dist` через GitHub Pages при изменениях в `frontend` или
самом workflow. В репозитории уже выбран источник **Settings → Pages → GitHub
Actions**. [Запуск 43071377681](https://github.com/Aydenxvi/subguard/actions/runs/43071377681)
завершился успешно и показал указанный URL. Прямой запрос к `github.io` из среды
разработки заблокирован её сетевыми настройками; перед отправкой ссылки клиентам
откройте её в обычном браузере.
