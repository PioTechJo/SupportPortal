import React, { useRef } from 'react';
import { ArrowLeft, Check, Package, ChevronRight, Paperclip, X, FileText, Image as ImageIcon, FileArchive } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getAttachmentIcon = (fileType: string) => {
  if (fileType === 'application/pdf') return <FileText size={16} className="text-red-500 shrink-0" />;
  if (fileType.startsWith('image/')) return <ImageIcon size={16} className="text-blue-500 shrink-0" />;
  return <FileArchive size={16} className="text-slate-500 shrink-0" />;
};

interface Step4DetailsProps {
  productName?: string;
  categoryName?: string;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  attachments: File[];
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (index: number) => void;
  attachmentError: string | null;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export const Step4Details: React.FC<Step4DetailsProps> = ({
  productName, categoryName, title, setTitle, description, setDescription,
  attachments, onAddAttachments, onRemoveAttachment, attachmentError,
  onBack, onSubmit, isSubmitting, error
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFormValid = title.trim() && description.trim();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onAddAttachments(files);
    e.target.value = ''; // allow re-selecting the same file
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px] mb-4">
            <Package size={14} className="text-slate-500" />
            <span className="text-[12px] font-medium text-slate-700">{productName || 'Product'}</span>
            <ChevronRight size={14} className="rtl:rotate-180 text-slate-400" />
            <span className="text-[12px] font-medium text-slate-700">{categoryName || t('wizard.stepCategory')}</span>
          </div>
          <h3 className="text-[18px] font-medium text-slate-800">{t("wizard.issueDetails")}</h3>
          <p className="text-[13px] text-slate-500 mt-1">{t("wizard.pleaseProvide")}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">{t("wizard.subjectTitle")}</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('wizard.briefSummary')}
              className="w-full border border-slate-200 rounded-[8px] px-3 py-2 text-[14px] focus:ring-[#f97316] focus:border-[#f97316] outline-none transition-colors shadow-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">{t("wizard.detailedDescription")}</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened..."
              className="w-full border border-slate-200 rounded-[8px] px-3 py-2 text-[14px] h-32 focus:ring-[#f97316] focus:border-[#f97316] outline-none transition-colors shadow-sm"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              {t("wizard.attachments", { defaultValue: "Attachments (optional)" })}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.zip,application/pdf,image/png,image/jpeg,application/zip"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-[8px] text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors w-full justify-center"
            >
              <Paperclip size={15} />
              {t("wizard.addAttachment", { defaultValue: "Attach files (PDF, PNG, JPG, ZIP — max 5MB each)" })}
            </button>

            {attachmentError && (
              <p className="text-[12px] text-red-600 mt-1.5">{attachmentError}</p>
            )}

            {attachments.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {attachments.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px]">
                    <div className="flex items-center gap-2 min-w-0">
                      {getAttachmentIcon(file.type)}
                      <span className="text-[13px] text-slate-700 truncate">{file.name}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(idx)}
                      className="text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-[8px] text-[13px] font-medium">{error}</div>}
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 border-[0.5px] border-slate-200 rounded-[8px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="rtl:rotate-180" size={16} /> {t('wizard.back')}
        </button>
        <button 
          onClick={onSubmit} 
          disabled={!isFormValid || isSubmitting}
          className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white font-medium text-[14px] py-2 px-4 rounded-[8px] transition-colors flex items-center gap-2"
        >
          {isSubmitting ? 'Submitting...' : 'Submit ticket'} <Check size={16} />
        </button>
      </div>
    </div>
  );
};
