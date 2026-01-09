export function formatarMoedaInput(input) {
    let value = input.value;
    const isNegative = value.includes('-');

    // Remove tudo que não é dígito
    let cleanValue = value.replace(/\D/g, "");

    if (cleanValue === "") {
        input.value = isNegative ? "-" : "";
        return;
    }

    let numericValue = Number(cleanValue) / 100;
    if (isNegative) numericValue = -numericValue;

    input.value = numericValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

export function limparValorMoeda(valorString) {
    if (!valorString) return 0;
    if (typeof valorString === 'number') return valorString;

    // Remove pontos de milhar, substitui vírgula por ponto decimal
    // e mantém apenas dígitos, ponto decimal e o sinal de menos
    const cleanValue = valorString
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '');

    return Number(cleanValue) || 0;
}

export function formatarData(d) {
    try {
        const p = d.split('-');
        return `${p[2]}/${p[1]}/${p[0]}`;
    } catch {
        return d;
    }
}

export function showToast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = "bg-emerald-500 text-white px-4 py-3 rounded shadow flex items-center gap-2 toast-enter";
    t.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> ${msg}`;
    c.appendChild(t);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => t.remove(), 3000);
}
