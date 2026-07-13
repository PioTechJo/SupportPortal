import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Step0Customer } from './Step0Customer';
import { Step1Product } from './Step1Product';
import { Step2Category } from './Step2Category';
import { Step3Questions } from './Step3Questions';
import { StepChat } from './StepChat';
import { Step4Details } from './Step4Details';
import { X, Check, Brain, AlertCircle, Loader2 } from 'lucide-react';

interface TicketCreationWizardProps {
  onClose?: () => void;
  onCancel?: () => void;
  onSuccess?: (ticketId: string, title: string, productName: string) => void;
}

export const TicketCreationWizard: React.FC<TicketCreationWizardProps> = ({ onClose, onCancel, onSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [newStatusId, setNewStatusId] = useState<string | null>(null);
  const [defaultPriorityId, setDefaultPriorityId] = useState<string | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Extra Info for display/submission
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [matchedRecommendation, setMatchedRecommendation] = useState<any>(null);
  
  const [duplicateTickets, setDuplicateTickets] = useState<any[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);

  const initialized = useRef(false);

  useEffect(() => {
    if (!user) return; // Wait until user is fully loaded
    if (initialized.current) return;
    initialized.current = true;

    // Determine if admin
    const checkAdmin = async () => {
      const { data, error } = await supabase.rpc('is_admin', { uid: user.id });
      if (!error && data) {
        setIsAdmin(true);
        setCurrentStep(0);
      } else {
        // Skip customer step for non-admins
        setSelectedCustomerId(user.customer_id || '');
        setCurrentStep(1);
      }
    };
    checkAdmin();

    // Fetch NEW status_id
    const fetchStatusId = async () => {
      const { data } = await supabase
        .from('ticket_statuses')
        .select('id')
        .eq('status_code', 'NEW')
        .single();
      if (data) setNewStatusId(data.id);
    };
    fetchStatusId();

    // Fetch MEDIUM priority_id
    const fetchPriorityId = async () => {
      const { data } = await supabase
        .from('priorities')
        .select('id')
        .eq('priority_code', 'MEDIUM')
        .maybeSingle();
      if (data) setDefaultPriorityId(data.id);
    };
    fetchPriorityId();
  }, [user]);

  const checkForDuplicates = async () => {
    setIsCheckingDuplicates(true);
    setDuplicateTickets([]);
    
    try {
      const { data: candidates, error } = await supabase
        .from('tickets')
        .select(`
          id, subject, created_at, 
          ticket_statuses(status_name, status_code),
          ticket_answers(question_id, answer_value)
        `)
        .eq('customer_id', selectedCustomerId)
        .eq('product_id', selectedProductId)
        .eq('category_id', selectedCategoryId);
        
      if (error) {
        console.error('Error fetching candidate tickets:', error);
        return;
      }
      
      const currentAnswerKeys = Object.keys(answers);
      if (currentAnswerKeys.length === 0) return; // Skip if no answers were provided
      
      const exactMatches = (candidates || []).filter(ticket => {
        const tAnswers = ticket.ticket_answers || [];
        
        // Exact match of length (must have answered same number of questions)
        if (tAnswers.length !== currentAnswerKeys.length) return false;
        
        // Every answer must match EXACTLY
        return tAnswers.every((ta: any) => answers[ta.question_id] === ta.answer_value);
      });
      
      // Sort newest first
      exactMatches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setDuplicateTickets(exactMatches);
    } catch (err) {
      console.error('Error checking duplicates:', err);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Please provide a title and description.');
      return;
    }
    if (!newStatusId) {
      setError('System error: NEW status lookup failed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 0. Calculate Severity Score
      let diagnosticScore = 0;
      let finalPriorityId = defaultPriorityId;
      let isAutoFlagged = true; // Always auto-flagged based on diagnostic logic
      let scorePercentage = 30; // Default if 0 questions answered
      
      const answerEntries = Object.entries(answers);
      const answeredCount = answerEntries.length;
      let maxPossibleScore = 0;

      if (answeredCount > 0) {
        // Fetch all point values for these answers
        const questionIds = answerEntries.map(e => e[0]);
        const { data: optionsData } = await supabase
          .from('ai_question_options')
          .select('question_id, option_value, point_value')
          .in('question_id', questionIds);
          
        if (optionsData) {
          answerEntries.forEach(([qId, val]) => {
            const opt = optionsData.find(o => o.question_id === qId && o.option_value === val);
            if (opt && opt.point_value) {
              diagnosticScore += Number(opt.point_value);
            }
          });
        }
        
        maxPossibleScore = answeredCount * 10; // Assuming max 10 points per question
        scorePercentage = maxPossibleScore > 0 ? (diagnosticScore / maxPossibleScore) * 100 : 0;
      }
      
      // Determine priorityName based on scorePercentage
      let priorityName = 'Low';
      if (scorePercentage >= 90) {
        priorityName = 'Critical';
      } else if (scorePercentage >= 70) {
        priorityName = 'Urgent';
      } else if (scorePercentage >= 50) {
        priorityName = 'High';
      } else if (scorePercentage >= 30) {
        priorityName = 'Medium';
      }
      
      console.log('[DEBUG] Severity Calculation:', {
        answeredCount,
        diagnosticScore,
        maxPossibleScore,
        scorePercentage,
        priorityName
      });
      
      // Fetch corresponding priority ID
      const { data: targetPriorityData } = await supabase
        .from('priorities')
        .select('id')
        .eq('priority_name', priorityName)
        .maybeSingle();
        
      if (targetPriorityData) {
        finalPriorityId = targetPriorityData.id;
      } else {
        // Fallback if priority doesn't exist
        isAutoFlagged = false; 
      }

      // 0.5. Calculate SLA Due Date
      let slaDays = 3; // Default for Medium
      const settingKey = `sla_days_${priorityName.toLowerCase()}`;
      const { data: slaSetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .maybeSingle();
        
      if (slaSetting?.setting_value) {
        slaDays = parseInt(slaSetting.setting_value);
      }
      
      const createdAt = new Date();
      const slaDueDate = new Date(createdAt);
      slaDueDate.setDate(slaDueDate.getDate() + slaDays);

      // 1. Create Ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          subject: title,
          description,
          customer_id: selectedCustomerId,
          product_id: selectedProductId,
          category_id: selectedCategoryId,
          status_id: newStatusId,
          priority_id: finalPriorityId,
          priority_auto_flagged: isAutoFlagged,
          diagnostic_score: diagnosticScore,
          created_by: user?.id,
          created_at: createdAt.toISOString(),
          sla_due_date: slaDueDate.toISOString(),
          chatbot_transcript: chatHistory.length > 0 ? chatHistory : null
        })
        .select('id, ticket_no')
        .single();

      if (ticketError) throw ticketError;

      // 1.5. Notify Admins and Send Emails
      try {
        const { data: adminRows, error: adminFetchError } = await supabase.rpc('get_admin_user_ids');
        if (adminFetchError) {
          console.error('Error fetching admin IDs:', adminFetchError);
        }
        const adminIds = (adminRows || []).map((row: any) => row.id);
        const ticketNo = ticket.ticket_no;

        if (adminIds.length > 0) {
          const notificationsPayload = adminIds.map((adminId: string) => ({
            profile_id: adminId,
            content: `New ticket #${ticketNo} created.`,
            type: 'new_ticket',
            is_read: false,
            link_ticket_id: ticket.id,
            created_at: new Date().toISOString()
          }));
          
          const { error: insertError } = await supabase.from('notifications').insert(notificationsPayload);
          if (insertError) {
            console.error("Supabase notification insert error:", insertError);
          }

          // Fetch admin emails
          const { data: adminUsers } = await supabase.from('users').select('email').in('id', adminIds);
          const adminEmails = adminUsers?.map(u => u.email).filter(Boolean) || [];

          // Send email to each admin (fire and forget)
          adminEmails.forEach(email => {
            supabase.functions.invoke('send-email', {
              body: {
                to: email,
                subject: `New ticket ${ticketNo} has been created by ${user?.email || 'Customer'} - ${title}`,
                body: `Hello Admin,\n\nA new ticket has been created:\n\nTicket No: ${ticketNo}\nSubject: ${title}\nCreated By: ${user?.email || 'Customer'}\n\nPlease review the ticket in the admin portal.`,
                ticket_id: ticket.id
              }
            }).catch(err => console.error("Error sending email to admin:", err));
          });
        }
        
        // Send email to the customer
        if (user?.email) {
          supabase.functions.invoke('send-email', {
            body: {
              to: user.email,
              subject: `Your ticket ${ticketNo} has been created`,
              body: `Hello,\n\nYour ticket ${ticketNo} has been created and is being reviewed.\n\nSubject: ${title}\n\nWe will get back to you shortly.`,
              ticket_id: ticket.id
            }
          }).catch(err => console.error("Error sending email to customer:", err));
        }
      } catch (notifErr) {
        console.error("Could not post system alerts / send emails", notifErr);
      }

      // 2. Insert Answers
      const answerInserts = Object.entries(answers).map(([questionId, value]) => ({
        ticket_id: ticket.id,
        question_id: questionId,
        answer_value: value
      }));

      if (answerInserts.length > 0) {
        const { error: answersError } = await supabase
          .from('ticket_answers')
          .insert(answerInserts);
        if (answersError) throw answersError;
      }

      // 3. Recommendation Matching
      const { data: rules } = await supabase
        .from('recommendation_rules')
        .select('*')
        .eq('category_id', selectedCategoryId);

      const matchedRule = rules?.find(rule => {
        const criteria = rule.match_criteria as Record<string, string>;
        if (!criteria || Object.keys(criteria).length === 0) return false;
        
        return Object.entries(criteria).every(
          ([questionId, expectedAnswer]) => answers[questionId] === expectedAnswer
        );
      });

      if (matchedRule) {
        const { error: recError } = await supabase
          .from('ai_recommendations')
          .insert({
            ticket_id: ticket.id,
            recommendation_text: matchedRule.recommendation_text,
            confidence_score: matchedRule.confidence_score || 50
          });

        if (recError) {
          console.error('Recommendation insert error:', recError);
        } else {
          console.log('Recommendation saved:', matchedRule.recommendation_text);
        }
        
        setMatchedRecommendation(matchedRule);
      }

      // Success
      if (onSuccess) {
        onSuccess(ticket.id, title, selectedProductName);
      }
      setCreatedTicketId(ticket.id);
      setCurrentStep(6);
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to create ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Step0Customer 
            selectedCustomerId={selectedCustomerId}
            onSelect={(id) => {
              setSelectedCustomerId(id);
              setCurrentStep(1);
            }}
          />
        );
      case 1:
        return (
          <Step1Product 
            organizationId={selectedCustomerId}
            selectedProductId={selectedProductId}
            onSelect={(id, name) => {
              setSelectedProductId(id);
              setSelectedProductName(name);
              setCurrentStep(2);
            }}
            onBack={isAdmin ? () => setCurrentStep(0) : undefined}
          />
        );
      case 2:
        return (
          <Step2Category 
            productId={selectedProductId}
            productName={selectedProductName}
            selectedCategoryId={selectedCategoryId}
            onSelect={(id, name) => {
              setSelectedCategoryId(id);
              setSelectedCategoryName(name);
              setCurrentStep(3);
            }}
            onBack={() => setCurrentStep(1)}
          />
        );
      case 3:
        return (
          <Step3Questions 
            categoryId={selectedCategoryId}
            productName={selectedProductName}
            categoryName={selectedCategoryName}
            answers={answers}
            setAnswers={setAnswers}
            onBack={() => setCurrentStep(2)}
            onNext={async () => {
              await checkForDuplicates();
              setCurrentStep(4);
            }}
          />
        );
        case 4:
          return (
            <StepChat 
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              onSkip={() => setCurrentStep(5)}
              onNext={() => setCurrentStep(5)}
              selectedProductId={selectedProductId}
            />
          );
      case 5:
        return (
          <div className="flex flex-col h-full space-y-4">
            {duplicateTickets.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-5 shrink-0 animate-in fade-in slide-in-from-top-4">
                <div className="flex gap-3">
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div className="w-full">
                    <h4 className="font-semibold text-amber-900 mb-1">⚠️ We found similar tickets you've submitted before</h4>
                    <p className="text-[13px] text-amber-800 mb-4">
                      Please review the tickets below. If your current issue is different, you can continue submitting this new ticket.
                    </p>
                    <div className="flex flex-col gap-2">
                      {duplicateTickets.map(dup => (
                        <div key={dup.id} className="bg-white border border-amber-100 rounded-lg p-3 flex justify-between items-center shadow-sm">
                          <div>
                            <div className="font-medium text-slate-800 text-[13px] flex items-center gap-2">
                               <a href={`/tickets/${dup.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                 #{dup.id.substring(0,8).toUpperCase()}
                               </a>
                               <span>- {dup.subject}</span>
                            </div>
                            <div className="text-slate-500 text-[11px] mt-1">
                               Submitted on {new Date(dup.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600">
                             {dup.ticket_statuses?.status_name || 'Unknown'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <Step4Details
              productName={selectedProductName}
              categoryName={selectedCategoryName}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              onBack={() => setCurrentStep(4)}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              error={error}
            />
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Check size={28} strokeWidth={3} />
            </div>
            <h3 className="text-[20px] font-semibold text-slate-900 mb-2">Ticket created successfully</h3>
            
            {matchedRecommendation ? (
              <div className="w-full max-w-md bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                    <Brain size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-blue-900 text-[15px]">AI Recommendation</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-800">
                        {matchedRecommendation.confidence_score}% Match
                      </span>
                    </div>
                    <p className="text-[13px] text-blue-800 mb-3">{matchedRecommendation.recommendation_text}</p>
                    
                    {matchedRecommendation.root_cause_text && (
                      <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-blue-200/50">
                        <AlertCircle size={14} className="text-blue-500 mt-0.5" />
                        <div className="text-[12px]">
                          <span className="font-semibold text-blue-900">Root Cause: </span>
                          <span className="text-blue-800">{matchedRecommendation.root_cause_text}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-slate-500 max-w-[320px] mb-8">
                Your ticket has been submitted. No automated recommendation was found. Our support team will review it and get back to you shortly.
              </p>
            )}

            <div className="flex items-center gap-4">
              <button 
                onClick={onClose || onCancel} 
                className="px-5 py-2.5 rounded-[8px] text-[14px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  if (onClose) onClose();
                  if (createdTicketId) {
                    navigate(`/tickets/${createdTicketId}`);
                  }
                }}
                className="px-5 py-2.5 rounded-[8px] text-[14px] font-medium text-white bg-[#f97316] hover:bg-[#ea580c] transition-colors"
              >
                View ticket
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const tabs = isAdmin 
    ? ['Customer', 'Product', 'Category', 'Questions', 'Chat', 'Details'] 
    : ['Product', 'Category', 'Questions', 'Chat', 'Details', 'Result'];

  const getStepProgress = () => {
    if (isAdmin) {
      if (currentStep === 0) return 20;
      if (currentStep === 1) return 40;
      if (currentStep === 2) return 60;
      if (currentStep === 3) return 80;
      return 100;
    } else {
      if (currentStep === 1) return 20;
      if (currentStep === 2) return 40;
      if (currentStep === 3) return 60;
      if (currentStep === 4) return 80;
      return 100;
    }
  };

  const getActiveTabIndex = () => {
    if (isAdmin) {
      return currentStep;
    } else {
      return currentStep - 1;
    }
  };

  const activeTabIndex = getActiveTabIndex();

  return (
    <div className="fixed inset-0 bg-[rgba(15,20,35,0.55)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[16px] w-full max-w-[620px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1a1f2e] p-5 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-[18px] font-medium text-white">Create Support Ticket</h2>
            <p className="text-[12px] text-slate-400 mt-1">Dynamic Diagnostic Wizard</p>
          </div>
          <button onClick={onClose || onCancel} className="text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex bg-slate-100 h-[3px] shrink-0">
          <div className="h-full bg-[#f97316] transition-all duration-300" style={{ width: `${getStepProgress()}%` }} />
        </div>

        {/* Step tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex gap-6 overflow-x-auto shrink-0">
          {tabs.map((tab, idx) => {
            const isCompleted = idx < activeTabIndex;
            const isActive = idx === activeTabIndex;
            return (
              <div key={tab} className={`flex items-center gap-2 pb-1 border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-[#f97316]' : 'border-transparent'}`}>
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium ${isActive ? 'bg-[#f97316]/10 text-[#f97316]' : 'bg-slate-200 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                )}
                <span className={`text-[13px] ${isActive ? 'text-[#f97316] font-medium' : isCompleted ? 'text-slate-700 font-medium' : 'text-slate-400 font-medium'}`}>
                  {tab}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white relative">
          {isCheckingDuplicates && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#f97316]" size={28} />
            </div>
          )}
          {renderStep()}
        </div>
      </div>
    </div>
  );
};
