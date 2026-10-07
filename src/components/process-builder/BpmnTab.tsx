'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function BpmnTab({ processId, initialUrl, readonly = false }: { processId: string, initialUrl: string, readonly?: boolean }) {
  const [url, setUrl] = useState(initialUrl || '');

  const handleSave = async () => {
    await fetch(`/api/processes/${processId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bpmnUrl: url }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Посилання на BPMN схему</Label>
        <div className="flex gap-2">
          <Input 
            disabled={readonly}
            value={url} 
            onChange={e => setUrl(e.target.value)} 
            placeholder="https://..." 
          />
          {!readonly && <Button onClick={handleSave}>Зберегти</Button>}
        </div>
        <p className="text-sm text-muted-foreground">
          Намалюйте схему в Camunda або bpmn.io, збережіть на Google Диск та вставте посилання
        </p>
      </div>

      {url && (
        <div className="mt-4 border rounded-md p-4">
          <a href={`/external-redirect?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
            Відкрити схему
          </a>
        </div>
      )}
    </div>
  );
}
