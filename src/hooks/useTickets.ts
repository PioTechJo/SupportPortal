import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Ticket, Comment } from '../types';
import { useAuth } from '../context/AuthContext';

export function useTickets() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query: Get all tickets
  const ticketsQuery = useQuery({
    queryKey: ['tickets', user?.id, user?.tenant_id, user?.customer_id, user?.role_code],
    queryFn: async () => {
      const allTickets = await api.getTickets();
      if (!user) return [];

      // Filter tickets based on user role and tenant
      const roleUp = user.role_code?.toUpperCase() || '';
      const isTenantUser = !['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER', 'AGENT', 'SUPPORT_ENGINEER', 'SUPPORT_OFFICER', 'TEAM_LEAD', 'TEAM_MEMBER'].includes(roleUp);
      if (isTenantUser) {
        const userTenantId = user.tenant_id || user.customer_id;
        if (!userTenantId) return [];
        return allTickets.filter(t => (t.tenant_id || (t as any).customer_id) === userTenantId);
      }
      return allTickets;
    },
    enabled: !!user,
  });

  // Query: Get active tickets count
  const activeTicketsCountQuery = useQuery({
    queryKey: ['activeTicketsCount', user?.tenant_id, user?.customer_id, user?.role_code],
    queryFn: async () => {
      if (!user) return 0;
      const roleUp = user.role_code?.toUpperCase() || '';
      const isTenantUser = !['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER', 'AGENT', 'SUPPORT_ENGINEER', 'SUPPORT_OFFICER', 'TEAM_LEAD', 'TEAM_MEMBER'].includes(roleUp);
      const userTenantId = user.tenant_id || user.customer_id;
      if (isTenantUser && userTenantId) {
        return api.getActiveTicketsCount(userTenantId);
      }
      return api.getActiveTicketsCount();
    },
    enabled: !!user,
  });

  // Mutation: Create a ticket
  const createTicketMutation = useMutation({
    mutationFn: (newTicket: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!user) throw new Error("Can't create ticket: No active user session.");
      return api.createTicket({
        ...newTicket,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    }
  });

  // Mutation: Update a ticket
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<Ticket> }) => {
      return api.updateTicket(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
    }
  });

  return {
    tickets: ticketsQuery.data || [],
    activeTicketsCount: activeTicketsCountQuery.data || 0,
    isLoading: ticketsQuery.isLoading,
    isError: ticketsQuery.isError,
    error: ticketsQuery.error,
    refetchTickets: () => ticketsQuery.refetch(),
    createTicket: createTicketMutation.mutateAsync,
    isCreating: createTicketMutation.isPending,
    updateTicket: updateTicketMutation.mutateAsync,
    isUpdating: updateTicketMutation.isPending
  };
}

export function useTicketDetails(ticketId: string) {
  const queryClient = useQueryClient();

  const ticketQuery = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => api.getTicket(ticketId),
    enabled: !!ticketId,
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', ticketId],
    queryFn: () => api.getComments(ticketId),
    enabled: !!ticketId,
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment: Omit<Comment, 'id' | 'created_at'>) => {
      return api.createComment(comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] });
    }
  });

  return {
    ticket: ticketQuery.data || null,
    isTicketLoading: ticketQuery.isLoading,
    isTicketError: ticketQuery.isError,
    comments: commentsQuery.data || [],
    isCommentsLoading: commentsQuery.isLoading,
    addComment: addCommentMutation.mutateAsync,
    isAddingComment: addCommentMutation.isPending
  };
}
