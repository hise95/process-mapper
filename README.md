# BeeProcess — Інструкція з розгортання (Deployment Guide)

Цей документ призначений розгортання сервера і містить покрокову інструкцію для розгортання системи на чистому сервері (наприклад, Ubuntu 22.04/24.04).

## 🛠 Технологічний стек
- **Frontend/Backend:** Next.js (App Router), React, Node.js
- **База даних:** PostgreSQL
- **ORM:** Prisma
- **Стилізація:** Tailwind CSS

---

## 1. Вимоги до сервера (Dependencies)
На сервері повинні бути встановлені:
1. **Node.js** (версія 18.17.0 або новіша)
2. **npm** (йде в комплекті з Node.js)
3. **PostgreSQL** (версія 14 або новіша)
4. **Git**

### Встановлення базових залежностей (Ubuntu/Debian):
```bash
# Оновлення системи
sudo apt update && sudo apt upgrade -y

# Встановлення Git, curl та Nginx
sudo apt install git curl nginx -y

# Встановлення Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Встановлення PostgreSQL
sudo apt install postgresql postgresql-contrib -y
```

---

## 2. Налаштування Бази Даних
Системі потрібна порожня база даних PostgreSQL.

```bash
# Заходимо в консоль PostgreSQL
sudo -i -u postgres psql

# Виконуємо SQL-команди (замініть 'your_password' на надійний пароль)
CREATE DATABASE process_mapper;
CREATE USER process_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE process_mapper TO process_user;
\c process_mapper
GRANT ALL ON SCHEMA public TO process_user;
\q
```

---

## 3. Завантаження коду та встановлення пакетів
```bash
# Клонуємо репозиторій
git clone https://github.com/hise95/process-mapper.git
cd process-mapper

# Встановлюємо всі Node.js залежності
npm install
```

---

## 4. Налаштування змінних оточення (.env)
Створіть файл `.env` у корені проекту:
```bash
nano .env
```

Додайте туди рядок підключення до бази даних (використовуйте дані з Кроку 2):
```env
# Формат: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
POSTGRES_URL="postgresql://process_user:your_password@localhost:5432/process_mapper"
```

---

## 5. Ініціалізація бази даних та Seed
Цей крок створить таблиці та згенерує базових користувачів і рівні L1-L3.

```bash
# Створення таблиць у базі даних
npx prisma db push

# Заповнення бази базовими даними (Створює Системного Адміністратора та ієрархію)
npm run db:seed
```
> **Увага:** Після seed-у логін адміністратора за замовчуванням: `admin@company.com` / `password123`. Рекомендується змінити його після першого входу.

---

## 6. Збірка проекту (Build)
Перед запуском у продакшені проект потрібно скомпілювати:
```bash
npm run build
```

---

## 7. Запуск у Production за допомогою PM2
Щоб програма працювала у фоновому режимі та автоматично перезапускалась після перезавантаження сервера, використовуємо **PM2**.

```bash
# Встановлюємо PM2 глобально
sudo npm install -g pm2

# Запускаємо проект
pm2 start npm --name "process-mapper" -- start

# Зберігаємо налаштування для автозапуску
pm2 save
pm2 startup
# (Після виконання pm2 startup скопіюйте команду, яку видасть консоль, і виконайте її)
```

Система тепер працює локально на порту **3000** (`http://localhost:3000`).

---

## 8. Налаштування Nginx (Reverse Proxy)
Щоб сайт був доступний ззовні через стандартний 80 порт (або домен), налаштуємо Nginx.

```bash
sudo nano /etc/nginx/sites-available/process-mapper
```

Вставте наступну конфігурацію (замініть `your_domain_or_IP`):
```nginx
server {
    listen 80;
    server_name your_domain_or_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Увімкніть конфігурацію та перезапустіть Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/process-mapper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Готово! 🎉
Проект розгорнуто. Відкрийте IP адресу вашого сервера або домен у браузері.

---

## 9. Надання прав Системного Адміністратора (Перший користувач / Active Directory)
Якщо ви підключите Active Directory (SSO) або просто хочете надати права адміністратора реальному співробітнику:

1. Нехай цей співробітник вперше авторизується в системі (його профіль автоматично створиться в базі).
2. Відкрийте інтерфейс керування базою даних на сервері:
`ash
npx prisma studio
`
(Або підключіться безпосередньо через PostgreSQL клієнт чи psql).
3. Знайдіть таблицю **User**, знайдіть корпоративний email цього співробітника.
4. Змініть значення в колонці **role** з PROCESS_MANAGER (за замовчуванням) на **ADMIN**.
5. Збережіть зміни. Після цього користувач зможе зайти в систему і роздавати ролі всім іншим через вбудовану «Адмін-панель» в інтерфейсі.
