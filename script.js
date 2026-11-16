// MODO: anfitrião (padrão) ou espectador (?role=viewer)
window.isViewer = new URLSearchParams(window.location.search).get('role') === 'viewer';
document.body.classList.toggle('viewer', window.isViewer);

// Relógio do servidor (definido por sync.js) — mantém todos os clientes na mesma linha do tempo
let offsetServidor = 0;
window.definirOffsetServidor = (ms) => { offsetServidor = ms || 0; };
const agora = () => Date.now() + offsetServidor;

// FUNDO "MATRIX"
const canvasBg = document.getElementById("matrixCanvas");
const ctxBg = canvasBg.getContext("2d");

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
const sound = document.getElementById('sound');
sound.volume = 0.3;

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
    [sound, document.getElementById('rocketSound'), document.getElementById('explosionSound')].forEach(a => {
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
let timerEstado = { mostrar: true, rodando: false, base: 0, desde: 0 };

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
    const emGiro = !!giro;

    if (spinBtn) {
        spinBtn.style.display = (window.isViewer || entries.length === 0 || usandoListaPadrao) ? 'none' : 'block';
        spinBtn.disabled = emGiro;
    }
    if (namesInput) namesInput.disabled = emGiro;
}

// Estado que o anfitrião grava no banco
window.obterEstado = function() {
    return {
        entries: entries.map(({ id, name, color }) => ({ id, name, color })),
        repouso: { angulo: repouso.angulo, desde: repouso.desde },
        giro: giro ? { ...giro } : null,
        foguetes: configFoguetes,
        timer: { ...timerEstado }
    };
};

function publicar(opcoes) {
    if (!window.isViewer && typeof window.publicarEstado === 'function') {
        window.publicarEstado(opcoes);
    }
}

// Lista usada quando o anfitrião ainda não informou nenhum nome
let usandoListaPadrao = true;   // a lista padrão é só demonstração: não pode ser sorteada
const NOMES_PADRAO = ["Aeronauta Barata", "Agrícola Beterraba Areia", "Agrícola da Terra Fonseca", "Alce Barbuda", "Amado Amoroso", "Amável Pinto", "Ravi", "Helena", "Igor", "Juliana"];

// Anfitrião: nomes digitados (vazio = lista padrão)
window.setupWheel = function(texto = '') {
    if (window.isViewer || giro) return;

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

    const lista = Array.isArray(novo.entries) ? novo.entries : Object.values(novo.entries || {});
    const novas = lista.filter(Boolean);
    const mudou = novas.length !== entries.length || novas.some((e, i) => e.id !== entries[i].id);

    entries = novas;
    arc = entries.length ? Math.PI * 2 / entries.length : 0;
    repouso = novo.repouso || { angulo: 0, desde: agora() };
    configFoguetes = novo.foguetes || 5;
    timerEstado = { mostrar: true, rodando: false, base: 0, desde: 0, ...(novo.timer || {}) };
    if (mudou) createSparkles();

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
        if (agora() >= giro.startTime + giro.duration) {
            // Entrou depois do giro terminar: só mostra o resultado, sem repetir som e fogos
            giroConcluidoId = giro.id;
            const entry = entries.find(e => e.id === giro.winnerId);
            if (entry) mostrarVencedor(entry, true);
        } else {
            iniciarGiroLocal();
        }
    }

    atualizarBotao();
};

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
    c.font = `bold ${fontSize}px Arial`;

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
        const p = Math.min(Math.max((now - giro.startTime) / giro.duration, 0), 1);
        return giro.from + (giro.to - giro.from) * easeOutCubic(p);
    }
    return repouso.angulo + IDLE_SPEED * Math.max(0, now - repouso.desde);
}

// Anfitrião: sorteia o vencedor primeiro e calcula o ângulo final que o faz cair no ponteiro
window.girar = function() {
    if (window.isViewer || entries.length === 0 || usandoListaPadrao || giro) return;

    liberarAudio();
    startTimer();

    const now = agora();
    const indice = Math.floor(Math.random() * entries.length);
    const dentroDaFatia = arc * (0.1 + Math.random() * 0.8);
    const base = POINTER_ANGLE - (indice * arc + dentroDaFatia);
    const from = anguloEm(now);
    const minimo = from + (5 + Math.floor(Math.random() * 5)) * Math.PI * 2;
    const to = base + Math.PI * 2 * Math.ceil((minimo - base) / (Math.PI * 2));

    giro = {
        id: `${now}-${Math.floor(Math.random() * 1e6)}`,
        startTime: now + ATRASO_BONECO,
        duration: configDuracao,
        from,
        to,
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
    window.animarBoneco(giro.startTime);
}

function processarGiro(now) {
    if (giro.id === giroConcluidoId) return;

    if (now >= giro.startTime) {
        if (giroEfeitosId !== giro.id) {
            giroEfeitosId = giro.id;
            lastTickAngle = startAngle;
            startHackingEffect();
        }

        const crossedSlices = Math.floor((startAngle + Math.PI / 2) / arc) - Math.floor((lastTickAngle + Math.PI / 2) / arc);
        if (crossedSlices !== 0) {
            playTicks(Math.abs(crossedSlices));
            flashPointer();
            lastTickAngle = startAngle;
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
        pauseTimer();
        const namesInput = document.getElementById('names');
        if (namesInput) namesInput.value = '';
        window.setupWheel('');
    }

    atualizarBotao();
    publicar();
}

function esconderModalVencedor() {
    vencedorId = null;
    document.getElementById('modal').style.display = 'none';
}

function mostrarVencedor(entry, silencioso) {
    vencedorId = entry.id;

    const winnerEl = document.getElementById('winner');
    winnerEl.classList.remove('glitch');
    void winnerEl.offsetWidth;
    const strong = document.createElement('strong');
    strong.textContent = entry.name;
    winnerEl.replaceChildren(strong);
    winnerEl.classList.add('glitch');

    document.getElementById('modal').style.display = 'flex';

    const okBtn = document.getElementById('okBtn');
    if (okBtn) okBtn.style.display = window.isViewer ? 'none' : 'inline-block';

    if (!silencioso) {
        sound.currentTime = 1;
        sound.volume = 0.3;
        sound.play().catch(() => {});
        fireworks();
    }
}

document.getElementById('okBtn').addEventListener('click', confirmarVencedor);

// LOOP ÚNICO DE RENDERIZAÇÃO (substitui o idle, o rotateWheel e o blink separados)
function frame() {
    const now = agora();
    startAngle = anguloEm(now);

    atualizarTimerUI(now);
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

    tocarAudio(document.getElementById('rocketSound'), 0.1);

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
    atualizarBotao();
};

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
function segundosTimer(now) {
    const corrido = timerEstado.rodando ? Math.max(0, Math.floor((now - timerEstado.desde) / 1000)) : 0;
    return timerEstado.base + corrido;
}

function startTimer() {
    if (timerEstado.rodando) return;
    timerEstado.rodando = true;
    timerEstado.desde = agora();
}

function pauseTimer() {
    if (!timerEstado.rodando) return;
    timerEstado.base = segundosTimer(agora());
    timerEstado.rodando = false;
}

let timerTextoAtual = '';
function atualizarTimerUI(now) {
    const el = document.getElementById('speechTimer');
    const visivel = timerEstado.mostrar ? 'block' : 'none';
    if (el.style.display !== visivel) el.style.display = visivel;

    const total = segundosTimer(now);
    const texto = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    if (texto !== timerTextoAtual) {
        timerTextoAtual = texto;
        el.textContent = texto;
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
// A cada 10–30 s (sorteado) ele cruza a tela voando (passagem direta, mergulho/subida ou parada no ar
// e arrancada). É só decoração: cada cliente sorteia o próprio trajeto.
const neoEl = document.getElementById('bonecoVoador');
let neoEmVoo = false;
// Intervalo (ms) entre uma aparição e a próxima: sorteado a cada vez
const NEO_INTERVALO_MIN = 10000;
const NEO_INTERVALO_MAX = 30000;
const aleatorio = (min, max) => min + Math.random() * (max - min);
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeIn = (p) => p * p * p;

function agendarNeo(ms = aleatorio(NEO_INTERVALO_MIN, NEO_INTERVALO_MAX)) {
    setTimeout(voarNeo, ms);
}

function voarNeo() {
    if (neoEmVoo || neoPousando || document.hidden) {
        agendarNeo(500);
        return;
    }
    agendarNeo();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const larg = neoEl.offsetWidth || 160;
    const alt = neoEl.offsetHeight || 70;
    const dir = Math.random() < 0.5 ? 1 : -1;          // 1: esquerda→direita
    const xIni = dir === 1 ? -larg - 10 : w + 10;
    const xFim = dir === 1 ? w + 10 : -larg - 10;
    const sorteio = Math.random();
    const yMax = Math.max(h - alt, alt);

    let yIni = aleatorio(0.08, 0.8) * yMax;
    let yFim = aleatorio(0.05, 0.85) * yMax;
    let duracao = aleatorio(2200, 3000);
    let paira = false;

    if (sorteio < 0.25) {              // mergulho: do alto até embaixo
        yIni = -alt;
        yFim = yMax + alt * 0.5;
    } else if (sorteio < 0.45) {       // subida: de baixo até o alto
        yIni = yMax + alt * 0.5;
        yFim = -alt;
    } else if (sorteio < 0.75) {       // chega, paira no ar e arranca
        paira = true;
        duracao = aleatorio(3000, 3600);
        yIni = aleatorio(0.1, 0.4) * yMax;
        yFim = aleatorio(0.1, 0.4) * yMax;
    }

    const giro = !paira && Math.random() < 0.4 ? 360 : 0;   // tonel (barrel roll)
    const inclinacao = Math.atan2(yFim - yIni, Math.abs(xFim - xIni)) * 180 / Math.PI;
    const yParada = aleatorio(0.25, 0.65) * yMax;
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
    const anim = neoEl.animate(quadros, { duration: duracao, easing: 'linear' });
    anim.onfinish = anim.oncancel = () => { neoEmVoo = false; };
}

if (neoEl.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    agendarNeo(aleatorio(3000, 8000));
}

requestAnimationFrame(frame);
