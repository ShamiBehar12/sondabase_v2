import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface RejectionComment {
  id: string;
  rejection_reason: string;
  created_at: string;
  admin_id: string;
  admin_name?: string;
}

interface RejectionCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateId: string;
  certificateType: 'certificate' | 'professional_certificate' | 'success_story';
}

export function RejectionCommentDialog({ 
  open, 
  onOpenChange, 
  certificateId, 
  certificateType 
}: RejectionCommentDialogProps) {
  const { t, i18n } = useTranslation();
  const [rejectionComments, setRejectionComments] = useState<RejectionComment[]>([]);
  const [loading, setLoading] = useState(false);

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'en': return enUS;
      case 'es': return es;
      default: return ptBR;
    }
  };

  const fetchRejectionComments = async () => {
    if (!certificateId) return;
    
    setLoading(true);
    try {
      let rejections;
      let rejectionsError;
      
      // Choose the correct query based on type
      if (certificateType === 'success_story') {
        const result = await apiClient
          .from('success_story_rejections')
          .select('id, rejection_reason, created_at, admin_id')
          .eq('success_story_id', certificateId)
          .order('created_at', { ascending: false });
        rejections = result.data;
        rejectionsError = result.error;
      } else {
        const result = await apiClient
          .from('certificate_rejections')
          .select('id, rejection_reason, created_at, admin_id')
          .eq('certificate_id', certificateId)
          .eq('certificate_type', certificateType)
          .order('created_at', { ascending: false });
        rejections = result.data;
        rejectionsError = result.error;
      }

      if (rejectionsError) {
        console.error('Error fetching rejection comments:', rejectionsError);
        return;
      }

      // Then get admin names for each rejection
      const commentsWithAdminNames: RejectionComment[] = [];
      
      for (const rejection of rejections || []) {
        const { data: profile } = await apiClient
          .from('profiles')
          .select('full_name')
          .eq('user_id', rejection.admin_id)
          .single();
          
        commentsWithAdminNames.push({
          ...rejection,
          admin_name: profile?.full_name || 'Admin'
        });
      }

      setRejectionComments(commentsWithAdminNames);
    } catch (error) {
      console.error('Error fetching rejection comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && certificateId) {
      fetchRejectionComments();
    }
  }, [open, certificateId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t('myCertificates.rejectionComment')}
          </DialogTitle>
          <DialogDescription>
            {t('myCertificates.rejectedBy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : rejectionComments.length === 0 ? (
            <div className="text-center py-8 text-white">
              {t('myCertificates.noRejected')}
            </div>
          ) : (
            <div className="space-y-4">
              {rejectionComments.map((comment, index) => (
                <div key={comment.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">
                        {t('myCertificates.statusRejected')}
                      </Badge>
                      <span className="text-sm text-white">
                        {comment.admin_name}
                      </span>
                    </div>
                    <span className="text-xs text-white">
                      {format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm', {
                        locale: getDateLocale()
                      })}
                    </span>
                  </div>
                  
                  <div className="bg-[rgba(35,44,58,0.5)] rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">
                      {comment.rejection_reason}
                    </p>
                  </div>
                  
                  {index < rejectionComments.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


