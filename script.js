// MODO: anfitrião (padrão) ou espectador (?role=viewer)
window.isViewer = new URLSearchParams(window.location.search).get('role') === 'viewer';
document.body.classList.toggle('viewer', window.isViewer);

// Relógio do servidor (definido por sync.js) — mantém todos os clientes na mesma linha do tempo
let offsetServidor = 0;
window.definirOffsetServidor = (ms) => { offsetServidor = ms || 0; };
const agora = () => Date.now() + offsetServidor;

// FUNDO "MATRIX"
const canvasBg = document.getElementById("matrixCanvas");
const ctxBg = canvasBg.getContext("2d", { alpha: false });

let allParticles = [];
let fireworksAnimation = null;

canvasBg.height = window.innerHeight;
canvasBg.width = window.innerWidth;

const letters = "イエス・キリストは昨日も今日も永遠に同じである".split("");
const matrixFontSize = 14;
const drops = Array(Math.floor(canvasBg.width / matrixFontSize)).fill(1);

function resizeMatrixCanvas() {
    canvasBg.width = window.innerWidth;
    canvasBg.height = window.innerHeight;

    const targetColumns = Math.floor(canvasBg.width / matrixFontSize);
    if (targetColumns > drops.length) {
        while (drops.length < targetColumns) drops.push(1);
    } else {
        drops.length = targetColumns;
    }
}

window.addEventListener('resize', resizeMatrixCanvas);

function drawMatrix() {
    if (document.hidden) return;
    ctxBg.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctxBg.fillRect(0, 0, canvasBg.width, canvasBg.height);

    ctxBg.fillStyle = "#0F0";
    ctxBg.font = matrixFontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctxBg.fillText(text, i * matrixFontSize, drops[i] * matrixFontSize);
        if (drops[i] * matrixFontSize > canvasBg.height || Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(drawMatrix, 50);

let sparkleParticles = [];

function createSparkles() {
    sparkleParticles = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
        sparkleParticles.push({
            angleOffset: (Math.PI * 2 / count) * i + Math.random() * 0.15,
            radiusOffset: Math.random() * 16 - 8,
            radius: Math.random() * 2 + 1,
            alpha: Math.random(),
            deltaAlpha: Math.random() * 0.015 + 0.008
        });
    }
}

function drawSparkles() {
    if (sparkleParticles.length === 0) return;
    const center = wheelSize / 2;
    const edgeRadius = center - 4;

    for (const p of sparkleParticles) {
        const angle = startAngle + p.angleOffset;
        const r = edgeRadius + p.radiusOffset;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;

        ctx.beginPath();
        ctx.fillStyle = `rgba(0, 255, 136, ${p.alpha * 0.25})`;
        ctx.arc(x, y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = `rgba(0, 255, 136, ${p.alpha})`;
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        p.alpha += p.deltaAlpha;
        if (p.alpha >= 1 || p.alpha <= 0.15) p.deltaAlpha *= -1;
    }
}

const fwCanvas = document.getElementById('fireworksCanvas');
const fwCtx = fwCanvas.getContext('2d');
fwCanvas.width = window.innerWidth;
fwCanvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    fwCanvas.width = window.innerWidth;
    fwCanvas.height = window.innerHeight;
});

// ROLETA
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

let entries = [];
let wheelSize = canvas.clientWidth || 600;

function resizeWheelCanvas() {
    const size = canvas.clientWidth;
    if (!size) return;
    wheelSize = size;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = wheelSize * dpr;
    canvas.height = wheelSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWheel(vencedorId, 1);
}

// SOM
let tickAudioCtx = null;

function getTickAudioCtx() {
    if (!tickAudioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        tickAudioCtx = new AudioContextClass();
    }
    if (tickAudioCtx.state === 'suspended') {
        tickAudioCtx.resume().catch(() => {});
    }
    return tickAudioCtx;
}

// Tempo (ms) que o áudio leva da hora em que é agendado até sair no alto-falante. O som do tique é
// disparado com essa antecedência (ver processarGiro), para chegar junto com a imagem da fatia passando.
function latenciaAudioMs() {
    const a = tickAudioCtx;
    const medida = a ? ((a.outputLatency || 0) + (a.baseLatency || 0)) * 1000 : 0;
    return Math.min(120, Math.max(30, medida || 50));   // sem medida (ex.: Safari): 50 ms
}

function playTick(delaySeconds = 0) {
    const audioCtx = getTickAudioCtx();
    const startTime = audioCtx.currentTime + delaySeconds;
    const duration = 0.03;

    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800 + Math.random() * 800;
    filter.Q.value = 1.2;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.7, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(startTime);
    noise.stop(startTime + duration);
}

function playTicks(count) {
    const ticksToPlay = Math.min(count, 8);
    for (let i = 0; i < ticksToPlay; i++) {
        playTick(i * 0.015);
    }
}

// Sorteio: o som de ser "sugado" para fora da Matrix pelo telefone.
// Sucção que acelera (ruído filtrado subindo + tom com vibrato digital) e um impacto grave e seco
// exatamente quando o nome termina de ser decodificado (0,9 s, igual a decodificarTexto).
function tocarSaidaDaMatrix() {
    try {
        const a = getTickAudioCtx();
        const t0 = a.currentTime + 0.02;
        const succao = 0.9;
        const ti = t0 + succao;                       // instante do impacto

        const mestre = a.createGain();
        mestre.gain.value = 0.35;
        mestre.connect(a.destination);

        const ruidoBuffer = (seg) => {
            const buf = a.createBuffer(1, Math.floor(a.sampleRate * seg), a.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            return buf;
        };

        // 1) vento da sucção: ruído filtrado cujo centro sobe cada vez mais rápido
        const vento = a.createBufferSource();
        vento.buffer = ruidoBuffer(succao + 0.1);
        const passaFaixa = a.createBiquadFilter();
        passaFaixa.type = 'bandpass';
        passaFaixa.Q.value = 2.5;
        passaFaixa.frequency.setValueAtTime(180, t0);
        passaFaixa.frequency.exponentialRampToValueAtTime(4200, ti);
        const ventoGanho = a.createGain();
        ventoGanho.gain.setValueAtTime(0.04, t0);
        ventoGanho.gain.exponentialRampToValueAtTime(0.5, ti - 0.05);
        ventoGanho.gain.exponentialRampToValueAtTime(0.001, ti + 0.03);
        vento.connect(passaFaixa);
        passaFaixa.connect(ventoGanho);
        ventoGanho.connect(mestre);
        vento.start(t0);
        vento.stop(ti + 0.05);

        // 2) a "linha" sendo puxada: tom que sobe com vibrato digital
        const tom = a.createOscillator();
        tom.type = 'sawtooth';
        tom.frequency.setValueAtTime(120, t0);
        tom.frequency.exponentialRampToValueAtTime(1500, ti);
        const vibrato = a.createOscillator();
        const vibratoGanho = a.createGain();
        vibrato.frequency.value = 14;
        vibratoGanho.gain.value = 40;                 // Hz de desvio
        vibrato.connect(vibratoGanho);
        vibratoGanho.connect(tom.frequency);
        const tomFiltro = a.createBiquadFilter();
        tomFiltro.type = 'lowpass';
        tomFiltro.frequency.value = 1800;
        const tomGanho = a.createGain();
        tomGanho.gain.setValueAtTime(0.01, t0);
        tomGanho.gain.exponentialRampToValueAtTime(0.12, ti - 0.08);
        tomGanho.gain.exponentialRampToValueAtTime(0.001, ti + 0.02);
        tom.connect(tomFiltro);
        tomFiltro.connect(tomGanho);
        tomGanho.connect(mestre);
        tom.start(t0);
        vibrato.start(t0);
        tom.stop(ti + 0.03);
        vibrato.stop(ti + 0.03);

        // 3) impacto: pancada grave quando o nome fecha
        const pancada = a.createOscillator();
        pancada.type = 'sine';
        pancada.frequency.setValueAtTime(140, ti);
        pancada.frequency.exponentialRampToValueAtTime(38, ti + 0.3);
        const pancadaGanho = a.createGain();
        pancadaGanho.gain.setValueAtTime(0.7, ti);
        pancadaGanho.gain.exponentialRampToValueAtTime(0.001, ti + 0.34);
        pancada.connect(pancadaGanho);
        pancadaGanho.connect(mestre);
        pancada.start(ti);
        pancada.stop(ti + 0.35);

        // clique seco no ataque
        const clique = a.createBufferSource();
        clique.buffer = ruidoBuffer(0.03);
        const cliqueFiltro = a.createBiquadFilter();
        cliqueFiltro.type = 'highpass';
        cliqueFiltro.frequency.value = 1500;
        const cliqueGanho = a.createGain();
        cliqueGanho.gain.setValueAtTime(0.5, ti);
        cliqueGanho.gain.exponentialRampToValueAtTime(0.001, ti + 0.03);
        clique.connect(cliqueFiltro);
        cliqueFiltro.connect(cliqueGanho);
        cliqueGanho.connect(mestre);
        clique.start(ti);

        // 4) "zip" descendente logo depois: o que foi sugado se afastando
        const zip = a.createOscillator();
        zip.type = 'sawtooth';
        zip.frequency.setValueAtTime(3000, ti + 0.02);
        zip.frequency.exponentialRampToValueAtTime(200, ti + 0.22);
        const zipGanho = a.createGain();
        zipGanho.gain.setValueAtTime(0.001, ti + 0.02);
        zipGanho.gain.exponentialRampToValueAtTime(0.08, ti + 0.04);
        zipGanho.gain.exponentialRampToValueAtTime(0.001, ti + 0.24);
        zip.connect(zipGanho);
        zipGanho.connect(mestre);
        zip.start(ti + 0.02);
        zip.stop(ti + 0.25);
    } catch (e) { /* áudio ainda não liberado pelo navegador: segue sem som */ }
}

// Subida do foguete: "zap" de laser (dente-de-serra descendente, curto). Cada disparo varia
// um pouco o tom, para uma salva de foguetes não soar repetida.
function tocarLaserFoguete() {
    try {
        const a = getTickAudioCtx();
        const t = a.currentTime;
        const osc = a.createOscillator();
        const ganho = a.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400 * (0.93 + Math.random() * 0.14), t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.18);
        ganho.gain.setValueAtTime(0.05, t);
        ganho.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(ganho);
        ganho.connect(a.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    } catch (e) { /* áudio ainda não liberado pelo navegador: segue sem som */ }
}

function tocarAudio(el, volume) {
    el.volume = volume;
    el.currentTime = 0;
    el.play().catch(() => {});
}

// Navegadores bloqueiam áudio sem interação; o espectador não tem botões, então
// qualquer toque/tecla na página libera o som.
let audioLiberado = false;
function liberarAudio() {
    if (audioLiberado) return;
    audioLiberado = true;
    getTickAudioCtx();
    [document.getElementById('explosionSound')].forEach(a => {
        a.muted = true;
        a.play().then(() => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
        }).catch(() => { a.muted = false; });
    });
}
['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, liberarAudio, { once: true }));

const pointerEl = document.getElementById('pointer');

function flashPointer() {
    pointerEl.animate([
        { transform: 'translateX(-50%) rotate(180deg) scale(1)', filter: 'drop-shadow(0 0 10px var(--accent-color))' },
        { transform: 'translateX(-50%) rotate(180deg) scale(1.35)', filter: 'drop-shadow(0 0 22px var(--accent-color))' },
        { transform: 'translateX(-50%) rotate(180deg) scale(1)', filter: 'drop-shadow(0 0 10px var(--accent-color))' }
    ], { duration: 120, easing: 'ease-out' });
}

// ESTADO DA ROLETA
// Tudo que o espectador vê deriva destas variáveis, que o anfitrião publica no banco
// (ver obterEstado / aplicarEstadoRemoto).
const POINTER_ANGLE = Math.PI * 3 / 2;     // ponteiro no topo do canvas
const IDLE_SPEED = 0.002 / 30;             // rad/ms (giro lento enquanto parada)
const ATRASO_BONECO = 1200;                // queda + pouso do Neo antes da roleta girar

let startAngle = 0;                        // ângulo atual (derivado do tempo)
let arc = 0;
let repouso = { angulo: 0, desde: agora() };
let giro = null;                           // { id, startTime, duration, from, to, winnerId }
let giroConcluidoId = null;
let giroEfeitosId = null;
let vencedorId = null;
let lastTickAngle = 0;
let ultimoDesenho = 0;

let configFoguetes = 5;
let configDuracao = 10000;
const timerPadrao = () => ({
    mostrar: true, rodando: false, base: 0, desde: 0,
    pessoa: { nome: '', rodando: false, base: 0, desde: 0 },   // quem está falando agora
    historico: []                                              // quem já falou: [{ nome, segundos }]
});
let timerEstado = timerPadrao();

resizeWheelCanvas();
window.addEventListener('resize', resizeWheelCanvas);
if (window.ResizeObserver) new ResizeObserver(resizeWheelCanvas).observe(canvas);

function generateDistinctColors(n) {
    const colors = [];
    const saturation = 70;
    const lightness = 60;
    for (let i = 0; i < n; i++) {
        const hue = Math.floor((360 / n) * i);
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    return colors;
}

function atualizarBotao() {
    const spinBtn = document.getElementById('spinBtn');
    const namesInput = document.getElementById('names');
    const timerBtn = document.getElementById('timerToggle');
    const emGiro = !!giro;

    if (spinBtn) {
        spinBtn.style.display = (entries.length === 0 || usandoListaPadrao) ? 'none' : 'block';
        spinBtn.disabled = emGiro;
        spinBtn.classList.toggle('somente-leitura', !!window.isViewer);
    }
    if (timerBtn) timerBtn.classList.toggle('somente-leitura', !!window.isViewer);
    if (namesInput) {
        namesInput.readOnly = !!window.isViewer || emGiro;
        namesInput.classList.toggle('bloqueado', emGiro);
    }
}

// Estado que o anfitrião grava no banco
window.obterEstado = function() {
    return {
        entries: entries.map(({ id, name, color }) => ({ id, name, color })),
        repouso: { angulo: repouso.angulo, desde: repouso.desde },
        giro: giro ? { ...giro } : null,
        foguetes: configFoguetes,
        timer: JSON.parse(JSON.stringify(timerEstado)),
        nomes: textoNomes,
        padrao: usandoListaPadrao,
        neoVoo: neoVooAtual,
        enc: encLocal
    };
};

function publicar(opcoes) {
    if (!window.isViewer && typeof window.publicarEstado === 'function') {
        window.publicarEstado(opcoes);
    }
}

// Lista usada quando o anfitrião ainda não informou nenhum nome
let usandoListaPadrao = true;   // a lista padrão é só demonstração: não pode ser sorteada
let textoNomes = '';             // conteúdo do campo de nomes (espelhado, somente leitura, para os espectadores)
const NOMES_PADRAO = ["Aeronauta Barata", "Agrícola Beterraba Areia", "Agrícola da Terra Fonseca", "Alce Barbuda", "Amado Amoroso", "Amável Pinto", "Ravi", "Helena", "Igor", "Juliana"];

// Anfitrião: nomes digitados (vazio = lista padrão)
window.setupWheel = function(texto = '') {
    if (window.isViewer || giro) return;
    textoNomes = texto;

    const digitados = texto
        .split(/[\n,]+/)
        .map(n => n.trim().slice(0, 60))
        .filter(n => n);
    const raw = digitados.length ? digitados : NOMES_PADRAO;
    usandoListaPadrao = digitados.length === 0;

    const colorArr = generateDistinctColors(raw.length);
    const lote = Date.now().toString(36);
    entries = raw.map((n, i) => ({
        id: `${lote}-${i}`,
        name: n,
        color: colorArr[i]
    }));

    arc = entries.length ? Math.PI * 2 / entries.length : 0;
    repouso = { angulo: 0, desde: agora() };
    startAngle = 0;
    createSparkles();
    drawWheel();
    atualizarBotao();
    publicar({ adiar: true });
};

// Espectador: aplica exatamente o que o anfitrião publicou
window.aplicarEstadoRemoto = function(estado) {
    if (!window.isViewer) return;
    const novo = estado || {};
    const rodandoAntes = timerEstado.rodando;

    usandoListaPadrao = novo.padrao !== false;   // sem estado = lista de demonstração
    const campoNomes = document.getElementById('names');
    const texto = novo.nomes || '';
    if (campoNomes && campoNomes.value !== texto) campoNomes.value = texto;

    const lista = Array.isArray(novo.entries) ? novo.entries : Object.values(novo.entries || {});
    const novas = lista.filter(Boolean);
    const mudou = novas.length !== entries.length || novas.some((e, i) => e.id !== entries[i].id);

    entries = novas;
    arc = entries.length ? Math.PI * 2 / entries.length : 0;
    repouso = novo.repouso || { angulo: 0, desde: agora() };
    configFoguetes = novo.foguetes || 5;
    const t = novo.timer || {};
    timerEstado = {
        ...timerPadrao(),
        ...t,
        pessoa: { ...timerPadrao().pessoa, ...(t.pessoa || {}) },
        historico: (Array.isArray(t.historico) ? t.historico : Object.values(t.historico || {})).filter(Boolean)
    };
    if (mudou) createSparkles();
    if (estadoRemotoRecebido && rodandoAntes !== timerEstado.rodando) pressionarBotao(document.getElementById('timerToggle'));
    estadoRemotoRecebido = true;

    const novoGiro = novo.giro || null;
    if (!novoGiro) {
        giro = null;
        giroConcluidoId = null;
        giroEfeitosId = null;
        stopHackingEffect();
        esconderModalVencedor();
    } else if (!giro || giro.id !== novoGiro.id) {
        // Giro novo substitui qualquer resultado/efeito do anterior (updates podem ser coalescidos)
        stopHackingEffect();
        esconderModalVencedor();
        giro = novoGiro;
        giroConcluidoId = null;
        giroEfeitosId = null;
        if (agora() >= giro.startTime + giro.duration + 1500) {
            // Entrou depois do giro terminar: só mostra o resultado, sem repetir som e fogos
            giroConcluidoId = giro.id;
            const entry = entries.find(e => e.id === giro.winnerId);
            if (entry) mostrarVencedor(entry, true);
        } else {
            iniciarGiroLocal();
            if (agora() < giro.startTime + 400) pressionarBotao(document.getElementById('spinBtn'));   // espelha o clique do anfitrião
        }
    }

    aplicarVooRemoto(novo.neoVoo);
    aplicarEncerramentoRemoto(novo.enc);

    atualizarBotao();
};
let estadoRemotoRecebido = false;

// A roleta (fatias + nomes) é desenhada uma vez num canvas de cache; a cada quadro
// só é rotacionada via drawImage. O brilho vem do drop-shadow em CSS.
let rodaCache = null;
let rodaCacheChave = '';

function montarRodaCache() {
    const dpr = window.devicePixelRatio || 1;
    const chave = `${wheelSize}|${dpr}|${entries.map(e => e.id).join(',')}`;
    if (rodaCache && chave === rodaCacheChave) return;
    rodaCacheChave = chave;

    rodaCache = document.createElement('canvas');
    rodaCache.width = Math.round(wheelSize * dpr);
    rodaCache.height = Math.round(wheelSize * dpr);
    const c = rodaCache.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const center = wheelSize / 2;
    const radius = center - 4;
    const fontSize = Math.max(10, Math.round(wheelSize / 33));
    c.font = `bold ${fontSize}px "Courier New", monospace`;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const angle = i * arc;

        c.fillStyle = entry.color;
        c.beginPath();
        c.moveTo(center, center);
        c.arc(center, center, radius, angle, angle + arc, false);
        c.lineTo(center, center);
        c.fill();

        c.save();
        c.fillStyle = '#000';
        c.translate(
            center + Math.cos(angle + arc / 2) * radius * 0.6,
            center + Math.sin(angle + arc / 2) * radius * 0.6
        );
        c.rotate(angle + arc / 2);
        c.fillText(entry.name, -c.measureText(entry.name).width / 2, 0);
        c.restore();
    }
}

function drawWheel(blinkId = null, alpha = 1) {
    ctx.clearRect(0, 0, wheelSize, wheelSize);
    if (entries.length === 0) return;

    montarRodaCache();

    const center = wheelSize / 2;
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(startAngle);
    ctx.drawImage(rodaCache, -center, -center, wheelSize, wheelSize);

    // Vencedor pulsando: escurece a fatia de forma intermitente
    if (blinkId) {
        const idx = entries.findIndex(e => e.id === blinkId);
        if (idx >= 0) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, center - 4, idx * arc, (idx + 1) * arc, false);
            ctx.fillStyle = `rgba(0,0,0,${(1 - alpha).toFixed(3)})`;
            ctx.fill();
        }
    }
    ctx.restore();
}

// HACKING EFFECT
const HACK_LINES = [
    'Conectando ao servidor 192.168.0.{n}...',
    'Autenticando usuário root...',
    'Decodificando lista de participantes...',
    'Ignorando firewall corporativo...',
    'Calculando probabilidades quânticas...',
    'Compilando algoritmo de sorteio...',
    'Verificando integridade dos dados... OK',
    'Acesso concedido.',
    'Criptografando resultado com AES-256...',
    'Sincronizando com satélite...',
    'Bypass de segurança em andamento...',
    'Escaneando portas... {n} abertas',
    'Injetando payload no kernel...',
    'Redirecionando tráfego de rede...',
    'Hash: 0x{hex}',
    'Download concluído: sorteio.exe',
    'Reiniciando protocolo de sorteio...',
    'Acessando banco de dados secreto...',
];

const HACK_MAX_WINDOWS = 3;
const HACK_MIN_SIDE_SPACE = 160;

let hackingActive = false;
let hackingSpawnTimeout = null;

function randomHackLine() {
    const template = HACK_LINES[Math.floor(Math.random() * HACK_LINES.length)];
    return template
        .replace('{n}', Math.floor(Math.random() * 999))
        .replace('{hex}', Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0'));
}

function startHackingEffect() {
    if (hackingActive) return;
    hackingActive = true;
    spawnHackWindowLoop();
}

function stopHackingEffect() {
    hackingActive = false;
    clearTimeout(hackingSpawnTimeout);
    document.querySelectorAll('.hack-window').forEach(closeHackWindow);
}

function spawnHackWindowLoop() {
    if (!hackingActive) return;

    const container = document.getElementById('hackingContainer');
    if (container.children.length < HACK_MAX_WINDOWS) {
        spawnHackWindow();
    }

    hackingSpawnTimeout = setTimeout(spawnHackWindowLoop, 700 + Math.random() * 900);
}

function spawnHackWindow() {
    const inputArea = document.getElementById('inputArea');
    const wheelContainer = document.getElementById('wheelContainer');

    // O espectador não tem painel de nomes: usa a própria roleta como referência
    const refEsquerda = (inputArea && inputArea.offsetParent !== null) ? inputArea : wheelContainer;
    const leftSpace = refEsquerda ? refEsquerda.getBoundingClientRect().left : 0;
    const rightSpace = wheelContainer ? window.innerWidth - wheelContainer.getBoundingClientRect().right : 0;

    const sides = [];
    if (leftSpace >= HACK_MIN_SIDE_SPACE) sides.push({ side: 'left', space: leftSpace });
    if (rightSpace >= HACK_MIN_SIDE_SPACE) sides.push({ side: 'right', space: rightSpace });
    if (sides.length === 0) return;

    const chosen = sides[Math.floor(Math.random() * sides.length)];
    const winWidth = Math.min(260, chosen.space - 24);

    const container = document.getElementById('hackingContainer');
    const win = document.createElement('div');
    win.className = 'hack-window';
    win.style.width = winWidth + 'px';
    win.style[chosen.side] = '12px';
    win.style.top = (10 + Math.random() * 60) + 'vh';

    win.innerHTML =
        '<div class="hack-titlebar">' +
        '<span class="hack-dot"></span><span class="hack-dot"></span><span class="hack-dot"></span>' +
        '<span>root@sorteio:~#</span>' +
        '</div>' +
        '<div class="hack-body"></div>';
    container.appendChild(win);

    const lineCount = 3 + Math.floor(Math.random() * 3);
    const lines = Array.from({ length: lineCount }, randomHackLine);

    typeHackLines(win.querySelector('.hack-body'), lines, () => {
        setTimeout(() => closeHackWindow(win), 1200 + Math.random() * 800);
    });
}

function typeHackLines(body, lines, onDone) {
    let lineIndex = 0;

    function typeNextLine() {
        if (lineIndex >= lines.length) {
            onDone();
            return;
        }

        const line = lines[lineIndex];
        const lineEl = document.createElement('div');
        body.appendChild(lineEl);
        let charIndex = 0;

        (function typeChar() {
            if (!lineEl.isConnected) return;
            if (charIndex <= line.length) {
                lineEl.textContent = line.slice(0, charIndex);
                charIndex++;
                setTimeout(typeChar, 15 + Math.random() * 25);
            } else {
                lineIndex++;
                setTimeout(typeNextLine, 150 + Math.random() * 200);
            }
        })();
    }

    typeNextLine();
}

function closeHackWindow(win) {
    if (!win || win.classList.contains('closing')) return;
    win.classList.add('closing');
    win.addEventListener('animationend', () => win.remove(), { once: true });
}

// GIRO & FÍSICA
// O ângulo é uma função pura do tempo do servidor + parâmetros do giro,
// então anfitrião e espectadores desenham exatamente o mesmo quadro.
function easeOutCubic(p) {
    return 1 - Math.pow(1 - p, 3);
}

function anguloEm(now) {
    if (giro) {
        const p = Math.min(Math.max((now - giro.startTime) / Math.max(1, giro.duration), 0), 1);
        return giro.from + (giro.to - giro.from) * easeOutCubic(p);
    }
    return repouso.angulo + IDLE_SPEED * Math.max(0, now - repouso.desde);
}

// Anfitrião: sorteia o vencedor primeiro e calcula o ângulo final que o faz cair no ponteiro
window.girar = function() {
    if (window.isViewer || entries.length === 0 || usandoListaPadrao || giro) return;

    liberarAudio();
    startTimer();
    if (timerEstado.pessoa.nome) {   // a fala anterior termina ao girar: o tempo dela fica registrado na lista
        timerEstado.historico.push({ nome: timerEstado.pessoa.nome, segundos: segundosDe(timerEstado.pessoa, agora()) });
    }
    timerEstado.pessoa = timerPadrao().pessoa;

    const now = agora();
    const indice = Math.floor(Math.random() * entries.length);
    const dentroDaFatia = arc * (0.1 + Math.random() * 0.8);
    const base = POINTER_ANGLE - (indice * arc + dentroDaFatia);
    const from = anguloEm(now);
    const minimo = from + (5 + Math.floor(Math.random() * 5)) * Math.PI * 2;
    const to = base + Math.PI * 2 * Math.ceil((minimo - base) / (Math.PI * 2));

    // Só resta um nome: não há o que girar, o resultado aparece direto (sem pouso do Neo nem espera)
    const ultimo = entries.length === 1;
    giro = {
        id: `${now}-${Math.floor(Math.random() * 1e6)}`,
        startTime: ultimo ? now : now + ATRASO_BONECO,
        duration: ultimo ? 0 : configDuracao,
        from,
        to: ultimo ? from : to,
        winnerId: entries[indice].id
    };
    giroConcluidoId = null;
    giroEfeitosId = null;

    iniciarGiroLocal();
    atualizarBotao();
    publicar();
};

function iniciarGiroLocal() {
    lastTickAngle = giro.from;
    if (giro.duration > 0) window.animarBoneco(giro.startTime);
}

function processarGiro(now) {
    if (giro.id === giroConcluidoId) return;

    if (now >= giro.startTime) {
        // O ângulo é uma função conhecida do tempo, então dá para saber onde a roleta estará daqui a
        // `latencia` ms: o tique é disparado antes do cruzamento e o áudio chega junto com a imagem.
        const latencia = latenciaAudioMs();
        const anguloFuturo = anguloEm(now + latencia);

        if (giroEfeitosId !== giro.id) {
            giroEfeitosId = giro.id;
            lastTickAngle = anguloEm(giro.startTime);   // não perde os cruzamentos dos primeiros ms do giro
            startHackingEffect();
        }

        const crossedSlices = Math.floor((anguloFuturo + Math.PI / 2) / arc) - Math.floor((lastTickAngle + Math.PI / 2) / arc);
        if (crossedSlices !== 0) {
            playTicks(Math.abs(crossedSlices));
            setTimeout(flashPointer, latencia);   // o ponteiro pisca quando a fatia realmente passa
            lastTickAngle = anguloFuturo;
        }
    }

    if (now >= giro.startTime + giro.duration) {
        concluirGiro();
    }
}

function concluirGiro() {
    giroConcluidoId = giro.id;
    stopHackingEffect();

    const entry = entries.find(e => e.id === giro.winnerId);
    if (entry) mostrarVencedor(entry, false);

    // A fala começa no instante em que a roleta parou (mesmo valor para todos, mesmo com a aba em segundo plano)
    if (entry && !window.isViewer) {
        iniciarFalaDe(entry.name, giro.startTime + giro.duration);
        publicar();
    }
}

// Anfitrião: botão OK — remove o vencedor da roleta e libera o próximo giro
function confirmarVencedor() {
    if (window.isViewer || !giro) return;

    entries = entries.filter(e => e.id !== giro.winnerId);
    arc = entries.length ? Math.PI * 2 / entries.length : 0;
    giro = null;
    giroConcluidoId = null;
    giroEfeitosId = null;
    repouso = { angulo: 0, desde: agora() };
    startAngle = 0;

    esconderModalVencedor();
    if (entries.length === 0) {
        pauseTimer();   // acabou: o geral e o de quem acabou de falar param
        const namesInput = document.getElementById('names');
        if (namesInput) namesInput.value = '';
        window.setupWheel('');
        encerrarReuniao();
    }

    atualizarBotao();
    publicar();
}

function esconderModalVencedor() {
    vencedorId = null;
    if (modalFechando) return;
    modalAnimId++;
    removerGenio();
    const modalEl = document.getElementById('modal');
    const conteudo = document.getElementById('modalContent');
    conteudo.style.visibility = '';
    if (reduzMovimento || getComputedStyle(modalEl).display === 'none') {
        modalEl.style.display = 'none';
        return;
    }
    escalaFechar(modalEl, conteudo);
}

function mostrarVencedor(entry, silencioso) {
    vencedorId = entry.id;

    const winnerEl = document.getElementById('winner');
    winnerEl.classList.remove('glitch');
    void winnerEl.offsetWidth;
    const strong = document.createElement('strong');
    winnerEl.replaceChildren(strong);
    winnerEl.classList.add('glitch');

    document.getElementById('modal').style.display = 'flex';

    // o espectador vê o OK, mas não consegue acioná-lo
    const okBtn = document.getElementById('okBtn');
    if (okBtn) {
        okBtn.style.display = 'inline-block';
        okBtn.classList.toggle('somente-leitura', !!window.isViewer);
    }

    if (silencioso) {
        strong.textContent = entry.name;
        return;
    }

    // O nome já ocupa o seu lugar (invisível) para a janela não crescer depois; ele só começa a ser
    // escrito quando o efeito Gênio termina, junto com o impacto do som, o clarão e o tremor.
    strong.textContent = entry.name;
    strong.style.visibility = 'hidden';
    abrirComGenio(() => {
        if (vencedorId !== entry.id) return;
        strong.style.visibility = '';
        decodificarTexto(strong, entry.name, 700, () => vencedorId === entry.id);
        flashTela();
        tremerRoleta();
    });
    tocarSaidaDaMatrix();
    fireworks();
}

document.getElementById('okBtn').addEventListener('click', confirmarVencedor);

// LOOP ÚNICO DE RENDERIZAÇÃO (substitui o idle, o rotateWheel e o blink separados)
function frame() {
    const now = agora();
    startAngle = anguloEm(now);

    atualizarTimerUI(now);
    atualizarEncerramento(now);
    if (giro) processarGiro(now);

    const perf = performance.now();
    if (giro || vencedorId || perf - ultimoDesenho >= 50) {
        ultimoDesenho = perf;
        if (entries.length > 0) {
            const alpha = vencedorId ? 0.7 + 0.3 * Math.sin(perf / 500) : 1;
            drawWheel(vencedorId, alpha);
            drawSparkles();
        }
        if (!giro) {
            canvas.style.transform = `perspective(1000px) rotateY(${Math.sin(startAngle) * 5}deg) rotateX(${Math.cos(startAngle) * 5}deg)`;
        }
    }

    requestAnimationFrame(frame);
}

// FOGOS DE ARTIFÍCIO
function fireworks() {
    const colors = generateDistinctColors(10);
    const numRockets = configFoguetes;

    const delay = 300;
    for (let i = 0; i < numRockets; i++) {
        setTimeout(() => {
            const startX = Math.random() * fwCanvas.width * 0.8 + fwCanvas.width * 0.1;
            const startY = fwCanvas.height + 10;
            const peakY = Math.random() * fwCanvas.height * 0.4 + fwCanvas.height * 0.1;
            launchRocket(startX, startY, peakY, colors);
        }, i * delay);
    }
}

function launchRocket(x, y, peakY, colors) {
    const rocketColor = colors[Math.floor(Math.random() * colors.length)];
    const rocket = {
        x, y, peakY,
        exploded: false,
        color: rocketColor,
        radius: 2 + Math.random() * 2,
        sway: Math.random() * 2 + 1,
        swayDir: Math.random() < 0.5 ? -1 : 1
    };

    tocarLaserFoguete();

    const rocketInterval = setInterval(() => {
        if (!rocket.exploded) {
            rocket.y += -4 - Math.random() * 4;
            rocket.x += rocket.swayDir * Math.random() * 1.5;
            if (Math.abs(rocket.x - x) > rocket.sway) rocket.swayDir *= -1;

            rocket.radius = 1 + Math.sin((rocket.y / peakY) * Math.PI) * 3;

            if (rocket.y <= rocket.peakY) {
                rocket.exploded = true;
                createExplosion(rocket.x, rocket.y, colors);
                tocarAudio(document.getElementById('explosionSound'), 0.5);
                clearInterval(rocketInterval);
            } else {
                allParticles.push({
                    x: rocket.x,
                    y: rocket.y,
                    vx: 0,
                    vy: 0,
                    color: rocket.color,
                    life: 10,
                    radius: 2
                });
            }
        }
    }, 30);

    startFireworksAnimation();
}

function createExplosion(x, y, colors) {
    const particleCount = 50 + Math.floor(Math.random() * 50);
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 5 + 2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        allParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            life: 50 + Math.random() * 30,
            radius: 2 + Math.random() * 3,
            shrink: 0.05 + Math.random() * 0.05,
            fade: 0.02 + Math.random() * 0.02
        });
    }
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function startFireworksAnimation() {
    if (fireworksAnimation) return;
    fireworksAnimation = setInterval(() => {
        fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);

        for (let i = allParticles.length - 1; i >= 0; i--) {
            let numeroAleatorio = getRandomIntInclusive(1, 10);
            const p = allParticles[i];
            fwCtx.beginPath();
            fwCtx.fillStyle = p.color;
            fwCtx.arc(p.x, p.y, numeroAleatorio, 0, Math.PI * 2);
            fwCtx.fill();

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life--;

            if (p.life <= 0) {
                allParticles.splice(i, 1);
            }
        }

        if (allParticles.length === 0) {
            clearInterval(fireworksAnimation);
            fireworksAnimation = null;
            fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
        }
    }, 30);
}

// NEO NO GIRO
// Cai do céu, levanta fumaça ao pousar, dá o impulso no instante em que a roleta começa
// a girar (onda de choque) e sai voando. A linha do tempo parte de giro.startTime, então
// anfitrião e espectadores veem a mesma cena (quem chega atrasado entra no meio dela).
let neoPousando = false;
const NEO_SAIDA = 700;

function soltarFumaca(x, y, qtd) {
    const wc = document.getElementById('wheelContainer');
    for (let i = 0; i < qtd; i++) {
        const tam = aleatorio(30, 64);
        const el = document.createElement('div');
        el.className = 'fumaca';
        el.style.cssText = `left:${x - tam / 2}px; top:${y - tam / 2}px; width:${tam}px; height:${tam}px`;
        wc.appendChild(el);

        const lado = qtd > 1 ? (i / (qtd - 1) - 0.5) * 2 : 0;   // -1..1
        const dx = lado * aleatorio(50, 120);
        const dy = -aleatorio(10, 70);
        el.animate([
            { transform: 'translate(0, 0) scale(0.4)', opacity: 0.85 },
            { transform: `translate(${dx}px, ${dy}px) scale(${aleatorio(1.8, 2.8)})`, opacity: 0 }
        ], { duration: aleatorio(700, 1100), easing: 'ease-out' }).onfinish = () => el.remove();
    }
}

function ondaDeChoque(x, y, raio) {
    const wc = document.getElementById('wheelContainer');
    [0, 110].forEach((atraso) => {
        const el = document.createElement('div');
        el.className = 'onda-choque';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        wc.appendChild(el);
        const base = 'translate(-50%, -50%) perspective(300px) rotateX(70deg)';
        el.animate([
            { transform: `${base} scale(0.2)`, opacity: 0.9 },
            { transform: `${base} scale(${(raio * 2) / 40})`, opacity: 0 }
        ], { duration: 700, delay: atraso, easing: 'ease-out', fill: 'backwards' }).onfinish = () => el.remove();
    });
}

function tremerRoleta() {
    document.getElementById('wheelContainer').animate([
        { transform: 'translate(0, 0)' },
        { transform: 'translate(-3px, 4px)' },
        { transform: 'translate(3px, -3px)' },
        { transform: 'translate(0, 0)' }
    ], { duration: 220 });
}

window.animarBoneco = function(startTime) {
    const boneco = document.getElementById('boneco');
    if (!boneco || !boneco.animate || entries.length === 0 || neoPousando) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    neoEl.getAnimations().forEach(a => a.cancel());   // só um Neo em cena por vez
    const wc = document.getElementById('wheelContainer');
    const bw = boneco.offsetWidth;
    const bh = boneco.offsetHeight;
    const ws = canvas.offsetWidth;
    const cr = wc.getBoundingClientRect();

    // Pousa na lateral esquerda da roleta, com os pés a ~80% da altura dela
    const x = Math.max(canvas.offsetLeft - bw * 0.55, 6 - cr.left);
    const yPouso = canvas.offsetTop + ws * 0.8 - bh;
    const yTopo = yPouso - Math.max(260, ws * 0.6);
    const xFim = x + ws * 0.5;
    const yFim = -cr.top - bh - 60;                  // sai pelo topo da tela
    const pesX = x + bw / 2;
    const pesY = yPouso + bh;

    const total = ATRASO_BONECO + NEO_SAIDA;
    const decorrido = Math.min(Math.max(ATRASO_BONECO - (startTime - agora()), 0), ATRASO_BONECO);
    const pose = (px, py, sx, sy, rot = 0) => `translate(${px}px, ${py}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
    const t = (ms) => ms / total;

    const quadros = [
        { offset: 0, transform: pose(x, yTopo, 1, 1.15), opacity: 0, easing: 'ease-in' },
        { offset: t(60), transform: pose(x, yTopo + (yPouso - yTopo) * 0.05, 1, 1.15), opacity: 1, easing: 'ease-in' },
        { offset: t(300), transform: pose(x, yPouso, 1, 1.15), opacity: 1, easing: 'ease-out' },        // pouso
        { offset: t(380), transform: pose(x, yPouso, 1.2, 0.8), opacity: 1 },                           // amortece
        { offset: t(450), transform: pose(x, yPouso, 1, 1), opacity: 1 },
        { offset: t(ATRASO_BONECO - 150), transform: pose(x, yPouso, 1, 1), opacity: 1 },
        { offset: t(ATRASO_BONECO), transform: pose(x, yPouso, 1.12, 0.78), opacity: 1 },              // agacha
        { offset: t(ATRASO_BONECO + 80), transform: pose(x, yPouso - ws * 0.05, 0.85, 1.25), opacity: 1, easing: 'ease-in' }, // impulso
        { offset: 1, transform: pose(xFim, yFim, 0.5, 0.5, 35), opacity: 0 }
    ];

    neoPousando = true;
    const anim = boneco.animate(quadros, { duration: total, easing: 'linear' });
    anim.currentTime = decorrido;
    anim.onfinish = anim.oncancel = () => {
        neoPousando = false;
        boneco.classList.remove('empurrando', 'decolando');
    };

    const agendar = (ms, fn) => { if (ms >= decorrido) setTimeout(fn, ms - decorrido); };
    agendar(300, () => { soltarFumaca(pesX, pesY, 9); tremerRoleta(); });
    agendar(450, () => boneco.classList.add('empurrando'));
    agendar(ATRASO_BONECO, () => {
        boneco.classList.remove('empurrando');
        boneco.classList.add('decolando');   // braço erguido na decolagem
        ondaDeChoque(pesX, pesY, ws * 0.9);
        soltarFumaca(pesX, pesY, 12);
        tremerRoleta();
    });
};

const spinBtnEl = document.getElementById('spinBtn');
if (spinBtnEl) spinBtnEl.addEventListener('click', () => window.girar());

// MODO ESPECTADOR FORÇADO (ex.: já existe outro anfitrião ativo)
window.entrarModoEspectador = function() {
    window.isViewer = true;
    document.body.classList.add('viewer');
    giro = null;
    prepararModoEspectador();
    atualizarBotao();
};

// CHUVA DE LETRAS da janela de configurações: só anima enquanto ela está aberta
function criarChuvaMatrix(cnv, fonte = 14) {
    const c = cnv.getContext('2d', { alpha: false });
    let gotas = [];
    let timer = null;

    function ajustar() {
        const r = cnv.parentElement.getBoundingClientRect();
        cnv.width = Math.max(1, Math.round(r.width));
        cnv.height = Math.max(1, Math.round(r.height));
        gotas = Array.from({ length: Math.floor(cnv.width / fonte) }, () => Math.floor(Math.random() * cnv.height / fonte));
        c.fillStyle = '#000';
        c.fillRect(0, 0, cnv.width, cnv.height);
    }

    function quadro() {
        c.fillStyle = 'rgba(0, 0, 0, 0.08)';
        c.fillRect(0, 0, cnv.width, cnv.height);
        c.fillStyle = '#0F0';
        c.font = fonte + 'px monospace';
        for (let i = 0; i < gotas.length; i++) {
            c.fillText(letters[Math.floor(Math.random() * letters.length)], i * fonte, gotas[i] * fonte);
            if (gotas[i] * fonte > cnv.height || Math.random() > 0.975) gotas[i] = 0;
            gotas[i]++;
        }
    }

    return {
        iniciar() {
            ajustar();
            if (!timer) timer = setInterval(quadro, 60);
        },
        parar() {
            clearInterval(timer);
            timer = null;
        }
    };
}

const chuvaConfig = criarChuvaMatrix(document.getElementById('configChuva'));

// MODAL CONFIGURAÇÕES
const modal = document.getElementById("configModal");
const btnOpen = document.getElementById("openConfig");
const btnClose = document.getElementById("closeModal");
const btnSave = document.getElementById("saveConfig");

if (btnOpen) {
    btnOpen.onclick = () => {
        document.getElementById("fireworksCount").value = configFoguetes;
        document.getElementById("spinTime").value = configDuracao / 1000;
        document.getElementById('toggleSpeechTimer').checked = timerEstado.mostrar;
        modal.style.display = "flex";
        chuvaConfig.iniciar();
    };
}

if (btnClose) {
    btnClose.onclick = () => {
        const fireworksCount = parseInt(document.getElementById("fireworksCount").value);
        const spinTime = parseInt(document.getElementById("spinTime").value) * 1000;

        const isDirty = fireworksCount !== configFoguetes
            || spinTime !== configDuracao
            || document.getElementById('toggleSpeechTimer').checked !== timerEstado.mostrar;

        if (isDirty && !confirm("Alterações não salvas, tem certeza que deseja fechar?")) return;
        modal.style.display = "none";
        chuvaConfig.parar();
    };
}

if (btnSave) {
    btnSave.onclick = () => {
        const fireworksCount = parseInt(document.getElementById("fireworksCount").value);
        const spinTime = parseInt(document.getElementById("spinTime").value) * 1000;
        const checkbox = document.getElementById('toggleSpeechTimer');

        if (!fireworksCount || fireworksCount < 1 || fireworksCount > 20) {
            showToast("⚠️ Número de foguetes deve estar entre 1 e 20!", "warning");
            return false;
        }

        if (!spinTime || spinTime < 1000) {
            showToast("⚠️ O tempo de execução deve ser de pelo menos 1 (um) segundo!", "warning");
            return false;
        }

        timerEstado.mostrar = checkbox.checked;
        configFoguetes = fireworksCount;
        configDuracao = spinTime;

        publicar();
        showToast("✅ Configurações salvas!", "success");
        modal.style.display = "none";
        chuvaConfig.parar();
    };
}

const numericInputs = document.querySelectorAll('#fireworksCount, #spinTime');
numericInputs.forEach(input => {
    input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '');
    });
});

document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    const progress = document.createElement("div");
    progress.className = "toast-progress";
    toast.appendChild(progress);

    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 50);

    progress.style.transition = `width ${duration}ms linear`;
    setTimeout(() => progress.style.width = "0%", 50);

    const removeToast = () => {
        toast.classList.remove("show");
        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 500);
    };

    toast.addEventListener('click', removeToast);
    setTimeout(removeToast, duration);
}
window.showToast = showToast;

// TIMER
// Faz parte do estado publicado: o valor é derivado do relógio do servidor
// (base + tempo corrido desde `desde`), então anfitrião e espectadores mostram o mesmo.
// Há dois contadores: o geral da reunião e o da pessoa que está falando.
const segundosDe = (c, now) => c.base + (c.rodando ? Math.max(0, Math.floor((now - c.desde) / 1000)) : 0);
const formatarTempo = (total) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

function iniciarContador(c) {
    if (c.rodando) return;
    c.rodando = true;
    c.desde = agora();
}

function pararContador(c) {
    if (!c.rodando) return;
    c.base = segundosDe(c, agora());
    c.rodando = false;
}

function startTimer() {
    iniciarContador(timerEstado);
}

function pauseTimer() {
    pararContador(timerEstado);
    pararContador(timerEstado.pessoa);
}

// Quando o nome é sorteado: o geral segue (ou começa) e o da pessoa zera e começa
function iniciarFalaDe(nome, desde = agora()) {
    startTimer();
    timerEstado.pessoa = { nome, rodando: true, base: 0, desde };
}

const timerBoxEl = document.getElementById('timerBox');
const timerGeralEl = document.getElementById('speechTimer');
const timerBotaoEl = document.getElementById('timerToggle');
const pessoaBoxEl = document.getElementById('personTimer');
let pessoaAssinatura = '';
let pessoaTempoAtualEl = null;   // <span> do tempo de quem está falando agora

// Só mexe no DOM quando o valor muda
function definirTexto(el, texto) {
    if (el.textContent !== texto) el.textContent = texto;
}
function definirDisplay(el, valor) {
    if (el.style.display !== valor) el.style.display = valor;
}

function reconstruirListaPessoas() {
    const linhas = timerEstado.historico.map(h => ({ nome: h.nome, tempo: formatarTempo(h.segundos), atual: false }));
    if (timerEstado.pessoa.nome) linhas.push({ nome: timerEstado.pessoa.nome, tempo: '00:00', atual: true });

    pessoaTempoAtualEl = null;
    pessoaBoxEl.replaceChildren(...linhas.map((l) => {
        const linha = document.createElement('div');
        linha.className = 'pessoa-linha' + (l.atual ? ' atual' : '');
        const nome = document.createElement('span');
        nome.className = 'nome';
        nome.textContent = l.nome;
        const tempo = document.createElement('span');
        tempo.className = 'tempo';
        tempo.textContent = l.tempo;
        linha.append(nome, tempo);
        if (l.atual) pessoaTempoAtualEl = tempo;
        return linha;
    }));
    definirDisplay(pessoaBoxEl, linhas.length ? 'flex' : 'none');
    pessoaBoxEl.scrollTop = pessoaBoxEl.scrollHeight;   // acompanha a pessoa mais recente
}

function atualizarTimerUI(now) {
    definirDisplay(timerBoxEl, timerEstado.mostrar ? 'flex' : 'none');
    definirTexto(timerGeralEl, formatarTempo(segundosDe(timerEstado, now)));

    // lista: só é reconstruída quando muda (nova pessoa ou tempo fechado); o tempo de quem fala só atualiza o texto
    const p = timerEstado.pessoa;
    const assinatura = timerEstado.historico.map(h => h.nome + '|' + h.segundos).join(';') + '#' + p.nome;
    if (assinatura !== pessoaAssinatura) {
        pessoaAssinatura = assinatura;
        reconstruirListaPessoas();
    }
    if (pessoaTempoAtualEl) definirTexto(pessoaTempoAtualEl, formatarTempo(segundosDe(p, now)));

    const rotulo = timerEstado.rodando ? '⏸ Pausar' : (timerEstado.base > 0 ? '▶ Continuar' : '▶ Iniciar');
    definirTexto(timerBotaoEl, rotulo);
}

// Anfitrião: iniciar/pausar (útil quando a reunião começa com recados antes da roleta)
timerBotaoEl.addEventListener('click', () => {
    if (window.isViewer) return;
    if (timerEstado.rodando) {
        pauseTimer();
    } else {
        startTimer();
        if (timerEstado.pessoa.nome) iniciarContador(timerEstado.pessoa);
    }
    publicar();
});

// EFEITOS: clique, cursor e sorteio (estilo terminal). Valem para anfitrião e espectadores.
const efeitosEl = document.getElementById('efeitos');
const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CARACTERES_FX = '01010101アイウエオカキクケコサシスセソ<>{}[]/\\|=+*#$%&'.split('');

function ondaNoBotao(btn, x, y) {
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2;
    const el = document.createElement('span');
    el.className = 'ripple';
    el.style.cssText = `width:${d}px; height:${d}px; left:${x - r.left - d / 2}px; top:${y - r.top - d / 2}px`;
    btn.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
}

// pequena explosão de "código" no ponto clicado
function explosaoCodigo(x, y, qtd) {
    if (efeitosEl.childElementCount > 80) return;
    for (let i = 0; i < qtd; i++) {
        const el = document.createElement('span');
        el.className = 'faisca';
        el.textContent = CARACTERES_FX[Math.floor(Math.random() * CARACTERES_FX.length)];
        el.style.cssText = `left:${x}px; top:${y}px; font-size:${aleatorio(11, 20)}px`;
        efeitosEl.appendChild(el);

        const ang = Math.random() * Math.PI * 2;
        const dist = aleatorio(30, 90);
        el.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist + 25}px)) scale(0.4)`, opacity: 0 }
        ], { duration: aleatorio(450, 800), easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }).onfinish = () => el.remove();
    }
}

// rastro de caracteres atrás do mouse
let ultimoRastro = 0;
function criarRastro(x, y) {
    if (efeitosEl.childElementCount > 80) return;
    const el = document.createElement('span');
    el.className = 'rastro';
    el.textContent = CARACTERES_FX[Math.floor(Math.random() * CARACTERES_FX.length)];
    el.style.cssText = `left:${x + aleatorio(-6, 6)}px; top:${y + aleatorio(-6, 6)}px`;
    efeitosEl.appendChild(el);
    el.animate([
        { transform: 'translate(-50%, -50%)', opacity: 0.85 },
        { transform: 'translate(-50%, calc(-50% + 22px))', opacity: 0 }
    ], { duration: 650, easing: 'ease-out' }).onfinish = () => el.remove();
}

// Espelha no espectador o "clique" que o anfitrião deu (os botões dele são somente leitura)
function pressionarBotao(btn) {
    if (!btn || reduzMovimento) return;
    btn.classList.remove('pressionado');
    void btn.offsetWidth;
    btn.classList.add('pressionado');
    setTimeout(() => btn.classList.remove('pressionado'), 400);
    const r = btn.getBoundingClientRect();
    ondaNoBotao(btn, r.left + r.width / 2, r.top + r.height / 2);
    explosaoCodigo(r.left + r.width / 2, r.top + r.height / 2, 10);
}

function flashTela() {
    if (reduzMovimento) return;
    const el = document.createElement('div');
    el.className = 'flash-tela';
    efeitosEl.appendChild(el);
    el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' }).onfinish = () => el.remove();
}

// nome sorteado "decodificando": caracteres aleatórios que se fixam da esquerda para a direita
function decodificarTexto(el, final, ms, aindaValido) {
    const alvos = Array.isArray(el) ? el : [el];
    const definir = (texto) => alvos.forEach((a) => { a.textContent = texto; });
    if (reduzMovimento || !final) {
        definir(final);
        return;
    }
    const simbolos = '01#$%&@*+=<>/\\|?ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const inicio = performance.now();
    (function passo() {
        if (!aindaValido()) return;
        const p = Math.min(1, (performance.now() - inicio) / ms);
        const fixas = Math.floor(final.length * p);
        let t = '';
        for (let i = 0; i < final.length; i++) {
            t += (i < fixas || final[i] === ' ') ? final[i] : simbolos[Math.floor(Math.random() * simbolos.length)];
        }
        definir(t);
        if (p < 1) setTimeout(passo, 35);
        else definir(final);
    })();
}

if (!reduzMovimento) {
    document.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest ? e.target.closest('button') : null;
        const ativo = btn && !btn.disabled && !btn.classList.contains('somente-leitura');
        if (ativo) ondaNoBotao(btn, e.clientX, e.clientY);
        explosaoCodigo(e.clientX, e.clientY, ativo ? 12 : 8);
    });

    document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const t = performance.now();
        if (t - ultimoRastro < 45) return;
        ultimoRastro = t;
        criarRastro(e.clientX, e.clientY);
    });
}

// ESPECTADOR: campo de nomes espelhado (somente leitura) e mensagem de espera
function prepararModoEspectador() {
    const campo = document.getElementById('names');
    if (campo) {
        campo.placeholder = 'Aguardando o anfitrião informar os nomes...';
        campo.readOnly = true;
    }
}
if (window.isViewer) prepararModoEspectador();

// JANELA DO SORTEADO — como as animações de minimizar do macOS:
//  • abre com o efeito Gênio: a janela é fatiada em faixas horizontais que saem de um ponto (o ponteiro
//    da roleta; em telas estreitas, o centro da borda de baixo, como o Dock) e se deformam em funil
//    até assumir a forma final;
//  • fecha com o efeito Escala: encolhe de volta para o mesmo ponto.
let modalAnimId = 0;
let modalFechando = false;
const limitar01 = (v) => Math.min(1, Math.max(0, v));
const suave = (p) => p * p * (3 - 2 * p);

function origemGenio(m) {
    const p = document.getElementById('pointer').getBoundingClientRect();
    const px = p.left + p.width / 2;
    const py = p.top + p.height / 2;
    if (py < m.top - 10) return { x: px, y: py, acima: true };
    return { x: window.innerWidth / 2, y: window.innerHeight + 10, acima: false };
}

function removerGenio() {
    const camada = document.getElementById('genio');
    if (camada) camada.remove();
}

// aoTerminar: chamado quando a janela termina de abrir (ou na hora, se o movimento está reduzido)
function abrirComGenio(aoTerminar) {
    const modalEl = document.getElementById('modal');
    const alvo = document.getElementById('modalContent');
    modalEl.getAnimations().forEach((a) => a.cancel());
    alvo.getAnimations().forEach((a) => a.cancel());
    modalFechando = false;
    alvo.style.visibility = '';
    removerGenio();
    if (reduzMovimento) {
        if (aoTerminar) aoTerminar();
        return;
    }

    const id = ++modalAnimId;
    const m = alvo.getBoundingClientRect();
    const o = origemGenio(m);
    const N = 44;           // faixas (quanto mais, mais suave a borda do funil)
    const K = 20;           // quadros-chave por faixa
    const D = 900;          // ms
    const hs = m.height / N;
    const cxN = m.left + m.width / 2;

    modalEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
    alvo.style.visibility = 'hidden';

    const camada = document.createElement('div');
    camada.id = 'genio';
    camada.className = 'genio';
    document.body.appendChild(camada);

    const faixas = [];
    for (let i = 0; i < N; i++) {
        const f = document.createElement('div');
        f.className = 'genio-faixa';
        f.style.cssText = `left:${m.left}px; top:${m.top + i * hs}px; width:${m.width}px; height:${hs + 0.6}px`;
        const copia = alvo.cloneNode(true);
        copia.style.cssText = `position:absolute; left:0; top:${-i * hs}px; width:${m.width}px; height:${m.height}px; margin:0; max-width:none; visibility:visible`;
        f.appendChild(copia);
        camada.appendChild(f);
        faixas.push(f);
    }

    // proximidade 0 = faixa colada na origem. A ponta distante da janela se forma primeiro e a parte
    // colada na origem fica fina (o "pescoço" do funil) e chega por último, como no efeito do macOS.
    const proximidade = (i) => (o.acima ? i : N - 1 - i) / (N - 1);
    const quadros = faixas.map(() => []);

    for (let k = 0; k < K; k++) {
        const p = k / (K - 1);
        const ys = [];
        const xs = [];
        const sxs = [];
        for (let i = 0; i < N; i++) {
            const q = suave(limitar01((p - 0.35 * (1 - proximidade(i))) / 0.65));
            ys.push(lerp(o.y, m.top + (i + 0.5) * hs, q));
            xs.push(lerp(o.x, cxN, q));
            sxs.push(lerp(0.03, 1, Math.pow(q, 2.2)));
        }
        for (let i = 0; i < N; i++) {
            const vizinho = i < N - 1 ? ys[i + 1] - ys[i] : ys[i] - ys[i - 1];
            const sy = Math.max(0.15, Math.abs(vizinho) / hs);
            quadros[i].push({
                transform: `translate(${(xs[i] - cxN).toFixed(1)}px, ${(ys[i] - (m.top + (i + 0.5) * hs)).toFixed(1)}px) scale(${sxs[i].toFixed(3)}, ${sy.toFixed(3)})`,
                opacity: Math.min(1, p / 0.12),
                offset: p
            });
        }
    }

    const anims = faixas.map((f, i) => f.animate(quadros[i], { duration: D, easing: 'linear', fill: 'both' }));
    anims[0].onfinish = () => {
        camada.remove();
        if (id !== modalAnimId) return;
        alvo.style.visibility = '';
        alvo.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 120 });   // o brilho da borda, que as faixas cortavam
        if (aoTerminar) aoTerminar();
    };
}

// efeito Escala: a janela encolhe de volta para o ponto de origem
function escalaFechar(modalEl, conteudo) {
    const m = conteudo.getBoundingClientRect();
    const o = origemGenio(m);
    const dx = o.x - (m.left + m.width / 2);
    const dy = o.y - (m.top + m.height / 2);
    const id = ++modalAnimId;
    modalFechando = true;

    modalEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
    conteudo.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.05)`, opacity: 0 }
    ], { duration: 260, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
        if (id !== modalAnimId) return;
        modalFechando = false;
        modalEl.getAnimations().forEach((a) => a.cancel());
        conteudo.getAnimations().forEach((a) => a.cancel());
        modalEl.style.display = 'none';
    };
}

// ENCERRAMENTO DA REUNIÃO
// Ao clicar em OK no último sorteado: aparece "Reunião encerrada, até a próxima", a tela inteira vira um
// ícone, o ícone entra num túnel de código binário e, 3 s depois, é colocado num computador dos anos 90 —
// o desktop dele é a nova tela. Clicando no ícone, a roleta volta pelo mesmo túnel.
// Tudo é função do tempo do servidor (estado.enc = { t0, volta }), então os espectadores veem a mesma cena.
let encLocal = null;   // o que o anfitrião publica: { t0, volta? }
let encAnim = null;    // o que está sendo animado neste cliente: { t0, volta }
let encVisivel = false;
let encTunelAtivo = false;
let encSons = {};
let encResetFeito = false;
let encRelogio = '';

const encEl = document.getElementById('encerramento');
const encPainel = document.getElementById('encPainel');
const encLinha1 = document.getElementById('encLinha1');
const encLinha2 = document.getElementById('encLinha2');
const encTunel = document.getElementById('encTunel');
const encTunelCtx = encTunel.getContext('2d');
const encVoo = document.getElementById('encVoo');
const encMonitor = document.getElementById('encMonitor');
const encTela = document.getElementById('encTela');
const encFlash = document.getElementById('encFlash');
const deskRoleta = document.getElementById('deskRoleta');
const deskIcone = deskRoleta.querySelector('.app-icone');
const deskRelogio = document.getElementById('deskRelogio');

// marcos da linha do tempo (ms desde o fim da reunião)
const ENC_ICONE = 96;      // tamanho do ícone que voa pelo túnel (px)
const ENC_MSG_FIM = 2800;  // mensagem na tela
const ENC_COLAPSO_FIM = 3600;   // a tela encolhe até virar o ícone
const ENC_TUNEL_FIM = 6600;     // 3 s dentro do túnel
const ENC_PLACA_FIM = 7600;     // computador liga e o ícone é colocado no desktop
const ENC_VOLTA_FIM = 3500;     // (ms desde o clique no ícone) túnel de volta + revela a roleta

function encerrarReuniao() {
    if (encAnim) return;
    encLocal = { t0: agora() + 300 };   // espera a janela do sorteado fechar
    encAnim = { t0: encLocal.t0, volta: null };
    encSons = {};
    encResetFeito = false;
    publicar();
}

// Anfitrião: clique no ícone do desktop → roleta volta
function reabrirDoDesktop() {
    if (window.isViewer || !encAnim || encAnim.volta) return;
    if (agora() - encAnim.t0 < ENC_PLACA_FIM) return;   // só depois que o ícone foi colocado
    encAnim.volta = agora();
    encLocal = { t0: encAnim.t0, volta: encAnim.volta };
    publicar();
}
deskRoleta.addEventListener('click', reabrirDoDesktop);
deskRoleta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        reabrirDoDesktop();
    }
});

// Anfitrião: depois da volta, recomeça do zero (timers, nomes e lista padrão)
function resetarAposEncerramento() {
    if (encResetFeito) return;
    encResetFeito = true;
    if (window.isViewer) return;   // o espectador recebe o estado novo do anfitrião
    timerEstado = { ...timerPadrao(), mostrar: timerEstado.mostrar };
    const campo = document.getElementById('names');
    if (campo) campo.value = '';
    window.setupWheel('');
    encLocal = null;
    publicar();
}

function ajustarTunel() {
    encTunel.width = window.innerWidth;
    encTunel.height = window.innerHeight;
    encTunelAtivo = false;
}
window.addEventListener('resize', () => { if (encVisivel) ajustarTunel(); });

function mostrarEnc() {
    encVisivel = true;
    encEl.hidden = false;
    document.querySelector('.container').inert = true;
    ajustarTunel();
}

function esconderEnc() {
    encVisivel = false;
    encEl.hidden = true;
    encEl.style.opacity = '0';
    document.querySelector('.container').inert = false;
    encMonitor.style.transformOrigin = '';
    [encPainel, encMonitor, encTela].forEach((el) => { el.style.transform = ''; el.style.opacity = ''; el.style.filter = ''; });
    encVoo.style.opacity = '0';
    encTunel.style.opacity = '0';
    encFlash.style.opacity = '0';
    deskIcone.style.visibility = '';
    deskRoleta.classList.remove('sel');
    encLinha1.textContent = '';
    encLinha2.textContent = '';
    encTunelAtivo = false;
}

function tocarChime90s() {
    try {
        const a = getTickAudioCtx();
        const t0 = a.currentTime + 0.02;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const t = t0 + i * 0.16;
            const osc = a.createOscillator();
            const g = a.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.001, t);
            g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(g);
            g.connect(a.destination);
            osc.start(t);
            osc.stop(t + 0.52);
        });
    } catch (e) { /* áudio ainda não liberado pelo navegador: segue sem som */ }
}

// Túnel de código binário em perspectiva: anéis de 0 e 1 que correm para perto da câmera
function desenharTunel(tMs, u, fator, alfa) {
    const c = encTunelCtx;
    const w = encTunel.width;
    const h = encTunel.height;
    if (!encTunelAtivo) {
        c.fillStyle = '#000';
        c.fillRect(0, 0, w, h);
        encTunelAtivo = true;
    }
    encTunel.style.opacity = alfa.toFixed(3);
    c.fillStyle = 'rgba(0, 0, 0, 0.3)';   // rastro
    c.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const rMax = Math.hypot(w, h) * 0.62;
    const colunas = 30;
    const aneis = 16;
    const avanco = (tMs / 1000) * (0.35 + 0.9 * u) * fator;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    for (let j = 0; j < aneis; j++) {
        const s = (j / aneis + avanco) % 1;   // 0 = longe, 1 = perto
        const r = rMax * s * s;
        c.font = `bold ${(6 + 40 * s * s).toFixed(1)}px monospace`;
        const a = 0.15 + 0.85 * s;
        c.fillStyle = s > 0.85 ? `rgba(190, 255, 220, ${a})` : `rgba(0, 255, 136, ${a})`;
        for (let k = 0; k < colunas; k++) {
            const ang = (k / colunas) * Math.PI * 2 + s * 1.4 + tMs * 0.00012;
            const ch = ((k * 7 + j * 13 + Math.floor(tMs / 140)) & 1) ? '1' : '0';
            c.fillText(ch, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        }
    }
}

function textoComCursor(texto, digitando, piscando) {
    return texto + (digitando || piscando ? '█' : '');
}

function quadroIda(t) {
    encEl.style.opacity = limitar01(t / 500).toFixed(3);

    // 1) mensagem, "digitada" no estilo terminal
    const l1 = '> REUNIÃO ENCERRADA';
    const l2 = 'Até a próxima!';
    const n1 = Math.max(0, Math.min(l1.length, Math.floor((t - 300) / 45)));
    const n2 = Math.max(0, Math.min(l2.length, Math.floor((t - 1300) / 55)));
    const piscando = Math.floor(t / 500) % 2 === 0;
    definirTexto(encLinha1, textoComCursor(l1.slice(0, n1), n1 < l1.length, false));
    definirTexto(encLinha2, n1 < l1.length ? '' : textoComCursor(l2.slice(0, n2), n2 < l2.length, piscando && n2 === l2.length));

    // 2) a tela inteira encolhe até virar o ícone
    if (t < ENC_MSG_FIM) {
        encPainel.style.transform = '';
        encPainel.style.opacity = '1';
        encLinha1.style.opacity = encLinha2.style.opacity = '1';
        encVoo.style.opacity = '0';
    } else if (t < ENC_COLAPSO_FIM) {
        const u = suave((t - ENC_MSG_FIM) / (ENC_COLAPSO_FIM - ENC_MSG_FIM));
        const w = encPainel.offsetWidth || 1;
        const h = encPainel.offsetHeight || 1;
        encPainel.style.transform = `scale(${lerp(1, ENC_ICONE / w, u)}, ${lerp(1, ENC_ICONE / h, u)})`;
        encLinha1.style.opacity = encLinha2.style.opacity = String(1 - limitar01(u * 2.2));
        encPainel.style.opacity = String(1 - limitar01((u - 0.7) / 0.3));
        encVoo.style.opacity = String(limitar01((u - 0.35) / 0.65));
        encVoo.style.transform = 'scale(1)';
    } else {
        encPainel.style.opacity = '0';
    }

    // 3) túnel de código binário (3 s) com o ícone se afastando para o fundo
    if (t >= ENC_COLAPSO_FIM && t < ENC_TUNEL_FIM + 400) {
        const tt = t - ENC_COLAPSO_FIM;
        const u = limitar01(tt / (ENC_TUNEL_FIM - ENC_COLAPSO_FIM));
        const alfa = t < ENC_COLAPSO_FIM + 300 ? (t - ENC_COLAPSO_FIM) / 300 : t > ENC_TUNEL_FIM ? 1 - (t - ENC_TUNEL_FIM) / 400 : 1;
        desenharTunel(tt, u, 1, limitar01(alfa));
        if (!encSons.tunel && t < ENC_COLAPSO_FIM + 600) {
            encSons.tunel = true;
            tocarSaidaDaMatrix();
        }
    } else {
        encTunel.style.opacity = '0';
        encTunelAtivo = false;
    }

    // 4) clarão, o computador liga (efeito de TV antiga) e o ícone é colocado no desktop
    const flash = t < 6500 ? 0 : t < 6600 ? (t - 6500) / 100 * 0.9 : t < 7000 ? 0.9 * (1 - (t - 6600) / 400) : 0;
    encFlash.style.opacity = flash.toFixed(3);

    if (t < 6700) {
        encMonitor.style.opacity = '0';
    } else {
        encMonitor.style.opacity = '1';
        const lig = easeOut(limitar01((t - 6750) / 350));
        encTela.style.transform = lig < 1 ? `scale(1, ${lerp(0.02, 1, lig).toFixed(3)})` : '';
        encTela.style.filter = lig < 1 ? `brightness(${lerp(4, 1, lig).toFixed(2)})` : '';
    }

    const noDesktop = t >= ENC_PLACA_FIM;
    deskIcone.style.visibility = noDesktop ? 'visible' : 'hidden';
    deskRoleta.classList.remove('sel');

    if (t >= ENC_COLAPSO_FIM && t < ENC_PLACA_FIM) {
        let escala;
        let dx = 0;
        let dy = 0;
        if (t < 7100) {
            escala = lerp(1, 0.12, easeIn(limitar01((t - ENC_COLAPSO_FIM) / (ENC_TUNEL_FIM - ENC_COLAPSO_FIM))));
        } else {
            // o ícone voa do fundo do túnel até o seu lugar no desktop
            const r = deskIcone.getBoundingClientRect();
            const p = easeOut(limitar01((t - 7100) / (ENC_PLACA_FIM - 7100)));
            escala = lerp(0.12, r.width / ENC_ICONE, p);
            dx = (r.left + r.width / 2 - window.innerWidth / 2) * p;
            dy = (r.top + r.height / 2 - window.innerHeight / 2) * p;
            if (!encSons.chime) {
                encSons.chime = true;
                tocarChime90s();
            }
        }
        encVoo.style.opacity = '1';
        encVoo.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${escala.toFixed(3)})`;
    } else if (noDesktop) {
        encVoo.style.opacity = '0';
    }

    // relógio do desktop
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (hora !== encRelogio) {
        encRelogio = hora;
        deskRelogio.textContent = hora;
    }
}

function quadroVolta(tv) {
    encEl.style.opacity = tv > 3000 ? String(1 - limitar01((tv - 3000) / 500)) : '1';
    encPainel.style.opacity = '0';
    encLinha1.textContent = encLinha2.textContent = '';
    deskIcone.style.visibility = 'visible';
    deskRoleta.classList.toggle('sel', tv < 900);

    if (tv < 900) {
        // zoom do monitor até o ícone clicado
        const u = suave(limitar01((tv - 250) / 650));
        encMonitor.style.transform = '';   // mede o ícone sem o zoom aplicado (vale também para quem entra no meio)
        const r = deskIcone.getBoundingClientRect();
        encMonitor.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
        encMonitor.style.transform = `scale(${lerp(1, 7, u).toFixed(3)})`;
        encMonitor.style.opacity = String(1 - limitar01((u - 0.55) / 0.45));
        encVoo.style.opacity = '0';
        encTunel.style.opacity = '0';
        encTunelAtivo = false;
    } else {
        // túnel de volta: o ícone cresce vindo do fundo, na direção da câmera
        encMonitor.style.opacity = '0';
        const tt = tv - 900;
        const u = limitar01(tt / 2100);
        const alfa = tv < 1200 ? (tv - 900) / 300 : tv > 2700 ? 1 - (tv - 2700) / 300 : 1;
        desenharTunel(tt, u, 1.8, limitar01(alfa));
        encVoo.style.opacity = '1';
        encVoo.style.transform = `scale(${lerp(0.12, 1.6, easeIn(u)).toFixed(3)})`;
        if (!encSons.volta && tv < 1500) {
            encSons.volta = true;
            tocarSaidaDaMatrix();
        }
    }

    const flash = tv < 2700 ? 0 : tv < 3000 ? (tv - 2700) / 300 * 0.9 : 0.9 * (1 - limitar01((tv - 3000) / 500));
    encFlash.style.opacity = flash.toFixed(3);

    if (tv >= 2900) resetarAposEncerramento();   // a roleta já está nova quando o clarão a revela
}

function atualizarEncerramento(now) {
    const a = encAnim;
    if (!a) {
        if (encVisivel) esconderEnc();
        return;
    }
    const t = now - a.t0;
    if (t < 0) return;
    if (!encVisivel) mostrarEnc();

    if (a.volta && now >= a.volta) {
        const tv = now - a.volta;
        if (reduzMovimento || tv >= ENC_VOLTA_FIM) {
            resetarAposEncerramento();
            encAnim = null;
            esconderEnc();
            return;
        }
        quadroVolta(tv);
    } else {
        quadroIda(reduzMovimento && t > ENC_MSG_FIM ? Math.max(t, ENC_PLACA_FIM) : t);
    }
}

// Espectador: segue o que o anfitrião publicou
function aplicarEncerramentoRemoto(e) {
    if (e && e.t0) {
        if (!encAnim || encAnim.t0 !== e.t0) {
            encAnim = { t0: e.t0, volta: e.volta || null };
            encSons = {};
            encResetFeito = false;
        } else if (e.volta && !encAnim.volta) {
            encAnim.volta = e.volta;
        }
    } else if (encAnim && !encAnim.volta) {
        encAnim = null;   // o anfitrião recomeçou sem passar pela volta (ex.: recarregou a página)
    }
}

window.onload = () => {
    if (window.isViewer) {
        // Não limpa o estado aqui: o banco pode já ter respondido antes do load terminar
        showToast("🔊 Toque na tela para ativar o som.", "info", 6000);
        return;
    }

    // O navegador restaura o conteúdo do textarea no reload; a rodada sempre começa limpa
    const namesInput = document.getElementById('names');
    if (namesInput) namesInput.value = '';

    window.setupWheel('');
};

if (window.isViewer === false) {
    const namesInput = document.getElementById('names');
    if (namesInput) namesInput.addEventListener('input', () => window.setupWheel(namesInput.value));

    // Estado inicial do anfitrião (lista padrão) já pronto antes de assumir o banco
    window.setupWheel('');
}

// NEO VOADOR
// De 30 s a 2,5 min (sorteado a cada vez) ele cruza a tela voando (passagem direta, mergulho/subida ou
// parada no ar e arrancada). O anfitrião sorteia o voo e o publica (estado.neoVoo); anfitrião e espectadores
// executam o MESMO voo, no mesmo horário. As alturas são frações da altura da tela de cada um.
const neoEl = document.getElementById('bonecoVoador');
let neoEmVoo = false;
let neoAnimAtual = null;
let neoVooAtual = null;   // último voo sorteado (publicado no estado)
let neoVooVisto = null;   // id do último voo já tratado neste cliente
// Intervalo (ms) entre uma aparição e a próxima: sorteado a cada vez
const NEO_INTERVALO_MIN = 30000;
const NEO_INTERVALO_MAX = 150000;
const aleatorio = (min, max) => min + Math.random() * (max - min);
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeIn = (p) => p * p * p;

function agendarNeo(ms = aleatorio(NEO_INTERVALO_MIN, NEO_INTERVALO_MAX)) {
    if (window.isViewer) return;   // só o anfitrião sorteia
    setTimeout(voarNeo, ms);
}

// Anfitrião: sorteia o voo, executa e publica
function voarNeo() {
    if (window.isViewer) return;
    if (neoEmVoo || neoPousando || encAnim || document.hidden) {
        agendarNeo(500);
        return;
    }
    agendarNeo();

    const sorteio = Math.random();
    const tipo = sorteio < 0.25 ? 'mergulho' : sorteio < 0.45 ? 'subida' : sorteio < 0.75 ? 'paira' : 'direto';
    const paira = tipo === 'paira';
    const voo = {
        id: `${agora()}-${Math.floor(Math.random() * 1e6)}`,
        t0: agora(),
        dir: Math.random() < 0.5 ? 1 : -1,                    // 1: esquerda→direita
        tipo,
        yIni: paira ? aleatorio(0.1, 0.4) : aleatorio(0.08, 0.8),
        yFim: paira ? aleatorio(0.1, 0.4) : aleatorio(0.05, 0.85),
        yParada: aleatorio(0.25, 0.65),
        duracao: Math.round(paira ? aleatorio(3000, 3600) : aleatorio(2200, 3000)),
        giro: !paira && Math.random() < 0.4 ? 360 : 0         // tonel (barrel roll)
    };
    neoVooAtual = voo;
    neoVooVisto = voo.id;
    executarVooNeo(voo, 0);
    publicar();
}

// Executa um voo a partir do instante `decorrido` (ms): quem chega no meio entra na hora certa
function executarVooNeo(voo, decorrido) {
    if (!neoEl.animate || reduzMovimento || neoEmVoo || neoPousando) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const larg = neoEl.offsetWidth || 160;
    const alt = neoEl.offsetHeight || 70;
    const dir = voo.dir;
    const xIni = dir === 1 ? -larg - 10 : w + 10;
    const xFim = dir === 1 ? w + 10 : -larg - 10;
    const yMax = Math.max(h - alt, alt);
    const paira = voo.tipo === 'paira';

    let yIni = voo.yIni * yMax;
    let yFim = voo.yFim * yMax;
    if (voo.tipo === 'mergulho') {         // do alto até embaixo
        yIni = -alt;
        yFim = yMax + alt * 0.5;
    } else if (voo.tipo === 'subida') {    // de baixo até o alto
        yIni = yMax + alt * 0.5;
        yFim = -alt;
    }

    const giro = voo.giro;
    const inclinacao = Math.atan2(yFim - yIni, Math.abs(xFim - xIni)) * 180 / Math.PI;
    const yParada = voo.yParada * yMax;
    const xParada = lerp(xIni, xFim, 0.5);

    const posicao = (p) => {            // p: 0..1 do voo -> {x, y, rot}
        if (!paira) {
            return { x: lerp(xIni, xFim, p), y: lerp(yIni, yFim, p) + Math.sin(p * Math.PI * 2) * 25, rot: inclinacao + giro * p };
        }
        if (p < 0.35) {                 // chegada, desacelerando
            const q = easeOut(p / 0.35);
            return { x: lerp(xIni, xParada, q), y: lerp(yIni, yParada, q), rot: lerp(inclinacao, 0, q) };
        }
        if (p < 0.65) {                 // paira balançando levemente
            const q = (p - 0.35) / 0.3;
            return { x: xParada + dir * q * 20, y: yParada + Math.sin(q * Math.PI * 2) * 10, rot: Math.sin(q * Math.PI * 2) * 4 };
        }
        const q = easeIn((p - 0.65) / 0.35);   // arrancada
        return { x: lerp(xParada + dir * 20, xFim, q), y: lerp(yParada, yFim, q), rot: lerp(0, inclinacao, q) };
    };

    const N = 48;
    const quadros = [];
    for (let i = 0; i <= N; i++) {
        const p = i / N;
        const { x, y, rot } = posicao(p);
        quadros.push({
            transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scaleX(${dir}) rotate(${rot.toFixed(1)}deg)`,
            opacity: p < 0.06 ? p / 0.06 : p > 0.94 ? (1 - p) / 0.06 : 1,
            offset: p
        });
    }

    neoEmVoo = true;
    const anim = neoEl.animate(quadros, { duration: voo.duracao, easing: 'linear' });
    if (decorrido > 0) anim.currentTime = decorrido;
    neoAnimAtual = anim;
    anim.onfinish = anim.oncancel = () => { if (neoAnimAtual === anim) neoEmVoo = false; };
}

// Espectador: executa o voo que o anfitrião publicou (ignora voos que já terminaram)
function aplicarVooRemoto(voo) {
    if (!voo || !voo.id || voo.id === neoVooVisto) return;
    neoVooVisto = voo.id;
    const decorrido = agora() - voo.t0;
    if (decorrido >= 0 && decorrido < voo.duracao - 200) executarVooNeo(voo, decorrido);
}

if (!window.isViewer && neoEl.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    agendarNeo(aleatorio(20000, 60000));
}

requestAnimationFrame(frame);
