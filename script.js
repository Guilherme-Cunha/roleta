// Controla se a roleta já girou pelo menos uma vez nesta sessão — usado em
// setupWheel() pra perguntar antes de gerar a roleta de novo (evita perder
// o giro em andamento por engano)
let starded = 0;

// ====================================================================
// FUNDO "MATRIX" — a chuva de caracteres verdes desenhada no canvas de
// fundo (#matrixCanvas), atrás de todo o resto da página.
// ====================================================================
const canvasBg = document.getElementById("matrixCanvas");
const ctxBg = canvasBg.getContext("2d");

let allParticles = []; // todas as partículas de todos os foguetes
let fireworksAnimation = null;

canvasBg.height = window.innerHeight;
canvasBg.width = window.innerWidth;

const letters = "イエス・キリストは昨日も今日も永遠に同じである".split("");
const matrixFontSize = 14;
// "drops" guarda, para cada coluna de caracteres, a altura atual da "gota" que está caindo
const drops = Array(Math.floor(canvasBg.width / matrixFontSize)).fill(1);

// Reajusta o canvas de fundo ao tamanho da janela e recalcula quantas colunas
// de caracteres cabem, adicionando/removendo colunas conforme necessário
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

// Desenha um quadro da chuva de caracteres: escurece levemente o quadro
// anterior (efeito de rastro) e desenha um caractere aleatório por coluna,
// avançando cada "gota" um pouco mais pra baixo a cada chamada
function drawMatrix() {
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

// Faíscas orbitando a borda da roleta — giram junto com ela (ancoradas em startAngle)
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

// Desenha as faíscas na posição atual da borda da roleta e faz cada uma
// piscar (o brilho vai e volta entre `alpha` mínimo e máximo a cada quadro)
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
        ctx.fillStyle = `rgba(0, 255, 136, ${p.alpha})`;
        ctx.shadowColor = 'rgba(0, 255, 136, 0.9)';
        ctx.shadowBlur = 6;
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        p.alpha += p.deltaAlpha;
        if (p.alpha >= 1 || p.alpha <= 0.15) p.deltaAlpha *= -1;
    }
}

// Canvas dos fogos de artifício (fica por cima de tudo, menos o modal de configurações)
const fwCanvas = document.getElementById('fireworksCanvas');
const fwCtx = fwCanvas.getContext('2d');
fwCanvas.width = window.innerWidth;
fwCanvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    fwCanvas.width = window.innerWidth;
    fwCanvas.height = window.innerHeight;
});

// ====================================================================
// ROLETA — canvas principal, desenho das fatias e giro
// ====================================================================
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

let entries = []; // participantes atuais: [{ id, name, color }, ...]
let wheelSize = canvas.clientWidth || 600; // tamanho "lógico" (CSS) atual da roleta

// Ajusta a resolução real do canvas ao tamanho exibido em CSS, já considerando
// o devicePixelRatio (evita roleta borrada em telas de alta densidade/retina)
// e redesenha, já que o breakpoint responsivo pode ter mudado o tamanho
function resizeWheelCanvas() {
    wheelSize = canvas.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = wheelSize * dpr;
    canvas.height = wheelSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (entries.length > 0) drawWheel();
}

resizeWheelCanvas();
window.addEventListener('resize', resizeWheelCanvas);

const sound = document.getElementById('sound');
sound.volume = 0.3;

// TIQUE DA ROLETA — sintetizado via Web Audio API (não é um <audio> reaproveitado),
// porque cada fatia cruzada precisa de um clique instantâneo e independente; reiniciar
// um <audio> compartilhado (como acontecia antes) não gera um novo evento "play" e
// trava o carregamento do arquivo.
let tickAudioCtx = null;

function getTickAudioCtx() {
    if (!tickAudioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        tickAudioCtx = new AudioContextClass();
    }
    if (tickAudioCtx.state === 'suspended') {
        tickAudioCtx.resume();
    }
    return tickAudioCtx;
}

function playTick(delaySeconds = 0) {
    const audioCtx = getTickAudioCtx();
    const startTime = audioCtx.currentTime + delaySeconds;
    const duration = 0.03;

    // Estouro de ruído branco filtrado — soa como um clique mecânico de
    // roleta de verdade, em vez do "bipe" de onda quadrada de antes
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // ruído com decaimento linear
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800 + Math.random() * 800; // pequena variação para não soar robótico
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
    const ticksToPlay = Math.min(count, 8); // evita "metralhadora" se várias fatias forem cruzadas no mesmo frame
    for (let i = 0; i < ticksToPlay; i++) {
        playTick(i * 0.015);
    }
}

// Flash/tremor no ponteiro a cada fatia cruzada — usa Web Animations API para não
// precisar de reflow/reinício de classe CSS a cada chamada rápida
const pointerEl = document.getElementById('pointer');

function flashPointer() {
    pointerEl.animate([
        { transform: 'translateX(-50%) rotate(180deg) scale(1)', filter: 'drop-shadow(0 0 10px var(--accent-color))' },
        { transform: 'translateX(-50%) rotate(180deg) scale(1.35)', filter: 'drop-shadow(0 0 22px var(--accent-color))' },
        { transform: 'translateX(-50%) rotate(180deg) scale(1)', filter: 'drop-shadow(0 0 10px var(--accent-color))' }
    ], { duration: 120, easing: 'ease-out' });
}

// --- Estado do giro atual ---
let startAngle = 0;       // rotação acumulada da roleta (radianos)
let arc;                  // tamanho angular de cada fatia (2π / número de participantes)
let spinTimeout = null;   // referência do setTimeout do loop de rotateWheel()
let spinAngleStart = 0;   // velocidade angular no início do giro (graus por quadro)
let spinTime = 0;         // tempo decorrido do giro atual (ms)
let spinTimeTotal = 0;    // duração total configurada do giro (ms)
let currentWinner = null; // último vencedor sorteado
let idleAnimation = null; // referência do setInterval da animação parada (wobble 3D)
let blinkInterval = null; // referência do requestAnimationFrame da fatia "respirando"

// Gera N cores distintas e uniformemente espaçadas na roda de matizes (HSL),
// depois embaralha a ordem pra fatias vizinhas não ficarem sempre nas mesmas posições
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

// Lê os nomes digitados no textarea, monta a lista de participantes (entries)
// com uma cor pra cada um, e redesenha a roleta. É chamada a cada tecla digitada.
function setupWheel() {
    const input = document.getElementById('names').value;
    if (!input) {
		showToast("ℹ️ Informe pelo menos um nome para gerar a roleta!", "info");
		return;
	}

    if (starded === 1) {
        const confirmar = confirm("Deseja realmente gerar a roleta novamente?");
        if (!confirmar) return;
    }

    const raw = input
        .split(/[\n,]+/)
        .map(n => n.trim())
        .filter(n => n);

    const colorArr = generateDistinctColors(raw.length);
    entries = raw.map((n, i) => ({
        id: `${Date.now()}-${i}-${Math.floor(Math.random() * 100000)}`,
        name: n,
        color: colorArr[i]
    }));

    arc = Math.PI * 2 / entries.length;
    createSparkles();
    drawWheel();
    document.getElementById('spinBtn').style.display = 'block';
	showToast("🎉 Roleta gerada com sucesso!", "info");
	resetTimer(); // reseta para 00:00
}

let blinkFatiaId = null; // fatia que vai "respirar"

// Desenha a roleta inteira do zero (canvas é limpo a cada chamada): cada fatia,
// seu nome centralizado e rotacionado, e opcionalmente destaca uma fatia
// (blinkId) com transparência customizada — usado na animação do vencedor
function drawWheel(blinkId = null, alpha = 1) {
    const center = wheelSize / 2;
    const radius = center - 4;

    ctx.clearRect(0, 0, wheelSize, wheelSize);

    ctx.shadowColor = "rgba(0,255,0,0.5)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const angle = startAngle + i * arc;

        if (blinkId && entry.id === blinkId) {
            ctx.fillStyle = hexToRgba(entry.color, alpha);
        } else {
            ctx.fillStyle = entry.color;
        }

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, angle, angle + arc, false);
        ctx.lineTo(center, center);
        ctx.fill();

        ctx.save();
        ctx.fillStyle = '#000';
        const fontSize = Math.max(10, Math.round(wheelSize / 33));
        const textRadius = radius * 0.6;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.translate(
            center + Math.cos(angle + arc / 2) * textRadius,
            center + Math.sin(angle + arc / 2) * textRadius
        );
        ctx.rotate(angle + arc / 2);
        ctx.fillText(entry.name, -ctx.measureText(entry.name).width / 2, 0);
        ctx.restore();
    }
    ctx.shadowBlur = 0;
}

// Função auxiliar para converter HEX/HSL para RGBA
function hexToRgba(hex, alpha = 1) {
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('hsl')) {
        // Se usar hsl, podemos converter para rgb aproximado
        const hsl = hex.match(/[\d.]+/g);
        const h = Number(hsl[0]);
        const s = Number(hsl[1]) / 100;
        const l = Number(hsl[2]) / 100;
        const a = l <= 0.5 ? l * (1 + s) : l + s - l * s;
        const f = 2 * l - a;
        function hue2rgb(f, a, b) {
            if (b < 0) b += 1;
            if (b > 1) b -= 1;
            if (b < 1 / 6) return f + (a - f) * 6 * b;
            if (b < 1 / 2) return a;
            if (b < 2 / 3) return f + (a - f) * (2/3 - b) * 6;
            return f;
        }
        r = Math.round(hue2rgb(f, a, h/360 + 1/3) * 255);
        g = Math.round(hue2rgb(f, a, h/360) * 255);
        b = Math.round(hue2rgb(f, a, h/360 - 1/3) * 255);
    } else if (hex.length === 7) {
        r = parseInt(hex.slice(1,3),16);
        g = parseInt(hex.slice(3,5),16);
        b = parseInt(hex.slice(5,7),16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
}


// Loop contínuo de animação para a fatia piscante
function animateBlink() {
    if (blinkFatiaId) {
        drawWheel(blinkFatiaId);
        requestAnimationFrame(animateBlink);
    }
}

// ====================================================================
// EFEITO "HACKEANDO" — janelas de terminal falso nas laterais da tela,
// enquanto a roleta gira, dando a impressão de que algo está sendo
// invadido/processado em segundo plano. Some quando o giro termina.
// ====================================================================

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
const HACK_MIN_SIDE_SPACE = 160; // espaço lateral livre mínimo (px) pra caber uma janela

let hackingActive = false;
let hackingSpawnTimeout = null;

// Preenche os {n}/{hex} do template com valores aleatórios a cada uso
function randomHackLine() {
    const template = HACK_LINES[Math.floor(Math.random() * HACK_LINES.length)];
    return template
        .replace('{n}', Math.floor(Math.random() * 999))
        .replace('{hex}', Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0'));
}

function startHackingEffect() {
    hackingActive = true;
    spawnHackWindowLoop();
}

function stopHackingEffect() {
    hackingActive = false;
    clearTimeout(hackingSpawnTimeout);
    document.querySelectorAll('.hack-window').forEach(closeHackWindow);
}

// Agenda o próximo terminal falso em um intervalo aleatório, respeitando o
// limite de janelas simultâneas
function spawnHackWindowLoop() {
    if (!hackingActive) return;

    const container = document.getElementById('hackingContainer');
    if (container.children.length < HACK_MAX_WINDOWS) {
        spawnHackWindow();
    }

    hackingSpawnTimeout = setTimeout(spawnHackWindowLoop, 700 + Math.random() * 900);
}

function spawnHackWindow() {
    // Mede o espaço realmente vazio nas laterais do conteúdo (não do .container,
    // que é width:100% de propósito pra poder centralizar os filhos dele) —
    // assim a janela nunca cobre o textarea ou a roleta
    const inputRect = document.getElementById('inputArea').getBoundingClientRect();
    const wheelRect = document.getElementById('wheelContainer').getBoundingClientRect();
    const leftSpace = inputRect.left;
    const rightSpace = window.innerWidth - wheelRect.right;

    const sides = [];
    if (leftSpace >= HACK_MIN_SIDE_SPACE) sides.push({ side: 'left', space: leftSpace });
    if (rightSpace >= HACK_MIN_SIDE_SPACE) sides.push({ side: 'right', space: rightSpace });
    if (sides.length === 0) return; // tela estreita demais, sem espaço lateral livre

    const chosen = sides[Math.floor(Math.random() * sides.length)];
    const winWidth = Math.min(260, chosen.space - 24);

    const container = document.getElementById('hackingContainer');
    const win = document.createElement('div');
    win.className = 'hack-window';
    win.style.width = winWidth + 'px';
    win.style[chosen.side] = '12px';
    win.style.top = (10 + Math.random() * 60) + 'vh'; // altura aleatória

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

// "Digita" as linhas uma a uma, caractere por caractere, tipo terminal de verdade
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

// Inicia um giro: espera 1.5s (dá tempo do bonequinho "empurrar" a roleta),
// sorteia um ângulo final aleatório e dispara o loop de rotateWheel()
function spin() {
	if (entries.length > 0) {
		getTickAudioCtx(); // cria/retoma o AudioContext já dentro do gesto de clique
		startTimer(); // inicia a contagem
		setTimeout(() => {
			starded = 1;
			const spinBtn = document.getElementById('spinBtn');
			clearInterval(idleAnimation);
			idleAnimation = null;

			spinBtn.disabled = true;

			// ----------------------------
			// VELOCIDADE FIXA + RESULTADO ALEATÓRIO
			// ----------------------------
			spinAngleStart = 40;  // velocidade constante
			startAngle += Math.random() * Math.PI * 2; // resultado continua aleatório
			lastTickAngle = startAngle; // evita uma rajada de tiques por causa do salto aleatório acima
			// ----------------------------

			spinTime = 0;

			const configuredTime = parseInt(localStorage.getItem("spinTime")) || 5000;
			spinTimeTotal = configuredTime;

			startHackingEffect();
			rotateWheel();
		}, 1500);
	} else {
		showToast("ℹ️ Essa rodada terminou, gere novamente a roleta para continuar!", "info");
	}
}

let lastTickAngle = 0; // ângulo (startAngle) no último tique/quadro em que uma fatia cruzou o ponteiro

// Um quadro da animação de giro: avança o ângulo da roleta (com desaceleração
// suave via easeOut), toca o tique/flash quando uma fatia cruza o ponteiro,
// redesenha tudo e se agenda de novo — até o tempo configurado acabar
function rotateWheel() {
    spinTime += 30;
    if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
    }

    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI) / 180;

    // +90° porque o ponteiro fica no topo da roleta (ângulo -90° no canvas),
    // não no lado direito (ângulo 0) — mesma correção usada em stopRotateWheel().
    const POINTER_ANGLE_OFFSET = Math.PI / 2;
    const crossedSlices = Math.floor((startAngle + POINTER_ANGLE_OFFSET) / arc) - Math.floor((lastTickAngle + POINTER_ANGLE_OFFSET) / arc);
    if (crossedSlices !== 0) {
        playTicks(Math.abs(crossedSlices));
        flashPointer();
        lastTickAngle = startAngle;
    }

    drawWheel();
    drawSparkles();
    spinTimeout = setTimeout(rotateWheel, 30);
}

// Encerra o giro e descobre qual fatia parou sob o ponteiro (topo da roleta,
// por isso o +90°), convertendo o índice pra dentro da faixa válida de entries
function stopRotateWheel() {
    clearTimeout(spinTimeout);
    stopHackingEffect();

    const degrees = (startAngle * 180) / Math.PI + 90;
    const arcd = (arc * 180) / Math.PI;
    let index = Math.floor((360 - (degrees % 360)) / arcd);
    index = ((index % entries.length) + entries.length) % entries.length;

    const winnerEntry = entries[index];
    currentWinner = winnerEntry;
    showWinner(winnerEntry);
}

// Curva de desaceleração cúbica (ease-out): começa rápido e desacelera suavemente
// até o fim — t=tempo decorrido, b=valor inicial, c=variação total, d=duração total
function easeOut(t, b, c, d) {
    return c * ((t = t / d - 1) * t * t + 1) + b;
}

// Exibe o modal do vencedor: toca o som, dispara os fogos, faz a fatia
// vencedora "respirar" (piscar) na roleta e prepara o clique em OK pra
// remover o vencedor da lista e voltar pro estado parado
function showWinner(entry) {
    sound.currentTime = 1;
    sound.volume = 0.3;
    sound.play();
    fireworks();

    const winnerEl = document.getElementById('winner');
    winnerEl.classList.remove('glitch');
    void winnerEl.offsetWidth; // força reflow, permite reiniciar o glitch em vencedores seguidos
    winnerEl.innerHTML = `<strong>${entry.name}</strong>`;
    winnerEl.classList.add('glitch');
    winnerEl.addEventListener('animationend', () => winnerEl.classList.remove('glitch'), { once: true });

    document.getElementById('modal').style.display = 'flex';
    startBonecoVoador();

    // Cancelar qualquer blink anterior
    if (blinkInterval) {
        cancelAnimationFrame(blinkInterval);
        blinkInterval = null;
        drawWheel();
    }

    const winnerId = entry.id;
    let animating = true;

    // Função de animação contínua para a fatia "respirar"
    function animateBlink() {
        if (!animating) return;

        const time = performance.now() / 500; // controla a velocidade da respiração
        const alpha = 0.7 + 0.3 * Math.sin(time); // varia suavemente entre 0.7 e 1

        drawWheel(winnerId, alpha); // modificaremos drawWheel para aceitar alpha

        blinkInterval = requestAnimationFrame(animateBlink);
    }

    // Inicia a animação
    animateBlink();

    document.getElementById('okBtn').onclick = () => {
        animating = false;
        cancelAnimationFrame(blinkInterval);
        blinkInterval = null;
        stopBonecoVoador();

        // Remove a fatia vencedora
        entries = entries.filter(e => e.id !== winnerId);
        if (entries.length > 0) {
            arc = Math.PI * 2 / entries.length;
        }
        startAngle = 0;
        document.getElementById('modal').style.display = 'none';
        drawWheel(); // redesenha a roda sem a fatia vencedora
        animateIdle();
        document.getElementById('spinBtn').disabled = false;

		if (entries.length === 0) {
			pauseTimer(); // pausa temporariamente
		}
    };
}

// Dispara vários foguetes de fogos de artifício em sequência (com um pequeno
// atraso entre cada um), na quantidade configurada pelo usuário
function fireworks() {
    const colors = generateDistinctColors(10);

    // Pega configuração do localStorage ou usa 5 como padrão
    const numRockets = parseInt(localStorage.getItem("fireworksCount")) || 5;

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

// Anima um único foguete subindo (com leve oscilação lateral) até sua altura
// máxima (peakY), onde explode em partículas; toca os sons de lançamento/explosão
function launchRocket(x, y, peakY, colors) {
    const rocketColor = colors[Math.floor(Math.random() * colors.length)];
    const rocket = {
        x,
        y,
        peakY,
        exploded: false,
        color: rocketColor,
        radius: 2 + Math.random() * 2, // tamanho inicial
        sway: Math.random() * 2 + 1, // amplitude horizontal
        swayDir: Math.random() < 0.5 ? -1 : 1 // direção inicial da oscilação
    };

    const rocketSound = document.getElementById('rocketSound');
    rocketSound.volume = 0.1;
    rocketSound.currentTime = 0;
    rocketSound.play();

    const rocketInterval = setInterval(() => {
        if (!rocket.exploded) {
            // sobe verticalmente
            rocket.y += -4 - Math.random() * 4;

            // oscila horizontalmente
            rocket.x += rocket.swayDir * Math.random() * 1.5;
            // inverte direção se passar limite da amplitude
            if (Math.abs(rocket.x - x) > rocket.sway) rocket.swayDir *= -1;

            // aumenta ou diminui o raio do foguete para parecer que se aproxima ou afasta
            rocket.radius = 1 + Math.sin((rocket.y / peakY) * Math.PI) * 3;

            // explode no topo
            if (rocket.y <= rocket.peakY) {
                rocket.exploded = true;
                createExplosion(rocket.x, rocket.y, colors);

                const explosionSound = document.getElementById('explosionSound');
                explosionSound.volume = 0.5;
                explosionSound.currentTime = 0;
                explosionSound.play();

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

// Gera as partículas de uma explosão de foguete, cada uma voando em uma
// direção/velocidade aleatória a partir do ponto (x, y)
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
            life: 50 + Math.random() * 30, // vida da partícula
            radius: 2 + Math.random() * 3, // tamanho inicial
            shrink: 0.05 + Math.random() * 0.05, // taxa de encolhimento
            fade: 0.02 + Math.random() * 0.02 // taxa de transparência
        });
    }
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min); // Garante que o valor mínimo seja um inteiro
    max = Math.floor(max); // Garante que o valor máximo seja um inteiro
    return Math.floor(Math.random() * (max - min + 1)) + min; // O número gerado é [min, max]
}

// Loop único que desenha e atualiza TODAS as partículas de fogos em tela
// (foguetes subindo + explosões), independente de quantos foguetes existam;
// para sozinho quando não sobra nenhuma partícula
function startFireworksAnimation() {
    if (fireworksAnimation) return; // já rodando
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
            p.vy += 0.05; // gravidade leve
            p.life--;

            if (p.life <= 0) {
                allParticles.splice(i, 1);
            }
        }

        // Para o loop se não houver partículas
        if (allParticles.length === 0) {
            clearInterval(fireworksAnimation);
            fireworksAnimation = null;
            fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
        }
    }, 30);
}

// Animação de "descanso": enquanto ninguém está girando, a roleta gira bem
// devagar e balança suavemente em 3D (efeito puramente decorativo)
function animateIdle() {
    if (idleAnimation) return;
    idleAnimation = setInterval(() => {
        startAngle += 0.002;
        canvas.style.transform = `rotateY(${Math.sin(startAngle) * 5}deg) rotateX(${Math.cos(startAngle) * 5}deg)`;
        drawWheel();
        drawSparkles();
    }, 30);
}

// ====================================================================
// BONEQUINHO — o palitinho em SVG que "corre" até a roleta e empurra ela
// quando o usuário clica em girar (puramente decorativo, em paralelo ao giro)
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
	const boneco = document.getElementById('boneco');
    const spinBtn = document.getElementById('spinBtn');

	if (!boneco || !spinBtn) {
        console.warn('Elemento(s) não encontrado(s): verifique se #boneco e #spinBtn existem no HTML.');
        return;
    }

    let animando = false;

    function animarBoneco() {
        if (entries.length === 0) return;
        if (animando) return;

		spinBtn.disabled = true;
        animando = true;

        // 1) aparece caminhando
        boneco.classList.add('ativo');

        // 2) quando chega, empurra a roleta
        const tempoCaminhada = 1200; // ms (deve casar com o CSS .boneco.ativo transition)
        setTimeout(() => {
            boneco.classList.add('empurrando');
        }, tempoCaminhada);

        // 3) depois sai caminhando e some
        const tempoEmpurrao = 3200;
        setTimeout(() => {
            boneco.classList.remove('empurrando');
            boneco.classList.add('saindo');
        }, tempoCaminhada + tempoEmpurrao);

        // 4) reset para próxima vez
        const tempoSaida = 1200; // deve casar com o CSS .boneco.saindo transition
        setTimeout(() => {
            boneco.classList.remove('ativo', 'saindo', 'empurrando');
            // limpa estilos inline se você os usar em outros trechos
            animando = false;
        }, tempoCaminhada + tempoEmpurrao + tempoSaida + 50);
    }
	
    spinBtn.addEventListener('click', animarBoneco);
});

// ====================================================================
// BONECO VOADOR — enquanto o modal do vencedor está aberto, um segundo
// bonequinho (estilo "Neo desviando" do Matrix) cruza a tela voando: entra
// por um lado, faz uma pausa dramática (o "desvio"), sai pelo outro lado e
// some — em loop aleatório, até o usuário clicar OK.
// ====================================================================
let bonecoVoadorActive = false;
let bonecoVoadorTimeout = null;

function startBonecoVoador() {
    bonecoVoadorActive = true;
    bonecoVoadorLoop();
}

function stopBonecoVoador() {
    bonecoVoadorActive = false;
    clearTimeout(bonecoVoadorTimeout);
    const el = document.getElementById('bonecoVoador');
    el.getAnimations().forEach(anim => anim.cancel());
    el.style.opacity = '0';
}

// Só agenda a PRÓXIMA passada depois que a atual termina de verdade (espera a
// Promise `finished` da animação) — do contrário, como a passada dura mais que
// o intervalo entre chamadas, o boneco era cancelado e "teleportado" no meio
// do voo, o que parecia travamento.
function bonecoVoadorLoop() {
    if (!bonecoVoadorActive) return;
    const anim = voarBoneco();
    anim.finished
        .then(() => {
            if (!bonecoVoadorActive) return;
            bonecoVoadorTimeout = setTimeout(bonecoVoadorLoop, 300 + Math.random() * 700);
        })
        .catch(() => {}); // animação cancelada por stopBonecoVoador() — não agenda de novo
}

// Monta uma passada: entra de um lado aleatório da tela, faz uma pausa com
// inclinação dramática no meio do caminho (o "desvio" estilo bullet-time),
// depois sai acelerando pelo lado oposto e desaparece. Retorna a Animation
// pra quem chamou saber quando ela realmente termina.
function voarBoneco() {
    const el = document.getElementById('bonecoVoador');
    const larguraTela = window.innerWidth;

    const entraPelaEsquerda = Math.random() < 0.5;
    const entradaX = entraPelaEsquerda ? -150 : larguraTela + 150;
    const saidaX = entraPelaEsquerda ? larguraTela + 150 : -150;
    const pausaX = larguraTela * (0.25 + Math.random() * 0.5); // pausa entre 25% e 75% da largura

    const alturaVh = 15 + Math.random() * 60; // evita ficar muito perto do topo/rodapé
    el.style.top = alturaVh + 'vh';

    // ângulo "deitado" apontando na direção do voo, e mais inclinado ainda na pausa (o desvio)
    const anguloBase = entraPelaEsquerda ? 70 : -70;
    const anguloDesvio = entraPelaEsquerda ? 110 : -110;

    return el.animate([
        { transform: `translateX(${entradaX}px) rotate(${anguloBase}deg) scale(0.85)`, opacity: 0 },
        { transform: `translateX(${(entradaX + pausaX) / 2}px) rotate(${anguloBase}deg) scale(1)`, opacity: 1, offset: 0.22 },
        { transform: `translateX(${pausaX}px) rotate(${anguloDesvio}deg) scale(1.15)`, opacity: 1, offset: 0.45 },
        { transform: `translateX(${pausaX}px) rotate(${anguloDesvio}deg) scale(1.15)`, opacity: 1, offset: 0.62 },
        { transform: `translateX(${(pausaX + saidaX) / 2}px) rotate(${anguloBase}deg) scale(0.95)`, opacity: 1, offset: 0.82 },
        { transform: `translateX(${saidaX}px) rotate(${anguloBase}deg) scale(0.8)`, opacity: 0 }
    ], { duration: 1600 + Math.random() * 600, easing: 'ease-in-out' });
}

// ====================================================================
// MODAL DE CONFIGURAÇÕES — quantidade de foguetes, tempo de giro e o
// toggle do timer de fala. Avisa se há alterações não salvas ao fechar.
// ====================================================================
const modal = document.getElementById("configModal");
const btnOpen = document.getElementById("openConfig");
const btnClose = document.getElementById("closeModal");
const btnSave = document.getElementById("saveConfig");

btnOpen.onclick = () => modal.style.display = "block";

// Fecha sem salvar — mas antes verifica se algum campo mudou em relação ao
// que já estava salvo, e confirma com o usuário se sim
btnClose.onclick = () => {
	let isDirty = false;
	const fireworksCount = parseInt(document.getElementById("fireworksCount").value);
    const spinTime = parseInt(document.getElementById("spinTime").value) * 1000;
	
	if (parseInt(localStorage.getItem("fireworksCount")) !== fireworksCount) {
		isDirty = true;
	}
	if (parseInt(localStorage.getItem("spinTime")) !== spinTime) {
		isDirty = true;
	}
	if (document.getElementById('toggleSpeechTimer').checked !== showSpeechTimer) {
		isDirty = true;
	}

	if (isDirty) {
		const sair = confirm("Alterações não salvas, tem certeza que deseja fechar?");
		if (!sair) return;
	}
	
	modal.style.display = "none";
};

// Valida e salva as configurações no localStorage; mostra avisos/piadinhas
// dependendo dos valores escolhidos (muito rápido, muito devagar, etc.)
btnSave.onclick = () => {
    const fireworksCount = parseInt(document.getElementById("fireworksCount").value);
    const spinTime = parseInt(document.getElementById("spinTime").value) * 1000;
	const checkbox = document.getElementById('toggleSpeechTimer');

	showSpeechTimer = checkbox.checked;

	if (fireworksCount < 1 || !fireworksCount) {
		showToast("⚠️ Número de foguetes deve ser maior ou igual a 1 (um)!", "warning");
		return false;
	}

	if (spinTime < 1 || !spinTime) {
		showToast("⚠️ O tempo de execução deve ser de pelo menos 1 (um) segundo!", "warning");
		return false;
	}
	
    localStorage.setItem("fireworksCount", fireworksCount);
    localStorage.setItem("spinTime", spinTime);
	document.getElementById('speechTimer').style.display = showSpeechTimer ? 'block' : 'none';

    showToast("✅ Configurações salvas!", "success");

	if (fireworksCount >= 15) {
		showToast("ℹ️ Quantos foguetes!!!\n\nCuidado, estamos quase chamando os bombeiros 🚒💨🔥👨‍🚒", "info", 10000);
	}

	if (fireworksCount < 5) {
		showToast("ℹ️ Olha a animação subindo… devagarzinho 😅🚀", "info", 8000);
	}

	if (spinTime <= 7000) {
		showToast("ℹ️ Cuidado!!!\n\nGirar tão rápido pode causar tontura virtual 🌀😅", "info", 8000);
	}
	
	if (spinTime >= 15000) {
		showToast("ℹ️ Ah, claro… vamos deixar a roleta girando até o café esfriar 🙄", "info", 8000);
	}
	
    modal.style.display = "none";
};

const numericInputs = document.querySelectorAll('#fireworksCount, #spinTime');
const fireworksVerify = document.getElementById('fireworksCount');
const spinTimeVerify = document.getElementById('spinTime');

numericInputs.forEach(input => {
    input.addEventListener('input', () => {
        // Remove qualquer caractere que não seja dígito
        input.value = input.value.replace(/\D/g, '');

		if (fireworksVerify.value > 100) {
	        fireworksVerify.value = 100;
	    }

		if (spinTimeVerify.value > 60) {
	        spinTimeVerify.value = 60;
	    }
    });
});

// Desativa o menu de clique direito do navegador na página inteira
document.addEventListener('contextmenu', function (e) {
	e.preventDefault();
});

// Cria e anima uma notificação (toast) temporária no canto da tela, com uma
// barra de progresso indicando o tempo até ela sumir sozinha
function showToast(message, type = 'info', duration = 5000) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = message.replace(/\n/g, "<br>");

  // Cria a barra de progresso
  const progress = document.createElement("div");
  progress.className = "toast-progress";
  toast.appendChild(progress);

  container.appendChild(toast);

  // Animação de entrada
  setTimeout(() => toast.classList.add("show"), 50);

  // Animação da barra
  progress.style.transition = `width ${duration}ms linear`;
  setTimeout(() => progress.style.width = "0%", 50);

  // Função para remover o toast
  const removeToast = () => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (container.contains(toast)) container.removeChild(toast);
    }, 500);
  };

  // Fecha ao clicar
  toast.addEventListener('click', removeToast);

  // Fecha automaticamente após o tempo
  setTimeout(removeToast, duration);
}

// Regenera a roleta automaticamente a cada tecla digitada na lista de nomes
const namesInput = document.getElementById('names');

namesInput.addEventListener('input', function () {
	setupWheel();
});
  
let timer = 0;
let timerInterval = null;
let showSpeechTimer = false;

// Função para iniciar o contador
function startTimer() {
  if (timerInterval) return; // evita múltiplos timers
  timerInterval = setInterval(() => {
    timer++;
    const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
    const seconds = String(timer % 60).padStart(2, '0');
    document.getElementById('speechTimer').textContent = `${minutes}:${seconds}`;
  }, 1000);
}

// Função para pausar
function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// Função para resetar
function resetTimer() {
  pauseTimer();
  timer = 0;
  document.getElementById('speechTimer').textContent = '00:00';
}

// Inicialização: configura os valores padrão e monta a roleta com nomes de
// exemplo, já parada em animação idle, assim que a página termina de carregar
window.onload = () => {
    localStorage.setItem("fireworksCount", 5);
    localStorage.setItem("spinTime", 10000);

    const defaultNames = ["Aeronauta Barata", "Agrícola Beterraba Areia", "Agrícola da Terra Fonseca", "Alce Barbuda", "Amado Amoroso", "Amável Pinto", "Ravi", "Helena", "Igor", "Juliana"];
    const colorArr = generateDistinctColors(defaultNames.length);
    entries = defaultNames.map((n, i) => ({
        id: `init-${i}`,
        name: n,
        color: colorArr[i]
    }));
    arc = Math.PI * 2 / entries.length;
    createSparkles();
    drawWheel();
    animateIdle();
};
