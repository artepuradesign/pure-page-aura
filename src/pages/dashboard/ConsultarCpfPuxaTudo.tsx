import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  User, Search, AlertCircle, CheckCircle, Download, Settings, Crown, FileText, 
  Camera, DollarSign, TrendingUp, Award, Shield, Target, AlertTriangle, Info, Copy, Phone, ShoppingCart, Wallet
} from 'lucide-react';
import PixQRCodeModal from '@/components/payment/PixQRCodeModal';
import { usePixPaymentFlow } from '@/hooks/usePixPaymentFlow';
import { useUserDataApi } from '@/hooks/useUserDataApi';
import { API_BASE_URL } from '@/config/apiConfig';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { getPlanType } from '@/utils/planUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { baseCpfService } from '@/services/baseCpfService';
import { useBaseAuxilioEmergencial } from '@/hooks/useBaseAuxilioEmergencial';
import { useBaseRais } from '@/hooks/useBaseRais';
import { useBaseCredilink } from '@/hooks/useBaseCredilink';
import { useBaseVacina } from '@/hooks/useBaseVacina';
import { consultasCpfService } from '@/services/consultasCpfService';
import { consultasCpfHistoryService } from '@/services/consultasCpfHistoryService';
import AuthenticatedImage from '@/components/ui/AuthenticatedImage';
import { consultationsService } from '@/services/consultationsService';
import { consultationApiService } from '@/services/consultationApiService';
import { walletApiService } from '@/services/walletApiService';
import { cookieUtils } from '@/utils/cookieUtils';
import PriceDisplay from '@/components/dashboard/PriceDisplay';
import { checkBalanceForModule } from '@/utils/balanceChecker';
import { getModulePrice } from '@/utils/modulePrice';
import { getModulePriceById, moduleService } from '@/services/moduleService';
import ConsultaHistoryItem from '@/components/consultas/ConsultaHistoryItem';
import ConsultationCard from '@/components/historico/ConsultationCard';
import ConsultationsSection from '@/components/historico/sections/ConsultationsSection';
import { formatBrazilianCurrency, formatDate } from '@/utils/historicoUtils';
import LoadingScreen from '@/components/layout/LoadingScreen';
import LoadingSpinner from '@/components/ui/loading-spinner';
import ElegantPriceCard from '@/components/consultas/ElegantPriceCard';
import { baseReceitaService, BaseReceita } from '@/services/baseReceitaService';
import ConsultationDetailDialog from '@/components/consultas/ConsultationDetailDialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDateOnly } from '@/utils/formatters';
import ParentesSection from '@/components/dashboard/ParentesSection';
import TelefonesSection from '@/components/dashboard/TelefonesSection';
import EmailsSection from '@/components/dashboard/EmailsSection';
import EnderecosSection from '@/components/dashboard/EnderecosSection';
import VacinaDisplay from '@/components/vacina/VacinaDisplay';
import EmpresasSocioSection from '@/components/dashboard/EmpresasSocioSection';
import CnpjMeiSection from '@/components/dashboard/CnpjMeiSection';
import DividasAtivasSection from '@/components/dashboard/DividasAtivasSection';
import { AuxilioEmergencialSection } from '@/components/dashboard/AuxilioEmergencialSection';
import { RaisSection } from '@/components/dashboard/RaisSection';
import InssSection from '@/components/dashboard/InssSection';
import OperadoraOiSection from '@/components/dashboard/OperadoraOiSection';
import OperadoraTimSection from '@/components/dashboard/OperadoraTimSection';
import ClaroSection from '@/components/dashboard/ClaroSection';
import VivoSection from '@/components/dashboard/VivoSection';
import SenhaEmailSection from '@/components/dashboard/SenhaEmailSection';
import SenhaCpfSection from '@/components/dashboard/SenhaCpfSection';
import BoletimOcorrenciaBoSection from '@/components/dashboard/BoletimOcorrenciaBoSection';
import FotosSection from '@/components/dashboard/FotosSection';
import CertidaoNascimentoSection from '@/components/dashboard/CertidaoNascimentoSection';
import DocumentoSection from '@/components/dashboard/DocumentoSection';
import CnsSection from '@/components/dashboard/CnsSection';
import GestaoSection from '@/components/dashboard/GestaoSection';
import PlaceholderSection from '@/components/dashboard/PlaceholderSection';
import ScoreGaugeCard from '@/components/dashboard/ScoreGaugeCard';
import { atitoApiService } from '@/services/atitoApiService';
import { cpfDatabaseService } from '@/services/cpfDatabaseService';
import { getFullApiUrl } from '@/utils/apiHelper';
import { atitoConsultaCpfService } from '@/services/atitoConsultaCpfService';
import SectionActionButtons from '@/components/dashboard/SectionActionButtons';
import PisSection from '@/components/dashboard/PisSection';
import ScrollToTop from '@/components/ui/scroll-to-top';
import SimpleTitleBar from '@/components/dashboard/SimpleTitleBar';
import { smoothScrollToHash } from '@/utils/smoothScroll';

// Função melhorada para consultar CPF e registrar com debug robusto
const consultarCPFComRegistro = async (
  cpf: string,
  cost: number,
  metadata: any,
  moduleId: number,
  source: string,
  options?: {
    /** Quando true, realiza a busca/retorno dos dados, mas NÃO registra/cobra no histórico. */
    skipRegister?: boolean;
  }
) => {
  console.log('🔍 [CPF_CONSULTA] INÍCIO - Consultando CPF:', cpf);
  console.log('💰 [CPF_CONSULTA] Custo da consulta (VALOR COM DESCONTO):', cost);
  console.log('🔑 [CPF_CONSULTA] Metadata enviado:', metadata);
  console.log('📊 [CPF_CONSULTA] Valores de controle:', {
    cost_parameter: cost,
    original_price_metadata: metadata.original_price,
    final_price_metadata: metadata.final_price,
    discount_metadata: metadata.discount
  });
  
  try {
    // Validação prévia de token de autenticação
    const sessionToken = cookieUtils.get('session_token') || cookieUtils.get('api_session_token');
    if (!sessionToken) {
      console.error('❌ [CPF_CONSULTA] Token de autenticação não encontrado');
      toast.error('Erro de autenticação. Faça login novamente.');
      return {
        success: false,
        error: 'Token de autenticação não encontrado'
      };
    }
    console.log('✅ [CPF_CONSULTA] Token de autenticação válido');
    
    // Primeiro: buscar o CPF na nova base usando o serviço otimizado
    console.log('🔍 [CPF_CONSULTA] Buscando CPF na nova base de dados...');
    const searchResult = await baseCpfService.getByCpf(cpf);
    console.log('📊 [CPF_CONSULTA] Resultado da busca:', {
      success: searchResult.success,
      hasData: !!searchResult.data,
      dataType: typeof searchResult.data,
      error: searchResult.error
    });

    // Segundo: buscar dados da Receita Federal na tabela base_receita
    console.log('🏛️ [CPF_CONSULTA] Buscando dados da Receita Federal...');
    const receitaResult = await baseReceitaService.getByCpf(cpf);
    console.log('📊 [CPF_CONSULTA] Resultado da Receita Federal:', {
      success: receitaResult.success,
      hasData: !!receitaResult.data,
      error: receitaResult.error
    });

    if (searchResult.success && searchResult.data) {
      // CPF encontrado! Agora registrar a consulta via API externa
      console.log('✅ [CPF_CONSULTA] CPF encontrado:', searchResult.data.nome);
      if (!options?.skipRegister) {
        console.log('📤 [REGISTRO_CONSULTA] Iniciando registro da consulta...');

        try {
          // Preparar payload para registro unificado - valor JÁ VEM COM DESCONTO APLICADO
          const finalCost = parseFloat(cost.toString()); // cost = finalPrice (já com desconto)

          // Determinar tipo de saldo usado baseado nos saldos disponíveis
          let saldoUsado: 'plano' | 'carteira' | 'misto' = 'carteira';
          const planBalance = metadata.plan_balance || 0;
          const walletBalance = metadata.wallet_balance || 0;

          if (planBalance >= finalCost) {
            saldoUsado = 'plano';
            console.log('💳 [REGISTRO_CONSULTA] Usando apenas saldo do plano');
          } else if (planBalance > 0 && (planBalance + walletBalance) >= finalCost) {
            saldoUsado = 'misto';
            console.log('💳 [REGISTRO_CONSULTA] Usando saldo do plano + carteira');
          } else {
            saldoUsado = 'carteira';
            console.log('💳 [REGISTRO_CONSULTA] Usando apenas saldo da carteira');
          }

          console.log('💰 [REGISTRO_CONSULTA] Valores de cobrança:', {
            cost_recebido: cost,
            finalCost,
            discount_metadata: metadata.discount,
            original_price_metadata: metadata.original_price,
            final_price_metadata: metadata.final_price,
            planBalance,
            walletBalance,
            saldoUsado
          });

          console.log('💳 [REGISTRO_CONSULTA] Saldo usado determinado:', saldoUsado);

          const registroPayload = {
            user_id: parseInt(metadata.user_id.toString()),
            module_type: 'cpf',
            document: cpf,  // Backend PHP espera 'document', não 'documento'
            cost: finalCost, // VALOR COM DESCONTO JÁ APLICADO
            status: 'completed',
            result_data: searchResult.data,
            ip_address: window.location.hostname,
            user_agent: navigator.userAgent,
            saldo_usado: saldoUsado, // Incluir o tipo de saldo usado
            metadata: {
              source,
              page_route: window.location.pathname,
              // Exibição no histórico (não altera o module_type exigido pelo backend)
              module_title: (metadata?.module_title ?? metadata?.moduleTypeTitle ?? '').toString().trim() || undefined,
              discount: metadata.discount || 0,
              original_price: metadata.original_price || finalCost,
              discounted_price: finalCost,
              final_price: metadata.final_price || finalCost,
              subscription_discount: metadata.subscription_discount || false,
              plan_type: metadata.plan_type || 'Pré-Pago',
              module_id: moduleId,
              timestamp: new Date().toISOString(),
              saldo_usado: saldoUsado
            }
          };

          console.log('📤 [REGISTRO_CONSULTA] Payload preparado:', {
            user_id: registroPayload.user_id,
            document: registroPayload.document,
            cost: registroPayload.cost,
            status: registroPayload.status,
            hasResultData: !!registroPayload.result_data,
            hasMetadata: !!registroPayload.metadata
          });

          // Chamada para o serviço unificado
          console.log('🌐 [REGISTRO_CONSULTA] Enviando para consultasCpfService.create...');

          try {
            const registroResult = await consultasCpfService.create(registroPayload as any);

            console.log('📊 [REGISTRO_CONSULTA] Resposta do serviço:', {
              success: registroResult.success,
              hasData: !!registroResult.data,
              error: registroResult.error,
              message: registroResult.message
            });

            if (registroResult.success) {
              console.log('✅ [REGISTRO_CONSULTA] Consulta registrada com sucesso!');
            } else {
              console.error('❌ [REGISTRO_CONSULTA] Falha ao registrar:', registroResult.error);
              console.warn('⚠️ [REGISTRO_CONSULTA] Continuando com a consulta apesar do erro no registro');
            }
          } catch (registroError: any) {
            console.error('❌ [REGISTRO_CONSULTA] Exceção no registro:', registroError);

            // Tentar extrair mais detalhes do erro
            let errorDetails = 'Erro desconhecido';
            if (registroError instanceof Error) {
              errorDetails = registroError.message;
            } else if (typeof registroError === 'string') {
              errorDetails = registroError;
            } else if (registroError?.error) {
              errorDetails = registroError.error;
            }

            console.error('❌ [REGISTRO_CONSULTA] Detalhes do erro:', {
              message: errorDetails,
              type: typeof registroError,
              keys: Object.keys(registroError || {})
            });

            console.warn('⚠️ [REGISTRO_CONSULTA] Histórico não salvo, mas consulta foi realizada com sucesso');
          }
        } catch (outerError) {
          console.error('❌ [REGISTRO_CONSULTA] Erro crítico:', outerError);
        }
      } else {
        console.log('⏭️ [REGISTRO_CONSULTA] skipRegister=true — não registrar/cobrar neste momento');
      }

      // Retornar dados do CPF encontrado junto com dados da Receita Federal
      console.log('✅ [CPF_CONSULTA] Retornando dados do CPF encontrado');
      console.log('🔍 [CPF_CONSULTA] Dados recebidos da API:', {
        nome: searchResult.data.nome,
        naturalidade: searchResult.data.naturalidade,
        uf_naturalidade: searchResult.data.uf_naturalidade,
        cor: searchResult.data.cor,
        escolaridade: searchResult.data.escolaridade,
        estado_civil: searchResult.data.estado_civil,
        endereco_completo: {
          logradouro: searchResult.data.logradouro,
          numero: searchResult.data.numero,
          complemento: searchResult.data.complemento,
          uf: searchResult.data.uf_endereco
        },
        documentos: {
          cnh: searchResult.data.cnh,
          dt_expedicao_cnh: searchResult.data.dt_expedicao_cnh,
          passaporte: searchResult.data.passaporte,
          nit: searchResult.data.nit,
          ctps: searchResult.data.ctps
        },
        dados_financeiros: {
          fx_poder_aquisitivo: searchResult.data.fx_poder_aquisitivo
        },
        outros: {
          fonte_dados: searchResult.data.fonte_dados,
          ultima_atualizacao: searchResult.data.ultima_atualizacao
        }
      });
      
      return {
        success: true,
        data: searchResult.data,
        receitaData: receitaResult.success ? receitaResult.data : null,
        message: 'CPF encontrado na base de dados',
        cpfId: searchResult.data.id // Retornar o ID do CPF para carregar dados relacionados
      };
    } else {
      // CPF não encontrado na base local
      console.log('❌ [CPF_CONSULTA] CPF não encontrado na base local');
      
      // PRIMEIRO: Verificar novamente no banco antes de enviar para Telegram
      console.log('🔍 [PRE_CHECK] Verificando no banco antes de enviar para Telegram...');
      const preCheck = await cpfDatabaseService.checkCpfExists(cpf);
      
      if (preCheck.success && preCheck.exists && preCheck.data) {
        console.log('✅ [PRE_CHECK] CPF encontrado no banco antes do envio!');
        
        if (!options?.skipRegister) {
          // Registrar consulta
          const finalCost = parseFloat(cost.toString());
          let saldoUsado: 'plano' | 'carteira' | 'misto' = 'carteira';
          const planBalance = metadata.plan_balance || 0;
          const walletBalance = metadata.wallet_balance || 0;

          if (planBalance >= finalCost) {
            saldoUsado = 'plano';
          } else if (planBalance > 0 && (planBalance + walletBalance) >= finalCost) {
            saldoUsado = 'misto';
          } else {
            saldoUsado = 'carteira';
          }

          const registroPayload = {
            user_id: parseInt(metadata.user_id.toString()),
            module_type: 'cpf',
            document: cpf,
            cost: finalCost,
            status: 'completed',
            result_data: preCheck.data,
            ip_address: window.location.hostname,
            user_agent: navigator.userAgent,
            saldo_usado: saldoUsado,
            metadata: {
              source: `${source}-precheck`,
              page_route: window.location.pathname,
              discount: metadata.discount || 0,
              original_price: metadata.original_price || finalCost,
              discounted_price: finalCost,
              final_price: metadata.final_price || finalCost,
              subscription_discount: metadata.subscription_discount || false,
              plan_type: metadata.plan_type || 'Pré-Pago',
              module_id: moduleId,
              timestamp: new Date().toISOString(),
              saldo_usado: saldoUsado
            }
          };

          await consultasCpfService.create(registroPayload as any);
        } else {
          console.log('⏭️ [PRE_CHECK] skipRegister=true — não registrar/cobrar neste momento');
        }
        
        // Buscar dados da Receita Federal também
        const receitaResult = await baseReceitaService.getByCpf(cpf);
        
        return {
          success: true,
          data: preCheck.data,
          receitaData: receitaResult.success ? receitaResult.data : null,
          message: 'CPF encontrado na base de dados',
          cpfId: preCheck.data.id
        };
      }
      
      // SEGUNDO: CPF não existe, enviar para Atito
      console.log('🌐 [ATITO] CPF não existe no banco, enviando para Atito...');
      
      try {
        // Enviar CPF para o Atito
        const atitoResult = await atitoConsultaCpfService.enviarCpf(cpf);
        
        if (atitoResult.success) {
          console.log('✅ [ATITO] CPF enviado com sucesso para processamento!');
          
          toast.success('CPF enviado para processamento!', { duration: 3000 });
          
          // Aguardar 10 segundos para o sistema processar
          console.log('⏳ [WAIT] Aguardando 10 segundos para processamento...');
          toast.info('Aguardando processamento...', { duration: 2000 });
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Verificar no banco após 10 segundos
          console.log('🔍 [CHECK] Verificando no banco após 10 segundos...');
          const finalCheck = await cpfDatabaseService.checkCpfExists(cpf);
          
          if (finalCheck.success && finalCheck.exists && finalCheck.data) {
            console.log('✅ [CHECK] CPF encontrado no banco após processamento!');
            
            // Registrar consulta
            const finalCost = parseFloat(cost.toString());
            let saldoUsado: 'plano' | 'carteira' | 'misto' = 'carteira';
            const planBalance = metadata.plan_balance || 0;
            const walletBalance = metadata.wallet_balance || 0;
            
            if (planBalance >= finalCost) {
              saldoUsado = 'plano';
            } else if (planBalance > 0 && (planBalance + walletBalance) >= finalCost) {
              saldoUsado = 'misto';
            } else {
              saldoUsado = 'carteira';
            }
            
            const registroPayload = {
              user_id: parseInt(metadata.user_id.toString()),
              module_type: 'cpf',
              document: cpf,
              cost: finalCost,
              status: 'completed',
              result_data: finalCheck.data,
              ip_address: window.location.hostname,
              user_agent: navigator.userAgent,
              saldo_usado: saldoUsado,
              metadata: {
                source: 'railway-flow',
                page_route: window.location.pathname,
                discount: metadata.discount || 0,
                original_price: metadata.original_price || finalCost,
                discounted_price: finalCost,
                final_price: metadata.final_price || finalCost,
                subscription_discount: metadata.subscription_discount || false,
                plan_type: metadata.plan_type || 'Pré-Pago',
                module_id: moduleId,
                timestamp: new Date().toISOString(),
                saldo_usado: saldoUsado
              }
            };
            
            await consultasCpfService.create(registroPayload as any);
            
            // Buscar dados da Receita Federal também
            const receitaResult = await baseReceitaService.getByCpf(cpf);
            
            toast.success('CPF processado com sucesso!');
            
            return {
              success: true,
              data: finalCheck.data,
              receitaData: receitaResult.success ? receitaResult.data : null,
              message: 'CPF encontrado após processamento',
              source: 'atito-flow',
              cpfId: finalCheck.data.id
            };
          } else {
            console.warn('⚠️ [CHECK] CPF não encontrado no banco após 10 segundos');
            
            toast.error('CPF não encontrado após processamento.');
            
            return {
              success: false,
              error: 'CPF não encontrado no tempo limite de 10 segundos.',
              message: 'CPF não retornou no tempo esperado'
            };
          }
        } else {
          console.error('❌ [ATITO] Falha ao enviar CPF:', atitoResult.error);
          return {
            success: false,
            error: atitoResult.error || 'Falha ao enviar CPF para processamento'
          };
        }
      } catch (atitoError) {
        console.error('❌ [ATITO] Erro na consulta:', atitoError);
        return {
          success: false,
          error: 'Erro ao processar consulta'
        };
      }
      
      // Se chegou aqui, não encontrou em nenhuma fonte
      return {
        success: false,
        error: 'CPF não encontrado nas bases disponíveis'
      };
    }

  } catch (error) {
    console.error('❌ [CPF_CONSULTA] Exceção geral na consulta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    toast.error(`Erro na consulta: ${errorMessage}`, { duration: 5000 });
    return {
      success: false,
      error: errorMessage
    };
  }
};

interface CPFResult {
  id?: number;
  cpf: string;
  ref?: string;
  situacao_cpf?: string;
  nome: string;
  data_nascimento?: string;
  sexo?: string;
  genero?: string;
  idade?: number;
  mae?: string;
  pai?: string;
  nome_mae?: string;
  nome_pai?: string;
  naturalidade?: string;
  uf_naturalidade?: string;
  cor?: string;
  cns?: string;
  estado_civil?: string;
  escolaridade?: string;
  email?: string;
  senha_email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  uf_endereco?: string;
  endereco?: string;
  data_obito?: string;
  foto?: string;
  foto2?: string;
  ultima_atualizacao?: string;
  fonte_dados?: string;
  qualidade_dados?: number;
  score?: number;
  created_at?: string;
  updated_at?: string;
  
  // Documentos
  rg?: string;
  orgao_emissor?: string;
  uf_emissao?: string;
  cnh?: string;
  dt_expedicao_cnh?: string;
  passaporte?: string;
  nit?: string;
  ctps?: string;
  pis?: string;
  titulo_eleitor?: string;
  zona?: string;
  secao?: string;
  nsu?: string;
  
  // Dados profissionais
  aposentado?: boolean | string;
  tipo_emprego?: string;
  cbo?: string;
  
  // Dados financeiros
  renda?: number | string;
  renda_presumida?: number | string;
  poder_aquisitivo?: string;
  fx_poder_aquisitivo?: string;
  csb8?: number | string;
  csb8_faixa?: string;
  csba?: number | string;
  csba_faixa?: string;
  
  // Dados relacionados (arrays)
  telefones?: any[];
  emails?: any[];
  enderecos?: any[];
  parentes?: any[];
  empresas_socio?: any[];
  historico_veiculos?: any[];
  
  // Outros campos da API
  nivel_consulta?: string;
  situacao_receita?: string;
  status_receita_federal?: string;
  percentual_participacao_societaria?: number;
  foto_rosto_rg?: string;
  foto_rosto_cnh?: string;
  foto_doc_rg?: string;
  foto_doc_cnh?: string;
  vacinas_covid?: any[];
  cnpj_mei?: string;
  dividas_ativas?: any[];
  auxilio_emergencial?: any[];
  rais_historico?: any[];
  inss_dados?: any[];
  operadora_vivo?: any[];
  operadora_claro?: any[];
  operadora_tim?: any[];
  senhas_vazadas_email?: any[];
  senhas_vazadas_cpf?: any[];
  cloud_cpf?: any[];
  cloud_email?: any[];
}

export interface ConsultarCpfPuxaTudoProps {
  /** ID do módulo cadastrado no banco (usado para preço/título e metadata.module_id) */
  moduleId?: number;
  /** Identificador de origem salvo no histórico (metadata.source) */
  source?: string;
  /** Fallback para o util moduleData quando a API de módulos falhar */
  fallbackPricePath?: string;

  /**
   * Quando definido, a página deve exibir SOMENTE a seção alvo (modo página específica).
   * Mantém o layout do Puxa Tudo, mas filtra a renderização do resultado.
   */
  onlySection?:
    | 'cns'
    | 'titulo'
    | 'pis'
    | 'score'
    | 'vacinas'
    | 'empresas_socio'
    | 'cnpj_mei'
    | 'dividas_ativas'
    | 'auxilio_emergencial'
    | 'rais'
    | 'inss'
    | 'senhas_email'
    | 'senhas_cpf';

  /**
   * Regra de cobrança para páginas específicas:
   * cobrar sempre quando o usuário clicar em Consultar, exceto quando carregado do histórico.
   */
  chargeAlwaysExceptHistory?: boolean;
}

const ConsultarCpfPuxaTudo: React.FC<ConsultarCpfPuxaTudoProps> = ({
  moduleId: moduleIdProp,
  source: sourceProp,
  fallbackPricePath,
  onlySection,
  chargeAlwaysExceptHistory,
}) => {
  const moduleId = moduleIdProp ?? 83;
  const source = sourceProp ?? 'consultar-cpf-puxa-tudo';
  const fallbackModulePath = fallbackPricePath ?? '/dashboard/consultar-cpf-puxa-tudo';

  const isExclusiveMode = !!onlySection;

  // Modos “enxutos” por rota/módulo
  const isParentesMode =
    moduleId === 132 || (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/consultar-cpf-parentes'));

  const isCertidaoMode =
    moduleId === 134 || (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/consultar-cpf-certidao'));

  const isTelefonesMode =
    moduleId === 141 || (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/consultar-cpf-telefones'));

  const isEmailsMode =
    moduleId === 142 || (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/consultar-cpf-emails'));

  const isEnderecosMode =
    moduleId === 143 || (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/consultar-cpf-enderecos'));

  const isRestrictToBasicAndParentes = isParentesMode;
  const isRestrictToBasicAndCertidao = isCertidaoMode;
  const isRestrictToBasicAndTelefones = isTelefonesMode;
  const isRestrictToBasicAndEmails = isEmailsMode;
  const isRestrictToBasicAndEnderecos = isEnderecosMode;

  const isRestrictedMode =
    isRestrictToBasicAndParentes ||
    isRestrictToBasicAndCertidao ||
    isRestrictToBasicAndTelefones ||
    isRestrictToBasicAndEmails ||
    isRestrictToBasicAndEnderecos;

  const isSlimMode = isRestrictedMode || isExclusiveMode;

  // Visibilidade das seções (Puxa Tudo = mostra tudo; modos enxutos = mostra apenas o essencial)
  // Observação: nos módulos enxutos (Parentes/Telefones/Emails/Endereços/Certidão), ocultamos "Dados Básicos".
  const showDadosBasicosSection = !isSlimMode;
  const showTelefonesSection = !isSlimMode || isRestrictToBasicAndTelefones;
  const showEmailsSection = !isSlimMode || isRestrictToBasicAndEmails;
  const showEnderecosSection = !isSlimMode || isRestrictToBasicAndEnderecos;
  const showParentesSection = !isSlimMode || isRestrictToBasicAndParentes;

  const showTituloEleitorSection = !isExclusiveMode || onlySection === 'titulo';
  const showCnsSection = !isExclusiveMode || onlySection === 'cns';
  const showPisSection = !isExclusiveMode || onlySection === 'pis';
  const showVacinasSection = !isExclusiveMode || onlySection === 'vacinas';
  const showEmpresasSocioSection = !isExclusiveMode || onlySection === 'empresas_socio';
  const showCnpjMeiSection = !isExclusiveMode || onlySection === 'cnpj_mei';
  const showDividasAtivasSection = !isExclusiveMode || onlySection === 'dividas_ativas';
  const showAuxilioEmergencialSection = !isExclusiveMode || onlySection === 'auxilio_emergencial';
  const showRaisSection = !isExclusiveMode || onlySection === 'rais';
  const showInssSection = !isExclusiveMode || onlySection === 'inss';
  const showSenhasEmailSection = !isExclusiveMode || onlySection === 'senhas_email';
  const showSenhasCpfSection = !isExclusiveMode || onlySection === 'senhas_cpf';
  const showScoreCards = !isExclusiveMode || onlySection === 'score';

  // Nessas telas enxutas, não exibimos os badges de atalho no topo.
  const hideShortcutBadges =
    isExclusiveMode ||
    isRestrictToBasicAndParentes ||
    isRestrictToBasicAndCertidao ||
    isRestrictToBasicAndTelefones ||
    isRestrictToBasicAndEmails ||
    isRestrictToBasicAndEnderecos;

  // Nestes módulos, a consulta só deve ser cobrada se a seção principal vier com dados.
  // Inclui todos os modos enxutos E todos os módulos com onlySection
  const isConditionalChargeModeRaw =
    isRestrictToBasicAndParentes ||
    isRestrictToBasicAndCertidao ||
    isRestrictToBasicAndTelefones ||
    isRestrictToBasicAndEmails ||
    isRestrictToBasicAndEnderecos ||
    isExclusiveMode; // Qualquer módulo com onlySection deve ter cobrança condicional

  // Para páginas específicas: sempre cobrar na busca manual (exceto histórico), então NÃO usar cobrança condicional.
  const isConditionalChargeMode =
    !!chargeAlwaysExceptHistory ? false : isConditionalChargeModeRaw;

  const navigate = useNavigate();
  const location = useLocation();
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CPFResult | null>(null);
  const [fotosCount, setFotosCount] = useState(0);
  const [telefonesCount, setTelefonesCount] = useState(0);
  const [emailsCount, setEmailsCount] = useState(0);
  const [enderecosCount, setEnderecosCount] = useState(0);
  const [parentesCount, setParentesCount] = useState(0);
  const [cnsCount, setCnsCount] = useState(0);
  const [vacinasCount, setVacinasCount] = useState(0);
  const [empresasSocioCount, setEmpresasSocioCount] = useState(0);
  const [cnpjMeiCount, setCnpjMeiCount] = useState(0);
  const [dividasAtivasCount, setDividasAtivasCount] = useState(0);
  const [certidaoNascimentoCount, setCertidaoNascimentoCount] = useState(0);
  const [documentoCount, setDocumentoCount] = useState(0);
  const [inssCount, setInssCount] = useState(0);
  const [claroCount, setClaroCount] = useState(0);
  const [vivoCount, setVivoCount] = useState(0);
  const [timCount, setTimCount] = useState(0);
  const [oiCount, setOiCount] = useState(0);
  const [senhaEmailCount, setSenhaEmailCount] = useState(0);
  const [senhaCpfCount, setSenhaCpfCount] = useState(0);
  const [boCount, setBoCount] = useState(0);
  const [gestaoCount, setGestaoCount] = useState(0);
  const [receitaData, setReceitaData] = useState<BaseReceita | null>(null);
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [recentConsultations, setRecentConsultations] = useState<any[]>([]);
  const [recentConsultationsLoading, setRecentConsultationsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [planBalance, setPlanBalance] = useState(0);
  const [modulePrice, setModulePrice] = useState(0);
  const [modulePriceLoading, setModulePriceLoading] = useState(true);
  const [balanceCheckLoading, setBalanceCheckLoading] = useState(true);
  const [moduleTitle, setModuleTitle] = useState<string>('');
  const [moduleSubtitle, setModuleSubtitle] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    today: 0,
    this_month: 0,
    total_cost: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(5);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(60);
  const [showRechargePixModal, setShowRechargePixModal] = useState(false);
  const [rechargeToastId, setRechargeToastId] = useState<string | number | null>(null);
  const { loading: pixLoading, pixResponse, createPixPayment, checkPaymentStatus, generateNewPayment } = usePixPaymentFlow();
  const { userData } = useUserDataApi();

  const [conditionalChargePending, setConditionalChargePending] = useState<null | {
    cpf: string;
    finalPrice: number;
    metadata: any;
    moduleId: number;
    source: string;
  }>(null);
  const conditionalChargeInFlightRef = useRef(false);

  // Helper function to format income as Brazilian currency
  const formatRenda = (renda: string | number | null | undefined): string => {
    if (!renda) return '';
    
    // If it's already a formatted string (contains R$ or letters), return as is
    if (typeof renda === 'string' && (renda.includes('R$') || /[A-Za-z]/.test(renda))) {
      return renda;
    }
    
    // Try to parse as number and format as currency
    const numValue = typeof renda === 'number' ? renda : parseFloat(String(renda).replace(/[^\d.-]/g, ''));
    if (!isNaN(numValue)) {
      // Valor vem em centavos, dividir por 100
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(numValue / 100);
    }
    
    return String(renda);
  };

  const [verificationLoadingOpen, setVerificationLoadingOpen] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationSecondsLeft, setVerificationSecondsLeft] = useState<number | null>(null);
  const [verificationPhase, setVerificationPhase] = useState<'initial' | 'retry' | null>(null);
  const isMobile = useIsMobile();
  const resultRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Carregar título/descrição do módulo (do cadastro)
  useEffect(() => {
    let cancelled = false;
    const loadModuleInfo = async () => {
      try {
        const res = await moduleService.getModuleById(moduleId);
        if (!cancelled && res.success && res.data) {
          setModuleTitle(res.data.title || res.data.name || '');
          setModuleSubtitle(res.data.description || '');
        }
      } catch {
        // Silencioso: mantém fallbacks.
      }
    };

    loadModuleInfo();
    return () => {
      cancelled = true;
    };
  }, [moduleId]);
  
  // Hook para saldo da API externa
  const { balance, loadBalance: reloadApiBalance } = useWalletBalance();

  // Auto-checagem de pagamento PIX para recarga rápida
  useEffect(() => {
    if (!showRechargePixModal || !pixResponse?.payment_id) return;
    let cancelled = false;

    const checkLive = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/mercadopago/check-payment-status-live.php?payment_id=${pixResponse.payment_id}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.data?.status === 'approved' && !cancelled) {
          if (rechargeToastId) toast.dismiss(rechargeToastId);
          toast.success('🎉 Pagamento aprovado! Saldo creditado.');
          setShowRechargePixModal(false);
          setRechargeToastId(null);
          reloadApiBalance();
        }
      } catch {}
    };

    const interval = setInterval(checkLive, 4000);
    checkLive();
    return () => { cancelled = true; clearInterval(interval); };
  }, [showRechargePixModal, pixResponse?.payment_id]);
  
  // Hook para verificar assinatura e descontos
  const { 
    hasActiveSubscription, 
    subscription, 
    planInfo, 
    discountPercentage,
    calculateDiscountedPrice: calculateSubscriptionDiscount,
    isLoading: subscriptionLoading 
  } = useUserSubscription();
  
  // Hooks para dados relacionados - mesmo padrão do CpfView
  const { getCreditinksByCpfId } = useBaseCredilink();
  const { getVacinasByCpfId } = useBaseVacina();
  const { getAuxiliosEmergenciaisByCpfId, auxiliosEmergenciais } = useBaseAuxilioEmergencial();
  const { getRaisByCpfId, rais, loading: raisLoading } = useBaseRais();

  // IMPORTANTE: nesta tela, várias seções buscam dados sozinhas via `cpfId`.
  // A seção de Auxílio Emergencial recebe apenas `auxilios` (não recebe `cpfId`),
  // então precisamos disparar o fetch sempre que `result.id` estiver disponível
  // (ex.: quando a tela abre a partir do histórico / state de navegação).
  useEffect(() => {
    if (!result?.id) return;
    getAuxiliosEmergenciaisByCpfId(result.id);
  }, [result?.id, getAuxiliosEmergenciaisByCpfId]);

  // Obter plano do usuário específico (user-specific) ou usar assinatura ativa
  const userPlan = hasActiveSubscription && subscription 
    ? subscription.plan_name 
    : (user ? localStorage.getItem(`user_plan_${user.id}`) || "Pré-Pago" : "Pré-Pago");

  // Função auxiliar para calcular o status do score (mesmo padrão do CpfView)
  const getScoreStatus = (score: number) => {
    const getScoreLabel = (score: number) => {
      if (score >= 800) return 'Excelente';
      if (score >= 600) return 'Bom';
      if (score >= 400) return 'Regular';
      return 'Baixo';
    };

    const getScoreColor = (score: number) => {
      if (score >= 800) return 'emerald';
      if (score >= 600) return 'green';
      if (score >= 400) return 'yellow';
      return 'red';
    };

    const color = getScoreColor(score);
    
    return {
      label: getScoreLabel(score),
      color: `text-${color}-600 dark:text-${color}-400`,
      bgColor: `bg-${color}-50 dark:bg-${color}-900/20`,
      borderColor: `border-${color}-200 dark:border-${color}-800`,
      icon: score >= 800 ? Award : score >= 600 ? Shield : score >= 400 ? Target : AlertTriangle,
      description: score >= 800 ? 'Score muito alto, excelente para crédito' :
                  score >= 600 ? 'Score bom, boas chances de aprovação' :
                  score >= 400 ? 'Score regular, pode melhorar' : 'Score baixo, precisa de atenção'
    };
  };

  // Carregar últimas 5 consultas CPF para exibir na seção de histórico
  const loadRecentConsultations = async () => {
    if (!user) return;
    
    try {
      setRecentConsultationsLoading(true);
      console.log('📋 [RECENT_CONSULTATIONS] Carregando últimas 5 consultas CPF...');
      
      // Buscar um lote maior para garantir 5 itens mesmo após o filtro por rota
      const response = await consultationApiService.getConsultationHistory(50, 0);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        const getModuleLabel = (route?: string, metaTitle?: unknown) => {
          const meta = (metaTitle ?? '').toString().trim();
          if (meta) return meta;
          const mt = (moduleTitle ?? '').toString().trim();
          if (mt) return mt;

          const r = (route || '').toString();
          if (!r) return '-';
          if (r.includes('/dashboard/consultar-cpf-simples')) return 'CPF SIMPLES';
          if (r.includes('/dashboard/consultar-cpf-puxa-tudo')) return 'CPF PUXA TUDO';
          if (r.includes('/dashboard/consultar-cpf-parentes')) return 'Parentes';
          return r;
        };

        // Fonte de verdade: metadata.page_route (sem fallback)
        const cpfConsultations = response.data
          .filter((item: any) => (item?.metadata?.page_route || '') === window.location.pathname)
          .map((consultation: any) => ({
            id: `consultation-${consultation.id}`,
            type: 'consultation',
            module_type: getModuleLabel(
              consultation?.metadata?.page_route,
              consultation?.metadata?.module_title ?? consultation?.metadata?.moduleTypeTitle
            ),
            document: consultation.document,
            cost: consultation.cost,
            amount: -Math.abs(consultation.cost),
            status: consultation.status,
            created_at: consultation.created_at,
            updated_at: consultation.updated_at,
            description: `Consulta CPF ${consultation.document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`,
            result_data: consultation.result_data,
            metadata: consultation.metadata
          }))
          // Mais recente primeiro
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        
        setRecentConsultations(cpfConsultations);
        console.log('✅ [RECENT_CONSULTATIONS] Últimas consultas carregadas:', cpfConsultations.length);
      } else {
        console.warn('⚠️ [RECENT_CONSULTATIONS] Nenhuma consulta encontrada');
        setRecentConsultations([]);
      }
    } catch (error) {
      console.error('❌ [RECENT_CONSULTATIONS] Erro ao carregar consultas:', error);
      setRecentConsultations([]);
    } finally {
      setRecentConsultationsLoading(false);
    }
  };

  const planType = getPlanType(userPlan);

  useEffect(() => {
    if (user) {
      loadBalances();
      reloadApiBalance(); // Carregar saldo da API externa
      loadModulePrice(); // Carregar preço do módulo ID 83
      
      // Carregar dados em paralelo
      Promise.all([
        loadConsultationHistory(), // Carregar histórico do banco
        loadRecentConsultations(), // Carregar últimas 5 consultas para exibir na seção
        loadStats() // Carregar estatísticas via API externa
      ]).then(() => {
        console.log('✅ [INIT] Todos os dados foram carregados');
      }).catch((error) => {
        console.error('❌ [INIT] Erro ao carregar dados:', error);
      });
    }
  }, [user, reloadApiBalance]);

  // Recarrega "Últimas Consultas" quando o título do módulo é carregado via API.
  // Sem isso, consultas antigas (sem metadata.module_title) podem cair no fallback
  // e exibir um nome incorreto na coluna "Módulo" (ex.: /consultar-cpf-parentes).
  useEffect(() => {
    const mt = (moduleTitle ?? '').toString().trim();
    if (!user || !mt) return;
    loadRecentConsultations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, moduleTitle]);

  // Verificar se veio do histórico com dados de consulta
  useEffect(() => {
    if (location.state?.fromHistory && location.state?.consultationData) {
      const { consultationData, cpf: historyCpf, noCharge } = location.state;
      
      console.log('📜 [HISTORY] Carregando consulta do histórico:', {
        cpf: historyCpf,
        noCharge,
        hasData: !!consultationData
      });
      
      // Definir o CPF e resultado
      setCpf(historyCpf || '');
      setResult(consultationData);
      setLoading(false);
      
      // Buscar dados da Receita Federal se disponível
      if (historyCpf) {
        baseReceitaService.getByCpf(historyCpf).then(receitaResult => {
          if (receitaResult.success && receitaResult.data) {
            setReceitaData(receitaResult.data);
          }
        });
      }
      
      // Scroll suave para a seção "CPF Encontrado" - delay maior para garantir renderização
      setTimeout(() => {
        const anchor = document.getElementById('cpf-encontrado');
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
          console.log('✅ [HISTORY] Scroll para #cpf-encontrado realizado');
        } else {
          console.warn('⚠️ [HISTORY] Elemento #cpf-encontrado não encontrado, usando resultRef');
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 1000);
      
      // Limpar o state para não recarregar se voltar à página
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);
  
  // Recarregar estatísticas quando queryHistory mudar
  useEffect(() => {
    if (queryHistory.length > 0 && stats.total === 0) {
      console.log('📊 [STATS] Query history atualizado, recalculando estatísticas...');
      loadStats();
    }
  }, [queryHistory]);

  // Proteção de saldo - verificar acesso à página (CORRIGIDO - remove verificação que causa loop)
  useEffect(() => {
    const checkPageAccess = async () => {
      // Se não tem user, libera acesso (vai ser tratado pelo AuthGuard)
      if (!user) {
        setBalanceCheckLoading(false);
        return;
      }

      // Se ainda está carregando o preço do módulo, aguarda
      if (modulePriceLoading || !modulePrice) {
        return;
      }

      // Se ainda está carregando subscription, aguarda
      if (subscriptionLoading) {
        return;
      }

      console.log('🛡️ [BALANCE_GUARD] Verificando acesso à página CPF Puxa Tudo');
      
      // Calcular preço final com desconto se aplicável
      const originalPrice = modulePrice;
      const finalPrice = hasActiveSubscription && discountPercentage > 0 
        ? calculateSubscriptionDiscount(originalPrice).discountedPrice 
        : originalPrice;
      
      // Calcular saldo total disponível
      const totalBalance = planBalance + walletBalance;
      
      console.log('🛡️ [BALANCE_GUARD] Dados da verificação:', {
        modulePrice: originalPrice,
        finalPrice,
        totalBalance,
        planBalance,
        walletBalance,
        hasActiveSubscription,
        discountPercentage
      });

      // REMOVIDO: Verificação de saldo insuficiente que bloqueia acesso
      // Permitir acesso sempre - a verificação será feita no momento da consulta
      console.log('✅ [BALANCE_GUARD] Acesso liberado - verificação de saldo na consulta');
      setBalanceCheckLoading(false);
    };

    // Aguardar um pouco para garantir que os dados foram carregados
    const timer = setTimeout(checkPageAccess, 300);
    return () => clearTimeout(timer);
  }, [
    user, 
    modulePrice, 
    modulePriceLoading, 
    planBalance, 
    walletBalance, 
    hasActiveSubscription, 
    discountPercentage, 
    calculateSubscriptionDiscount,
    subscriptionLoading
  ]);

  // Atualizar saldos locais quando o saldo da API externa mudar
  useEffect(() => {
    if (balance.saldo !== undefined || balance.saldo_plano !== undefined) {
      loadBalances();
    }
  }, [balance]);

  const loadBalances = () => {
    if (!user) return;
    
    // Usar saldo da API externa (prioridade: saldo_plano primeiro, depois saldo principal)
    const apiPlanBalance = balance.saldo_plano || 0;
    const apiWalletBalance = balance.saldo || 0;
    
    setPlanBalance(apiPlanBalance);
    setWalletBalance(apiWalletBalance);
    
    console.log('ConsultarCPF - Saldos carregados da API:', { 
      plan: apiPlanBalance, 
      wallet: apiWalletBalance, 
      total: apiPlanBalance + apiWalletBalance 
    });
  };

  // Carregar preço do módulo (via API) pelo ID
  const loadModulePrice = async () => {
    try {
      setModulePriceLoading(true);
      console.log(`💰 Carregando preço do módulo ID ${moduleId} via API...`);
      
      // Buscar preço direto da API usando o serviço correto
      const price = await getModulePriceById(moduleId);
      
      if (price && price > 0) {
        setModulePrice(price);
        console.log(`✅ Preço do módulo ID ${moduleId} carregado da API:`, price);
      } else {
        console.warn('⚠️ Preço inválido recebido da API, usando fallback');
        // Fallback para o preço padrão do moduleData.ts apenas se API falhar
        const fallbackPrice = getModulePrice(fallbackModulePath);
        setModulePrice(fallbackPrice);
        console.log('⚠️ Usando preço fallback:', fallbackPrice);
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar preço do módulo ID ${moduleId}:`, error);
      // Fallback para o preço padrão do moduleData.ts
      const fallbackPrice = getModulePrice(fallbackModulePath);
      setModulePrice(fallbackPrice);
      console.log('⚠️ Usando preço fallback devido ao erro:', fallbackPrice);
    } finally {
      setModulePriceLoading(false);
    }
  };

  // Carregar histórico de consultas usando API; fallback se endpoint não existir
  const loadConsultationHistory = async () => {
    if (!user) return;
    
    try {
      console.log('📋 [CPF_HISTORY] Carregando histórico de consultas CPF (/consultas/history)...');

      const response = await consultationApiService.getConsultationHistory(50, 0);
      console.log('📡 [CPF_HISTORY] Resposta do serviço:', response);

      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.error || 'Erro ao carregar histórico');
      }

      const consultasFormatted = response.data
        // Fonte de verdade: metadata.page_route (sem fallback)
        .filter((c: any) => (c?.metadata?.page_route || '') === window.location.pathname)
        .map((consulta: any) => {
          const valorCobrado = Number(consulta.cost || 0);
          const descontoAplicado = Number(consulta.metadata?.discount || 0);
          const valorOriginal = valorCobrado + descontoAplicado;
          const descontoPercent = descontoAplicado > 0 && valorOriginal > 0
            ? Math.round((descontoAplicado / valorOriginal) * 100)
            : 0;

          return {
            date: consulta.created_at,
            document: consulta.document || 'N/A',
            module_type: consulta.module_type,
            price: valorCobrado,
            original_price: descontoAplicado > 0 ? valorOriginal : undefined,
            discount_percent: descontoPercent,
            status: consulta.status || 'completed',
            success: (consulta.status || 'completed') === 'completed',
            saldo_usado: consulta.metadata?.saldo_usado || consulta.saldo_usado || 'carteira',
            source_table: 'consultations',
            result_data: consulta.result_data ?? null,
            metadata: consulta.metadata,
          };
        });

      setQueryHistory(consultasFormatted);
      console.log('✅ [CPF_HISTORY] Histórico carregado com sucesso:', consultasFormatted.length, 'consultas');
    } catch (error) {
      console.error('❌ [CPF_HISTORY] Erro ao carregar histórico:', error);
      setQueryHistory([]);
    }
  };

  // Carregar estatísticas usando o novo serviço, com fallback
  const loadStats = async () => {
    if (!user) {
      setStatsLoading(false);
      return;
    }
    
    setStatsLoading(true);
    
    try {
      console.log('📊 [STATS] Carregando estatísticas de consultas CPF...');
      
      // Tentar buscar via consultationApiService primeiro (mais confiável)
      const response = await consultationApiService.getConsultationHistory(1000, 0);
      
      console.log('📊 [STATS] Resposta da API:', response);
      
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        // Fonte de verdade: metadata.page_route (sem fallback)
        const cpfConsultations = response.data.filter((c: any) => (c?.metadata?.page_route || '') === window.location.pathname);
        
        console.log('📊 [STATS] Consultas CPF encontradas:', cpfConsultations.length);
        
        // Calcular estatísticas
        const todayStr = new Date().toDateString();
        const now = new Date();
        
        const computed = cpfConsultations.reduce((acc: any, item: any) => {
          acc.total += 1;
          const st = item.status || 'completed';
          if (st === 'completed') acc.completed += 1;
          else if (st === 'failed') acc.failed += 1;
          else if (st === 'processing') acc.processing += 1;
          acc.total_cost += Number(item.cost || 0);
          const d = new Date(item.created_at);
          if (d.toDateString() === todayStr) acc.today += 1;
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) acc.this_month += 1;
          return acc;
        }, { total: 0, completed: 0, failed: 0, processing: 0, today: 0, this_month: 0, total_cost: 0 });
        
        console.log('📊 [STATS] Estatísticas calculadas:', computed);
        
        setStats(computed);
        setStatsLoading(false);
        return;
      }
      
      console.warn('⚠️ [STATS] Sem dados da API, usando queryHistory como fallback...');
    } catch (error) {
      console.error('❌ [STATS] Erro ao carregar estatísticas:', error);
    }
    
    // Fallback: calcular a partir das consultas carregadas no queryHistory
    try {
      console.log('📊 [STATS] Usando fallback - calculando a partir do histórico local');
      console.log('📊 [STATS] Query history length:', queryHistory.length);
      
      // Se não houver dados no queryHistory, esperar um pouco e tentar novamente
      if (queryHistory.length === 0) {
        console.log('📊 [STATS] Query history vazio, aguardando 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const todayStr = new Date().toDateString();
      const now = new Date();
      
      const computed = queryHistory.reduce((acc: any, item: any) => {
        acc.total += 1;
        const st = item.status || 'completed';
        if (st === 'completed') acc.completed += 1;
        else if (st === 'failed') acc.failed += 1;
        else if (st === 'processing') acc.processing += 1;
        acc.total_cost += Number(item.price || 0);
        const d = new Date(item.date);
        if (d.toDateString() === todayStr) acc.today += 1;
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) acc.this_month += 1;
        return acc;
      }, { total: 0, completed: 0, failed: 0, processing: 0, today: 0, this_month: 0, total_cost: 0 });
      
      console.log('📊 [STATS] Estatísticas do fallback:', computed);
      
      setStats(computed);
    } catch (error) {
      console.error('❌ [STATS] Erro no fallback:', error);
      setStats({ total: 0, completed: 0, failed: 0, processing: 0, today: 0, this_month: 0, total_cost: 0 });
    } finally {
      setStatsLoading(false);
    }
  };
  const getTodayQueries = () => {
    if (!queryHistory.length) return 0;
    const today = new Date().toDateString();
    return queryHistory.filter(item => 
      new Date(item.date).toDateString() === today
    ).length;
  };

  const getMonthlyTotal = () => {
    if (!queryHistory.length) return 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return queryHistory
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      })
      .reduce((total, item) => total + (item.price || 0), 0);
  };

  const getMonthlyDiscount = () => {
    if (!queryHistory.length) return 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return queryHistory
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      })
      .reduce((total, item) => {
        const originalPrice = item.price / (1 - (item.discount || 0) / 100);
        return total + (originalPrice - item.price);
      }, 0);
  };

  // Fallbacks derivados do histórico já carregado
  const getCompletedCount = () => {
    return queryHistory.filter(item => {
      const st = item.status || (item.success ? 'completed' : 'failed');
      return st === 'completed';
    }).length;
  };

  const getTotalSpent = () => {
    return queryHistory.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  };

  // Lógica de saldo prioritário: plano primeiro, depois carteira
  const totalBalance = planBalance + walletBalance;
  const hasSufficientBalance = (amount: number) => {
    return planBalance >= amount || (planBalance + walletBalance) >= amount;
  };

  const validateCPF = (cpf: string): boolean => {
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Calcula o primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
    
    // Calcula o segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
    
    return true;
  };

  // Estado para controlar se a consulta é gratuita (vindo do histórico)
  const [isFromHistory, setIsFromHistory] = useState(false);
  const fromHistoryProcessedRef = useRef(false);

  // Função para realizar busca gratuita (sem cobrança) - usada quando vem do histórico
  const performFreeSearch = async (cpfToSearch: string) => {
    console.log('🆓 [FREE_SEARCH] Iniciando consulta gratuita do histórico para CPF:', cpfToSearch);

    if (!user) {
      console.error('❌ [FREE_SEARCH] Usuário não autenticado');
      return;
    }

    setLoading(true);

    try {
      // Buscar dados sem registrar/cobrar
      const searchResult = await baseCpfService.getByCpf(cpfToSearch);
      const receitaResult = await baseReceitaService.getByCpf(cpfToSearch);

      if (searchResult.success && searchResult.data) {
        console.log('✅ [FREE_SEARCH] CPF encontrado:', searchResult.data.nome);
        setResult(searchResult.data as CPFResult);
        
        if (receitaResult.success && receitaResult.data) {
          setReceitaData(receitaResult.data);
        }

        toast.success('✅ Consulta carregada do histórico', { duration: 3000 });

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } else {
        console.warn('⚠️ [FREE_SEARCH] CPF não encontrado na base');
        toast.info('CPF não encontrado. Os dados podem ter sido atualizados.');
      }
    } catch (error) {
      console.error('❌ [FREE_SEARCH] Erro:', error);
      toast.error('Erro ao carregar consulta do histórico');
    } finally {
      setLoading(false);
    }
  };

  // Processar parâmetros de URL para consulta do histórico
  useEffect(() => {
    if (fromHistoryProcessedRef.current) return;

    const searchParams = new URLSearchParams(location.search);
    const cpfFromUrl = searchParams.get('cpf');
    const fromHistory = searchParams.get('from_history') === 'true';

    if (cpfFromUrl && fromHistory) {
      fromHistoryProcessedRef.current = true;
      setIsFromHistory(true);
      const cleanCpf = cpfFromUrl.replace(/\D/g, '');
      
      if (cleanCpf.length === 11) {
        setCpf(cleanCpf);
        
        // Aguardar um pouco para garantir que os hooks carregaram
        setTimeout(() => {
          performFreeSearch(cleanCpf);
        }, 500);
      }
    }
  }, [location.search, user]);

  // Remover funções antigas do chat do Telegram

  const handleSearch = async () => {
    console.log('🚀 [HANDLE_SEARCH] INÍCIO da consulta CPF');
    
    // Validações prévias detalhadas
    if (!cpf || cpf.length !== 11) {
      console.error('❌ [HANDLE_SEARCH] CPF inválido:', cpf);
      toast.error("Digite um CPF válido (11 dígitos)");
      return;
    }

    if (!validateCPF(cpf)) {
      console.error('❌ [HANDLE_SEARCH] CPF não passou na validação:', cpf);
      toast.error("CPF Inválido");
      return;
    }

    performSearch();
  };

  const getConditionalRequiredCount = () => {
    // Modos enxutos (rotas específicas)
    if (isRestrictToBasicAndParentes) return parentesCount;
    if (isRestrictToBasicAndCertidao) return certidaoNascimentoCount;
    if (isRestrictToBasicAndTelefones) return telefonesCount;
    if (isRestrictToBasicAndEmails) return emailsCount;
    if (isRestrictToBasicAndEnderecos) return enderecosCount;
    
    // Modos exclusivos (onlySection)
    if (onlySection === 'cns') return cnsCount;
    if (onlySection === 'pis') return result?.pis ? 1 : 0;
    if (onlySection === 'titulo') return result?.titulo_eleitor ? 1 : 0;
    if (onlySection === 'score') return (result?.score && result.score > 0) ? 1 : 0;
    if (onlySection === 'vacinas') return vacinasCount;
    if (onlySection === 'empresas_socio') return empresasSocioCount;
    if (onlySection === 'cnpj_mei') return cnpjMeiCount;
    if (onlySection === 'dividas_ativas') return dividasAtivasCount;
    if (onlySection === 'auxilio_emergencial') return auxiliosEmergenciais?.length ?? 0;
    if (onlySection === 'rais') return rais?.length ?? 0;
    if (onlySection === 'inss') return inssCount;
    if (onlySection === 'senhas_email') return senhaEmailCount;
    if (onlySection === 'senhas_cpf') return senhaCpfCount;
    
    return null;
  };

  useEffect(() => {
    if (!isConditionalChargeMode) return;
    if (!conditionalChargePending) return;
    if (!result) return;

    const requiredCount = getConditionalRequiredCount();
    if (requiredCount === null) return;

    // aguardando primeira carga das seções
    if (requiredCount < 0) return;
    if (conditionalChargeInFlightRef.current) return;

    if (requiredCount === 0) {
      // Mensagem de "não encontrado" no mesmo padrão visual do toast de "encontrado"
      toast.info(
        <div className="flex flex-col gap-0.5">
          <div>❌ Nenhum registro encontrado</div>
          <div className="text-sm text-muted-foreground">Consulta não cobrada</div>
        </div>,
        { duration: 3500 }
      );
      setConditionalChargePending(null);
      return;
    }

    // requiredCount > 0 => cobrar agora
    conditionalChargeInFlightRef.current = true;
    (async () => {
      try {
        await consultarCPFComRegistro(
          conditionalChargePending.cpf,
          conditionalChargePending.finalPrice,
          conditionalChargePending.metadata,
          conditionalChargePending.moduleId,
          conditionalChargePending.source
        );

        // Toast único (padrão 2 linhas como /dashboard/consultar-cpf-foto)
        toast.success(
          <div className="flex flex-col gap-0.5">
            <div>✅ Consulta cobrada!</div>
            <div className="text-sm text-muted-foreground">
              Valor cobrado: R$ {conditionalChargePending.finalPrice.toFixed(2)}
            </div>
          </div>,
          { duration: 3500 }
        );

        await reloadApiBalance();
        loadBalances();

        const finalPrice = conditionalChargePending.finalPrice;
        const saldoUsado = planBalance >= finalPrice ? 'plano' :
          (planBalance > 0 && (planBalance + walletBalance) >= finalPrice) ? 'misto' : 'carteira';

        if (saldoUsado === 'plano') {
          const newPlanBalance = Math.max(0, planBalance - finalPrice);
          setPlanBalance(newPlanBalance);
          localStorage.setItem(`plan_balance_${user?.id}`, newPlanBalance.toFixed(2));
        } else if (saldoUsado === 'misto') {
          const remainingCost = Math.max(0, finalPrice - planBalance);
          const newWalletBalance = Math.max(0, walletBalance - remainingCost);
          setPlanBalance(0);
          setWalletBalance(newWalletBalance);
          localStorage.setItem(`plan_balance_${user?.id}`, '0.00');
          localStorage.setItem(`wallet_balance_${user?.id}`, newWalletBalance.toFixed(2));
        } else {
          const newWalletBalance = Math.max(0, walletBalance - finalPrice);
          setWalletBalance(newWalletBalance);
          localStorage.setItem(`wallet_balance_${user?.id}`, newWalletBalance.toFixed(2));
        }

        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { shouldAnimate: true, immediate: true }
        }));

        setTimeout(() => {
          loadConsultationHistory();
          loadRecentConsultations();
        }, 1000);
      } finally {
        conditionalChargeInFlightRef.current = false;
        setConditionalChargePending(null);
      }
    })();
  }, [
    isConditionalChargeMode,
    conditionalChargePending,
    result,
    parentesCount,
    certidaoNascimentoCount,
    telefonesCount,
    emailsCount,
    enderecosCount,
    planBalance,
    walletBalance,
    reloadApiBalance,
    user?.id,
  ]);

  const performSearch = async () => {
    console.log('🚀 [PERFORM_SEARCH] Iniciando consulta no banco de dados');

    if (!user) {
      console.error('❌ [HANDLE_SEARCH] Usuário não autenticado');
      toast.error("Usuário não autenticado");
      return;
    }
    
    // Validação prévia de token
    const sessionToken = cookieUtils.get('session_token') || cookieUtils.get('api_session_token');
    if (!sessionToken) {
      console.error('❌ [HANDLE_SEARCH] Token não encontrado');
      toast.error("Token de autenticação não encontrado. Faça login novamente.");
      return;
    }
    
    console.log('✅ [HANDLE_SEARCH] Validações iniciais aprovadas');
    console.log('👤 [HANDLE_SEARCH] Usuário:', { id: user.id, email: user.email });
    console.log('🔑 [HANDLE_SEARCH] Token encontrado:', sessionToken.substring(0, 20) + '...');

    setLoading(true);

    try {
      // Usar preço do módulo ID 83 da API - aguardar carregamento se necessário
      let originalPrice = modulePrice;
      if (originalPrice <= 0) {
        console.log('⏳ Aguardando preço do módulo ser carregado...');
        toast.info('Carregando preço do módulo...', { duration: 2000 });
        return;
      }
      
      console.log('💰 Preço original do módulo ID 83:', originalPrice);
      
      // Usar desconto da assinatura se ativa
      const { discountedPrice: finalPrice, hasDiscount } = hasActiveSubscription 
        ? calculateSubscriptionDiscount(originalPrice)
        : { discountedPrice: originalPrice, hasDiscount: false };
      
      const discount = hasDiscount ? discountPercentage : 0;
      
      console.log('💳 Cálculo de preços:', {
        originalPrice,
        finalPrice,
        discount,
        hasDiscount,
        hasActiveSubscription
      });

      console.log('=== [HANDLE_SEARCH] VERIFICAÇÃO DE SALDO E PREÇOS ===', {
        userPlan,
        hasActiveSubscription,
        subscription: subscription?.plan_name,
        discountPercentage,
        originalPrice,
        discount,
        finalPrice,
        planBalance,
        walletBalance,
        totalBalance,
        hasSufficientBalance: hasSufficientBalance(finalPrice)
      });

      // Validação de saldo usando o preço com desconto aplicado
      if (!hasSufficientBalance(finalPrice)) {
        const errorMsg = `Saldo insuficiente. Necessário: R$ ${finalPrice.toFixed(2)}, Disponível: R$ ${totalBalance.toFixed(2)}`;
        console.error('❌ [HANDLE_SEARCH] Saldo insuficiente:', {
          necessario: finalPrice,
          planBalance,
          walletBalance,
          totalBalance,
          originalPrice,
          discount,
          hasActiveSubscription,
          userPlan
        });
        toast.error(errorMsg, {
          description: `Saldo do plano: R$ ${planBalance.toFixed(2)} | Carteira: R$ ${walletBalance.toFixed(2)}`,
          duration: 5000
        });
        return;
      }

      console.log('✅ [HANDLE_SEARCH] Saldo suficiente verificado');
      console.log('🔍 [HANDLE_SEARCH] Primeira tentativa: consultando no banco de dados...');
      
      // PRIMEIRA CONSULTA NO BANCO DE DADOS
      const firstCheckResult = await baseCpfService.getByCpf(cpf);
      
      console.log('📊 [PRIMEIRA_CONSULTA] Resultado:', {
        success: firstCheckResult.success,
        hasData: !!firstCheckResult.data
      });

      // SE NÃO ENCONTROU NO BANCO, ENVIA PARA API EXTERNA
      if (!firstCheckResult.success || !firstCheckResult.data) {
        console.log('⚠️ [PRIMEIRA_CONSULTA] CPF não encontrado no banco');
        console.log('📤 [API_EXTERNA] Enviando CPF para processamento externo...');

        // Parar loading normal e abrir modal imediatamente (sem contagem ainda)
        setLoading(false);
        setVerificationLoadingOpen(true);
        setVerificationPhase(null);
        setVerificationSecondsLeft(null);
        setVerificationProgress(0);

        // ENVIAR PARA ATITO e só então iniciar contagem (após exibir notificação de envio)
        console.log('🌐 [ATITO] Enviando CPF para o Atito...');
        const atitoResult = await atitoConsultaCpfService.enviarCpf(cpf);

        if (!atitoResult.success) {
          console.error('❌ [ATITO] Erro ao enviar CPF:', atitoResult.error);
          toast.warning('Aviso: ' + (atitoResult.error || 'Falha ao enviar CPF'), { duration: 3000 });
          setVerificationLoadingOpen(false);
          setLoading(false);
          return;
        }

        console.log('✅ [ATITO] CPF enviado com sucesso ao Atito!');
        toast.success('CPF enviado para processamento!', { duration: 2000 });

        // Garantir que a notificação apareça antes de iniciar a contagem regressiva
        await new Promise((resolve) => setTimeout(resolve, 250));

        // Agora sim: iniciar contagem (10s + retry 5s)
        const firstWaitSeconds = 10;
        const retryWaitSeconds = 5;
        setVerificationPhase('initial');
        setVerificationSecondsLeft(firstWaitSeconds);
        setVerificationProgress(0);

        const tickCountdown = async (secondsTotal: number) => {
          for (let elapsed = 0; elapsed < secondsTotal; elapsed++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const secondsLeft = Math.max(secondsTotal - (elapsed + 1), 0);
            const progress = Math.min(Math.round(((elapsed + 1) / secondsTotal) * 100), 100);
            setVerificationSecondsLeft(secondsLeft);
            setVerificationProgress(progress);
          }
        };

        let foundInDatabase = false;

        // 1) Aguarda 10s e verifica (contagem começa APÓS a notificação "CPF enviado")
        console.log(`⏳ [POLLING] Aguardando ${firstWaitSeconds}s antes da 2ª consulta no banco...`);
        await tickCountdown(firstWaitSeconds);

        console.log('🔍 [POLLING] Verificando banco de dados após 10s...');
        try {
          const checkResult = await baseCpfService.getByCpf(cpf);
          if (checkResult.success && checkResult.data) {
            console.log('✅ [POLLING] CPF encontrado no banco após 10s!');
            foundInDatabase = true;
          } else {
            console.log('⏳ [POLLING] CPF ainda não encontrado após 10s');
          }
        } catch (recheckError) {
          console.error('❌ [POLLING] Erro ao verificar banco após 10s:', recheckError);
        }

        // 2) Se não encontrou, aguarda +5s e verifica novamente
        if (!foundInDatabase) {
          setVerificationPhase('retry');
          setVerificationSecondsLeft(retryWaitSeconds);
          setVerificationProgress(0);

          console.log(`⏳ [POLLING] Não encontrado após 10s. Aguardando +${retryWaitSeconds}s e verificando novamente...`);
          await tickCountdown(retryWaitSeconds);

          console.log('🔍 [POLLING] Verificando banco de dados após 15s...');
          try {
            const checkResult2 = await baseCpfService.getByCpf(cpf);
            if (checkResult2.success && checkResult2.data) {
              console.log('✅ [POLLING] CPF encontrado no banco após 15s!');
              foundInDatabase = true;
            } else {
              console.log('❌ [POLLING] CPF ainda não encontrado após 15s');
            }
          } catch (recheckError2) {
            console.error('❌ [POLLING] Erro ao verificar banco após 15s:', recheckError2);
          }
        }

        // SEMPRE fechar modal após conclusão do polling
        setVerificationLoadingOpen(false);
        setVerificationSecondsLeft(null);
        setVerificationProgress(0);
        setVerificationPhase(null);
        console.log('🔒 [POLLING] Modal fechado');

        if (!foundInDatabase) {
          console.log('❌ [POLLING] CPF não foi cadastrado após 10s + 5s');
          toast.error('CPF não encontrado após processamento', {
            description: 'O CPF não foi localizado na base de dados'
          });
          setLoading(false);
          return;
        }

        console.log('✅ [POLLING] Continuando com consulta completa...');
        setLoading(true);
      }
      
      console.log('💰 [HANDLE_SEARCH] Valores finais para registro:', {
        originalPrice,
        discount,
        finalPrice,
        hasActiveSubscription,
        subscriptionPlan: subscription?.plan_name,
        userPlan
      });
      
      const baseCpfResult = await consultarCPFComRegistro(cpf, finalPrice, {
        module_title: moduleTitle,
        discount: discount,
        original_price: originalPrice,
        final_price: finalPrice, // valor que será efetivamente cobrado (com desconto)
        subscription_discount: hasActiveSubscription,
        plan_type: userPlan,
        user_id: parseInt(user.id),
        user_name: user.full_name || user.email || 'Arte Pura', // Nome do usuário para o Telegram
        session_token: sessionToken,
        plan_balance: planBalance,
        wallet_balance: walletBalance
      }, moduleId, source, {
        skipRegister: isConditionalChargeMode,
      });
      
      console.log('📊 [HANDLE_SEARCH] Resultado da consulta:', {
        success: baseCpfResult.success,
        hasData: !!baseCpfResult.data,
        error: baseCpfResult.error
      });
      
      if (baseCpfResult.success && baseCpfResult.data) {
        // CPF encontrado na base
        const cpfData = baseCpfResult.data;
        
        console.log('✅ [HANDLE_SEARCH] CPF encontrado! Processando dados...');
        console.log('👤 [HANDLE_SEARCH] Nome encontrado:', cpfData.nome);
        
        // Mapear dados da API para formato CPFResult
        setResult({
          id: cpfData.id || baseCpfResult.cpfId, // Adicionar ID do CPF para passar aos componentes
          cpf: cpfData.cpf || cpf,
          nome: cpfData.nome || 'Nome não informado',
          data_nascimento: cpfData.data_nascimento || '',
          situacao_cpf: cpfData.situacao_cpf || 'Regular',
          situacao_receita: cpfData.situacao_receita || cpfData.status_receita_federal || '',
          nome_mae: cpfData.mae || cpfData.nome_mae || '',
          nome_pai: cpfData.pai || cpfData.nome_pai || '',
          endereco: cpfData.enderecos ? (Array.isArray(cpfData.enderecos) ? cpfData.enderecos[0]?.endereco : cpfData.enderecos.endereco) : cpfData.endereco || '',
          bairro: cpfData.enderecos ? (Array.isArray(cpfData.enderecos) ? cpfData.enderecos[0]?.bairro : cpfData.enderecos.bairro) : cpfData.bairro || '',
          cidade: cpfData.enderecos ? (Array.isArray(cpfData.enderecos) ? cpfData.enderecos[0]?.cidade : cpfData.enderecos.cidade) : cpfData.cidade || '',
          uf: cpfData.enderecos ? (Array.isArray(cpfData.enderecos) ? cpfData.enderecos[0]?.uf : cpfData.enderecos.uf) : cpfData.uf || '',
          cep: cpfData.enderecos ? (Array.isArray(cpfData.enderecos) ? cpfData.enderecos[0]?.cep : cpfData.enderecos.cep) : cpfData.cep || '',
          email: cpfData.emails ? (Array.isArray(cpfData.emails) ? cpfData.emails[0]?.email : cpfData.emails.email) : cpfData.email || '',
          telefone: cpfData.telefones ? (Array.isArray(cpfData.telefones) ? cpfData.telefones[0]?.numero : cpfData.telefones.numero) : cpfData.telefone || '',
          genero: cpfData.sexo || cpfData.genero,
          sexo: cpfData.sexo,
          idade: cpfData.data_nascimento ? new Date().getFullYear() - new Date(cpfData.data_nascimento).getFullYear() : cpfData.idade,
          
          // CAMPOS FALTANTES - Dados Pessoais
          naturalidade: cpfData.naturalidade,
          uf_naturalidade: cpfData.uf_naturalidade,
          cor: cpfData.cor,
          escolaridade: cpfData.escolaridade,
          estado_civil: cpfData.estado_civil,
          aposentado: cpfData.aposentado,
          tipo_emprego: cpfData.tipo_emprego,
          cbo: cpfData.cbo,
          data_obito: cpfData.data_obito,
          
          // CAMPOS FALTANTES - Contato
          senha_email: cpfData.senha_email,
          
          // CAMPOS FALTANTES - Endereço
          logradouro: cpfData.logradouro,
          numero: cpfData.numero,
          complemento: cpfData.complemento,
          uf_endereco: cpfData.uf_endereco || cpfData.uf,
          
          // CAMPOS FALTANTES - Documentos
          cnh: cpfData.cnh,
          dt_expedicao_cnh: cpfData.dt_expedicao_cnh,
          passaporte: cpfData.passaporte,
          nit: cpfData.nit,
          ctps: cpfData.ctps,
          
          // CAMPOS FALTANTES - Dados Financeiros
          fx_poder_aquisitivo: cpfData.fx_poder_aquisitivo,
          
          // CAMPOS FALTANTES - Outros Dados
          fonte_dados: cpfData.fonte_dados,
          ultima_atualizacao: cpfData.ultima_atualizacao,
          
          // CAMPOS FALTANTES - Score
          score: cpfData.score,
          
          // Campos adicionais da API
          mae: cpfData.mae,
          pai: cpfData.pai,
          ref: cpfData.ref,
          rg: cpfData.rg,
          orgao_emissor: cpfData.orgao_emissor,
          uf_emissao: cpfData.uf_emissao,
          pis: cpfData.pis,
          cns: cpfData.cns,
          poder_aquisitivo: cpfData.poder_aquisitivo,
          renda: cpfData.renda,
          renda_presumida: cpfData.renda_presumida,
          nivel_consulta: cpfData.nivel_consulta,
          telefones: cpfData.telefones,
          emails: cpfData.emails,
          enderecos: cpfData.enderecos,
          parentes: cpfData.parentes,
          // Campos específicos da API
          titulo_eleitor: cpfData.titulo_eleitor,
          zona: cpfData.zona,
          secao: cpfData.secao,
          nsu: cpfData.nsu,
          csb8: cpfData.csb8?.toString(),
          csb8_faixa: cpfData.csb8_faixa,
          csba: cpfData.csba?.toString(),
          csba_faixa: cpfData.csba_faixa,
          percentual_participacao_societaria: cpfData.percentual_participacao_societaria,
          status_receita_federal: cpfData.status_receita_federal,
          foto: cpfData.foto,
          foto2: cpfData.foto2,
          foto_rosto_rg: cpfData.foto_rosto_rg,
          foto_rosto_cnh: cpfData.foto_rosto_cnh,
          foto_doc_rg: cpfData.foto_doc_rg,
          foto_doc_cnh: cpfData.foto_doc_cnh,
          vacinas_covid: cpfData.vacinas_covid,
          empresas_socio: cpfData.empresas_socio,
          cnpj_mei: cpfData.cnpj_mei,
          dividas_ativas: cpfData.dividas_ativas,
          auxilio_emergencial: cpfData.auxilio_emergencial,
          rais_historico: cpfData.rais_historico,
          inss_dados: cpfData.inss_dados,
          operadora_vivo: cpfData.operadora_vivo,
          operadora_claro: cpfData.operadora_claro,
          operadora_tim: cpfData.operadora_tim,
          historico_veiculos: cpfData.historico_veiculos,
          senhas_vazadas_email: cpfData.senhas_vazadas_email,
          senhas_vazadas_cpf: cpfData.senhas_vazadas_cpf,
          qualidade_dados: cpfData.qualidade_dados,
          created_at: cpfData.created_at,
          updated_at: cpfData.updated_at,
        });

        // Armazenar dados da Receita Federal separadamente se encontrados
        if (baseCpfResult.receitaData) {
          setReceitaData(baseCpfResult.receitaData);
          console.log('🏛️ [HANDLE_SEARCH] Dados da Receita Federal carregados:', baseCpfResult.receitaData);
        } else {
          setReceitaData(null);
          console.log('⚠️ [HANDLE_SEARCH] Dados da Receita Federal não encontrados');
        }
        
        // Carregar dados relacionados se houver ID (mesmo padrão do CpfView)
        if (baseCpfResult.cpfId || cpfData.id) {
          const cpfId = baseCpfResult.cpfId || cpfData.id;
          try {
            console.log('📊 [HANDLE_SEARCH] Carregando dados relacionados para cpfId:', cpfId);
            
            // Carregar todos os dados relacionados em paralelo
            await Promise.all([
              getAuxiliosEmergenciaisByCpfId(cpfId),
              getRaisByCpfId(cpfId),
              getCreditinksByCpfId(cpfId),
              getVacinasByCpfId(cpfId)
            ]);
            
            console.log('✅ [HANDLE_SEARCH] Todos os dados relacionados carregados');
          } catch (error) {
            console.error('❌ [HANDLE_SEARCH] Erro ao carregar dados adicionais:', error);
          }
        }
        
        // Exibir notificação de sucesso COM feedback detalhado
        // Obs: Em módulos com cobrança condicional, o toast final (cobrado/não cobrado) já é exibido depois.
        // Para evitar duplicidade, suprimimos o toast inicial nesses fluxos.
        console.log('✅ [HANDLE_SEARCH] Exibindo toast de sucesso');
        const shouldSuppressInitialFoundToast = isConditionalChargeMode;

        if (!shouldSuppressInitialFoundToast) {
          // Padrão EXACT do /dashboard/consultar-cpf-foto (2 linhas, mesmo spacing/alinhamento)
          toast.success(
            <div className="flex flex-col gap-0.5">
              <div>✅ CPF encontrado!</div>
              <div className="text-sm text-muted-foreground">
                Valor cobrado: R$ {finalPrice.toFixed(2)}
              </div>
            </div>,
            { duration: 4000 }
          );
        }

        // Auto scroll to result
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        
        if (isConditionalChargeMode) {
          // Preparar cobrança condicional (após a seção principal carregar)
          if (isRestrictToBasicAndParentes) setParentesCount(-1);
          if (isRestrictToBasicAndCertidao) setCertidaoNascimentoCount(-1);
          if (isRestrictToBasicAndTelefones) setTelefonesCount(-1);
          if (isRestrictToBasicAndEmails) setEmailsCount(-1);
          if (isRestrictToBasicAndEnderecos) setEnderecosCount(-1);

          setConditionalChargePending({
            cpf,
            finalPrice,
            metadata: {
              module_title: moduleTitle,
              discount: discount,
              original_price: originalPrice,
              final_price: finalPrice,
              subscription_discount: hasActiveSubscription,
              plan_type: userPlan,
              user_id: parseInt(user.id),
              user_name: user.full_name || user.email || 'Arte Pura',
              session_token: sessionToken,
              plan_balance: planBalance,
              wallet_balance: walletBalance
            },
            moduleId,
            source,
          });
        } else {
          console.log('🔄 [HANDLE_SEARCH] Recarregando saldo após consulta...');
          // Recarregar saldo após cobrança
          await reloadApiBalance();
          loadBalances();
        }
        
        if (isConditionalChargeMode) {
          // Não deduzir saldo aqui; será feito após validação da seção principal.
          return;
        }

        // Deduzir saldo localmente para garantir consistência
        const saldoUsado = planBalance >= finalPrice ? 'plano' :
                          (planBalance > 0 && (planBalance + walletBalance) >= finalPrice) ? 'misto' : 'carteira';
        
        console.log('💰 [HANDLE_SEARCH] Deduzindo saldo localmente:', {
          finalPrice,
          planBalance,
          walletBalance,
          saldoUsado
        });
        
        if (saldoUsado === 'plano') {
          // Usar apenas saldo do plano
          const newPlanBalance = Math.max(0, planBalance - finalPrice);
          setPlanBalance(newPlanBalance);
          localStorage.setItem(`plan_balance_${user.id}`, newPlanBalance.toFixed(2));
        } else if (saldoUsado === 'misto') {
          // Usar saldo do plano primeiro, depois carteira
          const remainingCost = Math.max(0, finalPrice - planBalance);
          const newWalletBalance = Math.max(0, walletBalance - remainingCost);
          setPlanBalance(0);
          setWalletBalance(newWalletBalance);
          localStorage.setItem(`plan_balance_${user.id}`, '0.00');
          localStorage.setItem(`wallet_balance_${user.id}`, newWalletBalance.toFixed(2));
        } else {
          // Usar apenas saldo da carteira
          const newWalletBalance = Math.max(0, walletBalance - finalPrice);
          setWalletBalance(newWalletBalance);
          localStorage.setItem(`wallet_balance_${user.id}`, newWalletBalance.toFixed(2));
        }
        
        console.log('✅ [HANDLE_SEARCH] Saldo deduzido localmente');
        
        // Emitir evento IMEDIATO para atualização de saldo no menu superior
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { shouldAnimate: true, immediate: true }
        }));
        
        // Atualizar histórico imediatamente após sucesso
        console.log('🔄 [HANDLE_SEARCH] Atualizando histórico após CPF encontrado...');
        setTimeout(() => {
          loadConsultationHistory();
          loadRecentConsultations(); // Atualizar seção de consultas recentes
        }, 1000); // Pequeno delay para garantir que o backend processou
        
        // Verificar se o usuário gastou seu último saldo e não pode mais fazer consultas
        const newTotalBalance = (saldoUsado === 'plano' ? Math.max(0, planBalance - finalPrice) : 0) + 
                                (saldoUsado === 'carteira' ? Math.max(0, walletBalance - finalPrice) : 
                                 saldoUsado === 'misto' ? Math.max(0, walletBalance - (finalPrice - planBalance)) : walletBalance);
        
        console.log('💰 [HANDLE_SEARCH] Novo saldo total após consulta:', newTotalBalance);
        
        // Se o saldo é insuficiente para uma nova consulta (menos que o preço do módulo)
        if (newTotalBalance < finalPrice) {
          console.log('⚠️ [HANDLE_SEARCH] Saldo insuficiente para nova consulta. Exibindo aviso...');
          setShowInsufficientBalanceDialog(true);
        }
        
      } else {
        // CPF não encontrado na base
        console.log('❌ [HANDLE_SEARCH] CPF não encontrado na base');
        console.log('❌ [HANDLE_SEARCH] Erro detalhado:', baseCpfResult.error);
        setResult(null);
        
        toast.warning("🔍 CPF não encontrado", {
          description: "Este CPF não foi encontrado na base de dados.",
          duration: 5000
        });
        
        console.log('🔄 [HANDLE_SEARCH] Recarregando saldo após tentativa...');
        // Recarregar saldo (verificar se houve cobrança mesmo sem resultado)
        await reloadApiBalance();
        loadBalances();
        
        // Recarregar histórico e estatísticas também
        await loadConsultationHistory();
        await loadStats();
        
        // Emitir evento IMEDIATO para atualização de saldo no menu superior
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { shouldAnimate: true, immediate: true }
        }));
      }

      console.log('🔄 [HANDLE_SEARCH] Recarregando histórico...');
      // Recarregar histórico e estatísticas
      await loadConsultationHistory();
      await loadRecentConsultations(); // Atualizar seção de consultas recentes
      await loadStats();

    } catch (error) {
      console.error('❌ [HANDLE_SEARCH] EXCEÇÃO GERAL:', error);
      setResult(null);
      setVerificationLoadingOpen(false); // Garantir que o modal fecha em caso de erro
      setVerificationPhase(null);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [HANDLE_SEARCH] Mensagem de erro:', errorMessage);
      
      // Tratamento detalhado e específico dos erros
      if (errorMessage.toLowerCase().includes('connection') || 
          errorMessage.toLowerCase().includes('network') || 
          errorMessage.toLowerCase().includes('fetch') ||
          errorMessage.toLowerCase().includes('timeout')) {
        console.error('❌ [HANDLE_SEARCH] Erro de conexão detectado');
        toast.error("🌐 Falha na conexão", {
          description: "Não conseguimos conectar com nossos serviços. Verifique sua conexão com a internet e tente novamente.",
          duration: 6000
        });
      } else if (errorMessage.toLowerCase().includes('cors') ||
                 errorMessage.toLowerCase().includes('blocked')) {
        console.error('❌ [HANDLE_SEARCH] Erro de CORS detectado');
        toast.error("🚫 Erro de acesso", {
          description: "Problema de segurança detectado. Recarregue a página e tente novamente.",
          duration: 6000
        });
      } else if (errorMessage.toLowerCase().includes('unauthorized') ||
                 errorMessage.toLowerCase().includes('token')) {
        console.error('❌ [HANDLE_SEARCH] Erro de autorização detectado');
        toast.error("🔐 Erro de autorização", {
          description: "Sua sessão expirou. Faça login novamente.",
          duration: 6000
        });
      } else if (errorMessage.toLowerCase().includes('insufficient') ||
                 errorMessage.toLowerCase().includes('balance')) {
        console.error('❌ [HANDLE_SEARCH] Erro de saldo detectado');
        toast.error("💰 Saldo insuficiente", {
          description: "Não há saldo suficiente para realizar esta consulta.",
          duration: 6000
        });
      } else {
        console.error('❌ [HANDLE_SEARCH] Erro inesperado');
        toast.error("⚠️ Erro inesperado", {
          description: `Ocorreu um problema técnico: ${errorMessage}. Nossa equipe foi notificada.`,
          duration: 6000
        });
      }
    } finally {
      console.log('🏁 [HANDLE_SEARCH] Finalizando consulta');
      setLoading(false);
      setVerificationLoadingOpen(false); // Garantir que o modal fecha sempre
      setVerificationPhase(null);
    }
  };

  const buildFullReportText = () => {
    if (!result) return "";

    const formatValue = (value: any) => {
      if (value === null || value === undefined || value === "") return "N/A";
      return String(value);
    };

    const formatDateForReport = (dateString: string) => {
      if (!dateString) return "N/A";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("pt-BR");
      } catch {
        return dateString;
      }
    };

    const formatCurrencyForReport = (value: number | string | null | undefined) => {
      if (value === null || value === undefined) return "N/A";
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return String(value);
      return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const currentDate = new Date().toLocaleString("pt-BR");
    
    let reportText = `------------------------------------
APIPAINEL.COM.BR
Relatório Completo de Consulta CPF
------------------------------------

Data/Hora: ${currentDate}
CPF: ${formatCPF(result.cpf)}

------------------------------------
DADOS BÁSICOS DO CIDADÃO
------------------------------------

CPF: ${formatCPF(result.cpf)}
Nome Completo: ${formatValue(result.nome)?.toUpperCase()}
Referência: ${formatValue(result.ref)?.toUpperCase()}
Data de Nascimento: ${formatDateForReport(result.data_nascimento)}
Idade: ${formatValue(result.idade)} anos
Sexo: ${formatValue(result.sexo)?.toUpperCase()}
Gênero: ${formatValue(result.genero)?.toUpperCase()}
Situação CPF: ${formatValue(result.situacao_cpf)?.toUpperCase()}
Nome da Mãe: ${formatValue(result.mae || result.nome_mae)?.toUpperCase()}
Nome do Pai: ${formatValue(result.pai || result.nome_pai)?.toUpperCase()}

------------------------------------
DADOS PESSOAIS COMPLETOS
------------------------------------

Naturalidade: ${formatValue(result.naturalidade)?.toUpperCase()}
UF Naturalidade: ${formatValue(result.uf_naturalidade)?.toUpperCase()}
Cor/Raça: ${formatValue(result.cor)?.toUpperCase()}
Escolaridade: ${formatValue(result.escolaridade)?.toUpperCase()}
Estado Civil: ${formatValue(result.estado_civil)?.toUpperCase()}
Aposentado: ${formatValue(result.aposentado)?.toUpperCase()}
Tipo de Emprego: ${formatValue(result.tipo_emprego)?.toUpperCase()}
CBO: ${formatValue(result.cbo)?.toUpperCase()}
Data de Óbito: ${formatDate(result.data_obito)}

------------------------------------
DADOS DE CONTATO
------------------------------------

Email Principal: ${formatValue(result.email)?.toLowerCase()}
Telefone Principal: ${formatValue(result.telefone)}

------------------------------------
ENDEREÇO COMPLETO
------------------------------------

CEP: ${formatValue(result.cep)}
Logradouro: ${formatValue(result.logradouro || result.endereco)?.toUpperCase()}
Número: ${formatValue(result.numero)}
Complemento: ${formatValue(result.complemento)?.toUpperCase()}
Bairro: ${formatValue(result.bairro)?.toUpperCase()}
Cidade: ${formatValue(result.cidade)?.toUpperCase()}
UF: ${formatValue(result.uf_endereco || result.uf)?.toUpperCase()}

------------------------------------
DOCUMENTOS DE IDENTIFICAÇÃO
------------------------------------

RG: ${formatValue(result.rg)}
Órgão Emissor RG: ${formatValue(result.orgao_emissor)?.toUpperCase()}
UF Emissão RG: ${formatValue(result.uf_emissao)?.toUpperCase()}

CNH: ${formatValue(result.cnh)}
Data Expedição CNH: ${formatDateForReport(result.dt_expedicao_cnh)}

Passaporte: ${formatValue(result.passaporte)?.toUpperCase()}
CNS (Cartão SUS): ${formatValue(result.cns)}
NIT: ${formatValue(result.nit)}
CTPS: ${formatValue(result.ctps)}
Título de Eleitor: ${formatValue(result.titulo_eleitor)}
Zona Eleitoral: ${formatValue(result.zona)}
Seção Eleitoral: ${formatValue(result.secao)}
PIS/PASEP: ${formatValue(result.pis)}
NSU: ${formatValue(result.nsu)}

------------------------------------
DADOS FINANCEIROS E SCORE
------------------------------------

Score: ${formatValue(result.score)}
Poder Aquisitivo: ${formatValue(result.poder_aquisitivo)?.toUpperCase()}
Renda Estimada: ${formatValue(result.renda)}
Faixa Poder Aquisitivo: ${formatValue(result.fx_poder_aquisitivo)?.toUpperCase()}

CSB8: ${formatValue(result.csb8)}
CSBA: ${formatValue(result.csba)}`;

    // Seção: Receita Federal
    if (receitaData) {
      reportText += `

------------------------------------
RECEITA FEDERAL DO BRASIL
------------------------------------

CPF: ${formatCPF(receitaData.cpf)}
Situação Cadastral: ${formatValue(receitaData.situacao_cadastral)?.toUpperCase()}`;
    }

    // Seção: Telefones
    if (result.telefones && Array.isArray(result.telefones) && result.telefones.length > 0) {
      reportText += `

------------------------------------
TELEFONES (${result.telefones.length})
------------------------------------
`;
      result.telefones.forEach((tel: any, idx: number) => {
        reportText += `
[Telefone ${idx + 1}]
Número: ${formatValue(tel.numero || tel.telefone)}
Tipo: ${formatValue(tel.tipo)?.toUpperCase()}
Operadora: ${formatValue(tel.operadora)?.toUpperCase()}
WhatsApp: ${tel.whatsapp ? 'SIM' : 'NÃO'}`;
      });
    }

    // Seção: Emails
    if (result.emails && Array.isArray(result.emails) && result.emails.length > 0) {
      reportText += `

------------------------------------
EMAILS (${result.emails.length})
------------------------------------
`;
      result.emails.forEach((email: any, idx: number) => {
        reportText += `
[Email ${idx + 1}]
Email: ${formatValue(email.email || email.endereco)?.toLowerCase()}
Tipo: ${formatValue(email.tipo)?.toUpperCase()}`;
      });
    }

    // Seção: Endereços
    if (result.enderecos && Array.isArray(result.enderecos) && result.enderecos.length > 0) {
      reportText += `

------------------------------------
ENDEREÇOS (${result.enderecos.length})
------------------------------------
`;
      result.enderecos.forEach((end: any, idx: number) => {
        reportText += `
[Endereço ${idx + 1}]
CEP: ${formatValue(end.cep)}
Logradouro: ${formatValue(end.logradouro || end.endereco)?.toUpperCase()}
Número: ${formatValue(end.numero)}
Complemento: ${formatValue(end.complemento)?.toUpperCase()}
Bairro: ${formatValue(end.bairro)?.toUpperCase()}
Cidade: ${formatValue(end.cidade)?.toUpperCase()}
UF: ${formatValue(end.uf)?.toUpperCase()}`;
      });
    }

    // Seção: Parentes
    if (result.parentes && Array.isArray(result.parentes) && result.parentes.length > 0) {
      reportText += `

------------------------------------
PARENTES/VÍNCULOS (${result.parentes.length})
------------------------------------
`;
      result.parentes.forEach((parente: any, idx: number) => {
        reportText += `
[Parente ${idx + 1}]
Nome: ${formatValue(parente.nome)?.toUpperCase()}
CPF: ${parente.cpf ? formatCPF(parente.cpf) : 'N/A'}
Parentesco: ${formatValue(parente.parentesco || parente.vinculo)?.toUpperCase()}`;
      });
    }

    // Seção: Empresas/Sociedades
    if (result.empresas_socio && Array.isArray(result.empresas_socio) && result.empresas_socio.length > 0) {
      reportText += `

------------------------------------
EMPRESAS/SOCIEDADES (${result.empresas_socio.length})
------------------------------------
`;
      result.empresas_socio.forEach((empresa: any, idx: number) => {
        reportText += `
[Empresa ${idx + 1}]
Razão Social: ${formatValue(empresa.razao_social || empresa.nome)?.toUpperCase()}
CNPJ: ${formatValue(empresa.cnpj)}
Participação: ${formatValue(empresa.participacao || empresa.percentual)}%
Qualificação: ${formatValue(empresa.qualificacao)?.toUpperCase()}
Data Entrada: ${formatDateForReport(empresa.data_entrada)}`;
      });
    }

    // Seção: CNPJ MEI
    if (result.cnpj_mei) {
      reportText += `

------------------------------------
CNPJ MEI
------------------------------------

CNPJ: ${formatValue(result.cnpj_mei)}`;
    }

    // Seção: Dívidas Ativas
    if (result.dividas_ativas && Array.isArray(result.dividas_ativas) && result.dividas_ativas.length > 0) {
      reportText += `

------------------------------------
DÍVIDAS ATIVAS (${result.dividas_ativas.length})
------------------------------------
`;
      result.dividas_ativas.forEach((divida: any, idx: number) => {
        reportText += `
[Dívida ${idx + 1}]
Número: ${formatValue(divida.numero_inscricao || divida.numero)}
Valor: ${formatCurrencyForReport(divida.valor)}
Órgão: ${formatValue(divida.orgao)?.toUpperCase()}
Situação: ${formatValue(divida.situacao)?.toUpperCase()}
Data Inscrição: ${formatDateForReport(divida.data_inscricao)}`;
      });
    }

    // Seção: Auxílio Emergencial
    if (auxiliosEmergenciais && Array.isArray(auxiliosEmergenciais) && auxiliosEmergenciais.length > 0) {
      reportText += `

------------------------------------
AUXÍLIO EMERGENCIAL (${auxiliosEmergenciais.length})
------------------------------------
`;
      auxiliosEmergenciais.forEach((auxilio: any, idx: number) => {
        reportText += `
[Parcela ${idx + 1}]
Mês/Ano: ${formatValue(auxilio.mes)}/${formatValue(auxilio.ano)}
Valor: ${formatCurrencyForReport(auxilio.valor)}
Parcela: ${formatValue(auxilio.parcela)}`;
      });
    }

    // Seção: RAIS (Histórico Trabalhista)
    if (rais && Array.isArray(rais) && rais.length > 0) {
      reportText += `

------------------------------------
HISTÓRICO TRABALHISTA - RAIS (${rais.length})
------------------------------------
`;
      rais.forEach((registro: any, idx: number) => {
        reportText += `
[Registro ${idx + 1}]
Empresa: ${formatValue(registro.razao_social || registro.empresa)?.toUpperCase()}
CNPJ: ${formatValue(registro.cnpj)}
Cargo: ${formatValue(registro.cbo || registro.cargo)?.toUpperCase()}
Salário: ${formatCurrencyForReport(registro.remuneracao || registro.salario)}
Admissão: ${formatDateForReport(registro.data_admissao)}
Desligamento: ${formatDateForReport(registro.data_desligamento)}
Ano Referência: ${formatValue(registro.ano)}`;
      });
    }

    // Seção: INSS
    if (result.inss_dados && Array.isArray(result.inss_dados) && result.inss_dados.length > 0) {
      reportText += `

------------------------------------
INSS - PREVIDÊNCIA SOCIAL (${result.inss_dados.length})
------------------------------------
`;
      result.inss_dados.forEach((inss: any, idx: number) => {
        reportText += `
[Registro ${idx + 1}]
NIT: ${formatValue(inss.nit)}
Tipo: ${formatValue(inss.tipo)?.toUpperCase()}
Situação: ${formatValue(inss.situacao)?.toUpperCase()}
Valor: ${formatCurrencyForReport(inss.valor)}`;
      });
    }

    // Seção: Vacinas COVID
    if (result.vacinas_covid && Array.isArray(result.vacinas_covid) && result.vacinas_covid.length > 0) {
      reportText += `

------------------------------------
VACINAS COVID-19 (${result.vacinas_covid.length})
------------------------------------
`;
      result.vacinas_covid.forEach((vacina: any, idx: number) => {
        reportText += `
[Dose ${idx + 1}]
Vacina: ${formatValue(vacina.vacina || vacina.nome)?.toUpperCase()}
Fabricante: ${formatValue(vacina.fabricante)?.toUpperCase()}
Lote: ${formatValue(vacina.lote)}
Data Aplicação: ${formatDateForReport(vacina.data_aplicacao || vacina.data)}
Local: ${formatValue(vacina.local || vacina.estabelecimento)?.toUpperCase()}`;
      });
    }

    // Seção: Operadora VIVO
    if (result.operadora_vivo && Array.isArray(result.operadora_vivo) && result.operadora_vivo.length > 0) {
      reportText += `

------------------------------------
OPERADORA VIVO (${result.operadora_vivo.length})
------------------------------------
`;
      result.operadora_vivo.forEach((linha: any, idx: number) => {
        reportText += `
[Linha ${idx + 1}]
Número: ${formatValue(linha.numero || linha.telefone)}
Plano: ${formatValue(linha.plano)?.toUpperCase()}
Status: ${formatValue(linha.status)?.toUpperCase()}`;
      });
    }

    // Seção: Operadora CLARO
    if (result.operadora_claro && Array.isArray(result.operadora_claro) && result.operadora_claro.length > 0) {
      reportText += `

------------------------------------
OPERADORA CLARO (${result.operadora_claro.length})
------------------------------------
`;
      result.operadora_claro.forEach((linha: any, idx: number) => {
        reportText += `
[Linha ${idx + 1}]
Número: ${formatValue(linha.numero || linha.telefone)}
Plano: ${formatValue(linha.plano)?.toUpperCase()}
Status: ${formatValue(linha.status)?.toUpperCase()}`;
      });
    }

    // Seção: Operadora TIM
    if (result.operadora_tim && Array.isArray(result.operadora_tim) && result.operadora_tim.length > 0) {
      reportText += `

------------------------------------
OPERADORA TIM (${result.operadora_tim.length})
------------------------------------
`;
      result.operadora_tim.forEach((linha: any, idx: number) => {
        reportText += `
[Linha ${idx + 1}]
Número: ${formatValue(linha.numero || linha.telefone)}
Plano: ${formatValue(linha.plano)?.toUpperCase()}
Status: ${formatValue(linha.status)?.toUpperCase()}`;
      });
    }

    // Seção: Senhas Vazadas (Email)
    if (result.senhas_vazadas_email && Array.isArray(result.senhas_vazadas_email) && result.senhas_vazadas_email.length > 0) {
      reportText += `

------------------------------------
SENHAS VAZADAS - EMAIL (${result.senhas_vazadas_email.length})
------------------------------------
`;
      result.senhas_vazadas_email.forEach((vazamento: any, idx: number) => {
        reportText += `
[Vazamento ${idx + 1}]
Email: ${formatValue(vazamento.email)?.toLowerCase()}
Senha: ${formatValue(vazamento.senha)}
Fonte: ${formatValue(vazamento.fonte || vazamento.source)?.toUpperCase()}`;
      });
    }

    // Seção: Senhas Vazadas (CPF)
    if (result.senhas_vazadas_cpf && Array.isArray(result.senhas_vazadas_cpf) && result.senhas_vazadas_cpf.length > 0) {
      reportText += `

------------------------------------
SENHAS VAZADAS - CPF (${result.senhas_vazadas_cpf.length})
------------------------------------
`;
      result.senhas_vazadas_cpf.forEach((vazamento: any, idx: number) => {
        reportText += `
[Vazamento ${idx + 1}]
Login: ${formatValue(vazamento.login || vazamento.cpf)}
Senha: ${formatValue(vazamento.senha)}
Fonte: ${formatValue(vazamento.fonte || vazamento.source)?.toUpperCase()}`;
      });
    }

    // Seção: Histórico de Veículos
    if (result.historico_veiculos && Array.isArray(result.historico_veiculos) && result.historico_veiculos.length > 0) {
      reportText += `

------------------------------------
HISTÓRICO DE VEÍCULOS (${result.historico_veiculos.length})
------------------------------------
`;
      result.historico_veiculos.forEach((veiculo: any, idx: number) => {
        reportText += `
[Veículo ${idx + 1}]
Placa: ${formatValue(veiculo.placa)?.toUpperCase()}
Renavam: ${formatValue(veiculo.renavam)}
Marca/Modelo: ${formatValue(veiculo.marca_modelo || veiculo.modelo)?.toUpperCase()}
Ano: ${formatValue(veiculo.ano_fabricacao)}/${formatValue(veiculo.ano_modelo)}
Cor: ${formatValue(veiculo.cor)?.toUpperCase()}
Situação: ${formatValue(veiculo.situacao)?.toUpperCase()}`;
      });
    }

    // Finalização do relatório
    reportText += `

------------------------------------
INFORMAÇÕES COMPLEMENTARES
------------------------------------

Fonte dos Dados: ${formatValue(result.fonte_dados)?.toUpperCase()}
Qualidade dos Dados: ${result.qualidade_dados ? `${result.qualidade_dados}%` : 'N/A'}
Última Atualização: ${formatDateForReport(result.ultima_atualizacao)}

------------------------------------
FIM DO RELATÓRIO
------------------------------------

Relatório gerado por: APIPAINEL.COM.BR
Este relatório contém informações 
confidenciais e deve ser tratado com 
segurança e de acordo com a LGPD 
(Lei Geral de Proteção de Dados).

© ${new Date().getFullYear()} APIPAINEL.COM.BR
Todos os direitos reservados.`;

    return reportText;
  };

  const handleExport = () => {
    if (!result) return;

    const data = buildFullReportText();
    if (!data) return;
    
    const element = document.createElement("a");
    const file = new Blob([data], { type: 'text/plain; charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `cpf-completo-${result.cpf}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast.success("Relatório completo exportado com sucesso!");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };


  // Calcular preço com desconto para exibição usando módulo ID 83
  const originalPrice = modulePrice > 0 ? modulePrice : 0; // Só usar API, não fallback
  const { discountedPrice: finalPrice, hasDiscount } = hasActiveSubscription && originalPrice > 0
    ? calculateSubscriptionDiscount(originalPrice)
    : { discountedPrice: originalPrice, hasDiscount: false };
  const discount = hasDiscount ? discountPercentage : 0;

  // Mostrar loading enquanto verifica o saldo
  if (balanceCheckLoading || modulePriceLoading) {
    return (
      <LoadingScreen 
        message="Verificando acesso ao módulo..." 
        variant="dashboard" 
      />
    );
  }

  const handleBack = () => {
    // Se o usuário chegou aqui via navegação interna, volta uma tela.
    // Caso contrário (ex.: abriu direto a URL), volta para o dashboard.
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <div className="w-full">
        <SimpleTitleBar
          title={moduleTitle || 'Consulta CPF'}
          subtitle={moduleSubtitle || 'Consulte dados do CPF na base de dados'}
          onBack={handleBack}
        />

        <div className="mt-4 md:mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 md:gap-6 lg:gap-8">
        {/* Formulário de Consulta */}
        <Card className="dark:bg-gray-800 dark:border-gray-700 w-full">
          <CardHeader className="pb-4">
            {/* Compact Price Display */}
            <div className="relative bg-gradient-to-br from-purple-50/50 via-white to-blue-50/30 dark:from-gray-800/50 dark:via-gray-800 dark:to-purple-900/20 rounded-lg border border-purple-100/50 dark:border-purple-800/30 shadow-sm transition-all duration-300">
              {/* Badge de desconto centralizado no topo */}
              {hasDiscount && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-2.5 py-1 text-xs font-bold shadow-lg">
                    {discount}% OFF
                  </Badge>
                </div>
              )}
              
              <div className="relative p-3.5 md:p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Nome do plano - Esquerda */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-1 h-10 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                        Plano Ativo
                      </p>
                      <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white truncate">
                        {hasActiveSubscription ? subscription?.plan_name : userPlan}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Preço - Direita */}
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    {hasDiscount && (
                      <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 line-through">
                        R$ {originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent whitespace-nowrap">
                      R$ {finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF (apenas números)</Label>
              <Input
                id="cpf"
                placeholder="Digite o CPF (11 dígitos)"
                value={cpf}
                onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && cpf.length === 11 && !loading && hasSufficientBalance(finalPrice) && !modulePriceLoading) {
                    handleSearch();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text');
                  const cleanedCpf = pastedText.replace(/\D/g, '').slice(0, 11);
                  setCpf(cleanedCpf);
                }}
                maxLength={11}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSearch}
                disabled={loading || !cpf || cpf.length !== 11 || !hasSufficientBalance(finalPrice) || modulePriceLoading}
                className="w-full bg-brand-purple hover:bg-brand-darkPurple"
              >
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Consultando..." : modulePriceLoading ? "Carregando preço..." : `Consultar CPF (R$ ${finalPrice.toFixed(2)})`}
              </Button>
            </div>

            {/* Modal de Verificação */}
            <Dialog open={verificationLoadingOpen} onOpenChange={setVerificationLoadingOpen}>
              <DialogContent className="w-[92vw] max-w-[340px] p-4 sm:max-w-[320px] sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-center text-base sm:text-lg">Processando Consulta</DialogTitle>
                  <DialogDescription className="text-center text-sm sm:text-base">
                    {verificationPhase === 'retry'
                      ? 'Ainda processando... aguardando mais 5s para tentar novamente.'
                      : verificationPhase === 'initial'
                        ? 'Aguarde a exibição das informações'
                        : 'Enviando CPF para processamento externo...'}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center space-y-3 py-3 sm:space-y-4 sm:py-6">
                  <div className="relative">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-brand-purple/20 to-pink-500/20 rounded-full flex items-center justify-center">
                      <LoadingSpinner size="md" className="text-brand-purple" />
                    </div>
                    <div className="absolute inset-0 h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-brand-purple/10 to-pink-500/10 rounded-full animate-ping"></div>
                  </div>

                  <div className="w-full max-w-[260px] sm:max-w-xs space-y-2">
                    {verificationPhase ? (
                      <>
                        <Progress value={verificationProgress} className="w-full" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{verificationProgress}%</span>
                          <span>{verificationSecondsLeft ?? 0}s</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center">
                        Aguardando confirmação de envio...
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Indicador de saldo insuficiente - Design moderno */}
             {!hasSufficientBalance(finalPrice) && cpf.length === 11 && (() => {
              const missingAmount = Math.max(finalPrice - totalBalance, 0.01);
              return (
                <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 overflow-hidden">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs font-semibold text-destructive">Saldo Insuficiente</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>R$ {totalBalance.toFixed(2)} / R$ {finalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="px-3 pb-3 pt-1 flex items-center gap-3">
                    <div className="flex-1 text-center rounded-md bg-primary/5 dark:bg-primary/10 border border-primary/20 py-1.5">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Faltam</p>
                      <p className="text-sm font-extrabold text-primary">R$ {missingAmount.toFixed(2)}</p>
                    </div>
                    <Button
                      onClick={async () => {
                        const pixData = await createPixPayment(missingAmount, userData);
                        if (pixData) {
                          setShowRechargePixModal(true);
                          // Toast com QR Code embutido (mesmo padrão do AdicionarSaldo)
                          const toastId = toast.info(
                            <div className="flex items-center gap-3">
                              {pixData.qr_code && (
                                <div className="flex-shrink-0 bg-white p-1.5 rounded border-2 border-green-500">
                                  <QRCode value={pixData.qr_code} size={70} />
                                </div>
                              )}
                              <div className="space-y-1.5">
                                <div>
                                  <p className="font-semibold text-sm">PIX Criado</p>
                                  <p className="text-xs text-muted-foreground">Escaneie ou copie o código</p>
                                </div>
                                <button
                                  onClick={() => {
                                    toast.dismiss(toastId);
                                    setShowRechargePixModal(false);
                                    toast.info('Pagamento cancelado');
                                  }}
                                  className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>,
                            {
                              duration: Infinity,
                              action: {
                                label: 'Ver QR Code',
                                onClick: () => setShowRechargePixModal(true)
                              },
                            }
                          );
                          setRechargeToastId(toastId);
                        }
                      }}
                      disabled={pixLoading}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md"
                      size="sm"
                    >
                      {pixLoading ? (
                        <div className="flex items-center gap-1.5">
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                          <span className="text-xs">Gerando...</span>
                        </div>
                      ) : (
                        <>
                          <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                          <span className="text-xs">Comprar Agora</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Card Consulta Personalizada (desktop apenas) */}
        {!isMobile && (
          <Card className="dark:bg-gray-800 dark:border-gray-700 w-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg sm:text-xl lg:text-2xl">
                <Settings className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Consulta Personalizada</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                  Escolha as informações desejadas e otimize seus créditos e resultados.
                </p>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 truncate">
                      Exclusivo para Assinantes
                    </span>
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 break-words">
                    Monte sua consulta personalizada selecionando apenas as seções que precisa
                  </p>
                </div>

                {hasActiveSubscription ? (
                  <Link to="/dashboard/consulta-personalizada">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                      <Settings className="mr-2 h-4 w-4" />
                      Acessar Consulta Personalizada
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-purple-600 border-purple-600 hover:bg-purple-50"
                      onClick={() => {
                        toast.info("Assine um plano para acessar a Consulta Personalizada", {
                          description: "Monte suas consultas e pague apenas pelos dados que precisa",
                          duration: 5000
                        });
                      }}
                    >
                      Ver Planos Disponíveis
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      {/* Resultado da Consulta */}
      {result && (() => {
        const scoreData = getScoreStatus(Number(result.score) || 0);

        const hasValue = (v: unknown) => {
          if (v === null || v === undefined) return false;
          if (typeof v === 'string') return v.trim().length > 0;
          if (typeof v === 'number') return !Number.isNaN(v);
          return true;
        };

        const hasDadosBasicos = [
          result.cpf,
          result.nome,
          result.data_nascimento,
          result.sexo,
          result.mae,
          result.nome_mae,
          result.pai,
          result.nome_pai,
          result.estado_civil,
          result.rg,
          result.cbo,
          result.orgao_emissor,
          result.uf_emissao,
          result.data_obito,
          result.renda,
          result.titulo_eleitor,
        ].some(hasValue);

        const hasTituloEleitor = [
          result.titulo_eleitor,
          result.zona,
          result.secao,
        ].some(hasValue);

        // (incompleta) — por enquanto, consideramos “tem dados” se algum campo financeiro vier preenchido
        const hasDadosFinanceiros = [
          result.aposentado,
          result.tipo_emprego,
          result.cbo,
          result.poder_aquisitivo,
          result.renda,
          result.fx_poder_aquisitivo,
        ].some(hasValue);

        const scoreCount = Number(result.score) > 0 ? 1 : 0;
        const csb8Count = (hasValue(result.csb8) || hasValue(result.csb8_faixa)) ? 1 : 0;
        const csbaCount = (hasValue(result.csba) || hasValue(result.csba_faixa)) ? 1 : 0;
        const dadosFinanceirosCount = hasDadosFinanceiros ? 1 : 0;
        const dadosBasicosCount = hasDadosBasicos ? 1 : 0;
        const tituloEleitorCount = hasTituloEleitor ? 1 : 0;

        const pisCount = (() => {
          const v = (result.pis ?? '').toString().trim();
          const upper = v.toUpperCase();
          if (!v || upper === '-' || upper === 'SEM RESULTADO' || upper === 'SEM DADOS') return 0;
          return 1;
        })();

        // Quando houver dados, usamos destaque sólido (sem transparência)
        const onlineCardClass = (hasData: boolean) =>
          hasData ? "border-success-border bg-success-subtle" : undefined;
        
        return (
        <div ref={resultRef} data-pdf-container className="space-y-6 w-full max-w-full overflow-hidden">
           {/* Header com status de sucesso e ações */}
          <Card className="border-success-border w-full overflow-hidden">
            <CardHeader className="bg-success-subtle p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center text-success-subtle-foreground min-w-0">
                  <CheckCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                  <span className="truncate text-base sm:text-lg">Sucesso</span>
                </CardTitle>
                 <div className="flex flex-shrink-0 justify-end">
                   <SectionActionButtons
                     getText={buildFullReportText}
                     filenameBase={`cpf-completo-${result.cpf}-${Date.now()}`}
                     pdf={{
                       headerTitle: "APIPAINEL.COM.BR",
                       headerSubtitle: "Relatório Completo de Consulta CPF",
                     }}
                     labels={{
                       copied: "Relatório completo copiado!",
                       exportedTxt: "Relatório completo exportado com sucesso!",
                     }}
                     visualContainerRef={resultRef}
                   />
                 </div>
              </div>
            </CardHeader>
            {!hideShortcutBadges && (
              <CardContent className="p-4 md:p-6 pt-3">
                {(() => {
                // Exibir somente as sessões marcadas como "Online" (atalhos do topo),
                // mantendo a mesma ordem em que as seções aparecem na página.
                 const onlineBadgesBase = [
                    { href: '#fotos-section', label: 'Fotos' },
                    { href: '#score-section', label: 'Score' },
                    { href: '#csb8-section', label: 'CSB8' },
                    { href: '#csba-section', label: 'CSBA' },
                   { href: '#dados-financeiros-section', label: 'Dados Financeiros' },
                  { href: '#dados-basicos-section', label: 'Dados Básicos' },
                  { href: '#telefones-section', label: 'Telefones' },
                  { href: '#emails-section', label: 'Emails' },
                  { href: '#enderecos-section', label: 'Endereços' },
                  { href: '#titulo-eleitor-section', label: 'Título de Eleitor' },
                  { href: '#parentes-section', label: 'Parentes' },
                  { href: '#certidao-nascimento-section', label: 'Certidão de Nascimento' },
                  { href: '#documento-section', label: 'Documento' },
                  { href: '#cns-section', label: 'CNS' },
                  { href: '#pis-section', label: 'PIS' },
                  { href: '#vacinas-section', label: 'Vacinas' },
                  { href: '#empresas-socio-section', label: 'Empresas Associadas (SÓCIO)' },
                  { href: '#cnpj-mei-section', label: 'CNPJ MEI' },
                  { href: '#dividas-ativas-section', label: 'Dívidas Ativas (SIDA)' },
                  { href: '#auxilio-emergencial-section', label: 'Auxílio Emergencial' },
                  { href: '#rais-section', label: 'Rais - Histórico de Emprego' },
                  { href: '#inss-section', label: 'INSS' },
                  { href: '#claro-section', label: 'Operadora Claro' },
                  { href: '#vivo-section', label: 'Operadora Vivo' },
                  { href: '#tim-section', label: 'Operadora TIM' },
                  { href: '#oi-section', label: 'Operadora OI' },
                  { href: '#senhas-email-section', label: 'Senhas de Email' },
                  { href: '#senhas-cpf-section', label: 'Senhas de CPF' },
                  { href: '#gestao-cadastral-section', label: 'Gestão Cadastral' },
                 ] as const;

                 const onlineBadges = isRestrictToBasicAndParentes
                   ? ([
                       { href: '#dados-basicos-section', label: 'Dados Básicos' },
                       { href: '#parentes-section', label: 'Parentes' },
                     ] as const)
                   : isRestrictToBasicAndCertidao
                   ? ([
                       { href: '#dados-basicos-section', label: 'Dados Básicos' },
                       { href: '#certidao-nascimento-section', label: 'Certidão de Nascimento' },
                     ] as const)
                   : onlineBadgesBase;

                 const badgeCounts: Record<string, number> = {
                   '#fotos-section': fotosCount,
                    '#score-section': scoreCount,
                    '#csb8-section': csb8Count,
                    '#csba-section': csbaCount,
                    '#dados-financeiros-section': dadosFinanceirosCount,
                    '#dados-basicos-section': dadosBasicosCount,
                   '#telefones-section': telefonesCount,
                   '#emails-section': emailsCount,
                   '#enderecos-section': enderecosCount,
                    '#titulo-eleitor-section': tituloEleitorCount,
                   '#parentes-section': parentesCount,
                    '#certidao-nascimento-section': certidaoNascimentoCount,
                    '#documento-section': documentoCount,
                   '#cns-section': cnsCount,
                    '#pis-section': pisCount,
                   '#vacinas-section': vacinasCount,
                   '#empresas-socio-section': empresasSocioCount,
                   '#cnpj-mei-section': cnpjMeiCount,
                   '#dividas-ativas-section': dividasAtivasCount,
                   '#auxilio-emergencial-section': auxiliosEmergenciais?.length ?? 0,
                   '#rais-section': rais?.length ?? 0,
                   '#inss-section': inssCount,
                   '#claro-section': claroCount,
                   '#vivo-section': vivoCount,
                   '#tim-section': timCount,
                   '#oi-section': oiCount,
                   '#senhas-email-section': senhaEmailCount,
                   '#senhas-cpf-section': senhaCpfCount,
                   '#gestao-cadastral-section': gestaoCount,
                 };

                const badgeClassName =
                  'bg-success text-success-foreground hover:bg-success/80 cursor-pointer transition-colors text-xs';

                return (
                  <div className="flex flex-wrap gap-2">
                      {onlineBadges
                        .filter((b) => (badgeCounts[b.href] ?? 0) > 0)
                        .map((b) => {
                       const count = badgeCounts[b.href] ?? 0;
                       return (
                       <a
                         key={b.href}
                         href={b.href}
                         className="no-underline"
                         onClick={(e) => {
                           e.preventDefault();
                           smoothScrollToHash(b.href, { duration: 250, offsetTop: 96 });
                         }}
                       >
                         <span className="relative inline-flex">
                           <Badge variant="secondary" className={badgeClassName}>
                             {b.label}
                           </Badge>
                           <span
                             className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-1 ring-background"
                             aria-label={`Quantidade de registros: ${count}`}
                           >
                             {count}
                           </span>
                         </span>
                      </a>
                     );
                     })}
                  </div>
                );
                })()}
              </CardContent>
            )}
          </Card>

          {((!isSlimMode) || (isExclusiveMode && showScoreCards)) && (
            <>
              {/* Fotos - Usando FotosSection para consistência */}
              {!isSlimMode && (
                <div id="fotos-section" className={fotosCount === 0 ? 'hidden' : ''}>
                  <FotosSection cpfId={result.id} cpfNumber={result.cpf} onCountChange={setFotosCount} />
                </div>
              )}

              {/* Score + CSB8 + CSBA (responsivo e compacto) */}
              {showScoreCards && (scoreCount > 0 || csb8Count > 0 || csbaCount > 0) && (
              <section className="mx-auto w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {scoreCount > 0 && (
                <Card id="score-section" className={onlineCardClass(hasValue(result.score))}>
                  <CardContent className="p-2 space-y-1">
                    <ScoreGaugeCard
                      title="SCORE"
                      score={result.score}
                      faixa={scoreData.label}
                      icon="chart"
                      compact
                      embedded
                      headerRight={
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const dados = [
                                `SCORE: ${result.score || '-'}`,
                                `FAIXA: ${scoreData.label || '-'}`,
                              ].join('\n');
                              navigator.clipboard.writeText(dados);
                              toast.success('Score copiado!');
                            }}
                            className="h-7 w-7"
                            title="Copiar dados da seção"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <div className="relative inline-flex">
                            <Badge variant="secondary" className="uppercase tracking-wide text-[9px]">
                              Online
                            </Badge>
                            {scoreCount > 0 ? (
                              <span
                                className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-1 ring-background"
                                aria-label={`Quantidade de registros Score: ${scoreCount}`}
                              >
                                {scoreCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      }
                    />
                  {scoreData.description !== 'Score baixo, precisa de atenção' && (
                    <p className="text-xs text-muted-foreground">{scoreData.description}</p>
                  )}
               </CardContent>
                </Card>
                )}

                {csb8Count > 0 && (
                <Card id="csb8-section" className={onlineCardClass(hasValue(result.csb8) || hasValue(result.csb8_faixa))}>
                  <CardContent className="p-2">
                    <ScoreGaugeCard
                      title="CSB8 [SCORE]"
                      score={result.csb8}
                      faixa={result.csb8_faixa}
                      icon="chart"
                      compact
                      embedded
                      headerRight={
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const dados = [
                                `CSB8: ${result.csb8 || '-'}`,
                                `FAIXA: CSB8 [SCORE]: ${result.csb8_faixa || '-'}`,
                              ].join('\n');
                              navigator.clipboard.writeText(dados);
                              toast.success('CSB8 copiado!');
                            }}
                            className="h-7 w-7"
                            title="Copiar dados da seção"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <div className="relative inline-flex">
                            <Badge variant="secondary" className="uppercase tracking-wide text-[9px]">
                              Online
                            </Badge>
                            {csb8Count > 0 ? (
                              <span
                                className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-1 ring-background"
                                aria-label={`Quantidade de registros CSB8: ${csb8Count}`}
                              >
                                {csb8Count}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      }
                    />
               </CardContent>
                </Card>
                )}

                {csbaCount > 0 && (
                <Card id="csba-section" className={onlineCardClass(hasValue(result.csba) || hasValue(result.csba_faixa))}>
                  <CardContent className="p-2">
                    <ScoreGaugeCard
                      title="CSBA [SCORE]"
                      score={result.csba}
                      faixa={result.csba_faixa}
                      icon="trending"
                      compact
                      embedded
                      headerRight={
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const dados = [
                                `CSBA: ${result.csba || '-'}`,
                                `FAIXA: CSBA [SCORE]: ${result.csba_faixa || '-'}`,
                              ].join('\n');
                              navigator.clipboard.writeText(dados);
                              toast.success('CSBA copiado!');
                            }}
                            className="h-7 w-7"
                            title="Copiar dados da seção"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <div className="relative inline-flex">
                            <Badge variant="secondary" className="uppercase tracking-wide text-[9px]">
                              Online
                            </Badge>
                            {csbaCount > 0 ? (
                              <span
                                className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-1 ring-background"
                                aria-label={`Quantidade de registros CSBA: ${csbaCount}`}
                              >
                                {csbaCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      }
                    />
               </CardContent>
                </Card>
                )}
              </section>

              )}

              {/* Dados Financeiros */}
              {!isSlimMode && hasDadosFinanceiros && (
              <Card id="dados-financeiros-section" className={onlineCardClass(hasDadosFinanceiros)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
                  <DollarSign className="h-5 w-5" />
                  Dados Financeiros
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const dados = [
                        `Poder Aquisitivo: ${result.poder_aquisitivo || '-'}`,
                        `Renda: ${formatRenda(result.renda) || '-'}`,
                        `Faixa Poder Aquisitivo: ${result.fx_poder_aquisitivo || '-'}`,
                      ].join('\n');
                      navigator.clipboard.writeText(dados);
                      toast.success('Dados financeiros copiados!');
                    }}
                    className="h-8 w-8"
                    title="Copiar dados da seção"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  <div className="relative inline-flex">
                    <Badge variant="secondary" className="uppercase tracking-wide">
                      Online
                    </Badge>
                    {dadosFinanceirosCount > 0 ? (
                      <span
                        className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-1 ring-background"
                        aria-label={`Quantidade de registros Dados Financeiros: ${dadosFinanceirosCount}`}
                      >
                        {dadosFinanceirosCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Outros dados financeiros */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <Label htmlFor="poder_aquisitivo">Poder Aquisitivo</Label>
                  <Input
                    id="poder_aquisitivo"
                    value={result.poder_aquisitivo || ''}
                    disabled
                    className="uppercase text-[14px] md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="renda">Renda</Label>
                  <Input
                    id="renda"
                    value={formatRenda(result.renda)}
                    disabled
                    className="text-[14px] md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="fx_poder_aquisitivo">Faixa Poder Aquisitivo</Label>
                  <Input
                    id="fx_poder_aquisitivo"
                    value={result.fx_poder_aquisitivo || ''}
                    disabled
                    className="uppercase text-[14px] md:text-sm"
                  />
                </div>
              </div>
            </CardContent>
              </Card>

              )}
            </>
          )}

          {showDadosBasicosSection && (
            <Card id="dados-basicos-section" className={onlineCardClass(hasDadosBasicos) ? `w-full ${onlineCardClass(hasDadosBasicos)}` : "w-full"}>
              <CardHeader className="p-4 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl min-w-0">
                    <User className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Dados Básicos</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const dados = [
                          `CPF: ${result.cpf ? result.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '-'}`,
                          `Nome: ${result.nome || '-'}`,
                          `Data de Nascimento: ${result.data_nascimento ? formatDateOnly(result.data_nascimento) : '-'}`,
                          `Sexo: ${result.sexo ? (result.sexo.toLowerCase() === 'm' ? 'Masculino' : result.sexo.toLowerCase() === 'f' ? 'Feminino' : result.sexo) : '-'}`,
                          `Nome da Mãe: ${(result.mae || result.nome_mae) || '-'}`,
                          `Nome do Pai: ${(result.pai || result.nome_pai) || '-'}`,
                          `Estado Civil: ${result.estado_civil || '-'}`,
                          `RG: ${result.rg || '-'}`,
                          `CBO: ${result.cbo || '-'}`,
                          `Órgão Emissor: ${result.orgao_emissor || '-'}`,
                          `UF Emissor: ${result.uf_emissao || '-'}`,
                          `Data de Óbito: ${result.data_obito ? new Date(result.data_obito).toLocaleDateString('pt-BR') : '-'}`,
                          `Renda: ${formatRenda(result.renda) || '-'}`,
                          `Título de Eleitor: ${result.titulo_eleitor || '-'}`,
                        ].join('\n');
                        navigator.clipboard.writeText(dados);
                        toast.success('Dados básicos copiados!');
                      }}
                      className="h-8 w-8"
                      title="Copiar dados da seção"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <div className="relative inline-flex">
                      <Badge variant="secondary" className="uppercase tracking-wide">
                        Online
                      </Badge>
                      {dadosBasicosCount > 0 ? (
                        <span
                          className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-1 ring-background"
                          aria-label={`Quantidade de registros Dados Básicos: ${dadosBasicosCount}`}
                        >
                          {dadosBasicosCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  <div>
                    <Label className="text-xs sm:text-sm" htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={result.cpf ? result.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''}
                      disabled
                      className="bg-muted uppercase text-[14px] md:text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs sm:text-sm" htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={result.nome || ''}
                      disabled
                      className="bg-muted uppercase text-[14px] md:text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm" htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      value={result.data_nascimento ? formatDateOnly(result.data_nascimento) : ''}
                      disabled
                      className="bg-muted text-[14px] md:text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm" htmlFor="sexo">Sexo</Label>
                    <Input
                      id="sexo"
                      value={(result.sexo
                        ? (result.sexo.toLowerCase() === 'm'
                          ? 'Masculino'
                          : result.sexo.toLowerCase() === 'f'
                            ? 'Feminino'
                            : result.sexo.toLowerCase() === 'i'
                              ? 'Indefinido'
                              : result.sexo)
                        : '').toUpperCase()}
                      disabled
                      className="bg-muted text-[14px] md:text-sm"
                    />
                  </div>

                  {result.mae || result.nome_mae ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="mae">Nome da Mãe</Label>
                      <Input
                        id="mae"
                        value={(result.mae || result.nome_mae) || ''}
                        disabled
                        className="bg-muted uppercase text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.pai || result.nome_pai ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="pai">Nome do Pai</Label>
                      <Input
                        id="pai"
                        value={(result.pai || result.nome_pai) || ''}
                        disabled
                        className="bg-muted uppercase text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.estado_civil ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="estado_civil">Estado Civil</Label>
                      <Input
                        id="estado_civil"
                        value={result.estado_civil || ''}
                        disabled
                        className="bg-muted uppercase text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.rg ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="rg">RG</Label>
                      <Input
                        id="rg"
                        value={result.rg || ''}
                        disabled
                        className="bg-muted uppercase text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.cbo ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="cbo">CBO</Label>
                      <Input
                        id="cbo"
                        value={result.cbo || ''}
                        disabled
                        className="bg-muted uppercase text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.orgao_emissor ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="orgao_emissor">Órgão Emissor</Label>
                      <Input
                        id="orgao_emissor"
                        value={result.orgao_emissor || ''}
                        disabled
                        className="bg-muted uppercase text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.uf_emissao ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="uf_emissao">UF Emissor</Label>
                      <Input
                        id="uf_emissao"
                        value={result.uf_emissao || ''}
                        disabled
                        className="bg-muted uppercase text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.data_obito ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="data_obito">Data Óbito</Label>
                      <Input
                        id="data_obito"
                        value={result.data_obito ? new Date(result.data_obito).toLocaleDateString('pt-BR') : ''}
                        disabled
                        className="bg-muted text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.renda ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="renda_basicos">Renda</Label>
                      <Input
                        id="renda_basicos"
                        value={formatRenda(result.renda)}
                        disabled
                        className="bg-muted text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}

                  {result.titulo_eleitor ? (
                    <div>
                      <Label className="text-xs sm:text-sm" htmlFor="titulo_eleitor_basicos">Título de Eleitor</Label>
                      <Input
                        id="titulo_eleitor_basicos"
                        value={result.titulo_eleitor || ''}
                        disabled
                        className="bg-muted uppercase text-[14px] md:text-sm"
                      />
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}

          {showTelefonesSection && (
            <div id="telefones-section" className={telefonesCount === 0 ? 'hidden' : ''}>
              <TelefonesSection cpfId={result.id} onCountChange={setTelefonesCount} />
            </div>
          )}

          {showEmailsSection && (
            <div id="emails-section" className={emailsCount === 0 ? 'hidden' : ''}>
              <EmailsSection cpfId={result.id} onCountChange={setEmailsCount} />
            </div>
          )}

          {showEnderecosSection && (
            <div id="enderecos-section" className={enderecosCount === 0 ? 'hidden' : ''}>
              <EnderecosSection cpfId={result.id} onCountChange={setEnderecosCount} />
            </div>
          )}

          {(!isSlimMode || isExclusiveMode) && showTituloEleitorSection && hasTituloEleitor && (
              <Card id="titulo-eleitor-section" className={onlineCardClass(hasTituloEleitor)}>
            <CardHeader className="p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl truncate">
                  <FileText className="h-5 w-5" />
                  Título de Eleitor
                </CardTitle>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const dados = [
                        `Título de Eleitor: ${result.titulo_eleitor || '-'}`,
                        `Zona: ${result.zona || '-'}`,
                        `Seção: ${result.secao || '-'}`,
                      ].join('\n');
                      navigator.clipboard.writeText(dados);
                      toast.success('Título de eleitor copiado!');
                    }}
                    className="h-8 w-8"
                    title="Copiar dados da seção"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  <div className="relative inline-flex">
                    <Badge variant="secondary" className="uppercase tracking-wide">
                      Online
                    </Badge>
                    {tituloEleitorCount > 0 ? (
                      <span
                        className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-1 ring-background"
                        aria-label={`Quantidade de registros Título de Eleitor: ${tituloEleitorCount}`}
                      >
                        {tituloEleitorCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs sm:text-sm" htmlFor="titulo_eleitor">Título de Eleitor</Label>
                  <Input
                    id="titulo_eleitor"
                    value={result.titulo_eleitor || ''}
                    disabled
                    className="bg-muted uppercase text-[14px] md:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm" htmlFor="zona">Zona</Label>
                  <Input
                    id="zona"
                    value={result.zona || ''}
                    disabled
                    className="bg-muted text-[14px] md:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm" htmlFor="secao">Seção</Label>
                  <Input
                    id="secao"
                    value={result.secao || ''}
                    disabled
                    className="bg-muted text-[14px] md:text-sm"
                  />
                </div>
              </div>
            </CardContent>
              </Card>
          )}

          {/* Parentes */}
          {!isRestrictToBasicAndCertidao && showParentesSection && (
            <div id="parentes-section" className={parentesCount === 0 ? 'hidden' : ''}>
              <ParentesSection cpfId={result.id} onCountChange={setParentesCount} />
            </div>
          )}

          {/* Certidão de Nascimento */}
          {(isRestrictToBasicAndCertidao || !isSlimMode) && (
            <div id="certidao-nascimento-section" className={certidaoNascimentoCount === 0 ? 'hidden' : ''}>
              <CertidaoNascimentoSection cpfId={result.id} onCountChange={setCertidaoNascimentoCount} />
            </div>
          )}

          {/* Documento (somente no Puxa Tudo) */}
          {!isSlimMode && (
            <div id="documento-section" className={documentoCount === 0 ? 'hidden' : ''}>
              <DocumentoSection cpfId={result.id} onCountChange={setDocumentoCount} />
            </div>
          )}

          {/* CNS */}
          {(!isSlimMode || isExclusiveMode) && showCnsSection && (
            <div id="cns-section" className={cnsCount === 0 ? 'hidden' : ''}>
              <CnsSection cpfId={result.id} onCountChange={setCnsCount} />
            </div>
          )}

          {/* PIS */}
          {(!isSlimMode || isExclusiveMode) && showPisSection && pisCount > 0 && (
            <div id="pis-section">
              <PisSection pis={result.pis} />
            </div>
          )}

          {/* Vacinas */}
          {(!isSlimMode || isExclusiveMode) && showVacinasSection && (
            <div id="vacinas-section" className={vacinasCount === 0 ? 'hidden' : ''}>
              <VacinaDisplay cpfId={result.id} onCountChange={setVacinasCount} />
            </div>
          )}

          {/* Empresas Associadas (SÓCIO) */}
          {(!isSlimMode || isExclusiveMode) && showEmpresasSocioSection && (
            <div id="empresas-socio-section" className={empresasSocioCount === 0 ? 'hidden' : ''}>
              <EmpresasSocioSection cpfId={result.id} onCountChange={setEmpresasSocioCount} />
            </div>
          )}

          {/* CNPJ MEI */}
          {(!isSlimMode || isExclusiveMode) && showCnpjMeiSection && (
            <div id="cnpj-mei-section" className={cnpjMeiCount === 0 ? 'hidden' : ''}>
              <CnpjMeiSection cpfId={result.id} onCountChange={setCnpjMeiCount} />
            </div>
          )}

          {/* Dívidas Ativas (SIDA) */}
          {(!isSlimMode || isExclusiveMode) && showDividasAtivasSection && (
            <div id="dividas-ativas-section" className={dividasAtivasCount === 0 ? 'hidden' : ''}>
              <DividasAtivasSection cpf={result.id.toString()} onCountChange={setDividasAtivasCount} />
            </div>
          )}

          {/* Auxílio Emergencial */}
          {(!isSlimMode || isExclusiveMode) && showAuxilioEmergencialSection && (auxiliosEmergenciais?.length ?? 0) > 0 && (
            <div id="auxilio-emergencial-section">
              <AuxilioEmergencialSection auxilios={auxiliosEmergenciais} />
            </div>
          )}

          {/* Rais - Histórico de Emprego */}
          {(!isSlimMode || isExclusiveMode) && showRaisSection && (rais?.length ?? 0) > 0 && (
            <div id="rais-section">
              <RaisSection data={rais} isLoading={raisLoading} />
            </div>
          )}

          {/* INSS */}
          {(!isSlimMode || isExclusiveMode) && showInssSection && (
            <div id="inss-section" className={inssCount === 0 ? 'hidden' : ''}>
              <InssSection cpfId={result.id} onCountChange={setInssCount} />
            </div>
          )}

          {/* Operadoras (somente no Puxa Tudo) */}
          {!isSlimMode && (
            <>
              <div id="claro-section" className={claroCount === 0 ? 'hidden' : ''}>
                <ClaroSection cpfId={result.id} onCountChange={setClaroCount} />
              </div>

              <div id="vivo-section" className={vivoCount === 0 ? 'hidden' : ''}>
                <VivoSection cpfId={result.id} onCountChange={setVivoCount} />
              </div>

              <div id="tim-section" className={timCount === 0 ? 'hidden' : ''}>
                <OperadoraTimSection cpfId={result.id} onCountChange={setTimCount} />
              </div>

              <div id="oi-section" className={oiCount === 0 ? 'hidden' : ''}>
                <OperadoraOiSection cpfId={result.id} onCountChange={setOiCount} />
              </div>
            </>
          )}

          {/* Senhas de Email */}
          {(!isSlimMode || isExclusiveMode) && showSenhasEmailSection && (
            <div id="senhas-email-section" className={senhaEmailCount === 0 ? 'hidden' : ''}>
              <SenhaEmailSection cpfId={result.id} onCountChange={setSenhaEmailCount} />
            </div>
          )}

          {/* Senhas do CPF */}
          {(!isSlimMode || isExclusiveMode) && showSenhasCpfSection && (
            <div id="senhas-cpf-section" className={senhaCpfCount === 0 ? 'hidden' : ''}>
              <SenhaCpfSection cpfId={result.id} onCountChange={setSenhaCpfCount} />
          </div>
          )}

          {/* Boletim de Ocorrência */}
          {(!isSlimMode || isExclusiveMode) && (
            <div id="boletim-ocorrencia-section" className={boCount === 0 ? 'hidden' : ''}>
              <BoletimOcorrenciaBoSection cpfId={result.id} onCountChange={setBoCount} />
            </div>
          )}

          {/* Gestão Cadastral (somente no Puxa Tudo) */}
          {!isSlimMode && (
            <div id="gestao-cadastral-section" className={gestaoCount === 0 ? 'hidden' : ''}>
              <GestaoSection cpfId={result.id} onCountChange={setGestaoCount} />
            </div>
          )}


        </div>
        );
      })()}

      {/* Últimas Consultas CPF */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className={`flex items-center ${isMobile ? 'text-base' : 'text-lg sm:text-xl lg:text-2xl'}`}>
              <FileText className={`mr-2 flex-shrink-0 ${isMobile ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
              <span className="truncate">Últimas Consultas</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recentConsultationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3 text-muted-foreground">Carregando consultas...</span>
            </div>
          ) : recentConsultations.length > 0 ? (
            <>
              {(() => {
                const formatCPF = (cpf: string) => {
                  if (!cpf || cpf === 'CPF consultado') return 'N/A';
                  const cleaned = cpf.replace(/\D/g, '');
                  if (cleaned.length === 11) {
                    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                  }
                  return cpf;
                };

                const formatFullDate = (dateString: string) => {
                  const date = new Date(dateString);
                  return date.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                };

                const handleLoadConsultation = (consultation: any) => {
                  // Exibir consulta na mesma tela sem cobrar novamente
                  if (consultation?.result_data) {
                    setResult(consultation.result_data);
                    setCpf(consultation.document);
                    setLoading(false);

                    // Buscar dados da Receita Federal se disponível
                    baseReceitaService.getByCpf(consultation.document).then((receitaResult) => {
                      if (receitaResult.success && receitaResult.data) {
                        setReceitaData(receitaResult.data);
                      }
                    });

                    // Scroll suave para a seção de resultados
                    setTimeout(() => {
                      resultRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }, 100);

                    toast.success('Consulta carregada do histórico (sem cobrança)', { duration: 2000 });
                  } else {
                    toast.error('Dados da consulta não disponíveis');
                  }
                };

                if (isMobile) {
                  return (
                    <div className="space-y-2">
                      {recentConsultations.map((consultation) => (
                        <button
                          key={consultation.id}
                          type="button"
                          onClick={() => handleLoadConsultation(consultation)}
                          className="w-full text-left rounded-md border border-border bg-card px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-mono text-xs truncate">
                                {formatCPF(consultation.document || '')}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {consultation.module_type || '-'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatFullDate(consultation.created_at)}
                              </div>
                            </div>

                            {/* No mobile: substituir "Concluída" por bolinha verde */}
                            <span
                              className={
                                consultation.status === 'completed'
                                  ? 'mt-0.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-success'
                                  : 'mt-0.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-muted'
                              }
                              aria-label={consultation.status === 'completed' ? 'Concluída' : 'Pendente'}
                              title={consultation.status === 'completed' ? 'Concluída' : 'Pendente'}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40 whitespace-nowrap">CPF</TableHead>
                        <TableHead className="min-w-[180px] whitespace-nowrap">Módulo</TableHead>
                        <TableHead className="min-w-[180px] whitespace-nowrap">Data e Hora</TableHead>
                        <TableHead className="w-28 text-right whitespace-nowrap">Valor</TableHead>
                        <TableHead className="w-28 text-center whitespace-nowrap">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentConsultations.map((consultation) => {
                        const consultationValue = consultation.cost || consultation.amount || 0;
                        const numericValue =
                          typeof consultationValue === 'string'
                            ? parseFloat(consultationValue.toString().replace(',', '.'))
                            : Number(consultationValue) || 0;

                        return (
                          <TableRow
                            key={consultation.id}
                            className="cursor-pointer"
                            onClick={() => handleLoadConsultation(consultation)}
                          >
                            <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                              {formatCPF(consultation.document || '')}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                              {consultation.module_type || '-'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                              {formatFullDate(consultation.created_at)}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm font-medium text-destructive whitespace-nowrap">
                              R$ {numericValue.toFixed(2).replace('.', ',')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={consultation.status === 'completed' ? 'secondary' : 'outline'}
                                className={
                                  consultation.status === 'completed'
                                    ? 'text-xs rounded-full bg-foreground text-background hover:bg-foreground/90'
                                    : 'text-xs rounded-full'
                                }
                              >
                                {consultation.status === 'completed' ? 'Concluída' : 'Pendente'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma consulta encontrada
              </h3>
              <p className="text-sm">
                Suas consultas realizadas aparecerão aqui
              </p>
            </div>
          )}
          
          {recentConsultations.length > 0 && (
            <div className="text-center pt-4 mt-4 border-t border-border">
              <Button 
                variant="outline" 
                size={isMobile ? "sm" : "sm"}
                onClick={() => navigate('/dashboard/historico-consultas-cpf')}
                className="text-primary border-primary hover:bg-muted"
              >
                <FileText className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                <span className={isMobile ? 'text-xs' : 'text-sm'}>
                  Ver Histórico Completo
                </span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="text-center">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary truncate">
                {statsLoading ? '...' : stats.today}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">Consultas Hoje</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="text-center">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary truncate">
                {statsLoading ? '...' : stats.total}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">Total de Consultas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="text-center">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-green-600 truncate">
                {statsLoading ? '...' : stats.completed}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">Concluídas</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="text-center">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary truncate">
                R$ {statsLoading ? '0,00' : stats.total_cost.toFixed(2)}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">Total Gasto</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultation Detail Dialog */}
      <ConsultationDetailDialog
        open={consultationDialogOpen}
        onOpenChange={setConsultationDialogOpen}
        consultation={selectedConsultation}
      />

      {/* Insufficient Balance Alert Dialog */}
      <AlertDialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Saldo Insuficiente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p className="text-base">
                Sua consulta foi concluída com sucesso! No entanto, seu saldo é insuficiente para realizar uma nova consulta.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                  📋 Sua consulta está salva!
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Você pode continuar visualizando seus resultados e histórico de consultas a qualquer momento.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setShowInsufficientBalanceDialog(false);
                    navigate('/dashboard/adicionar-saldo?fromModule=true');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  💰 Adicionar Saldo
                </Button>
                
                <Button
                  onClick={() => setShowInsufficientBalanceDialog(false)}
                  variant="outline"
                  className="w-full"
                >
                  Continuar Visualizando
                </Button>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal PIX para recarga rápida */}
      <PixQRCodeModal
        isOpen={showRechargePixModal}
        onClose={() => setShowRechargePixModal(false)}
        amount={Math.max(finalPrice - totalBalance, 0.01)}
        onPaymentConfirm={async () => {
          if (pixResponse?.payment_id) {
            const status = await checkPaymentStatus(pixResponse.payment_id);
            if (status === 'approved') {
              setShowRechargePixModal(false);
              reloadApiBalance();
              toast.success('Saldo creditado! Agora você pode consultar.');
            }
          }
        }}
        isProcessing={false}
        pixData={pixResponse}
        onGenerateNew={() => generateNewPayment(Math.max(finalPrice - totalBalance, 0.01), userData)}
      />

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
};

export default ConsultarCpfPuxaTudo;