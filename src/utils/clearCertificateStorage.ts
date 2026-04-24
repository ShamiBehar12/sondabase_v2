import { apiClient } from '@/lib/api-client';

export const clearCertificateStorage = async () => {
  try {
    console.log('Iniciando limpeza do storage de certificados...');
    
    // Listar todos os arquivos no bucket de certificados
    const { data: files, error: listError } = await apiClient.storage
      .from('certificates')
      .list('', {
        limit: 1000,
        offset: 0
      });

    if (listError) {
      console.error('Erro ao listar arquivos:', listError);
      return { success: false, error: listError.message };
    }

    if (!files || files.length === 0) {
      console.log('Nenhum arquivo encontrado no storage.');
      return { success: true, message: 'Nenhum arquivo para limpar.' };
    }

    console.log(`Encontrados ${files.length} arquivos para deletar.`);

    // Listar arquivos em todas as pastas de usuários
    const allFilePaths: string[] = [];
    
    for (const file of files) {
      if (file.name && file.name !== '.emptyFolderPlaceholder') {
        // Se for uma pasta (diretório de usuário)
        const { data: userFiles, error: userListError } = await apiClient.storage
          .from('certificates')
          .list(file.name, {
            limit: 1000,
            offset: 0
          });

        if (!userListError && userFiles) {
          for (const userFile of userFiles) {
            if (userFile.name && userFile.name !== '.emptyFolderPlaceholder') {
              allFilePaths.push(`${file.name}/${userFile.name}`);
            }
          }
        }
      }
    }

    console.log(`Total de arquivos para deletar: ${allFilePaths.length}`);

    if (allFilePaths.length > 0) {
      // Deletar todos os arquivos
      const { data: deleteData, error: deleteError } = await apiClient.storage
        .from('certificates')
        .remove(allFilePaths);

      if (deleteError) {
        console.error('Erro ao deletar arquivos:', deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log('Arquivos deletados com sucesso:', deleteData);
    }

    return { 
      success: true, 
      message: `Limpeza concluída. ${allFilePaths.length} arquivos deletados.`,
      deletedFiles: allFilePaths.length
    };

  } catch (error) {
    console.error('Erro durante limpeza do storage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
};
