export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      licitacoes: {
        Relationships: []
        Row: {
          id: string
          numero_controle_pncp: string
          hash_conteudo: string
          orgao_cnpj: string
          orgao_razao_social: string
          municipio: string
          uf: string
          codigo_ibge: string | null
          poder_id: string | null
          esfera_id: string | null
          modalidade_id: number | null
          modalidade_nome: string | null
          ano_compra: number | null
          sequencial_compra: number | null
          situacao_id: number | null
          situacao_nome: string | null
          objeto_compra: string | null
          informacao_complementar: string | null
          srp: boolean | null
          valor_total_estimado: number | null
          valor_total_homologado: number | null
          data_publicacao: string
          data_abertura_proposta: string | null
          data_encerramento: string | null
          data_encerramento_proposta: string | null
          link_sistema_origem: string | null
          elegivel: boolean
          confianca_media: number | null
          revisao_manual: boolean
          possui_resultado: boolean | null
          coletada_em: string
          atualizada_em: string
        }
        Insert: {
          id?: string
          numero_controle_pncp: string
          hash_conteudo: string
          orgao_cnpj: string
          orgao_razao_social: string
          municipio: string
          uf: string
          codigo_ibge?: string | null
          poder_id?: string | null
          esfera_id?: string | null
          modalidade_id?: number | null
          modalidade_nome?: string | null
          ano_compra?: number | null
          sequencial_compra?: number | null
          situacao_id?: number | null
          situacao_nome?: string | null
          objeto_compra?: string | null
          informacao_complementar?: string | null
          srp?: boolean | null
          valor_total_estimado?: number | null
          valor_total_homologado?: number | null
          data_publicacao: string
          data_abertura_proposta?: string | null
          data_encerramento?: string | null
          data_encerramento_proposta?: string | null
          link_sistema_origem?: string | null
          elegivel?: boolean
          confianca_media?: number | null
          revisao_manual?: boolean
          possui_resultado?: boolean | null
          coletada_em?: string
          atualizada_em?: string
        }
        Update: {
          id?: string
          numero_controle_pncp?: string
          hash_conteudo?: string
          orgao_cnpj?: string
          orgao_razao_social?: string
          municipio?: string
          uf?: string
          codigo_ibge?: string | null
          poder_id?: string | null
          esfera_id?: string | null
          modalidade_id?: number | null
          modalidade_nome?: string | null
          ano_compra?: number | null
          sequencial_compra?: number | null
          situacao_id?: number | null
          situacao_nome?: string | null
          objeto_compra?: string | null
          informacao_complementar?: string | null
          srp?: boolean | null
          valor_total_estimado?: number | null
          valor_total_homologado?: number | null
          data_publicacao?: string
          data_abertura_proposta?: string | null
          data_encerramento?: string | null
          data_encerramento_proposta?: string | null
          link_sistema_origem?: string | null
          elegivel?: boolean
          confianca_media?: number | null
          revisao_manual?: boolean
          possui_resultado?: boolean | null
          coletada_em?: string
          atualizada_em?: string
        }
      }
      itens_licitacao: {
        Relationships: []
        Row: {
          id: string
          licitacao_id: string
          numero_item: number
          descricao: string
          codigo_material: string | null
          material_ou_servico: string | null
          material_ou_servico_nome: string | null
          unidade_medida: string | null
          quantidade_total: number | null
          valor_unitario_estimado: number | null
          valor_total_estimado: number | null
          ncm_codigo: string | null
          ncm_descricao: string | null
          criterio_julgamento: string | null
          situacao_item: string | null
          tipo_beneficio: string | null
          tem_resultado: boolean | null
          informacao_complementar: string | null
          categoria: string | null
          is_elegivel: boolean
          confianca: number | null
          motivo_classificacao: 'CATMAT_MATCH' | 'KEYWORD_MATCH' | 'MANUAL' | null
        }
        Insert: {
          id?: string
          licitacao_id: string
          numero_item: number
          descricao: string
          codigo_material?: string | null
          material_ou_servico?: string | null
          material_ou_servico_nome?: string | null
          unidade_medida?: string | null
          quantidade_total?: number | null
          valor_unitario_estimado?: number | null
          valor_total_estimado?: number | null
          ncm_codigo?: string | null
          ncm_descricao?: string | null
          criterio_julgamento?: string | null
          situacao_item?: string | null
          tipo_beneficio?: string | null
          tem_resultado?: boolean | null
          informacao_complementar?: string | null
          categoria?: string | null
          is_elegivel?: boolean
          confianca?: number | null
          motivo_classificacao?: 'CATMAT_MATCH' | 'KEYWORD_MATCH' | 'MANUAL' | null
        }
        Update: {
          id?: string
          licitacao_id?: string
          numero_item?: number
          descricao?: string
          codigo_material?: string | null
          material_ou_servico?: string | null
          material_ou_servico_nome?: string | null
          unidade_medida?: string | null
          quantidade_total?: number | null
          valor_unitario_estimado?: number | null
          valor_total_estimado?: number | null
          ncm_codigo?: string | null
          ncm_descricao?: string | null
          criterio_julgamento?: string | null
          situacao_item?: string | null
          tipo_beneficio?: string | null
          tem_resultado?: boolean | null
          informacao_complementar?: string | null
          categoria?: string | null
          is_elegivel?: boolean
          confianca?: number | null
          motivo_classificacao?: 'CATMAT_MATCH' | 'KEYWORD_MATCH' | 'MANUAL' | null
        }
      }
      resultados_item: {
        Relationships: []
        Row: {
          id: string
          item_id: string
          licitacao_id: string
          numero_item: number
          sequencial_resultado: number
          ni_fornecedor: string
          nome_fornecedor: string
          tipo_pessoa: string | null
          porte_fornecedor: string | null
          natureza_juridica: string | null
          valor_unitario_homologado: number | null
          valor_total_homologado: number | null
          quantidade_homologada: number | null
          percentual_desconto: number | null
          ordem_classificacao: number | null
          situacao_resultado: string | null
          aplicacao_beneficio_me_epp: boolean | null
          data_resultado: string | null
          coletado_em: string
        }
        Insert: {
          id?: string
          item_id: string
          licitacao_id: string
          numero_item: number
          sequencial_resultado?: number
          ni_fornecedor: string
          nome_fornecedor: string
          tipo_pessoa?: string | null
          porte_fornecedor?: string | null
          natureza_juridica?: string | null
          valor_unitario_homologado?: number | null
          valor_total_homologado?: number | null
          quantidade_homologada?: number | null
          percentual_desconto?: number | null
          ordem_classificacao?: number | null
          situacao_resultado?: string | null
          aplicacao_beneficio_me_epp?: boolean | null
          data_resultado?: string | null
          coletado_em?: string
        }
        Update: {
          id?: string
          item_id?: string
          licitacao_id?: string
          numero_item?: number
          sequencial_resultado?: number
          ni_fornecedor?: string
          nome_fornecedor?: string
          tipo_pessoa?: string | null
          porte_fornecedor?: string | null
          natureza_juridica?: string | null
          valor_unitario_homologado?: number | null
          valor_total_homologado?: number | null
          quantidade_homologada?: number | null
          percentual_desconto?: number | null
          ordem_classificacao?: number | null
          situacao_resultado?: string | null
          aplicacao_beneficio_me_epp?: boolean | null
          data_resultado?: string | null
          coletado_em?: string
        }
      }
      fornecedores: {
        Relationships: []
        Row: {
          ni: string
          nome: string
          tipo_pessoa: string | null
          porte: string | null
          total_homologacoes: number
          valor_total_homologado: number
          ticket_medio: number | null
          categorias: Json
          ufs_atuacao: Json
          primeira_homologacao: string | null
          ultima_homologacao: string | null
          atualizado_em: string
        }
        Insert: {
          ni: string
          nome: string
          tipo_pessoa?: string | null
          porte?: string | null
          total_homologacoes?: number
          valor_total_homologado?: number
          ticket_medio?: number | null
          categorias?: Json
          ufs_atuacao?: Json
          primeira_homologacao?: string | null
          ultima_homologacao?: string | null
          atualizado_em?: string
        }
        Update: {
          ni?: string
          nome?: string
          tipo_pessoa?: string | null
          porte?: string | null
          total_homologacoes?: number
          valor_total_homologado?: number
          ticket_medio?: number | null
          categorias?: Json
          ufs_atuacao?: Json
          primeira_homologacao?: string | null
          ultima_homologacao?: string | null
          atualizado_em?: string
        }
      }
      orgaos: {
        Relationships: []
        Row: {
          cnpj: string
          razao_social: string
          municipio: string
          uf: string
          total_licitacoes_iluminacao: number
          valor_total_historico: number
          ultima_licitacao: string | null
          score_potencial: number
          atualizado_em: string
        }
        Insert: {
          cnpj: string
          razao_social: string
          municipio: string
          uf: string
          total_licitacoes_iluminacao?: number
          valor_total_historico?: number
          ultima_licitacao?: string | null
          score_potencial?: number
          atualizado_em?: string
        }
        Update: {
          cnpj?: string
          razao_social?: string
          municipio?: string
          uf?: string
          total_licitacoes_iluminacao?: number
          valor_total_historico?: number
          ultima_licitacao?: string | null
          score_potencial?: number
          atualizado_em?: string
        }
      }
      catalogo_produtos: {
        Relationships: []
        Row: {
          codigo_material: string
          descricao_padronizada: string
          categoria: string | null
          total_ocorrencias: number
          preco_medio_historico: number | null
          preco_minimo: number | null
          preco_maximo: number | null
          atualizado_em: string
        }
        Insert: {
          codigo_material: string
          descricao_padronizada: string
          categoria?: string | null
          total_ocorrencias?: number
          preco_medio_historico?: number | null
          preco_minimo?: number | null
          preco_maximo?: number | null
          atualizado_em?: string
        }
        Update: {
          codigo_material?: string
          descricao_padronizada?: string
          categoria?: string | null
          total_ocorrencias?: number
          preco_medio_historico?: number | null
          preco_minimo?: number | null
          preco_maximo?: number | null
          atualizado_em?: string
        }
      }
      logs_coleta: {
        Relationships: []
        Row: {
          id: string
          trace_id: string
          iniciado_em: string
          concluido_em: string | null
          duration_ms: number | null
          total_coletadas: number | null
          total_elegiveis: number | null
          total_descartadas: number | null
          erros: Json
          status: 'em_execucao' | 'concluido' | 'falhou'
        }
        Insert: {
          id?: string
          trace_id: string
          iniciado_em?: string
          concluido_em?: string | null
          duration_ms?: number | null
          total_coletadas?: number | null
          total_elegiveis?: number | null
          total_descartadas?: number | null
          erros?: Json
          status?: 'em_execucao' | 'concluido' | 'falhou'
        }
        Update: {
          id?: string
          trace_id?: string
          iniciado_em?: string
          concluido_em?: string | null
          duration_ms?: number | null
          total_coletadas?: number | null
          total_elegiveis?: number | null
          total_descartadas?: number | null
          erros?: Json
          status?: 'em_execucao' | 'concluido' | 'falhou'
        }
      }
    }
  }
}
