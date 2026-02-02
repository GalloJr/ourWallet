import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { db, doc, getDoc, setDoc } from "../firebase.js";
import { showToast } from "./dialogs.js";

const veicaiConfig = {
    apiKey: "AIzaSyBX2KIqYKKmlEhjTvP5-F4GaR9shg6bEoA",
    authDomain: "studio-8071776082-3c93f.firebaseapp.com",
    projectId: "studio-8071776082-3c93f",
    storageBucket: "studio-8071776082-3c93f.firebasestorage.app",
    messagingSenderId: "237502597896",
    appId: "1:237502597896:web:8bae624f33404e2dacbabd"
};

let veicaiApp;
let veicaiFunctions;
let currentTenantId = null;

export function setupVeicAi(user) {
    if (!user) return;

    // Inicializar app secundário para o VeicAI
    if (!veicaiApp) {
        veicaiApp = initializeApp(veicaiConfig, "veicai");
        veicaiFunctions = getFunctions(veicaiApp, 'southamerica-east1');
    }

    const veicaiBtn = document.getElementById('veicai-btn');
    const veicaiModal = document.getElementById('veicai-modal');
    const veicaiForm = document.getElementById('veicai-form');
    const veicaiInput = document.getElementById('veicai-tenant-id');
    const categorySelect = document.getElementById('category');
    const transportFields = document.getElementById('transport-integration-fields');
    const vehicleSelect = document.getElementById('veicai-vehicle');
    const typeSelect = document.getElementById('veicai-type');
    const typeContainer = document.getElementById('veicai-type-container');

    if (veicaiBtn) {
        veicaiBtn.addEventListener('click', () => {
            veicaiModal.classList.remove('hidden');
            veicaiInput.value = currentTenantId || '';
        });
    }

    window.fecharModalVeicAi = () => {
        veicaiModal.classList.add('hidden');
    };

    if (veicaiForm) {
        veicaiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newId = veicaiInput.value.trim();
            try {
                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, { veicaiTenantId: newId }, { merge: true });
                currentTenantId = newId;
                showToast("ID de integração salvo!", "success");
                fecharModalVeicAi();
                if (currentTenantId) carregarVeiculos();
            } catch (err) {
                console.error("Erro ao salvar ID VeicAi:", err);
                showToast("Erro ao salvar ID.", "error");
            }
        });
    }

    // Carregar ID do Firestore
    carregarConfiguracao(user.uid);

    // Lógica do formulário de transação
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            if (categorySelect.value === 'transport' && currentTenantId) {
                transportFields.classList.remove('hidden');
                carregarVeiculos();
            } else {
                transportFields.classList.add('hidden');
            }
        });
    }

    if (vehicleSelect) {
        vehicleSelect.addEventListener('change', () => {
            if (vehicleSelect.value) {
                typeContainer.classList.remove('hidden');
            } else {
                typeContainer.classList.add('hidden');
                document.getElementById('veicai-fuel-fields').classList.add('hidden');
                document.getElementById('veicai-maintenance-fields').classList.add('hidden');
            }
        });
    }

    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            const fuelFields = document.getElementById('veicai-fuel-fields');
            const maintFields = document.getElementById('veicai-maintenance-fields');

            fuelFields.classList.add('hidden');
            maintFields.classList.add('hidden');

            if (typeSelect.value === 'fuel') {
                fuelFields.classList.remove('hidden');
            } else if (typeSelect.value === 'maintenance') {
                maintFields.classList.remove('hidden');
            }
        });
    }
}

async function carregarConfiguracao(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            currentTenantId = userDoc.data().veicaiTenantId || null;
            if (currentTenantId && document.getElementById('category')?.value === 'transport') {
                document.getElementById('transport-integration-fields').classList.remove('hidden');
                carregarVeiculos();
            }
        }
    } catch (err) {
        console.error("Erro ao carregar config VeicAi:", err);
    }
}

async function carregarVeiculos() {
    if (!currentTenantId || !veicaiFunctions) return;

    const vehicleSelect = document.getElementById('veicai-vehicle');
    if (!vehicleSelect) return;

    try {
        const listVehiclesFn = httpsCallable(veicaiFunctions, 'listVehicles');
        const result = await listVehiclesFn({ tenantId: currentTenantId });

        const vehicles = result.data || [];

        // Salvar valor atual para tentar re-selecionar
        const currentValue = vehicleSelect.value;

        vehicleSelect.innerHTML = '<option value="">Selecione um veículo...</option>';
        vehicles.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.marca} ${v.modelo} (${v.placa})`;
            if (v.id === currentValue) opt.selected = true;
            vehicleSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Erro ao carregar veículos do VeicAi:", err);
        // Se houver erro de permissão ou tenant inválido, talvez o ID esteja errado
        if (err.code === 'permission-denied' || err.code === 'invalid-argument') {
            showToast("ID de integração VeicAi inválido ou sem permissão.", "warning");
        }
    }
}

export async function sincronizarComVeicAi(transacao) {
    if (!currentTenantId || !veicaiFunctions) return;

    const vehicleId = document.getElementById('veicai-vehicle')?.value;
    const type = document.getElementById('veicai-type')?.value;

    if (!vehicleId || type === 'none') return;

    try {
        if (type === 'fuel') {
            const createFuelFn = httpsCallable(veicaiFunctions, 'createFuel');
            await createFuelFn({
                tenantId: currentTenantId,
                vehicleId: vehicleId,
                data: transacao.date,
                km: Number(document.getElementById('veicai-fuel-km').value),
                litros: Number(document.getElementById('veicai-fuel-liters').value),
                valor: Math.abs(transacao.amount),
                posto: document.getElementById('veicai-fuel-station').value
            });
            showToast("Abastecimento registrado no VeicAi!", "success");
        } else if (type === 'maintenance') {
            const createMaintenanceFn = httpsCallable(veicaiFunctions, 'createMaintenance');
            await createMaintenanceFn({
                tenantId: currentTenantId,
                vehicleId: vehicleId,
                dataRealizada: transacao.date,
                kmRealizada: Number(document.getElementById('veicai-maint-km').value),
                tipo: transacao.desc,
                custo: Math.abs(transacao.amount),
                fornecedor: document.getElementById('veicai-maint-provider').value,
                kmProxima: Number(document.getElementById('veicai-maint-next-km').value) || null,
                dataProxima: document.getElementById('veicai-maint-next-date').value || null
            });
            showToast("Manutenção registrada no VeicAi!", "success");
        }
    } catch (err) {
        console.error("Erro ao sincronizar com VeicAi:", err);
        showToast("Erro ao sincronizar com VeicAi: " + err.message, "error");
    }
}
