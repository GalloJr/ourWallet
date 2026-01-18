# 📊 Migração de Investimentos

## O que mudou?

O sistema de investimentos foi completamente reformulado para suportar múltiplas transações por ativo.

### Sistema Antigo
- Um investimento = um registro com `amount` e `currentValue`
- Não havia histórico de operações
- Difícil adicionar novas compras/vendas

### Sistema Novo
- Um investimento = um ativo (ex: Vale3, Bitcoin)
- Cada compra/venda/dividendo é uma transação separada
- Cálculo automático de preço médio, lucro, rentabilidade

## Como os dados antigos aparecem?

**Os investimentos antigos ainda existem no banco de dados, mas:**
1. Eles não têm transações associadas
2. O novo sistema não exibe investimentos sem transações
3. Os dados antigos permanecem intactos no Firestore

## Opções de Migração

### Opção 1: Começar do Zero (Recomendado)
1. Anote os investimentos antigos (nome, valor)
2. Crie novos ativos no sistema
3. Adicione as operações (compras, vendas, dividendos)

**Vantagem:** Sistema limpo e organizado desde o início

### Opção 2: Migração Manual via Console
1. Acesse: https://console.firebase.google.com/project/our-wallet-14998929-dc6cf/firestore
2. Navegue para `investments`
3. Para cada investimento antigo:
   - Copie o `id` do documento
   - Acesse a collection `investment-transactions`
   - Crie um novo documento com:
     ```json
     {
       "investmentId": "[id do investment]",
       "type": "compra",
       "date": "2024-01-01T12:00:00.000Z",
       "quantity": 1,
       "price": [valor do amount],
       "currentPrice": [valor do currentValue],
       "notes": "Migração do sistema antigo",
       "createdAt": [timestamp atual]
     }
     ```

### Opção 3: Excluir Investimentos Antigos
Se você não precisa manter o histórico:

1. Acesse o Firestore Console
2. Navegue para `investments`
3. Delete os documentos antigos
4. Recadastre no novo sistema

## Estrutura dos Dados

### Collection: `investments`
```json
{
  "name": "Vale3",
  "ticker": "VALE3",
  "type": "acoes",
  "color": "blue",
  "uid": "[userId]",
  "createdAt": timestamp
}
```

### Collection: `investment-transactions`
```json
{
  "investmentId": "[investment document id]",
  "type": "compra|venda|dividendo",
  "date": timestamp,
  
  // Para compra/venda:
  "quantity": 100,
  "price": 65.50,
  "currentPrice": 65.50,
  
  // Para dividendo:
  "amount": 150.00,
  
  // Opcional:
  "notes": "Compra via XP Investimentos",
  "createdAt": timestamp
}
```

## Suporte

Se precisar de ajuda com a migração, entre em contato!
