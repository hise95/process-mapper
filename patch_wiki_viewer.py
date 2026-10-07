import sys

with open("src/components/wiki/WikiContent.tsx", "r") as f:
    code = f.read()

import re

# Add imports for Tiptap
imports = """import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';

// CWE-79: Safe JSON AST Viewer (Replaces dangerouslySetInnerHTML)
function ReadOnlyViewer({ content }: { content: string }) {
  const isJson = content && (content.trim().startsWith('{') || content.trim().startsWith('['));
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ inline: true, allowBase64: true, HTMLAttributes: { class: 'rounded-md max-w-full my-4 border border-border shadow-sm' } }),
      LinkExtension.configure({ openOnClick: true, HTMLAttributes: { class: 'text-primary underline underline-offset-4' } })
    ],
    content: isJson ? JSON.parse(content) : content,
    editable: false,
  }, [content]);

  if (!editor) return null;
  return <EditorContent editor={editor} className="prose prose-neutral dark:prose-invert max-w-none ProseMirror" />;
}
"""

if "ReadOnlyViewer" not in code:
    code = code.replace("import DOMPurify from 'dompurify';", imports)
else:
    code = code.replace("import DOMPurify from 'dompurify';", "")

# Replace dangerouslySetInnerHTML with ReadOnlyViewer
old_render = """<div 
                  className="prose prose-neutral dark:prose-invert max-w-none ProseMirror" 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(activeSection.content, {
                      ALLOWED_TAGS: ['h1','h2','h3','h4','p','ul','ol','li','strong','em','a','br','div','span','code','pre','blockquote','table','thead','tbody','tr','th','td', 'img'],
                      ALLOWED_ATTR: ['href','class','target','rel','src','alt','title','width','height'],
                      ALLOW_DATA_ATTR: false,
                    })
                  }} 
                />"""

new_render = """<ReadOnlyViewer content={activeSection.content} />"""

code = code.replace(old_render, new_render)

with open("src/components/wiki/WikiContent.tsx", "w") as f:
    f.write(code)
print("Patched WikiContent Viewer")
