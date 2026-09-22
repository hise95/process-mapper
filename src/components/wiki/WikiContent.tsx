'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Activity, Users, CheckCircle, HelpCircle } from 'lucide-react';

const WIKI_SECTIONS = [
  {
    id: 'bpmn',
    title: 'Як правильно малювати BPMN',
    icon: <HelpCircle className="w-5 h-5" />,
    content: (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Основи моделювання в BPMN</h2>
        <p>
          BPMN (Business Process Model and Notation) — це стандарт для моделювання бізнес-процесів. Основна мета — зробити процеси зрозумілими для всіх: від аналітиків до розробників.
        </p>
        <h3 className="text-lg font-medium mt-6 mb-2">Основні елементи:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Події (Кружечки):</strong> Те, що відбувається (наприклад, &quot;Отримано заявку&quot;). Завжди є Початкова та Кінцева події.</li>
          <li><strong>Задачі (Прямокутники з округлими кутами):</strong> Конкретна дія, яку виконує людина або система. Дієслово + Іменник (&quot;Перевірити договір&quot;).</li>
          <li><strong>Шлюзи (Ромби):</strong> Точки прийняття рішень (наприклад, &quot;Чи схвалено документ?&quot;). Від них йдуть стрілки &quot;Так&quot; і &quot;Ні&quot;.</li>
          <li><strong>Доріжки (Pools & Lanes):</strong> Відображають учасників процесу. Кожна доріжка — це окрема роль (наприклад, &quot;Менеджер&quot;, &quot;Бухгалтер&quot;).</li>
        </ul>
        <div className="bg-muted p-4 rounded-md mt-6">
          <h4 className="font-medium text-foreground mb-1">💡 Порада:</h4>
          <p className="text-sm text-muted-foreground">Намагайтеся не перевантажувати одну схему. Якщо процес має більше 15-20 кроків, краще розбити його на підпроцеси.</p>
        </div>
      </div>
    )
  },
  {
    id: 'kpis',
    title: 'Як визначати показники',
    icon: <Activity className="w-5 h-5" />,
    content: (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Визначення показників процесу</h2>
        <p>
          Показники допомагають зрозуміти, наскільки ефективно працює ваш процес.
        </p>
        <h3 className="text-lg font-medium mt-6 mb-2">Які бувають показники:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Показники часу:</strong> Скільки часу займає виконання процесу (наприклад, &quot;Час обробки заявки — не більше 2 годин&quot;).</li>
          <li><strong>Показники якості:</strong> Відсоток помилок або повернень (наприклад, &quot;Кількість заявок з помилками &lt; 5%&quot;).</li>
          <li><strong>Показники вартості:</strong> Скільки ресурсів витрачається на одне виконання.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'passport',
    title: 'Заповнення паспорта процесу',
    icon: <FileText className="w-5 h-5" />,
    content: (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Що таке паспорт процесу?</h2>
        <p>
          Паспорт — це базовий документ, який описує суть процесу ще до того, як ми починаємо малювати його кроки (схему).
        </p>
        <h3 className="text-lg font-medium mt-6 mb-2">Ключові поля:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Вхід:</strong> Що запускає процес (який документ або подія).</li>
          <li><strong>Вихід:</strong> Який фінальний результат процесу.</li>
          <li><strong>Постачальник входу:</strong> Хто дає нам вхідні дані.</li>
          <li><strong>Клієнт процесу:</strong> Хто отримує результат (вихід).</li>
        </ul>
      </div>
    )
  },
  {
    id: 'roles',
    title: 'Ролі та права доступу',
    icon: <Users className="w-5 h-5" />,
    content: (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Матриця ролей в системі</h2>
        <div className="space-y-4">
          <div className="border rounded-md p-4">
            <h3 className="font-semibold text-primary">👑 Адміністратор / Процесний аналітик</h3>
            <p className="text-sm mt-1 text-muted-foreground">Мають повний доступ. Можуть створювати будь-які процеси, керувати архітектурою (деревом), призначати менеджерів та власників, а також погоджувати етапи за будь-кого.</p>
          </div>
          <div className="border rounded-md p-4">
            <h3 className="font-semibold text-primary">👔 Власник процесу (Owner)</h3>
            <p className="text-sm mt-1 text-muted-foreground">Відповідає за результат процесу. Погоджує паспорт, кроки та показники. Бачить тільки свої процеси.</p>
          </div>
          <div className="border rounded-md p-4">
            <h3 className="font-semibold text-primary">💼 Менеджер процесу</h3>
            <p className="text-sm mt-1 text-muted-foreground">Безпосередньо описує процес (заповнює паспорт, додає BPMN). Відправляє процес на перевірку Аналітику та Власнику.</p>
          </div>
          <div className="border rounded-md p-4">
            <h3 className="font-semibold text-primary">👥 Працівник</h3>
            <p className="text-sm mt-1 text-muted-foreground">Має доступ лише до Репозиторію (бібліотеки). Може переглядати вже затверджені процеси та інструкції. Не бачить чернеток.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'approvals',
    title: 'Як працює погодження',
    icon: <CheckCircle className="w-5 h-5" />,
    content: (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Життєвий цикл процесу</h2>
        <p>У системі реалізовано 3-фазну модель погодження:</p>
        <ol className="list-decimal pl-5 space-y-3 mt-4">
          <li><strong>Фаза 1: Паспорт.</strong> Спочатку погоджується загальна суть процесу.</li>
          <li><strong>Фаза 2: Кроки (BPMN).</strong> Після паспорта розробляється детальна схема (BPMN).</li>
          <li><strong>Фаза 3: Показники.</strong> Коли процес зрозумілий, для нього встановлюються показники ефективності.</li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          Кожна фаза проходить перевірку спочатку <strong>Аналітиком</strong> (перевірка методології), а потім <strong>Власником</strong> (погодження суті по бізнесу). Тільки після проходження всіх 3 фаз процес публікується в Репозиторій.
        </p>
      </div>
    )
  }
];

export default function WikiContent() {
  const [activeTab, setActiveTab] = useState(WIKI_SECTIONS[0].id);

  const activeSection = WIKI_SECTIONS.find(s => s.id === activeTab);

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Меню зліва */}
      <Card className="w-full md:w-72 shrink-0 bg-muted/20">
        <div className="p-2 space-y-1">
          {WIKI_SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === section.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {section.icon}
              {section.title}
            </button>
          ))}
        </div>
      </Card>

      {/* Контент справа */}
      <Card className="flex-1 min-h-[500px]">
        <CardContent className="p-6 md:p-8">
          {activeSection?.content}
        </CardContent>
      </Card>
    </div>
  );
}
