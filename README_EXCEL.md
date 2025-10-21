# 📊 Sincronização com Excel - Caixas

## 🎯 Funcionalidades Implementadas

### ✅ Sincronização Automática
- **Backup automático**: A cada alteração (criar, editar, excluir), os dados são automaticamente sincronizados e salvos em formato Excel no localStorage
- **Proteção contra perda de dados**: Mesmo que o navegador seja fechado inesperadamente, há um backup recente dos dados

### 📥 Exportar para Excel
- Botão **"📥 Baixar Excel"** no cabeçalho
- Gera um arquivo `.xlsx` com todas as caixas, subcaixas, conteúdos e itens
- Nome do arquivo inclui timestamp: `caixas_backup_YYYY-MM-DD.xlsx`
- Estrutura da planilha:
  - **Caixa #**: Número da caixa principal
  - **Nome da Caixa**: Nome da caixa principal
  - **Subcaixa #**: Número da subcaixa (se houver)
  - **Nome da Subcaixa**: Nome da subcaixa (se houver)
  - **Conteúdo**: Título do conteúdo
  - **Item**: Discriminação do item
  - **Quantidade**: Quantidade do item

### 📤 Importar do Excel
- Botão **"📤 Importar Excel"** no cabeçalho
- Permite restaurar dados a partir de um arquivo Excel exportado anteriormente
- **ATENÇÃO**: A importação substituirá todos os dados atuais
- Confirma antes de executar a operação

## 🔄 Como Funciona

### Fluxo de Sincronização Automática
```
Usuário faz alteração → save() → autoSyncToExcel() → 
Dados salvos no localStorage em formato Excel (base64)
```

### Estrutura dos Dados no Excel
Cada linha representa um item específico, com hierarquia completa:

```
Caixa # | Nome da Caixa | Subcaixa # | Nome da Subcaixa | Conteúdo | Item | Quantidade
1       | Cozinha      | 1          | Temperos        | Especiarias | Pimenta | 100g
1       | Cozinha      | 1          | Temperos        | Especiarias | Cominho | 50g
2       | Quarto       |            |                 | Roupas     | Camisa  | 5
```

## 💾 Backup e Recuperação

### Backup Automático (localStorage)
- **Chave**: `caixas:excel-backup`
- **Timestamp**: `caixas:excel-timestamp`
- Atualizado a cada alteração
- Persiste mesmo fechando o navegador

### Recuperação de Dados
1. **Pelo Excel**: Clique em "📥 Baixar Excel" para ter uma cópia local
2. **Importação**: Use "📤 Importar Excel" para restaurar de um arquivo
3. **localStorage**: Os dados ficam salvos automaticamente no navegador

## 🛠️ Tecnologias Utilizadas

- **SheetJS (xlsx)**: Biblioteca JavaScript para manipulação de arquivos Excel
- **CDN**: `https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js`
- **Formato**: XLSX (Excel 2007+)

## 📋 Casos de Uso

### Cenário 1: Backup Periódico
1. Trabalhe normalmente com o sistema
2. Periodicamente, clique em "📥 Baixar Excel"
3. Guarde o arquivo em local seguro (nuvem, HD externo)

### Cenário 2: Recuperação após Problema
1. Se perdeu os dados do navegador (localStorage limpo)
2. Clique em "📤 Importar Excel"
3. Selecione o arquivo de backup mais recente
4. Confirme a importação

### Cenário 3: Compartilhamento
1. Exporte os dados para Excel
2. Compartilhe o arquivo com outra pessoa
3. Ela pode importar no sistema dela

### Cenário 4: Análise Externa
1. Exporte para Excel
2. Abra no Microsoft Excel, Google Sheets, etc.
3. Faça análises, filtros, gráficos
4. (Opcional) Importe de volta alterações

## ⚠️ Observações Importantes

### Limitações
- A importação substitui **todos** os dados atuais
- Certifique-se de ter um backup antes de importar
- O formato do Excel deve seguir a estrutura esperada

### Boas Práticas
- ✅ Faça backups regulares clicando em "📥 Baixar Excel"
- ✅ Guarde arquivos Excel em locais seguros
- ✅ Nomeie versões importantes (ex: `caixas_antes_mudança.xlsx`)
- ✅ Teste a importação com uma cópia dos dados primeiro

### Compatibilidade
- ✅ Funciona em navegadores modernos (Chrome, Firefox, Edge, Safari)
- ✅ Arquivos Excel compatíveis com MS Office 2007+
- ✅ Compatível com Google Sheets, LibreOffice Calc
- ❌ Não funciona offline (precisa carregar biblioteca CDN na primeira vez)

## 🔐 Segurança e Privacidade

- Todos os dados ficam no navegador (localStorage)
- Nenhum dado é enviado para servidores externos
- A biblioteca SheetJS é carregada via CDN, mas não envia seus dados
- Arquivos Excel são gerados localmente no navegador

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador (F12)
2. Certifique-se que o navegador suporta localStorage
3. Verifique se a biblioteca SheetJS foi carregada corretamente
4. Teste com um arquivo Excel simples primeiro
