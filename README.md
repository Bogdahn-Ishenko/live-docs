<div align="center">
  <img src="assets/README/HEADER/main.png" width="100%" alt="WikiLive Header">

  <br>

  <img src="https://img.shields.io/badge/version-1.0.0-F80031?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=java&logoColor=white" alt="Java">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.2-green?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot">

  <br><br>

  <p>
    WikiLive — система для совместного редактирования вики-документов<br>
    с поддержкой real-time синхронизации, версионирования и интеграции с таблицами.
  </p>

  <a href="./backend/openapi.yml">
    <img src="https://img.shields.io/badge/OpenAPI-View%20Specification-blue?style=for-the-badge&logo=swagger&logoColor=white" alt="OpenAPI">
  </a>
</div>

---

# 📌 Описание

**WikiLive** — backend-платформа для работы с вики-документами уровня Notion / Confluence.

Система реализует:
- хранение и управление страницами
- версионирование и черновики
- real-time совместную работу
- граф связей между документами
- интеграцию с внешними источниками (MWS Tables)

Backend выступает как **единый источник бизнес-логики (SSOT)** и отвечает за синхронизацию данных.

---

# 🛠 Технологический стек

- Java 21
- Spring Boot 3.2
- Spring Security (HTTP Basic Auth)
- Spring Data JPA (Hibernate)
- WebSocket (STOMP)
- PostgreSQL
- Docker / Docker Compose





# 🚀 Запуск проекта

Проект полностью контейнеризирован и запускается одной командой:

```bash
docker compose up --build
После запуска сервисы доступны:

Сервис	URL
Backend API	https://wiki-live.ru/api

WebSocket (YJS)	wss://wiki-live.ru/yjs
Adminer	http://<server-ip>:8080
```

| Сервис          | URL                                                  |
| --------------- | ---------------------------------------------------- |
| Backend API     | [https://wiki-live.ru/api](https://wiki-live.ru/api) |
| WebSocket (YJS) | wss://wiki-live.ru/yjs                               |
| Adminer         | http://<server-ip>:8080                              |

⚡ Production-ready: доступ через публичный домен без дополнительной настройки

---

## 🔷 Команда (таблица)

| 👤 Имя | 🔗 Ссылка | 🎯 Роль |
|:------:|:---------:|:-------:|
| Богдан | [![Resume](https://img.shields.io/badge/Resume-000?style=flat&logo=readme&logoColor=white)](https://bogdahn-ishenko.github.io/resume/) | ![Team Lead](https://img.shields.io/badge/Team_Lead-F80031?style=flat) |
| Владимир Андреев | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/vovandreevik) | ![Product](https://img.shields.io/badge/Product-4ECDC4?style=flat) |
| Александр Локтев | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/StAlien666) | ![Backend](https://img.shields.io/badge/Backend-45B7D1?style=flat) |
| Илья Хакимов | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/PirateThunder) | ![Frontend](https://img.shields.io/badge/Frontend-96CEB4?style=flat) |
| Вадим Гамин | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/gaminv) | ![Fullstack](https://img.shields.io/badge/Fullstack-DDA0DD?style=flat) |

<div align="center">

<img src="assets/FOOTER/footer.png" width="100%" alt="WikiLive Footer">

<br><br>

### WikiLive

Backend-платформа для живых документов и синхронизации данных (SSOT)

<br>

© 2026 ArksTech Team  
True Tech Hack 2026

</div>
