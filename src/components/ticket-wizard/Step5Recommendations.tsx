import React, { useMemo } from 'react';
import { ArrowRight, ArrowLeft, Lightbulb, BookOpen, Wrench } from 'lucide-react';
import wizardConfig from './wizardConfig.json';

interface Step5RecommendationsProps {
  productId: string;
  moduleId: string;
  issueId: string;
  onNext: () => void;
  onBack: () => void;
}

export const Step5Recommendations: React.FC<Step5RecommendationsProps> = ({ 
  productId,
  moduleId,
  issueId,
  onNext,
  onBack
}) => {
  const recommendations = useMemo(() => {
    const configKey = `${productId}_${moduleId}_${issueId}`;
    const dynamicRecs = (wizardConfig.recommendations as any)[configKey];
    const defaultRecs = (wizardConfig.recommendations as any)["default"];
    return dynamicRecs || defaultRecs;
  }, [productId, moduleId, issueId]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4">
          <Lightbulb size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI Recommendations</h2>
        <p className="text-slate-500 font-medium max-w-lg mx-auto">Based on your answers, our AI suggests reviewing the following resources before submitting the ticket.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
        {/* Knowledge Base Articles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <BookOpen className="text-teal-600" size={20} />
            <h3 className="font-bold text-slate-800">Knowledge Base Articles</h3>
          </div>
          <ul className="space-y-3">
            {recommendations.articles.map((article: any) => (
              <li key={article.id}>
                <a href={article.url} className="text-sm font-medium text-teal-600 hover:text-teal-800 hover:underline flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{article.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Troubleshooting Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <Wrench className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-800">Recommended Steps</h3>
          </div>
          <ul className="space-y-3">
            {recommendations.actions.map((action: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <span className="text-sm text-slate-700">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-100 max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={onNext}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
        >
          I've tried these, continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
