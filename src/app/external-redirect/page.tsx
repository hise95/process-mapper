'use client'

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function ExternalRedirectContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const [safeUrl, setSafeUrl] = useState<string>('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setError(true);
      return;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        setSafeUrl(parsed.toString());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, [url]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Блокування безпеки</h1>
          <p className="text-gray-700 mb-6">Спроба переходу за небезпечним або непідтримуваним посиланням.</p>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Повернутися на головну</Link>
        </div>
      </div>
    );
  }

  if (!safeUrl) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-lg w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-amber-100 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Перехід за зовнішнім посиланням</h1>
        
        <p className="text-slate-600">
          Ви збираєтесь залишити корпоративний портал та перейти на зовнішній сайт.
        </p>

        <div className="bg-slate-100 p-4 rounded text-left break-all border border-slate-200">
          <code className="text-sm text-slate-700">{safeUrl}</code>
        </div>

        <div className="bg-blue-50 text-blue-800 p-4 rounded text-sm text-left">
          <strong>⚠️ Увага щодо безпеки:</strong>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Ніколи не вводьте свій корпоративний пароль на зовнішніх сайтах.</li>
            <li>Перевіряйте адресу сайту, перш ніж щось завантажувати.</li>
            <li>Адміністрація порталу не несе відповідальності за вміст сторонніх ресурсів.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <a
            href={safeUrl}
            className="flex-1 bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 transition font-medium text-center"
            rel="noopener noreferrer"
          >
            Зрозуміло, перейти
          </a>
          <button
            onClick={() => window.history.back()}
            className="flex-1 bg-slate-200 text-slate-800 py-2 px-4 rounded-md hover:bg-slate-300 transition font-medium"
          >
            Повернутися назад
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExternalRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Завантаження...</div>}>
      <ExternalRedirectContent />
    </Suspense>
  );
}
