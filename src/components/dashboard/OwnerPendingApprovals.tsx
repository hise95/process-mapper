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
        <Card className="bg-card border border-border">
          <CardContent className="p-8 text-center text-muted-foreground">
            Немає процесів, що очікують вашого погодження.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processes.map(process => (
            <Card key={process.id} className="hover:shadow-md transition-shadow flex flex-col bg-card border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg leading-tight text-foreground">{process.title}</CardTitle>
                <div className="text-sm font-mono text-muted-foreground">{process.code}</div>
              </CardHeader>
              <CardContent className="mt-auto pt-4">
                <div className="text-sm text-foreground/80 mb-1">Менеджер: {process.managerName}</div>
                <div className="text-sm text-muted-foreground mb-4">
                  Подано: {new Date(process.updatedAt).toLocaleDateString('uk-UA')}
                </div>
                <Link href={`/approvals?processId=${process.id}`} className="block w-full">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Переглянути</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
