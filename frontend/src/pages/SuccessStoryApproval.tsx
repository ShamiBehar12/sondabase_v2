import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, User, Eye, Building } from 'lucide-react';
import { SuccessStoryDetailDialog } from '@/components/stories/SuccessStoryDetailDialog';

interface SuccessStoryWithUser {
  id: string;
  user_id: string;
  title_pt?: string;
  title_en?: string;
  title_es?: string;
  client_pt?: string;
  client_en?: string;
  client_es?: string;
  country_pt?: string;
  country_en?: string;
  country_es?: string;
  product_pt?: string;
  product_en?: string;
  product_es?: string;
  challenge_pt?: string;
  challenge_en?: string;
  challenge_es?: string;
  solution_pt?: string;
  solution_en?: string;
  solution_es?: string;
  benefits_pt?: string;
  benefits_en?: string;
  benefits_es?: string;
  contract_period?: string;
  contract_value?: string;
  closure_year?: string;
  client_logo?: string;
  image_01?: string;
  image_02?: string;
  image_03?: string;
  image_04?: string;
  tags?: string[];
  is_verified: boolean;
  status: 'rascunho' | 'em_revisao' | 'aprovado' | 'rechazado';
  created_at: string;
  updated_at: string;
  // Profile information
  full_name?: string;
}

export default function SuccessStoryApproval() {
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState<Record<string, boolean>>({});
  const [loadingReject, setLoadingReject] = useState<Record<string, boolean>>({});
  const [successStories, setSuccessStories] = useState<SuccessStoryWithUser[]>([]);
  const [selectedStory, setSelectedStory] = useState<SuccessStoryWithUser | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [storyToReject, setStoryToReject] = useState<{id: string} | null>(null);

  // Fetch success stories with user information
  const fetchSuccessStoriesWithUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching success stories for approval...');
      
      const { data, error } = await apiClient
        .from('success_stories')
        .select(`
          id,
          user_id,
          title_pt,
          title_en,
          title_es,
          client_pt,
          client_en,
          client_es,
          country_pt,
          country_en,
          country_es,
          product_pt,
          product_en,
          product_es,
          challenge_pt,
          challenge_en,
          challenge_es,
          solution_pt,
          solution_en,
          solution_es,
          benefits_pt,
          benefits_en,
          benefits_es,
          contract_period,
          contract_value,
          closure_year,
          client_logo,
          image_01,
          image_02,
          image_03,
          image_04,
          tags,
          is_verified,
          status,
          created_at,
          updated_at
        `)
        .eq('status', 'em_revisao')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching success stories:', error);
        toast({
          title: "Error",
          description: "Error ao carregar historias de éxito pendentes",
          variant: "destructive",
        });
        return;
      }

      if (!data || data.length === 0) {
        console.log('No pending success stories found');
        setSuccessStories([]);
        return;
      }

      // Get user profiles for the stories
      const userIds = data.map(story => story.user_id);
      const { data: profiles, error: profilesError } = await apiClient
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        // Continue without profile names
      }

      const storiesWithUsers = data.map(story => ({
        ...story,
        full_name: profiles?.find(p => p.user_id === story.user_id)?.full_name || 'Usuario no encontrado'
      }));

      console.log('Loaded success stories with users:', storiesWithUsers);
      setSuccessStories(storiesWithUsers);
    } catch (err) {
      console.error('Unexpected error fetching success stories:', err);
      toast({
        title: "Error",
        description: "Error inesperado ao carregar historias de éxito",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'reviewer') {
      fetchSuccessStoriesWithUsers();
    }
  }, [userRole]);

  const handleApprove = async (storyId: string) => {
    if (!user || (userRole !== 'admin' && userRole !== 'reviewer')) {
      toast({
        title: "Error",
        description: "No tienes permiso para aprobar historias de éxito.",
        variant: "destructive",
      });
      return;
    }

    setLoadingApprove(prev => ({ ...prev, [storyId]: true }));
    
    try {
      // Update story status to approved
      const { error: updateError } = await apiClient
        .from('success_stories')
        .update({ 
          is_verified: true,
          status: 'aprovado'
        })
        .eq('id', storyId);

      if (updateError) {
        throw updateError;
      }

      // Log the approval in success_story_approvals table
      const story = successStories.find(s => s.id === storyId);
      if (story) {
        const { error: approvalError } = await apiClient
          .from('success_story_approvals')
          .insert({
            success_story_id: storyId,
            admin_id: user.id,
            user_id: story.user_id,
            original_title: story.title_pt || story.title_en || story.title_es
          });

        if (approvalError) {
          console.error('Error logging approval:', approvalError);
        }
      }

      toast({
        title: "Éxito",
        description: "Historia de éxito aprovada com éxito!",
      });

      // Refresh the list
      fetchSuccessStoriesWithUsers();
    } catch (error: any) {
      console.error('Error approving success story:', error);
      toast({
        title: "Error",
        description: error.message || "Error ao aprobar historia de éxito",
        variant: "destructive",
      });
    } finally {
      setLoadingApprove(prev => ({ ...prev, [storyId]: false }));
    }
  };

  const handleReject = async () => {
    if (!storyToReject || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Por favor, forneça un motivo para a rechazo.",
        variant: "destructive",
      });
      return;
    }

    if (!user || (userRole !== 'admin' && userRole !== 'reviewer')) {
      toast({
        title: "Error",
        description: "No tienes permiso para rejeitar historias de éxito.",
        variant: "destructive",
      });
      return;
    }

    setLoadingReject(prev => ({ ...prev, [storyToReject.id]: true }));
    
    try {
      const story = successStories.find(s => s.id === storyToReject.id);
      
      // Log the rejection
      const { error: rejectionError } = await apiClient
        .from('success_story_rejections')
        .insert({
          success_story_id: storyToReject.id,
          admin_id: user.id,
          user_id: story?.user_id,
          rejection_reason: rejectionReason,
          original_title: story?.title_pt || story?.title_en || story?.title_es
        });

      if (rejectionError) {
        console.error('Error logging rejection:', rejectionError);
        throw rejectionError;
      }

      // Update story status to rejected
      const { error: updateError } = await apiClient
        .from('success_stories')
        .update({ status: 'rechazado' })
        .eq('id', storyToReject.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Éxito",
        description: "Historia de éxito rechazada.",
      });

      // Close dialog and refresh
      setRejectDialogOpen(false);
      setRejectionReason('');
      setStoryToReject(null);
      fetchSuccessStoriesWithUsers();
    } catch (error: any) {
      console.error('Error rejecting success story:', error);
      toast({
        title: "Error",
        description: error.message || "Error ao rejeitar historia de éxito",
        variant: "destructive",
      });
    } finally {
      setLoadingReject(prev => ({ ...prev, [storyToReject.id]: false }));
    }
  };

  // Filter only unverified stories (following certificate approval pattern)
  const unverifiedStories = successStories.filter(story => !story.is_verified);

  if (userRole !== 'admin' && userRole !== 'reviewer') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t('approval.accessDenied')}</h1>
        <p>{t('approval.accessDeniedMessage')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('approval.successStoryApproval')}</h1>
        <p className="text-white mt-2">
          {t('approval.successStoryApprovalDescription')}
        </p>
      </div>

      {unverifiedStories.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-white">
              Ninguna historia de éxito esperando aprobación.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unverifiedStories.map((story) => (
                <TableRow key={story.id}>
                  <TableCell className="font-medium">
                    {story.title_pt || story.title_en || story.title_es || 'Sin título'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-white" />
                      <span>{story.full_name || 'Nombre no disponible'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-white" />
                      <span>{story.client_pt || story.client_en || story.client_es || 'No informado'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{story.country_pt || story.country_en || story.country_es || 'No informado'}</TableCell>
                  <TableCell>
                    {new Date(story.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Pendente</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={(y) => {
                          y.stopPropagation();
                          setSelectedStory(story);
                          setDetailDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Detalhes
                      </Button>
                      <Button
                        onClick={() => handleApprove(story.id)}
                        disabled={loadingApprove[story.id]}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => {
                          setStoryToReject({id: story.id});
                          setRejectDialogOpen(true);
                        }}
                        disabled={loadingReject[story.id]}
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Historia de Éxito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">
                Motivo de la rechazo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explique o motivo del rechazo para que el usuario pueda corregir..."
                value={rejectionReason}
                onChange={(y) => setRejectionReason(y.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                  setStoryToReject(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  if (!storyToReject || !rejectionReason.trim()) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Por favor, forneça un motivo para a rechazo.",
                    });
                    return;
                  }
                  
                  await handleReject();
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                  setStoryToReject(null);
                }}
                disabled={loading || !rejectionReason.trim()}
              >
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedStory && (
        <SuccessStoryDetailDialog
          story={selectedStory as any}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      )}
    </div>
  );
}


