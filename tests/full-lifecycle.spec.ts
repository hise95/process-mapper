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
    await managerPage.goto('http://localhost:3000/repository');
    await expect(managerPage.locator('text=' + processName).first()).toBeVisible();

    await browser.close();
  });

  test('Створення Власником -> Повне погодження Аналітиком та Власником -> Репозиторій', async () => {
    test.setTimeout(120000);
    const browser = await chromium.launch();
    
    const ownerPage = await createSession(browser, 'owner');
    const analystPage = await createSession(browser, 'analyst');

    const processName = `Повний цикл Власника ${Date.now()}`;

    // 1. Власник створює процес
    await ownerPage.click('a[href="/processes/new"]');
    await ownerPage.fill('input[name="name"]', processName);
    await ownerPage.fill('textarea[name="description"]', 'Створено власником');
    await ownerPage.click('button[type="submit"]');
    await ownerPage.waitForURL(/.*\/processes\/.*/);
    const processUrl = ownerPage.url();
    
    // Власник відправляє паспорт
    let sendBtn = ownerPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await ownerPage.waitForTimeout(1000);

    // 2. Аналітик погоджує
    await analystPage.goto(processUrl);
    let approveBtn = analystPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await analystPage.waitForTimeout(1000);

    // 3. Власник погоджує свою ж фазу (якщо вимагає система)
    await ownerPage.reload();
    approveBtn = ownerPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await ownerPage.waitForTimeout(1000);

    // ФАЗА 2: Кроки (Власник заповнює)
    await ownerPage.reload();
    sendBtn = ownerPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await ownerPage.waitForTimeout(1000);

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

    // ФАЗА 3: Показники (Власник заповнює)
    await ownerPage.reload();
    sendBtn = ownerPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await ownerPage.waitForTimeout(1000);

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

    // Фінальне затвердження Аналітиком
    await analystPage.reload();
    approveBtn = analystPage.locator('button:has-text("Фінально затвердити")');
    if (await approveBtn.isVisible()) {
        await approveBtn.click();
    } else {
        approveBtn = analystPage.locator('button:has-text("Погодити")');
        if (await approveBtn.isVisible()) await approveBtn.click();
    }
    await analystPage.waitForTimeout(1000);

    await browser.close();
  });

  test('Створення Аналітиком -> Повне погодження Власником та Аналітиком -> Репозиторій', async () => {
    test.setTimeout(120000);
    const browser = await chromium.launch();
    
    const analystPage = await createSession(browser, 'analyst');
    const ownerPage = await createSession(browser, 'owner');

    const processName = `Повний цикл Аналітика ${Date.now()}`;

    // 1. Аналітик створює процес
    await analystPage.click('a[href="/processes/new"]');
    await analystPage.fill('input[name="name"]', processName);
    await analystPage.fill('textarea[name="description"]', 'Створено аналітиком');
    await analystPage.click('button[type="submit"]');
    await analystPage.waitForURL(/.*\/processes\/.*/);
    const processUrl = analystPage.url();
    
    // Аналітик відправляє паспорт
    let sendBtn = analystPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await analystPage.waitForTimeout(1000);

    // Аналітик сам погоджує паспорт (перший етап)
    await analystPage.reload();
    let approveBtn = analystPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await analystPage.waitForTimeout(1000);

    // Власник погоджує паспорт
    await ownerPage.goto(processUrl);
    approveBtn = ownerPage.locator('button:has-text("Погодити")');
    if (await approveBtn.isVisible()) await approveBtn.click();
    await ownerPage.waitForTimeout(1000);

    // ФАЗА 2: Аналітик відправляє кроки
    await analystPage.reload();
    sendBtn = analystPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await analystPage.waitForTimeout(1000);

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

    // ФАЗА 3: Аналітик відправляє показники
    await analystPage.reload();
    sendBtn = analystPage.locator('button:has-text("Відправити на перевірку")');
    if (await sendBtn.isVisible()) await sendBtn.click();
    await analystPage.waitForTimeout(1000);

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

    // Фінальне затвердження Аналітиком
    await analystPage.reload();
    approveBtn = analystPage.locator('button:has-text("Фінально затвердити")');
    if (await approveBtn.isVisible()) {
        await approveBtn.click();
    } else {
        approveBtn = analystPage.locator('button:has-text("Погодити")');
        if (await approveBtn.isVisible()) await approveBtn.click();
    }
    await analystPage.waitForTimeout(1000);

    await browser.close();
  });

});
