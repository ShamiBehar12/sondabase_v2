import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useContentApproval, ContentItem, ContentType } from '@/hooks/useContentApproval';
import { useAuth } from '@/contexts/AuthContext';
import { DynamicContentForm } from '@/components/approval/DynamicContentForm';
import { ContentItemCard } from '@/components/approval/ContentItemCard';
import { Badge } from '@/components/ui/badge';

export default function ContentManagement() {
  const { user } = useAuth();
  const {
    contentTypes,
    items,
    loading,
    fetchMyItems,
    createItem,
    updateItem,
    submitForReview
  } = useContentApproval();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyItems();
    }
  }, [user, fetchMyItems]);

  // Filter items based on search and filters
  const filteredItems = items.filter(item => {
    const itemData = item.dados as any;
    const title = itemData?.titulo || '';
    const description = itemData?.descricao || itemData?.empresa || '';
    
    const matchesSearch = !searchTerm || 
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type_id === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Group items by status for stats
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCreateItem = async (data: any) => {
    if (!selectedType) return;
    await createItem(selectedType.id, data);
    setShowCreateDialog(false);
    setSelectedType(null);
  };

  const handleEditItem = async (data: any) => {
    if (!selectedItem) return;
    await updateItem(selectedItem.id, data);
    setShowEditDialog(false);
    setSelectedItem(null);
  };

  const handleSubmitForReview = async (item: ContentItem) => {
    await submitForReview(item.id);
  };

  const handleSubmitFromForm = async (data: any) => {
    if (!selectedItem) return;
    await updateItem(selectedItem.id, data);
    await submitForReview(selectedItem.id);
    setShowEditDialog(false);
    setSelectedItem(null);
  };

  const openEditDialog = (item: ContentItem) => {
    setSelectedItem(item);
    setSelectedType(contentTypes.find(type => type.id === item.type_id) || null);
    setShowEditDialog(true);
  };

  const openCreateDialog = (type: ContentType) => {
    setSelectedType(type);
    setShowCreateDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Certificados</h1>
          <p className="text-white">
            Gerencie seus certificados y documentos pessoais
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-[#3E4A5F]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Rascunhos</p>
                <p className="text-3xl font-bold">{statusCounts.rascunho || 0}</p>
              </div>
              <Badge variant="secondary" className="text-xs">DRAFT</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[#3E4A5F]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Em Revisão</p>
                <p className="text-3xl font-bold">{statusCounts.em_revisao || 0}</p>
              </div>
              <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">REVIEW</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[#3E4A5F]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Aprovados</p>
                <p className="text-3xl font-bold">{statusCounts.aprovado || 0}</p>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800 text-xs">APPROVED</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[#3E4A5F]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Rejeitados</p>
                <p className="text-3xl font-bold">{statusCounts.rechazado || 0}</p>
              </div>
              <Badge variant="destructive" className="text-xs">REJECTED</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Crear Nuevo Conteúdo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {contentTypes.map((type) => (
              <Button
                key={type.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => openCreateDialog(type)}
              >
                <h3 className="font-semibold">{type.name_pt}</h3>
                {type.description_pt && (
                  <p className="text-sm text-white text-left">
                    {type.description_pt}
                  </p>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white w-4 h-4" />
            <Input
              placeholder="Buscar por título o descrição..."
              value={searchTerm}
              onChange={(y) => setSearchTerm(y.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="em_revisao">Em Revisão</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="rechazado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {contentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name_pt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Items */}
      {loading ? (
        <div className="text-center py-8">
          <p>Carregando itens...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-white">
              {items.length === 0 
                ? 'Ningún item encontrado. Comece criando seu primeiro conteúdo!' 
                : 'Ningún item corresponde aos filtros selecionados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {filteredItems.map((item) => (
            <ContentItemCard
              key={item.id}
              item={item}
              onEdit={openEditDialog}
              onSubmitForReview={handleSubmitForReview}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Crear {selectedType?.name_pt}
            </DialogTitle>
          </DialogHeader>
          {selectedType && (
            <DynamicContentForm
              contentType={selectedType}
              onSave={handleCreateItem}
              onSubmitForReview={handleCreateItem}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar {selectedType?.name_pt}
            </DialogTitle>
          </DialogHeader>
          {selectedType && selectedItem && (
            <DynamicContentForm
              contentType={selectedType}
              item={selectedItem}
              onSave={handleEditItem}
              onSubmitForReview={handleSubmitFromForm}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

