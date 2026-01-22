/**
 * Composable para gerenciar upload e armazenamento de comprovantes no Supabase Storage
 */
export function useComprovante() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  /**
   * Faz upload de um comprovante para o Supabase Storage
   * @param imagem - Arquivo de imagem do comprovante
   * @param textoOCR - Texto extraído via OCR (opcional)
   * @returns URL pública do comprovante ou null se falhar
   */
  /**
   * Comprime uma imagem para reduzir o tamanho do arquivo
   */
  const comprimirImagem = async (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)

      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string

        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Redimensionar mantendo proporção
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Erro ao comprimir imagem'))
              }
            },
            'image/jpeg',
            quality
          )
        }

        img.onerror = () => reject(new Error('Erro ao carregar imagem'))
      }

      reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    })
  }

  const uploadComprovante = async (
    imagem: File,
    textoOCR?: string
  ): Promise<{ url: string; textoOCR?: string } | null> => {
    try {
      console.log('🔵 [UPLOAD] Iniciando upload de comprovante...')

      if (!user.value) {
        console.error('❌ [UPLOAD] Erro: Usuário não autenticado')
        throw new Error('Usuário não autenticado')
      }

      // Pega o ID do usuário (pode ser 'id' ou 'sub' dependendo da versão do Supabase)
      const userId = user.value.id || (user.value as any)?.sub

      if (!userId) {
        console.error('❌ [UPLOAD] Erro: ID do usuário não encontrado')
        throw new Error('ID do usuário não encontrado')
      }

      console.log('🔵 [UPLOAD] Comprimindo imagem...')
      const imagemComprimida = await comprimirImagem(imagem, 1200, 0.8)

      const timestamp = Date.now()
      const fileName = `${userId}/${timestamp}.jpg` // Sempre salva como JPG

      console.log('🔵 [UPLOAD] Dados do arquivo:', {
        userId,
        fileName,
        tamanhoOriginal: imagem.size,
        tamanhoComprimido: imagemComprimida.size,
        reducao: `${Math.round((1 - imagemComprimida.size / imagem.size) * 100)}%`,
        timestamp
      })

      // Upload para o Supabase Storage
      console.log('🔵 [UPLOAD] Fazendo upload para o Supabase Storage...')
      const { data, error } = await supabase.storage
        .from('comprovantes')
        .upload(fileName, imagemComprimida, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        })

      if (error) {
        console.error('❌ [UPLOAD] Erro ao fazer upload:', error)
        console.error('❌ [UPLOAD] Detalhes do erro:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: error
        })
        throw error
      }

      console.log('✅ [UPLOAD] Upload realizado com sucesso:', data)

      // Gerar URL pública (mesmo sendo bucket privado, usamos signedURL)
      console.log('🔵 [UPLOAD] Gerando URL assinada...')
      const { data: urlData, error: urlError } = await supabase.storage
        .from('comprovantes')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10) // 10 anos

      if (urlError) {
        console.error('❌ [UPLOAD] Erro ao gerar URL:', urlError)
        throw urlError
      }

      if (!urlData?.signedUrl) {
        console.error('❌ [UPLOAD] URL não foi gerada')
        throw new Error('Não foi possível gerar URL do comprovante')
      }

      console.log('✅ [UPLOAD] URL gerada com sucesso:', urlData.signedUrl)

      const resultado = {
        url: urlData.signedUrl,
        textoOCR
      }

      console.log('✅ [UPLOAD] Upload completo:', resultado)
      return resultado
    } catch (error) {
      console.error('❌ [UPLOAD] Erro no upload do comprovante:', error)
      return null
    }
  }

  /**
   * Remove um comprovante do Supabase Storage
   * @param url - URL do comprovante a ser removido
   */
  const removerComprovante = async (url: string): Promise<boolean> => {
    try {
      if (!user.value) {
        throw new Error('Usuário não autenticado')
      }

      // Extrair o caminho do arquivo da URL
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/')
      const fileName = pathParts.slice(-2).join('/') // userId/timestamp.ext

      const { error } = await supabase.storage
        .from('comprovantes')
        .remove([fileName])

      if (error) {
        console.error('Erro ao remover comprovante:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao remover comprovante:', error)
      return false
    }
  }

  /**
   * Obtém URL assinada de um comprovante (para visualização)
   * @param path - Caminho do arquivo no storage
   * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
   */
  const obterUrlComprovante = async (
    path: string,
    expiresIn: number = 3600
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('comprovantes')
        .createSignedUrl(path, expiresIn)

      if (error) {
        console.error('Erro ao obter URL:', error)
        return null
      }

      return data?.signedUrl || null
    } catch (error) {
      console.error('Erro ao obter URL do comprovante:', error)
      return null
    }
  }

  return {
    uploadComprovante,
    removerComprovante,
    obterUrlComprovante
  }
}
