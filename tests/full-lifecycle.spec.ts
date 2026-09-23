import { test, expect, chromium } from '@playwright/test';

const USERS = {
  analyst: { email: 'analyst@company.com', pass: 'password123' },
  owner: { email: 'owner@company.com', pass: 'password123' },
  manager: { email: 'manager@company.com', pass: 'password123' },
};

async function createSession(browser, userType: keyof typeof USERS) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', USERS[userType].email);
  await page.fill('input[type="password"]', USERS[userType].pass);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*\/dashboard|.*\/repository/);
  return page;
}

test.describe('Повний життєвий цикл процесу', () => {

  test('Створення Менеджером -> Повне погодження всіма ролями -> Репозиторій', async () => {
    test.setTimeout(120000); // 2 хвилини на повний цикл
    const browser = await chromium.launch();
    
    // Створюємо 3 паралельні сесії для 3 ролей
    const managerPage = await createSession(browser, 'manager');
    const analystPage = await createSession(browser, 'analyst');
    const ownerPage = await createSession(browser, 'owner');

    const processName = `Повний цикл Менеджера ${Date.now()}`;

    // === ФАЗА 1: ПАСПОРТ ===
    // 1. Менеджер створює процес
    await managerPage.click('a[href="/processes/new"]');
    await managerPage.fill('input[name="name"]', processName);
    await managerPage.fill('textarea[name="description"]', 'Тестовий опис для повного циклу');
    await managerPage.click('button[type="submit"]');
    await managerPage.waitForURL(/.*\/processes\/.*/);
    const processUrl = managerPage.url();
    
    // Менеджер відправляє паспорт на перевірку
    let sendBtn = managerPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await managerPage.waitForTimeout(1000);

    // 2. Аналітик погоджує паспорт
    await analystPage.goto(processUrl);
    let approveBtn = analystPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await analystPage.waitForTimeout(1000);

    // 3. Власник погоджує паспорт
    await ownerPage.goto(processUrl);
    approveBtn = ownerPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await ownerPage.waitForTimeout(1000);

    // === ФАЗА 2: КРОКИ ПРОЦЕСУ ===
    // Менеджер переходить до етапу кроків і відправляє їх
    await managerPage.reload();
    sendBtn = managerPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await managerPage.waitForTimeout(1000);

    // Аналітик погоджує кроки
    await analystPage.reload();
    approveBtn = analystPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await analystPage.waitForTimeout(1000);

    // Власник погоджує кроки
    await ownerPage.reload();
    approveBtn = ownerPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await ownerPage.waitForTimeout(1000);

    // === ФАЗА 3: ПОКАЗНИКИ ПРОЦЕСУ ===
    // Менеджер переходить до показників і відправляє
    await managerPage.reload();
    sendBtn = managerPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await managerPage.waitForTimeout(1000);

    // Аналітик погоджує показники
    await analystPage.reload();
    approveBtn = analystPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await analystPage.waitForTimeout(1000);

    // Власник погоджує показники
    await ownerPage.reload();
    approveBtn = ownerPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await ownerPage.waitForTimeout(1000);

    // === ФІНАЛЬНЕ ПОГОДЖЕННЯ ===
    // Аналітик робить фінальне затвердження (FINAL_APPROVAL_ANALYST -> APPROVED)
    await analystPage.reload();
    approveBtn = analystPage.locator('button:has-text("Фінально затвердити")'); // Або просто "Погодити"
    if (await approveBtn.isVisible()) {
        await approveBtn.click();
    } else {
        approveBtn = analystPage.locator('button:has-text("Погодити")');
        if (await approveBtn.isVisible()) await approveBtn.click();
    }
    await analystPage.waitForTimeout(1000);

    // === ПЕРЕВІРКА РЕПОЗИТОРІЮ ===
    // Працівник (або будь-хто інший) має побачити цей процес в репозиторії
    await managerPage.goto('http://localhost:3000/repository');
    await expect(managerPage.locator('text=' + processName).first()).toBeVisible();

    await browser.close();
  });

});
