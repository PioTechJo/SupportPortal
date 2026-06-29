import React, { useState } from 'react';
import { Step1Product } from './Step1Product';
import { Step2Module } from './Step2Module';
import { Step3IssueType } from './Step3IssueType';
import { Step4Questions } from './Step4Questions';
import { Step5Recommendations } from './Step5Recommendations';
import { Step6Resolution } from './Step6Resolution';
import { Step7Summary } from './Step7Summary';

interface SmartTicketWizardProps {
  onCancel: () => void;
  onSubmitTicket: (payload: {
    product: string;
    module: string;
    issueType: string;
    answers: Record<string, any>;
    title: string;
    description: string;
    priority: string;
  }) => Promise<void>;
  organizationId?: string;
}

export const SmartTicketWizard: React.FC<SmartTicketWizardProps> = ({ onCancel, onSubmitTicket, organizationId }) => {
  const [step, setStep] = useState(1);
  
  // Accumulated Payload
  const [productId, setProductId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [issueId, setIssueId] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nextStep = () => setStep(s => Math.min(7, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleDeflection = () => {
    // If the user says their issue is resolved, we just cancel the wizard entirely.
    onCancel();
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Map severity logic
      let priority = 'medium';
      if (answers.severity?.includes('Critical')) priority = 'urgent';
      if (answers.severity?.includes('High')) priority = 'high';
      if (answers.severity?.includes('Low')) priority = 'low';

      // Title logic: Use first few words of description, or fallback
      const desc = answers.desc || 'New Ticket Request';
      const title = desc.length > 50 ? desc.substring(0, 50) + '...' : desc;

      await onSubmitTicket({
        product: productId,
        module: moduleId,
        issueType: issueId,
        answers,
        title,
        description: desc,
        priority
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit ticket. Please check the network tab or console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
      {/* Wizard Progress Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
            <div 
              key={s} 
              className={`h-2 rounded-full transition-all duration-300 ${
                step === s ? 'w-12 bg-teal-500' : 
                s < step ? 'w-8 bg-teal-500/30' : 
                'w-8 bg-slate-200'
              }`}
            />
          ))}
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Step {step} of 7
        </div>
      </div>

      <div className="p-8 flex-1 overflow-y-auto relative">
        {step === 1 && (
          <Step1Product 
            selectedProductId={productId}
            organizationId={organizationId}
            onSelect={setProductId}
            onNext={nextStep}
            onCancel={onCancel}
          />
        )}
        
        {step === 2 && (
          <Step2Module 
            productId={productId}
            selectedModuleId={moduleId}
            onSelect={setModuleId}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {step === 3 && (
          <Step3IssueType 
            selectedIssueId={issueId}
            onSelect={setIssueId}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {step === 4 && (
          <Step4Questions 
            productId={productId}
            moduleId={moduleId}
            issueId={issueId}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {step === 5 && (
          <Step5Recommendations 
            productId={productId}
            moduleId={moduleId}
            issueId={issueId}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {step === 6 && (
          <Step6Resolution 
            onResolved={handleDeflection}
            onContinue={nextStep}
            onBack={prevStep}
          />
        )}

        {step === 7 && (
          <>
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <div>
                  <h4 className="font-bold text-sm">Failed to submit ticket</h4>
                  <p className="text-xs mt-1 opacity-90">{submitError}</p>
                </div>
              </div>
            )}
            <Step7Summary 
              productId={productId}
              moduleId={moduleId}
              issueId={issueId}
              answers={answers}
              onBack={prevStep}
              onSubmit={handleFinalSubmit}
              isSubmitting={isSubmitting}
            />
          </>
        )}
      </div>
    </div>
  );
};
