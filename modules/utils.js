export function formatarMoedaInput(input) {
    let value = input.value.replace(/\D/g, "");
    value = (Number(value) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    input.value = value;
}

export function limparValorMoeda(valorString) {
    if (!valorString) return 0;
    if (typeof valorString === 'number') return valorString;
    return Number(valorString.replace(/\./g, '').replace(',', '.').replace('R$', '').trim());
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
