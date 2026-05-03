import { apiClient } from '@/lib/api-client';

export const clearCertificateStorage = async () => {
  try {
    console.log('Iniciando limpeza del storage de certificados...');
    
    // Listar todos os archivos no bucket de certificados
    const { data: files, error: listError } = await apiClient.storage
      .from('certificates')
      .list('', {
        limit: 1000,
        offset: 0
      });

    if (listError) {
      console.error('Error ao listar archivos:', listError);
      return { success: false, error: listError.message };
    }

    if (!files || files.length === 0) {
      console.log('Ningún archivo encontrado no storage.');
      return { success: true, message: 'Ningún archivo para limpar.' };
    }

    console.log(`Encontrados ${files.length} archivos para deletar.`);

    // Listar archivos em todas as pastas de usuarios
    const allFilePaths: string[] = [];
    
    for (const file of files) {
      if (file.name && file.name !== '.emptyFolderPlaceholder') {
        // Si es uma carpeta (directorio de usuario)
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

    console.log(`Total de archivos para deletar: ${allFilePaths.length}`);

    if (allFilePaths.length > 0) {
      // Deletar todos os archivos
      const { data: deleteData, error: deleteError } = await apiClient.storage
        .from('certificates')
        .remove(allFilePaths);

      if (deleteError) {
        console.error('Error ao deletar archivos:', deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log('Arquivos deletados com éxito:', deleteData);
    }

    return { 
      success: true, 
      message: `Limpeza concluída. ${allFilePaths.length} archivos deletados.`,
      deletedFiles: allFilePaths.length
    };

  } catch (error) {
    console.error('Error durante limpeza del storage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconhecido' 
    };
  }
};
