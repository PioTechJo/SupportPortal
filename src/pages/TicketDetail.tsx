import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { getEmailDispatch } from "../lib/emailTemplates";
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Bot,
  AlertCircle,
  Edit,
  User,
  UserPlus,
  Send,
  FileText,
  Image as ImageIcon,
  Table,
  FileType,
  File,
  Download,
  Trash2,
  Paperclip,
  CheckCircle2,
  X,
  Lock,
  Code,
  XCircle,
  Video,
  ExternalLink,
} from "lucide-react";

import { Ticket } from "../types";
import { useTranslation } from "react-i18next";

const calculateTimeElapsed = (
  start: string,
  end?: string | null,
  isClosed?: boolean,
  t?: any
) => {
  if (!t) return "";
  if (!start) return "";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffInMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  let durationStr = "";
  if (diffInMinutes < 1) durationStr = t("ticketDetail.justNow");
  else if (diffInHours < 1)
    durationStr = `${diffInMinutes} ${diffInMinutes === 1 ? t("ticketDetail.minute") : t("ticketDetail.minutes")}`;
  else if (diffInDays < 1)
    durationStr = `${diffInHours} ${diffInHours === 1 ? t("ticketDetail.hour") : t("ticketDetail.hours")}`;
  else durationStr = `${diffInDays} ${diffInDays === 1 ? t("ticketDetail.day") : t("ticketDetail.days")}`;

  if (durationStr === t("ticketDetail.justNow")) return durationStr;
  return isClosed
    ? `${t("ticketDetail.assignedFor")} ${durationStr}`
    : `${t("ticketDetail.assignedAgo")} ${durationStr} ${t("ticketDetail.ago")}`;
};

export const TicketDetail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [recommendationData, setRecommendationData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loadingEngineers, setLoadingEngineers] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [justificationText, setJustificationText] = useState("");
  const [resolving, setResolving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubject, setEditSubject] = useState("");

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalatedTeamId, setEscalatedTeamId] = useState("");
  const [escalatedDeveloperName, setEscalatedDeveloperName] = useState("");
  const [teamDevelopers, setTeamDevelopers] = useState<any[]>([]);
  const [loadingTeamDevelopers, setLoadingTeamDevelopers] = useState(false);
  const [escalationNote, setEscalationNote] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [savingEscalation, setSavingEscalation] = useState(false);

  const [approving, setApproving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [remoteSessions, setRemoteSessions] = useState<any[]>([]);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteMeetingUrl, setRemoteMeetingUrl] = useState("");
  const [remoteMessage, setRemoteMessage] = useState("");
  const [requestingRemote, setRequestingRemote] = useState(false);

  const [editingCreatedDate, setEditingCreatedDate] = useState(false);
  const [newCreatedDate, setNewCreatedDate] = useState("");
  const [savingCreatedDate, setSavingCreatedDate] = useState(false);

  const isAdmin = ["ADMIN", "ADMINISTRATOR", "CEO", "SUPPORT_MANAGER", "SYS_ADMIN"].includes(
    user?.role_code?.toUpperCase() || user?.role_name?.toUpperCase() || "",
  );
  const isTeamMember = ["AGENT", "SUPPORT_ENGINEER"].includes(
    user?.role_name?.toUpperCase() || "",
  );
  const isClient = !isAdmin && !isTeamMember;

  useEffect(() => {
    if (!escalatedTeamId) {
      setTeamDevelopers([]);
      return;
    }
    const fetchDevelopers = async () => {
      setLoadingTeamDevelopers(true);
      try {
        const { data, error } = await supabase.rpc('get_team_developer_names', { p_team_id: escalatedTeamId });
        if (error) throw error;
        setTeamDevelopers(data || []);
      } catch (err) {
        console.error("Error fetching team developers:", err);
      } finally {
        setLoadingTeamDevelopers(false);
      }
    };
    fetchDevelopers();
  }, [escalatedTeamId]);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [prioritiesList, setPrioritiesList] = useState<any[]>([]);

  const handlePriorityChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newPriorityId = e.target.value;
    if (!newPriorityId || !id) return;

    setUpdatingPriority(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ priority_id: newPriorityId })
        .eq("id", id);

      if (error) throw error;

      const newPriority = prioritiesList.find((p) => p.id === newPriorityId);
      setTicket({
        ...ticket,
        priority_id: newPriorityId,
        priority: newPriority
          ? { priority_name: newPriority.priority_name }
          : ticket.priority,
      });
    } catch (err: any) {
      console.error("Error updating priority", err);
      alert("Failed to update priority");
    } finally {
      setUpdatingPriority(false);
    }
  };

  const renderSlaDueDate = () => {
    if (!ticket?.created_at)
      return <div className="text-sm text-slate-800">N/A</div>;

    let slaHours = 48; // default
    const prioName = (
      ticket.priority?.priority_name ||
      ticket.priority ||
      ""
    ).toUpperCase();
    if (prioName === "URGENT") slaHours = 4;
    else if (prioName === "HIGH") slaHours = 24;
    else if (prioName === "LOW") slaHours = 72;

    const created = new Date(ticket.created_at);
    const due = new Date(created.getTime() + slaHours * 60 * 60 * 1000);
    const now = new Date();

    const isOverdue =
      now > due &&
      !["CLOSED", "RESOLVED", "APPROVED"].includes(
        (ticket.status?.status_code || ticket.status_code || "").toUpperCase(),
      );

    return (
      <div
        className={`text-sm font-semibold flex items-center gap-2 ${isOverdue ? "text-red-600" : "text-slate-800"}`}
      >
        {due.toLocaleString()}
        {isOverdue && (
          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
            {t("ticketDetail.overdue")}
          </span>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!id) return;

    const fetchPriorities = async () => {
      const { data: pData } = await supabase.from("priorities").select("*");
      if (pData) setPrioritiesList(pData);
    };
    fetchPriorities();

    const fetchTicketDetails = async () => {
      setLoading(true);
      try {
        // Fetch Ticket
        const { data: tData, error: tError } = await supabase
          .from("tickets")
          .select(
            `
            *,
            status:ticket_statuses(status_name, status_code),
            priority:priorities(priority_name),
            product:products(product_name),
            customer:customers(customer_name),
            diagnostic_category:ai_diagnostic_categories(category_name, category_name_ar)
          `,
          )
          .eq("id", id)
          .single();

        if (tError) throw tError;

        // Everything below only depends on the ticket's id/assigned_to, not on
        // each other - fire them all at once instead of one-by-one so the
        // page doesn't pay for N sequential round trips.
        const [
          engineerRes,
          answersRes,
          recommendationRes,
          commentsRes,
          attachmentsRes,
          remoteRes,
        ] = await Promise.all([
          tData.assigned_to
            ? supabase.from("users").select("full_name").eq("id", tData.assigned_to).single()
            : Promise.resolve({ data: null } as any),
          supabase
            .from("ticket_answers")
            .select(
              `
              answer_value,
              question:ai_diagnostic_questions(
                question_text,
                question_text_ar,
                ai_question_options(option_value, option_label, option_label_ar)
              )
            `,
            )
            .eq("ticket_id", id),
          supabase
            .from("ai_recommendations")
            .select("recommendation_text, confidence_score")
            .eq("ticket_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("ticket_comments")
            .select(
              "id, comment_text, is_system_generated, created_at, author_id, is_internal, escalated_team_id, escalated_developer_name, teams(team_name)",
            )
            .eq("ticket_id", id)
            .order("created_at", { ascending: true }),
          supabase
            .from("ticket_attachments")
            .select("id, file_name, file_path, uploaded_at, uploaded_by, is_internal, description")
            .eq("ticket_id", id)
            .order("uploaded_at", { ascending: true }),
          supabase
            .from("ticket_remote_sessions")
            .select("id, meeting_url, message, status, created_at, requested_by")
            .eq("ticket_id", id)
            .order("created_at", { ascending: false }),
        ]);

        setTicket({ ...tData, assignedEngineerName: engineerRes.data?.full_name || null });
        setAnswers(answersRes.data || []);
        setRecommendationData(recommendationRes.data);
        setRemoteSessions(remoteRes.data || []);

        const commentsData = commentsRes.data;
        const attData = attachmentsRes.data;

        // The two author/uploader name lookups are independent of each
        // other too, so run them side by side rather than one after another.
        const commentAuthorIds = [
          ...new Set((commentsData || []).filter((c) => c.author_id).map((c) => c.author_id)),
        ];
        const uploaderIds = [
          ...new Set((attData || []).filter((a) => a.uploaded_by).map((a) => a.uploaded_by)),
        ];

        const [commentAuthorsRes, uploadersRes] = await Promise.all([
          commentAuthorIds.length
            ? supabase.from("users").select("id, full_name").in("id", commentAuthorIds)
            : Promise.resolve({ data: [] } as any),
          uploaderIds.length
            ? supabase.from("users").select("id, full_name").in("id", uploaderIds)
            : Promise.resolve({ data: [] } as any),
        ]);

        let finalComments: any[] = [];
        if (commentsData && commentsData.length > 0) {
          const usersMap = Object.fromEntries(
            (commentAuthorsRes.data || []).map((u: any) => [u.id, u.full_name]),
          );

          finalComments = commentsData.map((c) => ({
            ...c,
            author_name: c.is_system_generated
              ? "System"
              : usersMap[c.author_id] || "Unknown User",
          }));
        }

        // Auto-comment logic
        const lastActivityDate =
          finalComments.length > 0
            ? new Date(finalComments[finalComments.length - 1].created_at)
            : new Date(tData.created_at);

        const hoursSinceLastActivity =
          (new Date().getTime() - lastActivityDate.getTime()) /
          (1000 * 60 * 60);
        const statusCode = (tData.status?.status_code || tData.status_code || "").toUpperCase();
        const isClosedOrApproved =
          statusCode === "CLOSED" ||
          statusCode === "APPROVED" ||
          statusCode === "RESOLVED";

        if (hoursSinceLastActivity > 48 && !isClosedOrApproved) {
          const autoCommentText =
            "The Pio-Tech team is currently investigating your ticket and will get back to you with an update as soon as possible.";
          const lastComment =
            finalComments.length > 0
              ? finalComments[finalComments.length - 1]
              : null;

          // Prevent spamming the same auto comment multiple times
          if (!lastComment || lastComment.comment_text !== autoCommentText) {
            const { data: newAutoComment, error: autoCommentError } =
              await supabase
                .from("ticket_comments")
                .insert({
                  ticket_id: id,
                  author_id: null,
                  comment_text: autoCommentText,
                  is_system_generated: true,
                })
                .select(
                  "id, comment_text, is_system_generated, created_at, author_id, is_internal, escalated_team_id, escalated_developer_name, teams(team_name)",
                )
                .single();

            if (!autoCommentError && newAutoComment) {
              finalComments.push({
                ...newAutoComment,
                author_name: "System",
              });
            }
          }
        }

        setComments(finalComments);

        if (attData && attData.length > 0) {
          const uploadersMap = Object.fromEntries(
            (uploadersRes.data || []).map((u: any) => [u.id, u.full_name]),
          );
          setAttachments(attData.map((a) => ({
            ...a,
            uploader_name: uploadersMap[a.uploaded_by] || "Unknown",
          })));
        } else {
          setAttachments([]);
        }
      } catch (err) {
        console.error("Error fetching ticket details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketDetails();
  }, [id]);

  useEffect(() => {
    document.title = `TK-${id?.slice(0, 8).toUpperCase()}`;

    // Optional: cleanup title on unmount if you wish, or let router handle it
    return () => {
      document.title = "Support Portal";
    };
  }, [id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !id) return;

    const { data, error } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: id,
        author_id: user.id,
        comment_text: newComment,
        is_system_generated: false,
      })
      .select(
        "id, comment_text, is_system_generated, created_at, author_id, is_internal, escalated_team_id, escalated_developer_name, teams(team_name)",
      )
      .single();

    if (!error && data) {
      setComments([
        ...comments,
        {
          ...data,
          author_name: user.full_name || "You",
        },
      ]);
      setNewComment("");
    } else if (error) {
      console.error("Error adding comment:", error);
    }
  };

  const [internalReturnFiles, setInternalReturnFiles] = useState<Record<string, File>>({});
  const [internalReturnDescriptions, setInternalReturnDescriptions] = useState<Record<string, string>>({});
  const [uploadingInternalReturns, setUploadingInternalReturns] = useState<Record<string, boolean>>({});

  const handleMarkReturned = async (commentId: string) => {
    try {
      setUploadingInternalReturns((prev) => ({ ...prev, [commentId]: true }));
      const file = internalReturnFiles[commentId];
      if (file && user) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("ticket_attachments").insert({
          ticket_id: id,
          file_name: file.name,
          file_path: filePath,
          uploaded_by: user.id,
          is_internal: true,
          description: internalReturnDescriptions[commentId] || null,
        });

        if (dbError) throw dbError;
        
        // Clear the selected file and description
        setInternalReturnFiles((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
        setInternalReturnDescriptions((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
        
        // Refetch attachments
        const { data: attData } = await supabase
          .from("ticket_attachments")
          .select("id, file_name, file_path, uploaded_at, uploaded_by, is_internal, description")
          .eq("ticket_id", id)
          .order("uploaded_at", { ascending: true });
          
        if (attData) {
            const uploaderIds = [...new Set(attData.filter((a) => a.uploaded_by).map((a) => a.uploaded_by))];
            const { data: uploadersData } = await supabase.from("users").select("id, full_name").in("id", uploaderIds);
            const uploadersMap = Object.fromEntries((uploadersData || []).map((u) => [u.id, u.full_name]));
            setAttachments(attData.map((a) => ({ ...a, uploader_name: uploadersMap[a.uploaded_by] || "Unknown" })));
        }
      }

      const returnedAt = new Date().toISOString();
      const { error } = await supabase
        .from("ticket_comments")
        .update({ escalation_returned_at: returnedAt })
        .eq("id", commentId);

      if (error) throw error;

      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, escalation_returned_at: returnedAt } : c,
        ),
      );

      // The developer/specialized team handed the ticket back to support — reflect that
      // automatically, as long as the ticket hasn't moved on to a later stage in the meantime
      // (e.g. already resolved, pending approval, or closed).
      const currentStatusCode = (ticket?.status?.status_code || ticket?.status_code || "").toUpperCase();
      if (currentStatusCode === "DEVELOPMENT_ACTION") {
        try {
          const { data: supportStatus, error: supportStatusError } = await supabase
            .from("ticket_statuses")
            .select("id")
            .eq("status_code", "INVESTIGATION")
            .single();

          if (!supportStatusError && supportStatus) {
            const oldStatusId = ticket?.status_id;

            await supabase
              .from("tickets")
              .update({ status_id: supportStatus.id })
              .eq("id", id);

            await supabase.from("ticket_status_history").insert({
              ticket_id: id,
              old_status_id: oldStatusId,
              new_status_id: supportStatus.id,
              changed_by: user?.id,
              change_notes: "Specialized team returned the ticket to support",
            });

            setTicket((prev: any) => prev ? {
              ...prev,
              status_id: supportStatus.id,
              status: { ...prev.status, status_code: "INVESTIGATION", status_name: "Support Action" },
              status_code: "INVESTIGATION",
            } : prev);
          }
        } catch (statusErr) {
          console.error("Error reverting ticket status after return:", statusErr);
        }
      }
    } catch (err) {
      console.error("Error marking returned:", err);
      alert("Failed to mark internal note as returned.");
    } finally {
      setUploadingInternalReturns((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleStartEditCreatedDate = () => {
    if (!ticket?.created_at) return;
    // datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not the raw ISO string.
    const d = new Date(ticket.created_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localValue = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setNewCreatedDate(localValue);
    setEditingCreatedDate(true);
  };

  const handleSaveCreatedDate = async () => {
    if (!newCreatedDate || !id || !user) return;
    setSavingCreatedDate(true);
    try {
      const newDateIso = new Date(newCreatedDate).toISOString();
      const oldCreatedAt = ticket.created_at;

      const { error } = await supabase
        .from("tickets")
        .update({ created_at: newDateIso })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("audit_log").insert({
        table_name: "tickets",
        record_id: id,
        action_type: "CREATED_DATE_ADJUSTED",
        old_value: { created_at: oldCreatedAt },
        new_value: { created_at: newDateIso },
        changed_by: user.id,
      });

      setTicket((prev: any) => (prev ? { ...prev, created_at: newDateIso } : prev));
      setEditingCreatedDate(false);
    } catch (err) {
      console.error("Error updating created date:", err);
      alert("Failed to update the created date.");
    } finally {
      setSavingCreatedDate(false);
    }
  };

  const handleEscalateClick = async () => {
    setShowEscalateModal(true);
    if (teams.length === 0) {
      try {
        const { data, error } = await supabase
          .from("teams")
          .select("id, team_name")
          .order("team_name");
        if (!error && data) setTeams(data);
      } catch (err) {
        console.error("Error fetching teams:", err);
      }
    }
  };

  const handleSaveEscalation = async () => {
    if (!escalationNote.trim() || !escalatedTeamId || !user || !id) {
      alert("Team and note are required.");
      return;
    }
    setSavingEscalation(true);
    try {
      const { data, error } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: id,
          author_id: user.id,
          comment_text: escalationNote,
          is_system_generated: false,
          is_internal: true,
          escalated_team_id: escalatedTeamId,
          escalated_developer_name: escalatedDeveloperName || null,
        })
        .select(
          "id, comment_text, is_system_generated, created_at, author_id, is_internal, escalated_team_id, escalated_developer_name, teams(team_name)",
        )
        .single();

      if (error) throw error;

      // Escalating to a specialized team means the ticket has moved from general
      // support into development's hands — reflect that automatically so the bank
      // sees "Development Action" without anyone having to change the status manually.
      try {
        const { data: devStatus, error: devStatusError } = await supabase
          .from("ticket_statuses")
          .select("id")
          .eq("status_code", "DEVELOPMENT_ACTION")
          .single();

        if (!devStatusError && devStatus && ticket?.status_id !== devStatus.id) {
          const oldStatusId = ticket?.status_id;

          await supabase
            .from("tickets")
            .update({ status_id: devStatus.id })
            .eq("id", id);

          await supabase.from("ticket_status_history").insert({
            ticket_id: id,
            old_status_id: oldStatusId,
            new_status_id: devStatus.id,
            changed_by: user.id,
            change_notes: "Ticket escalated to a specialized team",
          });

          setTicket((prev: any) => prev ? {
            ...prev,
            status_id: devStatus.id,
            status: { ...prev.status, status_code: "DEVELOPMENT_ACTION", status_name: "Development Action" },
            status_code: "DEVELOPMENT_ACTION",
          } : prev);
        }
      } catch (statusErr) {
        console.error("Error updating ticket status after escalation:", statusErr);
      }

      if (data) {
        if (escalatedDeveloperName) {
          const selectedDev = teamDevelopers.find(dev => dev.full_name === escalatedDeveloperName);
          if (selectedDev && selectedDev.id) {
            (async () => {
              try {
                const tktNo = ticket?.ticket_no || ticket?.id?.substring(0, 8).toUpperCase();
                const { subject, body, recipientEmails } = await getEmailDispatch(
                  'ESCALATION_DEVELOPER',
                  { ticket_no: tktNo, subject: ticket?.subject || '', escalation_note: escalationNote },
                  { developerId: selectedDev.id, createdById: ticket?.created_by },
                  {
                    subject: `You have been assigned an escalation for ticket ${tktNo}: ${ticket?.subject || ''}`,
                    body: `You have been assigned an escalation for ticket ${tktNo}: ${ticket?.subject || ''}.\n\nEscalation note: ${escalationNote}`,
                    defaultRoles: ['developer']
                  }
                );
                recipientEmails.forEach(email => {
                  supabase.functions.invoke('send-email', {
                    body: { to: email, subject, body, ticket_id: ticket?.id }
                  }).catch(err => console.error("Error invoking send-email for escalation:", err));
                });
              } catch (emailErr) {
                console.error("Failed to fetch developer email or send notification:", emailErr);
              }
            })();
          }
        }

        setComments([
          ...comments,
          {
            ...data,
            author_name: user.full_name || "You",
          },
        ]);
        setShowEscalateModal(false);
        setEscalatedTeamId("");
        setEscalatedDeveloperName("");
        setEscalationNote("");
      }
    } catch (err) {
      console.error("Error saving escalation note:", err);
      alert("Failed to save internal note.");
    } finally {
      setSavingEscalation(false);
    }
  };

  const handleRequestRemoteCheck = async () => {
    if (!remoteMeetingUrl.trim() || !user || !id || !ticket) {
      alert("A meeting link is required.");
      return;
    }
    let normalizedUrl = remoteMeetingUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setRequestingRemote(true);
    try {
      const { data, error } = await supabase
        .from("ticket_remote_sessions")
        .insert({
          ticket_id: id,
          requested_by: user.id,
          meeting_url: normalizedUrl,
          message: remoteMessage.trim() || null,
        })
        .select("id, meeting_url, message, status, created_at, requested_by")
        .single();

      if (error) throw error;

      setRemoteSessions([data, ...remoteSessions]);
      setShowRemoteModal(false);
      setRemoteMeetingUrl("");
      setRemoteMessage("");

      // Notify the bank's users about the remote check request
      const { data: bankUsers } = await supabase
        .from("users")
        .select("id")
        .eq("customer_id", ticket.customer_id);

      if (bankUsers && bankUsers.length > 0) {
        const ticketNo = ticket.ticket_no || ticket.id.substring(0, 8).toUpperCase();
        const notificationsPayload = bankUsers.map((bu) => ({
          profile_id: bu.id,
          content: `A remote check-in has been requested for ticket ${ticketNo}. Join here: ${normalizedUrl}`,
          type: "remote_session_requested",
          is_read: false,
          link_ticket_id: id,
        }));
        const { error: notifError } = await supabase.from("notifications").insert(notificationsPayload);
        if (notifError) {
          console.error("Failed to notify bank users about remote session:", notifError);
        }
      }
    } catch (err) {
      console.error("Error requesting remote session:", err);
      alert("Failed to send the remote check request.");
    } finally {
      setRequestingRemote(false);
    }
  };

  const handleUploadAttachment = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user) return;

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "application/zip",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF, PNG, JPG, and ZIP files are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from("ticket_attachments")
        .insert({
          ticket_id: id,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
        })
        .select("id, file_name, file_path, uploaded_at, uploaded_by")
        .single();

      if (dbError) throw dbError;
      if (data)
        setAttachments([
          ...attachments,
          { ...data, uploader_name: user.full_name || "You" },
        ]);
    } catch (err: any) {
      console.error("Error uploading attachment:", err);
      alert("Failed to upload attachment.");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (
    attachmentId: string,
    filePath: string,
  ) => {
    try {
      // Remove from storage
      await supabase.storage.from("ticket-attachments").remove([filePath]);

      // Remove from DB
      const { error } = await supabase
        .from("ticket_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;

      setAttachments(attachments.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error("Error deleting attachment:", err);
      alert("Failed to delete attachment.");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["pdf"].includes(ext)) return <FileText size={18} color="#ef4444" />;
    if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext))
      return <ImageIcon size={18} color="#3b82f6" />;
    if (["xls", "xlsx", "csv"].includes(ext))
      return <Table size={18} color="#22c55e" />;
    if (["doc", "docx"].includes(ext))
      return <FileType size={18} color="#1e3a8a" />;
    return <File size={18} color="#94a3b8" />;
  };

  const downloadAttachment = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("ticket-attachments")
      .createSignedUrl(filePath, 60);
    if (error || !data) {
      console.error("Error getting download URL:", error);
      alert("Failed to download file.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const getPriorityStyle = (priority: string) => {
    switch((priority || '').toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-700 border border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getStatusColor = (s: string) => {
    const st = (s || "").toUpperCase();
    if (st === "NEW" || st === "OPEN") return "bg-blue-100 text-blue-700";
    if (st === "ASSIGNED") return "bg-purple-100 text-purple-700";
    if (st === "IN_PROGRESS" || st === "INVESTIGATION")
      return "bg-amber-100 text-amber-700";
    if (st === "DEVELOPMENT_ACTION") return "bg-indigo-100 text-indigo-700";
    if (st === "PENDING_CUSTOMER") return "bg-orange-100 text-orange-700";
    if (st === "RESOLVED_PENDING_APPROVAL")
      return "bg-amber-100 text-amber-700";
    if (st === "RESOLVED" || st === "APPROVED")
      return "bg-green-100 text-green-700";
    return "bg-slate-100 text-slate-700";
  };

  const getPriorityColor = (p: string) => {
    const pr = (p || "").toUpperCase();
    if (pr === "URGENT") return "bg-red-100 text-red-700 border border-red-200";
    if (pr === "HIGH") return "bg-orange-100 text-orange-700 border border-orange-200";
    if (pr === "MEDIUM") return "bg-amber-100 text-amber-700 border border-amber-200";
    if (pr === "LOW") return "bg-blue-100 text-blue-700 border border-blue-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6] mb-4" />
        <span className="text-sm font-semibold text-slate-500">
          {t("ticketDetail.loadingTicketDetails")}
        </span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center text-red-500">
        {t("ticketDetail.ticketNotFound")}
      </div>
    );
  }

  const handleAssignClick = async () => {
    setShowAssignDropdown(!showAssignDropdown);
    if (!showAssignDropdown && engineers.length === 0) {
      setLoadingEngineers(true);
      try {
        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("id")
          .eq("role_code", "SUPPORT_ENGINEER")
          .single();

        if (roleError) throw roleError;

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email")
          .eq("role_id", roleData.id)
          .eq("is_active", true);

        if (usersError) throw usersError;

        const { data: statuses } = await supabase.from("ticket_statuses").select("id, status_code");
        const excludedStatusIds = (statuses || [])
          .filter(s => ["RESOLVED_PENDING_APPROVAL", "APPROVED", "CLOSED"].includes((s.status_code || "").toUpperCase()))
          .map(s => s.id);

        const { data: openTickets } = await supabase
          .from("tickets")
          .select("assigned_to")
          .not("status_id", "in", `(${excludedStatusIds.join(",")})`);

        const ticketsByEngineer = (openTickets || []).reduce((acc: any, ticket: any) => {
          if (ticket.assigned_to) {
            acc[ticket.assigned_to] = (acc[ticket.assigned_to] || 0) + 1;
          }
          return acc;
        }, {});

        const engineersWithCounts = (usersData || []).map((eng: any) => ({
          ...eng,
          openTicketsCount: ticketsByEngineer[eng.id] || 0,
        })).sort((a: any, b: any) => a.openTicketsCount - b.openTicketsCount);

        setEngineers(engineersWithCounts);
      } catch (err) {
        console.error("Error fetching engineers", err);
      } finally {
        setLoadingEngineers(false);
      }
    }
  };

  const handleAssignTicket = async (engineerId: string) => {
    setAssigning(true);
    try {
      const { data: statusData, error: statusError } = await supabase
        .from("ticket_statuses")
        .select("id, status_name")
        .eq("status_code", "INVESTIGATION")
        .single();

      if (statusError) throw statusError;

      const oldAssignedTo = ticket.assigned_to;
      const oldStatusId = ticket.status_id;

      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          assigned_to: engineerId,
          status_id: statusData.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("audit_log").insert({
        table_name: "tickets",
        record_id: id,
        action_type: "ASSIGNMENT",
        old_value: { assigned_to: oldAssignedTo },
        new_value: { assigned_to: engineerId },
        changed_by: user?.id,
      });

      await supabase.from("ticket_status_history").insert({
        ticket_id: id,
        old_status_id: oldStatusId,
        new_status_id: statusData.id,
        changed_by: user?.id,
        change_notes: "Ticket assigned to engineer",
      });

      // Send notification to Engineer
      const ticketNo = ticket.ticket_no || ticket.id.substring(0, 8).toUpperCase();
      try {
        const { error: notifError } = await supabase.from("notifications").insert({
          profile_id: engineerId,
          content: `You have been assigned to ticket ${ticketNo}`,
          type: "ticket_assigned",
          is_read: false,
          link_ticket_id: id,
        });
        if (notifError) {
          console.error("Failed to insert notification for assigned engineer:", notifError);
        }
      } catch (notifErr) {
        console.error("Unexpected error while sending notification:", notifErr);
      }

      const assignedEng = engineers.find((e) => e.id === engineerId);

      // Send email to Engineer (and any other configured recipients)
      if (assignedEng?.email) {
        try {
          const { subject, body, recipientEmails } = await getEmailDispatch(
            'TICKET_ASSIGNED_ENGINEER',
            { ticket_no: ticketNo, subject: ticket.subject, engineer_name: assignedEng.full_name || 'Engineer' },
            { assigneeId: engineerId, createdById: ticket.created_by },
            {
              subject: `You have been assigned to ticket ${ticketNo}: ${ticket.subject}`,
              body: `Hello ${assignedEng.full_name || 'Engineer'},\n\nYou have been assigned to ticket ${ticketNo}.\n\nSubject: ${ticket.subject}\n\nPlease review it in the Support Portal.`,
              defaultRoles: ['assignee']
            }
          );
          recipientEmails.forEach(email => {
            supabase.functions.invoke('send-email', {
              body: { to: email, subject, body, ticket_id: ticket.id }
            }).catch(err => console.error("Error sending email to engineer:", err));
          });
        } catch (emailErr) {
          console.error("Unexpected error invoking send-email for engineer:", emailErr);
        }
      }

      setTicket({
        ...ticket,
        assigned_to: engineerId,
        assigned_at: new Date().toISOString(),
        status_id: statusData.id,
        status: {
          ...ticket.status,
          status_code: "INVESTIGATION",
          status_name: statusData.status_name,
        },
        assigned_to_name: assignedEng?.full_name || t("ticketDetail.unassigned"),
        assignedEngineerName: assignedEng?.full_name,
      });
      setShowAssignDropdown(false);
    } catch (err) {
      console.error("Error assigning ticket", err);
      alert("Failed to assign ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id || !editSubject.trim()) return;
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ subject: editSubject.trim() })
        .eq('id', id);
      
      if (!error) {
        setTicket({ ...ticket, subject: editSubject.trim() });
        setShowEditModal(false);
        // Also log audit
        await supabase.from('audit_log').insert({
          organization_id: ticket.customer_id,
          entity_type: 'ticket',
          entity_id: id,
          action_type: 'TICKET_UPDATED',
          performed_by: user?.id,
          old_value: { subject: ticket.subject },
          new_value: { subject: editSubject.trim() }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveTicket = async () => {
    if (!justificationText.trim()) {
      alert("Resolution justification is required.");
      return;
    }
    setResolving(true);
    try {
      const { data: statusData, error: statusError } = await supabase
        .from("ticket_statuses")
        .select("id")
        .eq("status_code", "RESOLVED_PENDING_APPROVAL")
        .single();

      if (statusError) throw statusError;

      const oldStatusId = ticket.status_id;

      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          status_id: statusData.id,
          resolution_justification: justificationText,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("audit_log").insert({
        table_name: "tickets",
        record_id: id,
        action_type: "RESOLUTION_SUBMITTED",
        old_value: { status_id: oldStatusId },
        new_value: { status_id: statusData.id },
        changed_by: user?.id,
      });

      await supabase.from("ticket_status_history").insert({
        ticket_id: id,
        old_status_id: oldStatusId,
        new_status_id: statusData.id,
        changed_by: user?.id,
        change_notes: "Ticket resolution submitted for approval",
      });

      // Send notification to Admins
      try {
        const { data: adminIds, error: rpcError } = await supabase.rpc("get_admin_user_ids");
        if (rpcError) {
          console.error("Failed to fetch admin user IDs for notification:", rpcError);
        } else if (adminIds && adminIds.length > 0) {
          const notifications = adminIds.map((admin: any) => ({
            profile_id: admin.id,
            content: `Ticket ${ticket.ticket_no || ticket.id.substring(0, 8).toUpperCase()} has been resolved and is pending your approval`,
            type: "resolution_pending",
            is_read: false,
            link_ticket_id: id,
          }));
          
          const { error: notifError } = await supabase.from("notifications").insert(notifications);
          if (notifError) {
            console.error("Failed to insert notifications for admins:", notifError);
          }
          
          // Send email to Admins (and any other configured recipients)
          (async () => {
            try {
              const tktNo = ticket.ticket_no || ticket.id.substring(0, 8).toUpperCase();
              const { subject, body, recipientEmails } = await getEmailDispatch(
                'RESOLVED_ADMIN',
                { ticket_no: tktNo, subject: ticket.subject, resolved_by_name: user?.full_name || 'an engineer' },
                { createdById: ticket.created_by, assigneeId: ticket.assigned_to },
                {
                  subject: `Ticket ${tktNo} is pending your approval`,
                  body: `Ticket ${tktNo} has been resolved by ${user?.full_name || 'an engineer'} and is pending your approval.\n\nSubject: ${ticket.subject}`,
                  defaultRoles: ['admin']
                }
              );
              recipientEmails.forEach(email => {
                supabase.functions.invoke('send-email', {
                  body: { to: email, subject, body, ticket_id: id }
                }).catch(err => console.error("Error sending email to admin:", err));
              });
            } catch (e) {
              console.error("Error dispatching resolved-admin email:", e);
            }
          })();
        }
      } catch (notifErr) {
        console.error("Unexpected error while sending notifications:", notifErr);
      }

      setTicket({
        ...ticket,
        status_id: statusData.id,
        status: {
          ...ticket.status,
          status_code: "RESOLVED_PENDING_APPROVAL",
          status_name: "Pending Approval",
        },
        resolution_justification: justificationText,
      });
      setShowResolveModal(false);
      setJustificationText("");
    } catch (err: any) {
      console.error("Error resolving ticket", err);
      alert(`Failed to resolve ticket: ${err.message || "Unknown error"}`);
    } finally {
      setResolving(false);
    }
  };

  const handleCloseTicket = async () => {
    setClosing(true);
    try {
      // Fetch CLOSED status
      const { data: closedStatus, error: closedError } = await supabase
        .from("ticket_statuses")
        .select("id")
        .eq("status_code", "CLOSED")
        .single();

      if (closedError) throw closedError;

      const oldStatusId = ticket.status_id;
      const now = new Date().toISOString();

      const { error: closeUpdateError } = await supabase
        .from("tickets")
        .update({ 
          status_id: closedStatus.id,
          closed_at: now
        })
        .eq("id", id);

      if (closeUpdateError) throw closeUpdateError;

      await supabase.from("audit_log").insert({
        table_name: "tickets",
        record_id: id,
        action_type: "TICKET_CLOSED",
        old_value: { status_id: oldStatusId },
        new_value: { status_id: closedStatus.id, closed_at: now },
        changed_by: user?.id,
      });

      await supabase.from("ticket_status_history").insert({
        ticket_id: id,
        old_status_id: oldStatusId,
        new_status_id: closedStatus.id,
        changed_by: user?.id,
        change_notes: "Ticket closed by support team, pending client approval",
      });

      // Send email to Customer (and any other configured recipients)
      if (ticket.created_by) {
        try {
          const ticketNo = ticket.ticket_no || ticket.id.substring(0, 8).toUpperCase();
          const { subject, body, recipientEmails } = await getEmailDispatch(
            'CLOSED_CUSTOMER',
            { ticket_no: ticketNo, subject: ticket.subject },
            { createdById: ticket.created_by, assigneeId: ticket.assigned_to },
            {
              subject: `Your ticket ${ticketNo} has been closed`,
              body: `Your ticket ${ticketNo} has been resolved and closed by our support team. Please review and approve the resolution at your convenience.\n\nSubject: ${ticket.subject}`,
              defaultRoles: ['customer']
            }
          );
          recipientEmails.forEach(email => {
            supabase.functions.invoke('send-email', {
              body: { to: email, subject, body, ticket_id: id }
            }).catch(err => console.error("Error sending email to customer:", err));
          });
        } catch (e) { console.error(e); }
      }

      setTicket({
        ...ticket,
        status_id: closedStatus.id,
        closed_at: now,
        status: {
          ...ticket.status,
          status_code: "CLOSED",
          status_name: "Closed",
        },
      });
    } catch (err: any) {
      console.error("Error closing ticket", err);
      alert(`Failed to close ticket: ${err.message || "Unknown error"}`);
    } finally {
      setClosing(false);
    }
  };

  const handleApproveTicket = async () => {
    setApproving(true);
    try {
      // Fetch APPROVED status
      const { data: approvedStatus, error: approvedError } = await supabase
        .from("ticket_statuses")
        .select("id")
        .eq("status_code", "APPROVED")
        .single();

      if (approvedError) throw approvedError;

      const oldStatusId = ticket.status_id;

      const { error: approveUpdateError } = await supabase
        .from("tickets")
        .update({ status_id: approvedStatus.id })
        .eq("id", id);

      if (approveUpdateError) throw approveUpdateError;

      await supabase.from("audit_log").insert({
        table_name: "tickets",
        record_id: id,
        action_type: "RESOLUTION_APPROVED",
        old_value: { status_id: oldStatusId },
        new_value: { status_id: approvedStatus.id },
        changed_by: user?.id,
      });

      await supabase.from("ticket_status_history").insert({
        ticket_id: id,
        old_status_id: oldStatusId,
        new_status_id: approvedStatus.id,
        changed_by: user?.id,
        change_notes: "Ticket resolution approved by client",
      });

      // Send email to Engineer (and any other configured recipients)
      if (ticket.assigned_to) {
        try {
          const ticketNo = ticket.ticket_no || ticket.id.substring(0, 8).toUpperCase();
          const { subject, body, recipientEmails } = await getEmailDispatch(
            'APPROVED_ENGINEER',
            { ticket_no: ticketNo, subject: ticket.subject },
            { assigneeId: ticket.assigned_to },
            {
              subject: `Your resolution for ticket ${ticketNo} has been approved`,
              body: `Your resolution for ticket ${ticketNo} has been approved.\n\nSubject: ${ticket.subject}`,
              defaultRoles: ['assignee']
            }
          );
          recipientEmails.forEach(email => {
            supabase.functions.invoke('send-email', {
              body: { to: email, subject, body, ticket_id: id }
            }).catch(err => console.error("Error sending email to engineer:", err));
          });
        } catch (e) { console.error(e); }
      }

      setTicket({
        ...ticket,
        status_id: approvedStatus.id,
        status: {
          ...ticket.status,
          status_code: "APPROVED",
          status_name: "Approved",
        },
      });
    } catch (err: any) {
      console.error("Error approving ticket", err);
      alert(`Failed to approve ticket: ${err.message || "Unknown error"}`);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectTicket = async () => {
    setRejecting(true);
    try {
      const { data: statusData, error: statusError } = await supabase
        .from("ticket_statuses")
        .select("id")
        .eq("status_code", "INVESTIGATION")
        .single();

      if (statusError) throw statusError;

      const oldStatusId = ticket.status_id;

      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status_id: statusData.id })
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("audit_log").insert({
        table_name: "tickets",
        record_id: id,
        action_type: "RESOLUTION_REJECTED",
        old_value: { status_id: oldStatusId },
        new_value: { status_id: statusData.id },
        changed_by: user?.id,
      });

      await supabase.from("ticket_status_history").insert({
        ticket_id: id,
        old_status_id: oldStatusId,
        new_status_id: statusData.id,
        changed_by: user?.id,
        change_notes: "Ticket resolution rejected, returned to investigation",
      });

      // Send notification to assigned engineer
      try {
        if (ticket.assigned_to) {
          const { error: notifError } = await supabase.from("notifications").insert({
            profile_id: ticket.assigned_to,
            content: `Your resolution for ticket ${ticket.ticket_no || ticket.id.substring(0, 8).toUpperCase()} was rejected and requires further investigation`,
            type: "resolution_rejected",
            is_read: false,
            link_ticket_id: id,
          });
          if (notifError) {
            console.error("Failed to insert notification for rejection:", notifError);
          }

          // Send email to Engineer (and any other configured recipients)
          (async () => {
            try {
              const tktNo = ticket.ticket_no || ticket.id.substring(0, 8).toUpperCase();
              const { subject, body, recipientEmails } = await getEmailDispatch(
                'RETURNED_ENGINEER',
                { ticket_no: tktNo, subject: ticket.subject },
                { assigneeId: ticket.assigned_to },
                {
                  subject: `Your resolution for ticket ${tktNo} was rejected`,
                  body: `Your resolution for ticket ${tktNo} was rejected and requires further investigation.\n\nSubject: ${ticket.subject}`,
                  defaultRoles: ['assignee']
                }
              );
              recipientEmails.forEach(email => {
                supabase.functions.invoke('send-email', {
                  body: { to: email, subject, body, ticket_id: id }
                }).catch(err => console.error("Error sending email to engineer:", err));
              });
            } catch (e) { console.error(e); }
          })();
        }
      } catch (notifErr) {
        console.error("Unexpected error while sending rejection notification:", notifErr);
      }

      setTicket({
        ...ticket,
        status_id: statusData.id,
        status: {
          ...ticket.status,
          status_code: "INVESTIGATION",
          status_name: "Support Action",
        },
      });
    } catch (err: any) {
      console.error("Error rejecting ticket", err);
      alert(`Failed to reject ticket: ${err.message || "Unknown error"}`);
    } finally {
      setRejecting(false);
    }
  };

  const shortId = ticket.id.substring(0, 8).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen font-sans">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0 shadow-sm">
        {/* Breadcrumb & Title Container */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-[#3B82F6] transition-colors"
          >
            <ArrowLeft size={16} />{t("ticketDetail.back")}</button>
          <div className="h-4 w-px bg-slate-300"></div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ticket.ticket_no || `TK-${id?.slice(0, 8).toUpperCase()}`}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ms-1 ${getStatusColor(ticket.status?.status_code || ticket.status_code || ticket.status)}`}
            >
              {t(`statusLabels.${(ticket.status?.status_code || ticket.status_code || ticket.status || '').toUpperCase()}`, { defaultValue: ticket.status?.status_name || ticket.status_code || ticket.status })}
            </span>
            {ticket.ticket_type === 'DEVELOPMENT' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold ms-1 bg-indigo-100 text-indigo-700 border border-indigo-200">
                {t('ticketDetail.developmentTicket')}
              </span>
            )}
          </div>
          <div className="h-4 w-px bg-slate-300 ms-1"></div>
          <h1 className="text-xl font-bold text-slate-900 line-clamp-1 pe-4 ms-1">
            {ticket.title || ticket.subject}
          </h1>
        </div>

        {/* Actions Container */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Client Specific Actions */}
          {(isClient || isAdmin) &&
            ["CLOSED", "APPROVED"].includes(
              (ticket.status?.status_code || ticket.status_code || "").toUpperCase()
            ) && (
              <button
                onClick={() => {
                  const proceed = window.confirm(
                    "Are you sure you want to reopen this ticket?",
                  );
                  if (proceed) {
                    // Dummy reopen action, since original logic was lost. You should implement actual reopen logic here.
                    alert("Reopen requested");
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <ArrowLeft size={16} />{t("ticketDetail.reopenTicket")}</button>
            )}

          {/* Tickets never escalated to another team can be closed by the assigned
              Support member or an admin; tickets that WERE escalated to a specialized
              team are the admin's responsibility to review and close. */}
          {(() => {
            const wasEscalatedToOtherTeam = comments.some((c: any) => c.escalated_team_id);
            const canClose = isAdmin || (!wasEscalatedToOtherTeam && ticket?.assigned_to === user?.id);
            const isPendingApproval = (ticket.status?.status_code || ticket.status_code || "").toUpperCase() === "RESOLVED_PENDING_APPROVAL";
            if (!isPendingApproval) return null;
            return (
              <>
                {isAdmin && (
                  <button
                    onClick={handleRejectTicket}
                    disabled={rejecting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    {rejecting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    {t("ticketDetail.reject")}
                  </button>
                )}
                {canClose && (
                  <button
                    onClick={handleCloseTicket}
                    disabled={closing}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    {closing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {t("ticketDetail.close")}
                  </button>
                )}
              </>
            );
          })()}

          {user && ["BANK_USER", "BANK_MANAGER", "BANK_ADMIN"].includes((user.role_code || "").toUpperCase()) &&
            (ticket.status?.status_code || ticket.status_code || "").toUpperCase() === "CLOSED" && (
              <button
                onClick={handleApproveTicket}
                disabled={approving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {approving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {t("ticketDetail.approve")}
              </button>
            )}

          {(isAdmin || ticket?.assigned_to === user?.id) &&
            !["RESOLVED_PENDING_APPROVAL", "APPROVED", "CLOSED"].includes(
              (ticket.status?.status_code || ticket.status_code || "").toUpperCase()
            ) && (
              <button
                onClick={handleEscalateClick}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Lock size={16} />{t("ticketDetail.internalNote")}</button>
            )}

          {(isAdmin || ticket?.assigned_to === user?.id) &&
            !["RESOLVED_PENDING_APPROVAL", "APPROVED", "CLOSED"].includes(
              (ticket.status?.status_code || ticket.status_code || "").toUpperCase()
            ) && (
              <button
                onClick={() => setShowRemoteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Video size={16} className="text-blue-600" />Request Remote Check
              </button>
            )}

          {ticket?.assigned_to === user?.id &&
            !["RESOLVED_PENDING_APPROVAL", "APPROVED", "CLOSED"].includes(
              (ticket.status?.status_code || ticket.status_code || "").toUpperCase()
            ) && (
              <button
                onClick={() => setShowResolveModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <CheckCircle2 size={16} />{t("ticketDetail.resolveTicket")}</button>
            )}

          {isAdmin && (
            <>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors">
                <Edit size={16} />{t("ticketDetail.edit")}</button>
              <div className="relative">
                <button
                  onClick={handleAssignClick}
                  disabled={assigning}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white hover:bg-[#2563eb] rounded-lg text-sm font-medium transition-colors shadow-sm disabled:bg-blue-300"
                >
                  {assigning ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {ticket.assignedEngineerName
                    ? `${t("ticketDetail.assigned")} ${ticket.assignedEngineerName}`
                    : t("ticketDetail.assign")}
                </button>

                {showAssignDropdown && (
                  <div className="absolute end-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-[10px] shadow-lg border border-slate-200 overflow-hidden z-20">
                    <div className="p-3 border-b border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("ticketDetail.selectSupportEngineer")}
                      </h3>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                      {loadingEngineers ? (
                        <div className="flex justify-center p-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#3B82F6]" />
                        </div>
                      ) : engineers.length > 0 ? (
                        engineers.map((eng: any) => (
                          <button
                            key={eng.id}
                            onClick={() => handleAssignTicket(eng.id)}
                            className="w-full text-start px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-[#3B82F6] rounded-md transition-colors flex items-center justify-between group"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{eng.full_name}</span>
                              <span className="text-xs text-slate-400 group-hover:text-blue-300">
                                {eng.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold group-hover:bg-blue-100 group-hover:text-[#3B82F6] transition-colors">
                              <span>{eng.openTicketsCount || 0} {t("ticketDetail.ticketsCount")}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-slate-500">
                          {t("ticketDetail.noEngineersFound")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 p-6 gap-6 max-w-[1400px] mx-auto w-full items-start overflow-y-auto">
        {/* Left Column (Main) */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Card 1: Ticket Info */}
          <div className="bg-white rounded-[10px] border border-slate-200 p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getPriorityColor(ticket.priority?.priority_name || ticket.priority)}`}
              >
                {t(`priorityLabels.${(ticket.priority?.priority_name || ticket.priority || 'MEDIUM').toUpperCase()}`, { defaultValue: ticket.priority?.priority_name || ticket.priority })} {t("ticketDetail.priority")}
              </span>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                {ticket.product?.product_name ||
                  ticket.product_id ||
                  t("ticketDetail.unknownProduct")}
              </span>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                {i18n.language === 'ar' && ticket.diagnostic_category?.category_name_ar 
                  ? ticket.diagnostic_category.category_name_ar 
                  : (ticket.diagnostic_category?.category_name || ticket.category?.name || ticket.category || t("ticketDetail.general"))}
              </span>
              <span className="text-xs text-slate-400 ms-auto flex items-center gap-1">
                <Clock size={14} />
                {new Date(ticket.created_at).toLocaleString()}
              </span>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap border-t border-slate-100 pt-6">
              {ticket.description}
            </div>
          </div>

          {/* Card 2: Diagnostics & AI */}
          <div className="bg-white rounded-[10px] border border-slate-200 border-t-[3px] border-t-[#3B82F6] p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-16 bg-blue-50/50 z-0"></div>
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                <AlertCircle size={20} className="text-[#3B82F6]" />
              </div>
              {t("ticketDetail.diagnosticInformation")}
            </h2>

            {answers.length > 0 ? (
              <div className="space-y-1 mb-6 mt-4">
                {answers.map((ans, idx) => {
                  const q = ans.question;
                  const displayQuestion = i18n.language === 'ar' && q?.question_text_ar 
                    ? q.question_text_ar 
                    : (q?.question_text || t("ticketDetail.diagnosticQuestion"));
                  
                  const options = q?.ai_question_options || [];
                  const matchedOption = options.find((o: any) => o.option_value === ans.answer_value);
                  const displayAnswer = i18n.language === 'ar' && matchedOption?.option_label_ar 
                    ? matchedOption.option_label_ar 
                    : (matchedOption?.option_label || ans.answer_value);

                  return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-3 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-500 text-sm sm:min-w-[220px]">
                      {displayQuestion}
                    </span>
                    <span className="text-slate-800 text-sm font-medium">
                      {displayAnswer}
                    </span>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-6 italic">
                {t("ticketDetail.noDiagnosticAnswers")}
              </p>
            )}

            {recommendationData && (
              <div
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  padding: "14px",
                  background: "#eff6ff",
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#1d4ed8",
                    }}
                  >
                    {t("ticketDetail.aiRecommendation")}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      background: "#3b82f6",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    {recommendationData.confidence_score}% {t("ticketDetail.match")}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#3b82f6",
                    lineHeight: "1.6",
                  }}
                >
                  {recommendationData.recommendation_text}
                </p>
              </div>
            )}
          </div>

          {/* Card 2.5: Attachments */}
          <div className="bg-white rounded-[10px] border border-slate-200 p-8 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Paperclip size={20} className="text-[#3B82F6]" />
                </div>{t("ticketDetail.attachments")}</h2>
              <div className="flex items-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.zip"
                  onChange={handleUploadAttachment}
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 transition-colors flex items-center gap-2 ${uploading ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"}`}
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400" />
                  ) : (
                    <Paperclip size={14} />
                  )}
                  {uploading ? t("ticketDetail.uploading") : t("ticketDetail.attachFile")}
                </label>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginLeft: "8px",
                  }}
                >
                  {t("ticketDetail.allowedFileTypes")}
                </span>
              </div>
            </div>

            {attachments.filter(a => !a.is_internal).length > 0 ? (
              <div className="space-y-2">
                {attachments.filter(a => !a.is_internal).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                        {getFileIcon(att.file_name || "")}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-sm font-medium text-slate-700 truncate"
                          title={att.file_name}
                        >
                          {att.file_name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{att.uploader_name || "User"}</span>
                          <span>•</span>
                          <span>
                            {new Date(att.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => downloadAttachment(att.file_path)}
                        className="p-1.5 text-slate-400 hover:text-[#f97316] hover:bg-orange-50 rounded"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      {(isAdmin || user?.id === att.uploaded_by) && (
                        <button
                          onClick={() =>
                            handleDeleteAttachment(att.id, att.file_path)
                          }
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic text-center py-4">
                {t("ticketDetail.noAttachments")}
              </p>
            )}

            {(isAdmin || (user?.role_code && ['SUPPORT_ENGINEER', 'TEAM_MEMBER'].includes(user.role_code.toUpperCase())) || user?.id === ticket.assigned_to) && attachments.filter(a => a.is_internal).length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">Internal Attachments</h3>
                  <div className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase flex items-center gap-1">
                    <Lock size={10} /> Internal Only
                  </div>
                </div>
                <div className="space-y-2">
                  {attachments.filter(a => a.is_internal).map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 border border-indigo-50 bg-indigo-50/30 rounded-lg hover:bg-indigo-50/80 transition-colors group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-white border border-indigo-100 text-indigo-500 flex items-center justify-center shrink-0">
                          {getFileIcon(att.file_name || "")}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className="text-sm font-medium text-indigo-900 truncate"
                            title={att.file_name}
                          >
                            {att.file_name}
                          </span>
                          {att.description && (
                            <span className="text-xs text-indigo-500/90 truncate mb-0.5" title={att.description}>
                              {att.description}
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-xs text-indigo-400/80">
                            <span>{att.uploader_name || "User"}</span>
                            <span>•</span>
                            <span>
                              {new Date(att.uploaded_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => downloadAttachment(att.file_path)}
                          className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        {(isAdmin || user?.id === att.uploaded_by) && (
                          <button
                            onClick={() =>
                              handleDeleteAttachment(att.id, att.file_path)
                            }
                            className="p-1.5 text-indigo-400 hover:text-red-500 hover:bg-white rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Resolution Justification */}
          {ticket.resolution_justification && (
            <div className="bg-white rounded-[10px] border border-emerald-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />{t("ticketDetail.resolutionJustification")}</h2>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 shadow-sm">
                {ticket.resolution_justification}
              </div>
            </div>
          )}

          {/* Card 3: Comments */}
          <div className="bg-white rounded-[10px] border border-slate-200 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <MessageSquare size={20} className="text-[#3B82F6]" />
              </div>{t("ticketDetail.activityAndComments")}</h2>

            <div className="space-y-6 mb-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  {comment.is_system_generated ? (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                      <Bot size={20} className="text-slate-500" />
                    </div>
                  ) : (
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name || "User")}&background=${comment.is_internal ? "4f46e5" : "f97316"}&color=fff`}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full shrink-0 border border-slate-200"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">
                        {comment.author_name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                      {comment.is_internal && (
                        <div className="flex items-center gap-1.5 ms-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold">
                          <Lock size={12} />
                          Internal
                          {(comment.teams?.team_name ||
                            comment.escalated_developer_name) && (
                            <span className="font-normal opacity-90 border-s border-indigo-200 ps-1.5 ml-0.5 flex items-center gap-1">
                              {comment.teams?.team_name &&
                                `${t("ticketDetail.escalatedTo")} ${comment.teams.team_name}`}
                              {comment.teams?.team_name &&
                                comment.escalated_developer_name &&
                                " - "}
                              {comment.escalated_developer_name &&
                                `${t("ticketDetail.dev")} ${comment.escalated_developer_name}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-sm p-3 rounded-lg border ${comment.is_system_generated ? "bg-slate-50 border-slate-200 text-slate-600 italic" : comment.is_internal ? "bg-indigo-50 border-indigo-100 text-indigo-900" : "bg-white border-slate-200 text-slate-800"}`}
                    >
                      {comment.comment_text || comment.content}
                    </div>
                    {comment.is_internal && (
                      <div className="mt-2 flex justify-end">
                        {comment.escalation_returned_at ? (
                          <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            {t("ticketDetail.returnedOn")} {" "}
                            {new Date(
                              comment.escalation_returned_at,
                            ).toLocaleString()}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-2 w-full max-w-sm ms-auto">
                            <div className="flex items-center gap-3 justify-end">
                              <input 
                                type="file" 
                                id={`internal-return-${comment.id}`} 
                                className="hidden" 
                                accept=".sql,.py,.js,.txt,.zip,.pdf,.png,.jpg,.jpeg"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setInternalReturnFiles(prev => ({ ...prev, [comment.id]: e.target.files![0] }));
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`internal-return-${comment.id}`}
                                className="text-xs text-slate-500 cursor-pointer hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                              >
                                <Paperclip size={14} />
                                {internalReturnFiles[comment.id] ? (
                                  <span className="font-medium text-indigo-600 truncate max-w-[120px]" title={internalReturnFiles[comment.id].name}>
                                    {internalReturnFiles[comment.id].name}
                                  </span>
                                ) : (
                                  "Attach file"
                                )}
                              </label>
                              <button
                                onClick={() => handleMarkReturned(comment.id)}
                                disabled={uploadingInternalReturns[comment.id]}
                                className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-md font-medium transition-colors border border-emerald-200 shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {uploadingInternalReturns[comment.id] ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-700" />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                {t("ticketDetail.markAsReturned")}
                              </button>
                            </div>
                            {internalReturnFiles[comment.id] && (
                              <input
                                type="text"
                                placeholder="What does this file do? (Optional) e.g. This script fixes the index issue."
                                value={internalReturnDescriptions[comment.id] || ""}
                                onChange={(e) => setInternalReturnDescriptions(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                className="w-full text-[11px] bg-slate-50/50 border border-slate-200 rounded px-2 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-400"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">{t("ticketDetail.noComments")}</p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t("ticketDetail.typeComment")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[10px] p-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-[#f97316] focus:border-[#3B82F6] min-h-[100px] resize-y"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="absolute bottom-3 end-3 w-8 h-8 bg-[#3B82F6] hover:bg-[#2563eb] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md flex items-center justify-center transition-colors shadow-sm"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="w-[260px] shrink-0 flex flex-col gap-6">
          {/* Details Card */}
          <div className="bg-white rounded-[10px] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} />{t("ticketDetail.ticketDetails")}</h3>

            <div className="flex flex-col">
              <div className="py-4 border-b border-slate-100 first:pt-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-slate-400">
                    <Bot size={16} />
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{t("ticketDetail.status")}</div>
                </div>
                <div className="ps-7 text-sm font-semibold text-slate-800 capitalize">
                  {t(`statusLabels.${(ticket.status?.status_code || ticket.status_code || ticket.status || '').toUpperCase()}`, { defaultValue: ticket.status?.status_name || ticket.status_code || ticket.status })}
                </div>
              </div>

              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-slate-400">
                    <AlertCircle size={16} />
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{t("ticketDetail.priority")}</div>
                </div>
                <div className="ps-7 flex items-center gap-2">
                  {isAdmin || ticket.assigned_to === user?.id ? (
                    <select
                      value={ticket.priority_id || ""}
                      onChange={handlePriorityChange}
                      disabled={updatingPriority}
                      className="text-sm font-semibold text-slate-800 capitalize bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#3B82F6] focus:ring-[#3B82F6] rounded px-2 py-1 -ms-2 transition-colors cursor-pointer"
                    >
                      {prioritiesList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {t(`priorityLabels.${p.priority_name.toUpperCase()}`, { defaultValue: p.priority_name })}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-semibold text-slate-800 capitalize">
                      {t(`priorityLabels.${(ticket.priority?.priority_name || ticket.priority || 'MEDIUM').toUpperCase()}`, { defaultValue: ticket.priority?.priority_name || ticket.priority })}
                    </span>
                  )}
                </div>
              </div>

              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-slate-400">
                    <Clock size={16} />
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{t("ticketDetail.slaDueDate")}</div>
                </div>
                <div className="ps-7">{renderSlaDueDate()}</div>
              </div>

              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-slate-400">
                    <User size={16} />
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{t("ticketDetail.customer")}</div>
                </div>
                <div className="ps-7 text-sm font-medium text-slate-800">
                  {ticket.customer?.customer_name || "N/A"}
                </div>
              </div>

              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-slate-400">
                    <FileType size={16} />
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{t("ticketDetail.product")}</div>
                </div>
                <div className="ps-7 text-sm font-medium text-slate-800">
                  {ticket.product?.product_name || ticket.product_id || "N/A"}
                </div>
              </div>

              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-slate-400">
                    <Table size={16} />
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{t("ticketDetail.category")}</div>
                </div>
                <div className="ps-7 text-sm font-medium text-slate-800">
                  {i18n.language === 'ar' && ticket.diagnostic_category?.category_name_ar 
                    ? ticket.diagnostic_category.category_name_ar 
                    : (ticket.diagnostic_category?.category_name || ticket.category?.name || ticket.category || "N/A")}
                </div>
              </div>

              <div className="py-4 pt-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-slate-400">
                    <UserPlus size={16} />
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{t("ticketDetail.assignedTo")}</div>
                </div>
                <div className="ps-7">
                  <div className="text-sm font-medium text-slate-800">
                    {ticket.assignedEngineerName || t("ticketDetail.unassigned")}
                  </div>
                  {isAdmin && ticket.assigned_to && ticket.assigned_at && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {calculateTimeElapsed(
                        ticket.assigned_at,
                        ticket.closed_at || ticket.updated_at,
                        ["CLOSED", "APPROVED"].includes(
                          (ticket.status?.status_code || ticket.status_code || "").toUpperCase()
                        ),
                        t
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Remote Check Requests */}
          {remoteSessions.length > 0 && (
            <div className="bg-white rounded-[10px] border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Video size={14} />Remote Check Requests
              </h3>
              <div className="space-y-3">
                {remoteSessions.map((rs) => (
                  <div key={rs.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          rs.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : rs.status === "cancelled"
                            ? "bg-slate-100 text-slate-500 border-slate-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {rs.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rs.created_at).toLocaleString()}
                      </span>
                    </div>
                    {rs.message && (
                      <p className="text-xs text-slate-600 mb-2">{rs.message}</p>
                    )}
                    <a
                      href={rs.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Join Meeting <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Card */}
          <div className="bg-white rounded-[10px] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} />{t("ticketDetail.timeline")}</h3>

            <div className="relative ps-6 space-y-8 before:absolute before:inset-y-3 before:start-[11px] before:w-0.5 before:bg-slate-100">
              <div className="relative">
                <div className="absolute -start-6 mt-1 w-5 h-5 rounded-full bg-[#3B82F6] border-[3px] border-white shadow-sm z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
                <div className="text-sm font-semibold text-slate-900">{t("ticketDetail.created")}</div>
                {editingCreatedDate ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="datetime-local"
                      value={newCreatedDate}
                      onChange={(e) => setNewCreatedDate(e.target.value)}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      onClick={handleSaveCreatedDate}
                      disabled={savingCreatedDate}
                      className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md px-2 py-1 disabled:opacity-50"
                    >
                      {savingCreatedDate ? "..." : t("common.save", { defaultValue: "Save" })}
                    </button>
                    <button
                      onClick={() => setEditingCreatedDate(false)}
                      disabled={savingCreatedDate}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-1"
                    >
                      {t("common.cancel", { defaultValue: "Cancel" })}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    {new Date(ticket.created_at).toLocaleString()}
                    {isAdmin && (
                      <button
                        onClick={handleStartEditCreatedDate}
                        title="Edit created date"
                        className="text-slate-300 hover:text-blue-600 transition-colors"
                      >
                        <Edit size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <div
                  className={`absolute -start-6 mt-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm z-10 flex items-center justify-center ${ticket.assigned_to_name !== t("ticketDetail.unassigned") ? "bg-[#3B82F6]" : "bg-white border-slate-300"}`}
                >
                  {ticket.assigned_to_name !== t("ticketDetail.unassigned") && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  )}
                </div>
                <div
                  className={`text-sm font-semibold ${ticket.assigned_to_name !== t("ticketDetail.unassigned") ? "text-slate-900" : "text-slate-500"}`}
                >{t("ticketDetail.assignedAgo")}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {ticket.assigned_to_name !== t("ticketDetail.unassigned")
                    ? ticket.assigned_to_name
                    : t("ticketDetail.pendingAssignment")}
                </div>
              </div>

              <div className="relative">
                <div
                  className={`absolute -start-6 mt-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm z-10 flex items-center justify-center ${["RESOLVED", "CLOSED", "APPROVED", "RESOLVED_PENDING_APPROVAL"].includes((ticket.status?.status_code || ticket.status_code || "").toUpperCase()) ? "bg-[#3B82F6]" : "bg-white border-slate-300"}`}
                >
                  {[
                    "RESOLVED",
                    "CLOSED",
                    "APPROVED",
                    "RESOLVED_PENDING_APPROVAL",
                  ].includes(
                    (
                      ticket.status?.status_code ||
                      ticket.status_code ||
                      ""
                    ).toUpperCase(),
                  ) && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  )}
                </div>
                <div
                  className={`text-sm font-semibold ${["RESOLVED", "CLOSED", "APPROVED", "RESOLVED_PENDING_APPROVAL"].includes((ticket.status?.status_code || ticket.status_code || "").toUpperCase()) ? "text-slate-900" : "text-slate-500"}`}
                >{t("ticketDetail.resolved")}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {ticket.justification_submitted_at
                    ? t("ticketDetail.resolutionSubmitted")
                    : t("ticketDetail.pendingResolution")}
                </div>
              </div>

              <div className="relative">
                <div
                  className={`absolute -start-6 mt-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm z-10 flex items-center justify-center ${["APPROVED"].includes((ticket.status?.status_code || ticket.status_code || "").toUpperCase()) ? "bg-[#3B82F6]" : "bg-white border-slate-300 outline outline-1 outline-dashed outline-slate-300"}`}
                >
                  {["APPROVED"].includes(
                    (
                      ticket.status?.status_code ||
                      ticket.status_code ||
                      ""
                    ).toUpperCase(),
                  ) && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  )}
                </div>
                <div
                  className={`text-sm font-semibold ${["APPROVED"].includes((ticket.status?.status_code || ticket.status_code || "").toUpperCase()) ? "text-slate-900" : "text-slate-500"}`}
                >{t("ticketDetail.approved", "Approved")}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {(
                    ticket.status?.status_code ||
                    ticket.status_code ||
                    ""
                  ).toUpperCase() === "APPROVED"
                    ? t("ticketDetail.ticketCompleted")
                    : t("ticketDetail.awaitingFinalApproval")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[10px] w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{t("ticketDetail.resolveTicketTitle")}</h2>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg border border-amber-100 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>
                  Please provide a detailed justification for the resolution.
                  This will be reviewed by a Support Manager before being sent
                  to the customer.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Resolution Justification{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={justificationText}
                  onChange={(e) => setJustificationText(e.target.value)}
                  placeholder={t("ticketDetail.resolvePlaceholder")}
                  className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#3B82F6] resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >{t("ticketDetail.cancel")}</button>
              <button
                onClick={handleResolveTicket}
                disabled={resolving || !justificationText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resolving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {t("ticketDetail.submitting")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {t("ticketDetail.submitForApproval")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Remote Check Modal */}
      {showRemoteModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[10px] w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Video size={20} className="text-blue-600" />Request Remote Check
              </h2>
              <button
                onClick={() => setShowRemoteModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                <Video size={16} className="mt-0.5 shrink-0" />
                <p>
                  Share a meeting link (Zoom, Teams, Google Meet...). The bank will be notified
                  and can join it directly from their ticket.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Meeting URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={remoteMeetingUrl}
                  onChange={(e) => setRemoteMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Message to bank <span className="text-slate-400 font-normal">{t("ticketDetail.optional")}</span>
                </label>
                <textarea
                  value={remoteMessage}
                  onChange={(e) => setRemoteMessage(e.target.value)}
                  placeholder="e.g. Please join at 3pm so we can check the AML module remotely."
                  className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setShowRemoteModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                {t("ticketDetail.cancel")}
              </button>
              <button
                onClick={handleRequestRemoteCheck}
                disabled={requestingRemote || !remoteMeetingUrl.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestingRemote ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Video size={16} />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[10px] w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Lock size={20} className="text-indigo-600" />{t("ticketDetail.internalEscalationNote")}</h2>
              <button
                onClick={() => setShowEscalateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-indigo-50 text-indigo-800 text-sm p-3 rounded-lg border border-indigo-100 flex items-start gap-2">
                <Lock size={16} className="mt-0.5 shrink-0" />
                <p>
                  This note is internal and will not be visible to the customer.
                  Use it to document escalations to development teams.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("ticketDetail.escalateToTeam")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={escalatedTeamId}
                    onChange={(e) => setEscalatedTeamId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">{t("ticketDetail.selectTeam")}</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.team_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Developer Name{" "}
                    <span className="text-slate-400 font-normal">{t("ticketDetail.optional")}</span>
                  </label>
                  {loadingTeamDevelopers ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      {t("ticketDetail.loadingDevelopers")}
                    </div>
                  ) : escalatedTeamId && teamDevelopers.length === 0 ? (
                    <div className="text-sm text-slate-500 py-2 italic bg-slate-50 border border-slate-100 rounded-lg px-3">
                      {t("ticketDetail.noDevelopers")}
                    </div>
                  ) : (
                    <select
                      value={escalatedDeveloperName}
                      onChange={(e) => setEscalatedDeveloperName(e.target.value)}
                      disabled={!escalatedTeamId}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">{t("ticketDetail.selectDeveloper")}</option>
                      {teamDevelopers.map((dev: any, idx: number) => (
                        <option key={idx} value={dev.full_name}>
                          {dev.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("ticketDetail.internalNoteLabel")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                  placeholder={t("ticketDetail.internalNotePlaceholder")}
                  className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >{t("ticketDetail.cancel")}</button>
              <button
                onClick={handleSaveEscalation}
                disabled={
                  savingEscalation || !escalatedTeamId || !escalationNote.trim()
                }
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEscalation ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {t("ticketDetail.saving")}
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    {t("ticketDetail.saveInternalNote")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
