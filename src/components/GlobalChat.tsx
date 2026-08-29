'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Bot } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import DocsConsultantChat from '@/app/guideline/components/DocsConsultantChat';

export const GlobalChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useAppStore();
  const t = getT(settings.locale);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 md:w-96 h-[500px] flex flex-col shadow-2xl rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
                <Bot className="text-primary" size={20} />
                <h3 className="font-semibold text-sm">{t.aiAssistantTitle}</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 scrollbar-thin overflow-y-auto">
             <DocsConsultantChat config={settings.aiConfig} locale={settings.locale} t={t} className="p-4" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};
