'use client';

import { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, Activity, Users, CheckCircle, HelpCircle, Edit, Plus, Trash, Save, X,
  Book, BookOpen, AlertTriangle, Shield, Settings, Server, Globe, Database, Key, 
  Lightbulb, MessagesSquare, PlayCircle, Star, Terminal, Zap, Briefcase, GraduationCap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import RichTextEditor from './RichTextEditor';

const ICON_MAP: Record<string, React.ReactNode> = {
  HelpCircle: <HelpCircle className="w-5 h-5" />,
  Activity: <Activity className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  CheckCircle: <CheckCircle className="w-5 h-5" />,
  Book: <Book className="w-5 h-5" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  AlertTriangle: <AlertTriangle className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
  Server: <Server className="w-5 h-5" />,
  Globe: <Globe className="w-5 h-5" />,
  Database: <Database className="w-5 h-5" />,
  Key: <Key className="w-5 h-5" />,
  Lightbulb: <Lightbulb className="w-5 h-5" />,
  MessagesSquare: <MessagesSquare className="w-5 h-5" />,
  PlayCircle: <PlayCircle className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  Terminal: <Terminal className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />
};

interface WikiPage {
  id: string;
  title: string;
  icon: string;
  content: string;
  order: number;
}

export default function WikiContent({ isEditor }: { isEditor?: boolean }) {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WikiPage>>({});
  const [isNew, setIsNew] = useState(false);
  
  const router = useRouter();

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/wiki');
      const data = await res.json();
      setPages(data);
      if (data.length > 0 && !activeTab) {
        setActiveTab(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const activeSection = pages.find(s => s.id === activeTab);

  const handleEdit = () => {
    if (activeSection) {
      setEditForm(activeSection);
      setIsEditing(true);
      setIsNew(false);
    }
  };

  const handleNew = () => {
    setEditForm({ id: `page_${Date.now()}`, title: '', content: '', icon: 'FileText', order: pages.length + 1 });
    setIsEditing(true);
    setIsNew(true);
  };

  const handleSave = async () => {
    try {
      if (isNew) {
        await fetch('/api/wiki', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        setActiveTab(editForm.id!);
      } else {
        await fetch(`/api/wiki/${editForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
      }
      setIsEditing(false);
      await fetchPages();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Видалити сторінку?')) return;
    try {
      await fetch(`/api/wiki/${activeSection?.id}`, { method: 'DELETE' });
      const remaining = pages.filter(p => p.id !== activeSection?.id);
      if (remaining.length > 0) setActiveTab(remaining[0].id);
      else setActiveTab('');
      setIsEditing(false);
      await fetchPages();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div>Завантаження...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Меню зліва */}
      <Card className="w-full md:w-72 shrink-0 bg-muted/20">
        <div className="p-2 space-y-1">
          {pages.map(section => (
            <button
              key={section.id}
              onClick={() => { setActiveTab(section.id); setIsEditing(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === section.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {ICON_MAP[section.icon] || <FileText className="w-5 h-5" />}
              {section.title}
            </button>
          ))}
          {isEditor && (
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-4 rounded-md text-sm font-medium border border-dashed border-primary text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-4 h-4" /> Додати сторінку
            </button>
          )}
        </div>
      </Card>

      {/* Контент справа */}
      <Card className="flex-1 min-h-[500px] w-full">
        <CardContent className="p-6 md:p-8 relative">
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{isNew ? 'Нова сторінка' : 'Редагування сторінки'}</h2>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}><X className="w-4 h-4 mr-2"/> Скасувати</Button>
                  <Button onClick={handleSave} className="bg-[#fa4616] text-white hover:bg-[#d93a10]"><Save className="w-4 h-4 mr-2"/> Зберегти</Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Заголовок</label>
                <Input 
                  value={editForm.title || ''} 
                  onChange={e => setEditForm({...editForm, title: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Іконка</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(ICON_MAP).map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, icon: iconName })}
                      className={`p-2 rounded-md border flex items-center justify-center transition-colors ${
                        editForm.icon === iconName 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                      title={iconName}
                    >
                      {ICON_MAP[iconName]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Контент</label>
                <RichTextEditor 
                  content={editForm.content || ''} 
                  onChange={content => setEditForm({...editForm, content})} 
                />
              </div>
            </div>
          ) : (
            <>
              {isEditor && activeSection && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleEdit}><Edit className="w-4 h-4 mr-1"/> Редагувати</Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}><Trash className="w-4 h-4 mr-1"/> Видалити</Button>
                </div>
              )}
              {activeSection ? (
                <div 
                  className="prose prose-neutral dark:prose-invert max-w-none ProseMirror" 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(activeSection.content, {
                      ALLOWED_TAGS: ['h1','h2','h3','h4','p','ul','ol','li','strong','em','a','br','div','span','code','pre','blockquote','table','thead','tbody','tr','th','td', 'img'],
                      ALLOWED_ATTR: ['href','class','target','rel','src','alt','title','width','height'],
                      ALLOW_DATA_ATTR: false,
                    })
                  }} 
                />
              ) : (
                <div className="text-muted-foreground">Оберіть сторінку зліва або створіть нову.</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
