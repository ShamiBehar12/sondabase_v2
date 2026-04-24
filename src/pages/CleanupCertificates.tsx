import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { clearCertificateStorage } from '@/utils/clearCertificateStorage';
import { Trash2, AlertTriangle } from 'lucide-react';

export const CleanupCertificates = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<any>(null);
  const { toast } = useToast();

  const handleClearStorage = async () => {
    if (!confirm('Tem certeza que deseja limpar TODOS os arquivos de certificados do storage? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsClearing(true);
    setClearResult(null);

    try {
      const result = await clearCertificateStorage();
      setClearResult(result);

      if (result.success) {
        toast({
          title: "Storage limpo com sucesso",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao limpar storage",
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Ocorreu um erro durante a limpeza.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Limpeza de Certificados</h1>
        <p className="text-muted-foreground mt-2">
          Ferramenta para limpeza completa dos arquivos de certificados no storage
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Limpeza do Storage de Certificados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h3 className="font-semibold text-orange-800 mb-2">⚠️ Atenção</h3>
            <p className="text-orange-700 text-sm">
              Esta ação irá deletar TODOS os arquivos de certificados do storage. 
              A base de dados já foi limpa, mas os arquivos físicos precisam ser removidos separadamente.
              Esta ação não pode ser desfeita.
            </p>
          </div>

          <Button 
            onClick={handleClearStorage}
            disabled={isClearing}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isClearing ? 'Limpando Storage...' : 'Limpar Storage de Certificados'}
          </Button>

          {clearResult && (
            <div className={`p-4 rounded-lg border ${
              clearResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                clearResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {clearResult.success ? '✅ Sucesso' : '❌ Erro'}
              </h3>
              <p className={`text-sm ${
                clearResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {clearResult.message || clearResult.error}
              </p>
              {clearResult.deletedFiles !== undefined && (
                <p className="text-sm text-green-600 mt-1">
                  Arquivos deletados: {clearResult.deletedFiles}
                </p>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">O que foi limpo da base de dados:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>✅ Tabela certificates (0 registros restantes)</li>
              <li>✅ Tabela professional_certificates (0 registros restantes)</li>
              <li>✅ Tabela certificate_rejections (0 registros restantes)</li>
              <li>✅ Tabela certificate_approvals (0 registros restantes)</li>
            </ul>
            
            <h4 className="font-medium mb-2 mt-4">O que foi mantido:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>✅ Usuários (auth.users)</li>
              <li>✅ Perfis de usuários (profiles)</li>
              <li>✅ Roles de usuários (user_roles)</li>
              <li>✅ Todas as outras configurações</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};