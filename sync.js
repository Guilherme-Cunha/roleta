import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getDatabase, ref, set, update, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCdnTHJPV1Ce0T4wVVF9Lhy1yOmM8YHfwU",
    authDomain: "piloto-1526f.firebaseapp.com",
    databaseURL: "https://piloto-1526f.firebaseio.com",
    projectId: "piloto-1526f",
    storageBucket: "piloto-1526f.firebasestorage.app",
    messagingSenderId: "746437052107",
    appId: "1:746437052107:web:bb80ce75617bd321a2fd4e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const estadoRef = ref(db, 'roleta/estado');
const hostRef = ref(db, 'roleta/host');

const HEARTBEAT_MS = 10000;
const DEBOUNCE_MS = 250;

let uid = null;
let anfitriaoAtivo = false;
let heartbeat = null;
let debounceTimer = null;
let espectadorIniciado = false;

// Relógio do servidor: todos os clientes calculam o giro na mesma linha do tempo
onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    window.definirOffsetServidor(snap.val() || 0);
});

let marcarConectado;
const conectado = new Promise((resolve) => { marcarConectado = resolve; });

onValue(ref(db, '.info/connected'), async (snap) => {
    if (!snap.val()) return;
    marcarConectado();
    // Reconexão: o servidor apaga o host ao detectar a queda, então reassume a presença
    if (anfitriaoAtivo) {
        try {
            await onDisconnect(hostRef).remove();
            await set(hostRef, dadosHost());
        } catch (erro) {
            perderAnfitriao(erro);
        }
    }
});

const dadosHost = () => ({ uid, lastSeen: serverTimestamp() });
const estadoSerializado = () => JSON.parse(JSON.stringify(window.obterEstado()));

// ESPECTADOR: somente leitura — renderiza exatamente o estado publicado pelo anfitrião
function iniciarEspectador() {
    if (espectadorIniciado) return;
    espectadorIniciado = true;
    onValue(estadoRef, (snap) => window.aplicarEstadoRemoto(snap.val()));
}

// ANFITRIÃO: ao abrir, assume o controle e zera o banco com os dados padrão
window.publicarEstado = () => {};

async function iniciarAnfitriao() {
    try {
        uid = (await signInAnonymously(getAuth(app))).user.uid;
        await conectado;

        await update(ref(db, 'roleta'), {
            host: dadosHost(),
            estado: estadoSerializado(),
            // nós do modelo antigo
            nomes: null,
            fecharModal: null
        });
        await onDisconnect(hostRef).remove();
    } catch (erro) {
        console.error('Falha ao assumir como anfitrião:', erro);
        window.showToast('⚠️ Não foi possível assumir como anfitrião (já existe outro ativo ou o acesso foi negado). Entrando como espectador.', 'warning', 8000);
        window.entrarModoEspectador();
        iniciarEspectador();
        return;
    }

    anfitriaoAtivo = true;

    window.publicarEstado = ({ adiar = false } = {}) => {
        if (!anfitriaoAtivo) return;
        clearTimeout(debounceTimer);
        const enviar = () => set(estadoRef, estadoSerializado()).catch(perderAnfitriao);
        if (adiar) {
            debounceTimer = setTimeout(enviar, DEBOUNCE_MS);
        } else {
            enviar();
        }
    };

    heartbeat = setInterval(() => {
        set(hostRef, dadosHost()).catch(perderAnfitriao);
    }, HEARTBEAT_MS);
}

function perderAnfitriao(erro) {
    if (!anfitriaoAtivo) return;
    console.error('Controle da roleta perdido:', erro);
    anfitriaoAtivo = false;
    clearInterval(heartbeat);
    clearTimeout(debounceTimer);
    window.showToast('⚠️ Outro anfitrião assumiu a roleta. Você agora é espectador.', 'warning', 8000);
    window.entrarModoEspectador();
    iniciarEspectador();
}

if (window.isViewer) {
    iniciarEspectador();
} else {
    iniciarAnfitriao();
}

// Botão "Link Espectador"
const shareBtn = document.getElementById('shareViewerBtn');
if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const viewerUrl = `${window.location.origin}${window.location.pathname}?role=viewer`;
        try {
            await navigator.clipboard.writeText(viewerUrl);
            window.showToast('🔗 Link de espectador copiado! Envie para quem vai assistir.', 'success');
        } catch {
            window.prompt('Copie o link de espectador:', viewerUrl);
        }
    });
}
