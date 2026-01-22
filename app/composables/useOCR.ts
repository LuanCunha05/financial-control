import Tesseract from 'tesseract.js'

export interface DadosComprovante {
  valor: number | null
  data: string | null
  estabelecimento: string | null
  textoCompleto: string
}

export default function useOCR() {
  const processando = ref(false)
  const progresso = ref(0)

  /**
   * Extrai valor do texto (formato R$ 123,45 ou R$ 123.45)
   */
  const extrairValor = (texto: string): number | null => {
    // Padrões comuns: R$ 123,45 | R$123,45 | 123,45 | 123.45
    const padroes = [
      /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/,  // R$ 1.234,56
      /R\$\s*(\d+,\d{2})/,                   // R$ 123,45
      /R\$\s*(\d+\.\d{2})/,                  // R$ 123.45
      /TOTAL[:\s]+R?\$?\s*(\d+[.,]\d{2})/i,  // TOTAL: 123,45
      /VALOR[:\s]+R?\$?\s*(\d+[.,]\d{2})/i,  // VALOR: 123,45
      /(\d{1,3}(?:\.\d{3})*,\d{2})/,        // 1.234,56 (sem R$)
    ]

    for (const padrao of padroes) {
      const match = texto.match(padrao)
      if (match && match[1]) {
        // Remove pontos de milhar e converte vírgula para ponto
        const valorStr = match[1].replace(/\./g, '').replace(',', '.')
        const valor = parseFloat(valorStr)
        if (!isNaN(valor) && valor > 0) {
          return valor
        }
      }
    }

    return null
  }

  /**
   * Extrai data do texto (formatos dd/mm/yyyy, dd-mm-yyyy, etc)
   */
  const extrairData = (texto: string): string | null => {
    const padroes = [
      /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,  // dd/mm/yyyy ou dd-mm-yyyy
      /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,  // yyyy/mm/dd ou yyyy-mm-dd
      /DATA[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,  // DATA: dd/mm/yyyy
    ]

    for (const padrao of padroes) {
      const match = texto.match(padrao)
      if (match && match[1] && match[2] && match[3]) {
        const [_, p1, p2, p3] = match

        // Detectar formato e converter para yyyy-mm-dd
        if (p1 && p1.length === 4) {
          // yyyy-mm-dd (já no formato correto)
          return `${p1}-${p2}-${p3}`
        } else if (p1 && p2 && p3) {
          // dd/mm/yyyy -> yyyy-mm-dd
          return `${p3}-${p2}-${p1}`
        }
      }
    }

    return null
  }

  /**
   * Extrai nome do estabelecimento (primeiras linhas geralmente)
   */
  const extrairEstabelecimento = (texto: string): string | null => {
    const linhas = texto.split('\n').filter(l => l.trim().length > 3)
    if (linhas.length > 0 && linhas[0]) {
      // Pega a primeira linha não-vazia com mais de 3 caracteres
      const primeiraLinha = linhas[0].trim()
      // Remove caracteres especiais extras
      return primeiraLinha.slice(0, 50) // Limita a 50 caracteres
    }
    return null
  }

  /**
   * Processa imagem de comprovante e extrai dados
   */
  const processarComprovante = async (imagem: File): Promise<DadosComprovante> => {
    processando.value = true
    progresso.value = 0

    try {
      const worker = await Tesseract.createWorker('por', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            progresso.value = Math.round(m.progress * 100)
          }
        }
      })

      const { data: { text } } = await worker.recognize(imagem)
      await worker.terminate()

      // Extrair dados do texto
      const dados: DadosComprovante = {
        valor: extrairValor(text),
        data: extrairData(text),
        estabelecimento: extrairEstabelecimento(text),
        textoCompleto: text
      }

      return dados

    } catch (error) {
      console.error('Erro ao processar comprovante:', error)
      throw new Error('Não foi possível processar o comprovante')
    } finally {
      processando.value = false
      progresso.value = 0
    }
  }

  return {
    processando,
    progresso,
    processarComprovante
  }
}
