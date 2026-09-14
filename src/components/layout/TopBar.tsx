'use client';

import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface TopBarProps {
  title: string;
  fullName: string;
}

export default function TopBar({ title, fullName }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    router.push(pathname + '?' + params.toString());
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch}>
          <Input 
            type="search" 
            placeholder="Пошук..." 
            className="w-64" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
          />
        </form>
        <div className="font-medium">{fullName}</div>
      </div>
    </header>
  );
}