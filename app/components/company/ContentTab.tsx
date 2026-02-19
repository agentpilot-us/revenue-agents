'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw } from 'lucide-react';

type DepartmentOption = {
  id: string;
  customName: string | null;
  type: string;
};

type ContentData = {
  emailSubject: string | null;
  emailBody: string | null;
  linkedinMessage: string | null;
  talkTrack: string | null;
};

type Props = {
  companyId: string;
  companyName: string;
  departments: DepartmentOption[];
};

export function ContentTab({ companyId, companyName, departments }: Props) {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(
    departments.length > 0 ? departments[0].id : null
  );
  const [content, setContent] = useState<ContentData>({
    emailSubject: null,
    emailBody: null,
    linkedinMessage: null,
    talkTrack: null,
  });
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editedContent, setEditedContent] = useState<ContentData>(content);

  useEffect(() => {
    if (selectedDepartmentId) {
      loadContent(selectedDepartmentId);
    }
  }, [selectedDepartmentId, companyId]);

  const loadContent = async (departmentId: string) => {
    try {
      const res = await fetch(
        `/api/companies/${companyId}/content?departmentId=${departmentId}`
      );
      if (res.ok) {
        const data = await res.json();
        setContent(data);
        setEditedContent(data);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
    }
  };

  const generateContent = async (contentType: 'email' | 'linkedin' | 'talk_track') => {
    if (!selectedDepartmentId) return;

    setGenerating((prev) => ({ ...prev, [contentType]: true }));
    try {
      const res = await fetch(`/api/companies/${companyId}/content/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          departmentId: selectedDepartmentId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (contentType === 'email') {
          // Parse email - look for "Subject:" line
          const lines = data.content.split('\n');
          let subject = '';
          let bodyStart = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().startsWith('subject:')) {
              subject = lines[i].replace(/^subject:\s*/i, '').trim();
              bodyStart = i + 1;
              // Skip blank line after subject
              if (lines[bodyStart]?.trim() === '') bodyStart++;
              break;
            }
          }
          const body = lines.slice(bodyStart).join('\n').trim();
          setContent((prev) => ({
            ...prev,
            emailSubject: subject,
            emailBody: body,
          }));
          setEditedContent((prev) => ({
            ...prev,
            emailSubject: subject,
            emailBody: body,
          }));
          // Save both subject and body
          if (subject) {
            await saveContentField('email_subject', subject);
          }
          if (body) {
            await saveContentField('email_body', body);
          }
        } else if (contentType === 'linkedin') {
          setContent((prev) => ({ ...prev, linkedinMessage: data.content }));
          setEditedContent((prev) => ({ ...prev, linkedinMessage: data.content }));
          await saveContentField('linkedin_message', data.content);
        } else if (contentType === 'talk_track') {
          setContent((prev) => ({ ...prev, talkTrack: data.content }));
          setEditedContent((prev) => ({ ...prev, talkTrack: data.content }));
          await saveContentField('talk_track', data.content);
        }
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setGenerating((prev) => ({ ...prev, [contentType]: false }));
    }
  };

  const saveContentField = async (contentType: string, content: string) => {
    if (!selectedDepartmentId) return;
    try {
      await fetch(`/api/companies/${companyId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: selectedDepartmentId,
          contentType,
          content,
        }),
      });
    } catch (error) {
      console.error('Failed to auto-save content:', error);
    }
  };

  const saveContent = async (field: keyof ContentData) => {
    if (!selectedDepartmentId) return;

    try {
      const contentTypeMap: Record<keyof ContentData, string> = {
        emailSubject: 'email_subject',
        emailBody: 'email_body',
        linkedinMessage: 'linkedin_message',
        talkTrack: 'talk_track',
      };

      const res = await fetch(`/api/companies/${companyId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: selectedDepartmentId,
          contentType: contentTypeMap[field],
          content: editedContent[field] || '',
        }),
      });
      if (res.ok) {
        setContent({ ...editedContent });
        setEditing((prev) => ({ ...prev, [field]: false }));
      }
    } catch (error) {
      console.error('Failed to save content:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const selectedDept = departments.find((d) => d.id === selectedDepartmentId);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Content Generation
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Buying Group
          </label>
          <select
            value={selectedDepartmentId || ''}
            onChange={(e) => setSelectedDepartmentId(e.target.value || null)}
            className="w-full p-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
          >
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.customName || dept.type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDepartmentId && (
        <>
          {/* Email Copy */}
          <ContentBlock
            title="Email Copy"
            content={editedContent.emailBody}
            subject={editedContent.emailSubject}
            isEditing={editing.emailBody || editing.emailSubject}
            onEdit={() => {
              setEditing({ emailBody: true, emailSubject: true });
            }}
            onCancel={() => {
              setEditedContent({ ...content });
              setEditing({ emailBody: false, emailSubject: false });
            }}
            onSave={async () => {
              await saveContent('emailSubject');
              await saveContent('emailBody');
            }}
            onGenerate={() => generateContent('email')}
            generating={generating.email}
            onCopy={() => {
              const fullEmail = editedContent.emailSubject
                ? `Subject: ${editedContent.emailSubject}\n\n${editedContent.emailBody || ''}`
                : editedContent.emailBody || '';
              copyToClipboard(fullEmail);
            }}
            onSubjectChange={(value) =>
              setEditedContent((prev) => ({ ...prev, emailSubject: value }))
            }
            onContentChange={(value) =>
              setEditedContent((prev) => ({ ...prev, emailBody: value }))
            }
          />

          {/* LinkedIn Message */}
          <ContentBlock
            title="LinkedIn Message"
            content={editedContent.linkedinMessage}
            isEditing={editing.linkedinMessage}
            onEdit={() => setEditing((prev) => ({ ...prev, linkedinMessage: true }))}
            onCancel={() => {
              setEditedContent((prev) => ({ ...prev, linkedinMessage: content.linkedinMessage }));
              setEditing((prev) => ({ ...prev, linkedinMessage: false }));
            }}
            onSave={() => saveContent('linkedinMessage')}
            onGenerate={() => generateContent('linkedin')}
            generating={generating.linkedin}
            onCopy={() => copyToClipboard(editedContent.linkedinMessage || '')}
            onContentChange={(value) =>
              setEditedContent((prev) => ({ ...prev, linkedinMessage: value }))
            }
          />

          {/* Talk Track */}
          <ContentBlock
            title="Talk Track"
            content={editedContent.talkTrack}
            isEditing={editing.talkTrack}
            onEdit={() => setEditing((prev) => ({ ...prev, talkTrack: true }))}
            onCancel={() => {
              setEditedContent((prev) => ({ ...prev, talkTrack: content.talkTrack }));
              setEditing((prev) => ({ ...prev, talkTrack: false }));
            }}
            onSave={() => saveContent('talkTrack')}
            onGenerate={() => generateContent('talk_track')}
            generating={generating.talk_track}
            onCopy={() => copyToClipboard(editedContent.talkTrack || '')}
            onContentChange={(value) =>
              setEditedContent((prev) => ({ ...prev, talkTrack: value }))
            }
          />
        </>
      )}
    </div>
  );
}

function ContentBlock({
  title,
  content,
  subject,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onGenerate,
  generating,
  onCopy,
  onContentChange,
  onSubjectChange,
}: {
  title: string;
  content: string | null;
  subject?: string | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onGenerate: () => void;
  generating: boolean;
  onCopy: () => void;
  onContentChange: (value: string) => void;
  onSubjectChange?: (value: string) => void;
}) {
  const hasContent = content || subject;

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="flex gap-2">
          {hasContent && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onCopy}
                className="flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onGenerate}
                disabled={generating}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </>
          )}
          {!hasContent && (
            <Button size="sm" onClick={onGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          )}
        </div>
      </div>

      {hasContent ? (
        isEditing ? (
          <div className="space-y-4">
            {subject !== undefined && onSubjectChange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject || ''}
                  onChange={(e) => onSubjectChange(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                  placeholder="Email subject"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                value={content || ''}
                onChange={(e) => onContentChange(e.target.value)}
                className="w-full p-3 border rounded-lg min-h-[200px] dark:bg-zinc-700 dark:border-zinc-600"
                placeholder={`Enter ${title.toLowerCase()}...`}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {subject && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Subject</div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{subject}</p>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Content</div>
              <div className="relative group">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg">
                  {content}
                </pre>
                <button
                  onClick={onEdit}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-4">No {title.toLowerCase()} generated yet.</p>
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? 'Generating...' : `Generate ${title}`}
          </Button>
        </div>
      )}
    </div>
  );
}
