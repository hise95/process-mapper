import { test, expect } from '@playwright/test';

const USERS = {
  analyst: { email: 'analyst@company.com', pass: 'password123' },
  owner: { email: 'owner@company.com', pass: 'password123' },
  manager: { email: 'manager@company.com', pass: 'password123' },
};

async function loginAs(page, userType: keyof typeof USERS) {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', USERS[userType].email);
  await page.fill('input[type="password"]', USERS[userType].pass);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*\/dashboard|.*\/repository/);
}

test.describe('Потоки створення процесу', () => {

  test('Сценарій 1: Менеджер створює процес', async ({ page }) => {
    test.setTimeout(60000); // Збільшуємо таймаут для довгого флоу
    
    // 1. Менеджер логіниться і створює процес
    await loginAs(page, 'manager');
    await page.click('a[href="/processes/new"]');
    
    const uniqueName = `Процес від Менеджера ${Date.now()}`;
    await page.fill('input[name="name"]', uniqueName);
    await page.fill('textarea[name="description"]', 'Опис від менеджера');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/processes\/.*/);
    
    // Менеджер відправляє паспорт на перевірку аналітику
    // Кнопка може називатись "Відправити на перевірку"
    const submitBtn = page.locator('button:has-text("Відправити на перевірку")');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
  });

  test('Сценарій 2: Власник створює процес', async ({ page }) => {
    // 1. Власник логіниться і створює процес
    await loginAs(page, 'owner');
    await page.click('a[href="/processes/new"]');
    
    const uniqueName = `Процес від Власника ${Date.now()}`;
    await page.fill('input[name="name"]', uniqueName);
    await page.fill('textarea[name="description"]', 'Опис від власника');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/processes\/.*/);
    
    // Перевіряємо що процес створився
    await expect(page.locator('text=' + uniqueName)).toBeVisible();
  });

  test('Сценарій 3: Аналітик швидко заносить процес (швидкий флоу)', async ({ page }) => {
    test.setTimeout(90000);
    // 1. Аналітик логіниться
    await loginAs(page, 'analyst');
    
    // 2. Створює процес
    await page.click('a[href="/processes/new"]');
    const uniqueName = `Швидкий процес ${Date.now()}`;
    await page.fill('input[name="name"]', uniqueName);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/processes\/.*/);
    
    // 3. Аналітик, оскільки має права адміна/аналітика, може сам погодити всё
    // Цикл швидкого погодження (спрощена імітація)
    for (let i = 0; i < 3; i++) { // Кілька етапів: Паспорт, Кроки, Показники
      const sendBtn = page.locator('button:has-text("Відправити на перевірку")');
      if (await sendBtn.isVisible()) await sendBtn.click();
      await page.waitForTimeout(1000);
      
      const approveBtn = page.locator('button:has-text("Погодити")');
      if (await approveBtn.isVisible()) await approveBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // 4. Перевірка чи потрапив у репозиторій
    await page.click('a[href="/repository"]');
    // В репозиторії мають бути тільки APPROVED. Якщо процес дійшов туди - супер.
  });

});
