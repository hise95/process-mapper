'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Process {
  id: string;
  title: string;
  code: string;
  managerName: string;
  updatedAt: string;
}

interface OwnerPendingApprovalsProps {
  processes: Process[];
}

export default function OwnerPendingApprovals({ processes }: OwnerPendingApprovalsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Очікують погодження</h2>

      {processes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Немає процесів, що очікують вашого погодження.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processes.map(process => (
            <Card key={process.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg leading-tight">{process.title}</CardTitle>
                <div className="text-sm font-mono text-slate-500">{process.code}</div>
              </CardHeader>
              <CardContent className="mt-auto pt-4">
                <div className="text-sm text-slate-600 mb-1">Менеджер: {process.managerName}</div>
                <div className="text-sm text-slate-500 mb-4">
                  Подано: {new Date(process.updatedAt).toLocaleDateString('uk-UA')}
                </div>
                <Link href={`/approvals?processId=${process.id}`} className="block w-full">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">Переглянути</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
