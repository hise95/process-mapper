'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Quote, ImageIcon, Link as LinkIcon, Unlink } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-md max-w-full my-4 border border-border shadow-sm',
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4',
        },
      })
    ],
    content: (content && (content.trim().startsWith('{') || content.trim().startsWith('['))) ? JSON.parse(content) : content,
    onUpdate: ({ editor }) => {
      // CWE-79: Зберігаємо JSON AST замість сирого HTML
      onChange(JSON.stringify(editor.getJSON()));
    },
  });

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Введіть URL зображення (посилання):');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Введіть URL (посилання):', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-md bg-background overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b p-2 bg-muted/50">
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-muted text-primary' : ''}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-muted text-primary' : ''}>
          <Italic className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-muted text-primary' : ''}>
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-muted text-primary' : ''}>
          <Heading3 className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-muted text-primary' : ''}>
          <List className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-muted text-primary' : ''}>
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'bg-muted text-primary' : ''}>
          <Quote className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        <Button type="button" variant="ghost" size="icon" onClick={addImage} title="Додати зображення">
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={setLink} className={editor.isActive('link') ? 'bg-muted text-primary' : ''} title="Додати посилання">
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} title="Видалити посилання">
          <Unlink className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-4 prose prose-neutral dark:prose-invert max-w-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
