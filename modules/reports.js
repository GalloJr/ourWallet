import { categoryConfig } from './constants.js';
import { formatarData } from './utils.js';
import { showToast } from './dialogs.js';

// Configuração da API do Gemini (Free Tier)
const GEMINI_API_KEY = 'AIzaSyDPFo6fh7Rr-rphz_vBZJr0RJQmBx4Yq0E';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Gera relatório mensal completo com análise de IA
 */
export async function gerarRelatorioMensalIA(transactions, cards, accounts, goals, mes, ano, userName) {
    try {
        showToast("🤖 Gerando relatório com IA... Aguarde (pode levar até 30s)");
        
        // Filtra transações do mês
        const transacoesMes = transactions.filter(t => {
            const data = new Date(t.date);
            return data.getMonth() + 1 === mes && data.getFullYear() === ano;
        });

        if (transacoesMes.length === 0) {
            showToast("⚠️ Nenhuma transação encontrada para este período");
            return;
        }

        // Prepara dados
        const dadosFinanceiros = prepararDadosFinanceiros(transacoesMes, cards, accounts, goals);
        
        // Gera análise com IA
        const analiseIA = await gerarAnaliseComGemini(dadosFinanceiros, mes, ano);
        
        // Gera gráficos
        const graficos = await gerarGraficosParaPDF(dadosFinanceiros);
        
        // Gera PDF
        await gerarPDFRelatorio(dadosFinanceiros, analiseIA, graficos, mes, ano, userName);
        
        showToast("✅ Relatório gerado com sucesso!");
    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        showToast("❌ Erro ao gerar relatório: " + error.message);
    }
}

/**
 * Prepara dados financeiros para análise
 */
function prepararDadosFinanceiros(transacoes, cards, accounts, goals) {
    const transacoesSemTransfer = transacoes.filter(t => t.category !== 'transfer' && !t.isTransfer);
    // Calcula totais
    const totalReceitas = transacoesSemTransfer
        .filter(t => t.amount >= 0)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalDespesas = transacoesSemTransfer
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const saldo = totalReceitas - totalDespesas;
    
    // Agrupa por categoria (APENAS DESPESAS)
    const porCategoria = {};
    transacoesSemTransfer
        .filter(t => t.amount < 0) // Apenas despesas
        .forEach(t => {
            const cat = t.category;
            if (!porCategoria[cat]) {
                porCategoria[cat] = {
                    nome: categoryConfig[cat]?.label || cat,
                    total: 0,
                    quantidade: 0,
                    transacoes: []
                };
            }
            porCategoria[cat].total += Math.abs(t.amount);
            porCategoria[cat].quantidade++;
            porCategoria[cat].transacoes.push(t);
        });
    
    // Ordena categorias por valor
    const categorias = Object.values(porCategoria)
        .sort((a, b) => b.total - a.total);
    
    // Gastos por fonte
    const porFonte = {};
    transacoesSemTransfer.forEach(t => {
        let fonte = 'Carteira';
        if (t.source && t.source !== 'wallet') {
            const card = cards?.find(c => c.id === t.source);
            const account = accounts?.find(a => a.id === t.source);
            fonte = card ? card.name : (account ? account.name : 'Desconhecido');
        }
        porFonte[fonte] = (porFonte[fonte] || 0) + Math.abs(t.amount);
    });
    
    // Gastos por responsável (APENAS DESPESAS)
    const porPessoa = {};
    transacoesSemTransfer
        .filter(t => t.amount < 0) // Apenas despesas
        .forEach(t => {
            const pessoa = t.ownerName || 'Não identificado';
            porPessoa[pessoa] = (porPessoa[pessoa] || 0) + Math.abs(t.amount);
        });
    
    // Maiores transações
    const maioresDespesas = transacoesSemTransfer
        .filter(t => t.amount < 0)
        .sort((a, b) => a.amount - b.amount)
        .slice(0, 5);
    
    const maioresReceitas = transacoesSemTransfer
        .filter(t => t.amount >= 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    
    // Status de metas
    const metasAtivas = goals?.filter(g => !g.reached) || [];
    
    return {
        totalReceitas,
        totalDespesas,
        saldo,
        categorias,
        porFonte,
        porPessoa,
        maioresDespesas,
        maioresReceitas,
        totalTransacoes: transacoesSemTransfer.length,
        metasAtivas,
        transacoes: transacoesSemTransfer
    };
}

/**
 * Gera análise inteligente usando Gemini AI
 */
async function gerarAnaliseComGemini(dados, mes, ano) {
    const prompt = `
Você é um consultor financeiro experiente e educador. Analise os seguintes dados financeiros de um casal e gere insights educativos e práticos.

**DADOS DO PERÍODO: ${obterNomeMes(mes)}/${ano}**

📊 **Resumo Financeiro:**
- Receitas Totais: R$ ${dados.totalReceitas.toFixed(2)}
- Despesas Totais: R$ ${dados.totalDespesas.toFixed(2)}
- Saldo do Mês: R$ ${dados.saldo.toFixed(2)}
- Total de Transações: ${dados.totalTransacoes}

💳 **Distribuição por Categoria (Top 5):**
${dados.categorias.slice(0, 5).map((c, i) => 
    `${i + 1}. ${c.nome}: R$ ${c.total.toFixed(2)} (${((c.total / dados.totalDespesas) * 100).toFixed(1)}%)`
).join('\n')}

👥 **Gastos por Pessoa:**
${Object.entries(dados.porPessoa).map(([nome, valor]) => 
    `- ${nome}: R$ ${valor.toFixed(2)}`
).join('\n')}

🎯 **Metas Ativas:**
${dados.metasAtivas.length > 0 
    ? dados.metasAtivas.map(m => `- ${m.description}: R$ ${m.saved.toFixed(2)} de R$ ${m.target.toFixed(2)} (${((m.saved / m.target) * 100).toFixed(1)}%)`).join('\n')
    : 'Nenhuma meta ativa no momento'
}

**GERE UM RELATÓRIO COM AS SEGUINTES SEÇÕES (use exatamente estes títulos):**

## 📝 Resumo Executivo
[Escreva 2-3 frases resumindo a saúde financeira do mês de forma clara e objetiva]

## 💡 Insights Principais
[Liste 4 insights numerados sobre padrões de gastos, comportamentos identificados e pontos de atenção]

## ⚠️ Alertas e Recomendações
[Liste 2-3 alertas importantes ou recomendações urgentes]

## 💰 Oportunidades de Economia
[Sugira 3 ações práticas e específicas para reduzir gastos, baseadas nos dados]

## 📈 Análise de Performance
[Compare com um mês "típico" e avalie se o desempenho foi bom, regular ou precisa melhorar]

## 🎓 Dica de Educação Financeira
[Explique 1 conceito de educação financeira relevante ao comportamento observado]

## 🎯 Sugestões para Próximo Mês
[Dê 3 sugestões práticas e alcançáveis para o próximo mês]

**IMPORTANTE:**
- Use linguagem amigável, motivadora e não julgadora
- Seja específico e quantitativo quando possível
- Contextualize com os dados apresentados
- Use emojis para deixar mais visual
- Mantenha um tom educativo e encorajador
`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Erro na API Gemini: ${response.status}`);
        }

        const result = await response.json();
        const textoAnalise = result.candidates[0].content.parts[0].text;
        
        return parseAnaliseIA(textoAnalise);
    } catch (error) {
        console.error("Erro ao chamar Gemini API:", error);
        return gerarAnaliseDefault(dados);
    }
}

/**
 * Parse da resposta da IA em seções
 */
function parseAnaliseIA(texto) {
    const secoes = {
        resumo: '',
        insights: [],
        alertas: [],
        economia: [],
        performance: '',
        educacao: '',
        sugestoes: []
    };

    try {
        const linhas = texto.split('\n');
        let secaoAtual = '';
        let conteudo = [];

        linhas.forEach(linha => {
            linha = linha.trim();
            
            if (linha.includes('Resumo Executivo')) {
                if (secaoAtual) processarSecao(secaoAtual, conteudo, secoes);
                secaoAtual = 'resumo';
                conteudo = [];
            } else if (linha.includes('Insights Principais')) {
                if (secaoAtual) processarSecao(secaoAtual, conteudo, secoes);
                secaoAtual = 'insights';
                conteudo = [];
            } else if (linha.includes('Alertas')) {
                if (secaoAtual) processarSecao(secaoAtual, conteudo, secoes);
                secaoAtual = 'alertas';
                conteudo = [];
            } else if (linha.includes('Oportunidades de Economia')) {
                if (secaoAtual) processarSecao(secaoAtual, conteudo, secoes);
                secaoAtual = 'economia';
                conteudo = [];
            } else if (linha.includes('Análise de Performance')) {
                if (secaoAtual) processarSecao(secaoAtual, conteudo, secoes);
                secaoAtual = 'performance';
                conteudo = [];
            } else if (linha.includes('Educação Financeira')) {
                if (secaoAtual) processarSecao(secaoAtual, conteudo, secoes);
                secaoAtual = 'educacao';
                conteudo = [];
            } else if (linha.includes('Sugestões para Próximo Mês')) {
                if (secaoAtual) processarSecao(secaoAtual, conteudo, secoes);
                secaoAtual = 'sugestoes';
                conteudo = [];
            } else if (linha && !linha.startsWith('#')) {
                conteudo.push(linha);
            }
        });

        if (secaoAtual) processarSecao(secaoAtual, conteudo, secoes);
    } catch (e) {
        console.error("Erro ao parsear análise:", e);
    }

    return secoes;
}

function processarSecao(tipo, conteudo, secoes) {
    const texto = conteudo.join('\n').trim();
    
    if (tipo === 'resumo' || tipo === 'performance' || tipo === 'educacao') {
        secoes[tipo] = texto;
    } else {
        const items = texto.split('\n').filter(l => l.match(/^[\d\-\*•]/) || l.length > 10);
        secoes[tipo] = items.map(i => i.replace(/^[\d\-\*•\.\)]\s*/, '').trim());
    }
}

/**
 * Análise padrão caso a IA falhe
 */
function gerarAnaliseDefault(dados) {
    const taxaEconomia = ((dados.saldo / dados.totalReceitas) * 100).toFixed(1);
    
    return {
        resumo: `Neste mês, você teve um saldo ${dados.saldo >= 0 ? 'positivo' : 'negativo'} de R$ ${Math.abs(dados.saldo).toFixed(2)}, com uma taxa de economia de ${taxaEconomia}%.`,
        insights: [
            `Maior categoria de gastos: ${dados.categorias[0]?.nome} com R$ ${dados.categorias[0]?.total.toFixed(2)}`,
            `Total de ${dados.totalTransacoes} transações registradas`,
            `Relação receitas/despesas: ${(dados.totalReceitas / dados.totalDespesas).toFixed(2)}x`,
            `Taxa de economia: ${taxaEconomia}%`
        ],
        alertas: [
            dados.saldo < 0 ? '⚠️ Atenção: Gastos superaram receitas este mês' : '✅ Parabéns! Conseguiu economizar este mês'
        ],
        economia: [
            `Revise gastos com ${dados.categorias[0]?.nome}`,
            'Estabeleça um orçamento mensal por categoria',
            'Considere reduzir despesas não essenciais'
        ],
        performance: `Taxa de economia de ${taxaEconomia}%. ${dados.saldo >= 0 ? 'Continue assim!' : 'Precisa ajustar gastos.'}`,
        educacao: 'A regra 50-30-20 sugere: 50% para necessidades, 30% para desejos e 20% para poupança.',
        sugestoes: [
            'Estabeleça um orçamento para o próximo mês',
            'Revise assinaturas e serviços recorrentes',
            'Defina uma meta de economia mensal'
        ]
    };
}

/**
 * Gera gráficos como imagens base64
 */
async function gerarGraficosParaPDF(dados) {
    const graficos = {};

    try {
        if (dados.categorias.length > 0) {
            graficos.categoriasChart = await criarGraficoPizza(dados.categorias.slice(0, 6));
        }
        
        if (Object.keys(dados.porPessoa).length > 0) {
            graficos.pessoasChart = await criarGraficoBarras(dados.porPessoa);
        }
    } catch (error) {
        console.error("Erro ao gerar gráficos:", error);
    }

    return graficos;
}

async function criarGraficoPizza(categorias) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    
    const ctx = canvas.getContext('2d');
    
    const cores = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    
    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categorias.map(c => c.nome),
            datasets: [{
                data: categorias.map(c => c.total),
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 14 },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: 'Distribuição de Gastos por Categoria',
                    font: { size: 18, weight: 'bold' }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 12 },
                    formatter: (value, ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return percentage + '%';
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    
    return canvas.toDataURL('image/png');
}

async function criarGraficoBarras(porPessoa) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    
    const ctx = canvas.getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(porPessoa),
            datasets: [{
                label: 'Gastos (R$)',
                data: Object.values(porPessoa),
                backgroundColor: '#6366f1',
                borderRadius: 8
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Gastos por Responsável',
                    font: { size: 18, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => 'R$ ' + value.toFixed(0)
                    }
                }
            }
        }
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    
    return canvas.toDataURL('image/png');
}

/**
 * Gera PDF final com pdfmake
 */
async function gerarPDFRelatorio(dados, analise, graficos, mes, ano, userName) {
    const mesNome = obterNomeMes(mes);
    const taxaEconomia = ((dados.saldo / dados.totalReceitas) * 100).toFixed(1);
    
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        info: {
            title: `Relatório Financeiro - ${mesNome}/${ano}`,
            author: 'OurWallet',
            subject: 'Análise Financeira Mensal'
        },
        
        content: [
            // CAPA
            { text: 'OurWallet', style: 'logo', color: '#6366f1', margin: [0, 0, 0, 10] },
            { text: 'Relatório Financeiro Mensal', style: 'header', margin: [0, 0, 0, 5] },
            { text: `${mesNome} de ${ano}`, style: 'subheader', color: '#6b7280', margin: [0, 0, 0, 10] },
            { text: `Gerado para: ${userName || 'Usuário'}`, style: 'normal', color: '#9ca3af', margin: [0, 0, 0, 5] },
            { text: `Data: ${formatarData(new Date().toISOString().split('T')[0])}`, style: 'normal', color: '#9ca3af', margin: [0, 0, 0, 30] },
            
            // CARD DE RESUMO
            {
                canvas: [
                    { type: 'rect', x: 0, y: 0, w: 515, h: 120, r: 8, color: '#f3f4f6' }
                ]
            },
            {
                absolutePosition: { x: 50, y: 235 },
                stack: [
                    {
                        columns: [
                            { width: '*', stack: [
                                { text: '💰 Receitas', style: 'cardLabel' },
                                { text: `R$ ${dados.totalReceitas.toFixed(2)}`, style: 'cardValue', color: '#10b981' }
                            ]},
                            { width: '*', stack: [
                                { text: '💸 Despesas', style: 'cardLabel' },
                                { text: `R$ ${dados.totalDespesas.toFixed(2)}`, style: 'cardValue', color: '#ef4444' }
                            ]},
                            { width: '*', stack: [
                                { text: '📊 Saldo', style: 'cardLabel' },
                                { text: `R$ ${dados.saldo.toFixed(2)}`, style: 'cardValue', color: dados.saldo >= 0 ? '#6366f1' : '#ef4444' }
                            ]}
                        ]
                    },
                    {
                        columns: [
                            { width: '*', stack: [
                                { text: '📝 Transações', style: 'cardLabel', margin: [0, 10, 0, 0] },
                                { text: dados.totalTransacoes.toString(), style: 'cardValue' }
                            ]},
                            { width: '*', stack: [
                                { text: '💹 Taxa Economia', style: 'cardLabel', margin: [0, 10, 0, 0] },
                                { text: `${taxaEconomia}%`, style: 'cardValue' }
                            ]},
                            { width: '*', text: '' }
                        ]
                    }
                ]
            },
            
            { text: '', pageBreak: 'after', margin: [0, 130, 0, 0] },
            
            // RESUMO EXECUTIVO
            { text: '📝 Resumo Executivo', style: 'sectionTitle', margin: [0, 0, 0, 15] },
            { text: analise.resumo || 'Análise não disponível', style: 'normal', margin: [0, 0, 0, 20] },
            
            // INSIGHTS PRINCIPAIS
            { text: '💡 Insights Principais', style: 'sectionTitle', margin: [0, 0, 0, 15] },
            {
                ul: analise.insights.length > 0 ? analise.insights : ['Nenhum insight disponível'],
                style: 'listItem',
                margin: [0, 0, 0, 20]
            },
            
            // GRÁFICOS
            { text: '📊 Análise Visual', style: 'sectionTitle', margin: [0, 0, 0, 15], pageBreak: 'before' },
            graficos.categoriasChart ? {
                image: graficos.categoriasChart,
                width: 500,
                alignment: 'center',
                margin: [0, 0, 0, 20]
            } : { text: 'Gráfico não disponível', margin: [0, 0, 0, 20] },
            
            graficos.pessoasChart ? {
                image: graficos.pessoasChart,
                width: 500,
                alignment: 'center',
                margin: [0, 0, 0, 20]
            } : {},
            
            // ALERTAS
            { text: '⚠️ Alertas e Recomendações', style: 'sectionTitle', margin: [0, 20, 0, 15], pageBreak: 'before' },
            {
                ul: analise.alertas.length > 0 ? analise.alertas : ['Nenhum alerta no momento'],
                style: 'listItem',
                margin: [0, 0, 0, 20]
            },
            
            // OPORTUNIDADES DE ECONOMIA
            { text: '💰 Oportunidades de Economia', style: 'sectionTitle', margin: [0, 0, 0, 15] },
            {
                ul: analise.economia.length > 0 ? analise.economia : ['Sem sugestões no momento'],
                style: 'listItem',
                margin: [0, 0, 0, 20]
            },
            
            // PERFORMANCE
            { text: '📈 Análise de Performance', style: 'sectionTitle', margin: [0, 0, 0, 15] },
            { text: analise.performance || 'Análise não disponível', style: 'normal', margin: [0, 0, 0, 20] },
            
            // EDUCAÇÃO FINANCEIRA
            { text: '🎓 Dica de Educação Financeira', style: 'sectionTitle', margin: [0, 0, 0, 15], pageBreak: 'before' },
            { text: analise.educacao || 'Sem dica disponível', style: 'normal', margin: [0, 0, 0, 20] },
            
            // SUGESTÕES
            { text: '🎯 Sugestões para Próximo Mês', style: 'sectionTitle', margin: [0, 0, 0, 15] },
            {
                ul: analise.sugestoes.length > 0 ? analise.sugestoes : ['Continue acompanhando seus gastos'],
                style: 'listItem',
                margin: [0, 0, 0, 30]
            },
            
            // RODAPÉ
            {
                text: [
                    { text: '✨ Gerado por ', color: '#9ca3af' },
                    { text: 'OurWallet', bold: true, color: '#6366f1' },
                    { text: ' - Finanças em Casal\n', color: '#9ca3af' },
                    { text: 'Continue acompanhando suas finanças para alcançar seus objetivos! 🚀', color: '#9ca3af' }
                ],
                alignment: 'center',
                style: 'footer'
            }
        ],
        
        styles: {
            logo: { fontSize: 28, bold: true },
            header: { fontSize: 24, bold: true },
            subheader: { fontSize: 18, bold: true },
            sectionTitle: { fontSize: 16, bold: true, color: '#1f2937' },
            normal: { fontSize: 11, lineHeight: 1.5 },
            listItem: { fontSize: 10, lineHeight: 1.6 },
            cardLabel: { fontSize: 9, color: '#6b7280', margin: [0, 0, 0, 3] },
            cardValue: { fontSize: 18, bold: true },
            footer: { fontSize: 9, lineHeight: 1.4 }
        },
        
        defaultStyle: {
            font: 'Roboto'
        }
    };

    pdfMake.createPdf(docDefinition).download(`relatorio-ourwallet-${mesNome}-${ano}.pdf`);
}

/**
 * Auxiliar: obtém nome do mês
 */
function obterNomeMes(mes) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return meses[mes - 1] || 'Mês';
}
