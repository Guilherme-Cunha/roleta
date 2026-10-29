// Controla se a roleta já girou pelo menos uma vez nesta sessão — usado em
// setupWheel() pra perguntar antes de gerar a roleta de novo (evita perder
// o giro em andamento por engano)
let starded = 0;

// Verificar modo Espectador
const urlParams = new URLSearchParams(window.location.search);
const isViewer = urlParams.get('role') === 'viewer';

// ====================================================================
// FUNDO "MATRIX" — chuva de caracteres verdes no canvas de fundo (#matrixCanvas)
// ====================================================================
const canvasBg = document.getElementById("matrixCanvas");
const ctxBg = canvasBg.getContext("2d");

let allParticles = []; // todas as partículas de todos os foguetes
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

// Canvas dos fogos de artifício
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

let entries = [];
let wheelSize = canvas.clientWidth || 600;

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

const pointerEl = document.getElementById('pointer');

function flashPointer() {
    pointerEl.animate([
        { transform: 'translateX(-50%) rotate(180deg) scale(1)', filter: 'drop-shadow(0 0 10px var(--accent-color))' },
        { transform: 'translateX(-50%) rotate(180deg) scale(1.35)', filter: 'drop-shadow(0 0 22px var(--accent-color))' },
        { transform: 'translateX(-50%) rotate(180deg) scale(1)', filter: 'drop-shadow(0 0 10px var(--accent-color))' }
    ], { duration: 120, easing: 'ease-out' });
}

// --- Estado do giro atual ---
let startAngle = 0;
let arc;
let spinTimeout = null;
let spinAngleStart = 0;
let spinTime = 0;
let spinTimeTotal = 0;
let currentWinner = null;
let idleAnimation = null;
let blinkInterval = null;

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

window.setupWheel = function(customList = null, isFromSync = false) {
    const input = customList || document.getElementById('names').value;
    if (!input && !isFromSync) {
        showToast("ℹ️ Informe pelo menos um nome para gerar a roleta!", "info");
        return;
    }

    if (starded === 1 && !isFromSync) {
        const confirmar = confirm("Deseja realmente gerar a roleta novamente?");
        if (!confirmar) return;
    }

    const raw = Array.isArray(input) ? input : input
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
    
    if (!isViewer) {
        document.getElementById('spinBtn').style.display = 'block';
    }
    
    if (!isFromSync) {
        showToast("🎉 Roleta gerada com sucesso!", "info");
    }
    resetTimer();
};

let blinkFatiaId = null;

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

function hexToRgba(hex, alpha = 1) {
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('hsl')) {
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

// ====================================================================
// EFEITO "HACKEANDO"
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
    
    const leftSpace = inputArea ? inputArea.getBoundingClientRect().left : 200;
    const rightSpace = wheelContainer ? window.innerWidth - wheelContainer.getBoundingClientRect().right : 200;

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

// ====================================================================
// ANIMAÇÃO E GIRO DA ROLETA
// ====================================================================
window.spin = function() {
    if (entries.length > 0) {
        getTickAudioCtx();
        startTimer();
        setTimeout(() => {
            starded = 1;
            const spinBtn = document.getElementById('spinBtn');
            clearInterval(idleAnimation);
            idleAnimation = null;

            if (spinBtn) spinBtn.disabled = true;

            spinAngleStart = 40;
            startAngle += Math.random() * Math.PI * 2;
            lastTickAngle = startAngle;

            spinTime = 0;
            const configuredTime = parseInt(localStorage.getItem("spinTime")) || 5000;
            spinTimeTotal = configuredTime;

            startHackingEffect();
            rotateWheel();
        }, 1500);
    } else {
        showToast("ℹ️ Essa rodada terminou, gere novamente a roleta para continuar!", "info");
    }
};

// Animação sincronizada em tempo real para Espectadores
window.animarRoletaSincronizada = function(targetRotation, startTime, durationMs) {
    getTickAudioCtx();
    clearInterval(idleAnimation);
    idleAnimation = null;
    startHackingEffect();

    function frame() {
        const agora = Date.now();
        const decorrido = agora - startTime;
        const progresso = Math.min(decorrido / durationMs, 1);

        const easeOutVal = 1 - Math.pow(1 - progresso, 3);
        startAngle = targetRotation * easeOutVal;

        const POINTER_ANGLE_OFFSET = Math.PI / 2;
        const crossedSlices = Math.floor((startAngle + POINTER_ANGLE_OFFSET) / arc) - Math.floor((lastTickAngle + POINTER_ANGLE_OFFSET) / arc);
        if (crossedSlices !== 0) {
            playTicks(Math.abs(crossedSlices));
            flashPointer();
            lastTickAngle = startAngle;
        }

        drawWheel();
        drawSparkles();

        if (progresso < 1) {
            requestAnimationFrame(frame);
        } else {
            stopRotateWheel();
        }
    }

    requestAnimationFrame(frame);
};

let lastTickAngle = 0;

function rotateWheel() {
    spinTime += 30;
    if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
    }

    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI) / 180;

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

function easeOut(t, b, c, d) {
    return c * ((t = t / d - 1) * t * t + 1) + b;
}

function showWinner(entry) {
    sound.currentTime = 1;
    sound.volume = 0.3;
    sound.play();
    fireworks();

    const winnerEl = document.getElementById('winner');
    winnerEl.classList.remove('glitch');
    void winnerEl.offsetWidth;
    winnerEl.innerHTML = `<strong>${entry.name}</strong>`;
    winnerEl.classList.add('glitch');
    winnerEl.addEventListener('animationend', () => winnerEl.classList.remove('glitch'), { once: true });

    document.getElementById('modal').style.display = 'flex';

    if (blinkInterval) {
        cancelAnimationFrame(blinkInterval);
        blinkInterval = null;
        drawWheel();
    }

    const winnerId = entry.id;
    let animating = true;

    function animateBlink() {
        if (!animating) return;

        const time = performance.now() / 500;
        const alpha = 0.7 + 0.3 * Math.sin(time);

        drawWheel(winnerId, alpha);
        blinkInterval = requestAnimationFrame(animateBlink);
    }

    animateBlink();

    document.getElementById('okBtn').onclick = () => {
        animating = false;
        cancelAnimationFrame(blinkInterval);
        blinkInterval = null;

        entries = entries.filter(e => e.id !== winnerId);
        if (entries.length > 0) {
            arc = Math.PI * 2 / entries.length;
        }
        startAngle = 0;
        document.getElementById('modal').style.display = 'none';
        drawWheel();
        animateIdle();
        
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) spinBtn.disabled = false;

        if (entries.length === 0) {
            pauseTimer();
        }
    };
}

// ====================================================================
// FOGOS DE ARTIFÍCIO
// ====================================================================
function fireworks() {
    const colors = generateDistinctColors(10);
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

    const rocketSound = document.getElementById('rocketSound');
    rocketSound.volume = 0.1;
    rocketSound.currentTime = 0;
    rocketSound.play();

    const rocketInterval = setInterval(() => {
        if (!rocket.exploded) {
            rocket.y += -4 - Math.random() * 4;
            rocket.x += rocket.swayDir * Math.random() * 1.5;
            if (Math.abs(rocket.x - x) > rocket.sway) rocket.swayDir *= -1;

            rocket.radius = 1 + Math.sin((rocket.y / peakY) * Math.PI) * 3;

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
// BONEQUINHO (Palitinho em SVG)
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    const boneco = document.getElementById('boneco');
    const spinBtn = document.getElementById('spinBtn');

    if (!boneco || !spinBtn) return;

    let animando = false;

    function animarBoneco() {
        if (entries.length === 0 || animando) return;

        spinBtn.disabled = true;
        animando = true;

        boneco.classList.add('ativo');

        const tempoCaminhada = 1200;
        setTimeout(() => {
            boneco.classList.add('empurrando');
        }, tempoCaminhada);

        const tempoEmpurrao = 3200;
        setTimeout(() => {
            boneco.classList.remove('empurrando');
            boneco.classList.add('saindo');
        }, tempoCaminhada + tempoEmpurrao);

        const tempoSaida = 1200;
        setTimeout(() => {
            boneco.classList.remove('ativo', 'saindo', 'empurrando');
            animando = false;
        }, tempoCaminhada + tempoEmpurrao + tempoSaida + 50);
    }

    spinBtn.addEventListener('click', animarBoneco);
});

// ====================================================================
// MODAL DE CONFIGURAÇÕES
// ====================================================================
const modal = document.getElementById("configModal");
const btnOpen = document.getElementById("openConfig");
const btnClose = document.getElementById("closeModal");
const btnSave = document.getElementById("saveConfig");

if (btnOpen) btnOpen.onclick = () => modal.style.display = "block";

if (btnClose) {
    btnClose.onclick = () => {
        let isDirty = false;
        const fireworksCount = parseInt(document.getElementById("fireworksCount").value);
        const spinTime = parseInt(document.getElementById("spinTime").value) * 1000;
        
        if (parseInt(localStorage.getItem("fireworksCount")) !== fireworksCount) isDirty = true;
        if (parseInt(localStorage.getItem("spinTime")) !== spinTime) isDirty = true;
        if (document.getElementById('toggleSpeechTimer').checked !== showSpeechTimer) isDirty = true;

        if (isDirty) {
            const sair = confirm("Alterações não salvas, tem certeza que deseja fechar?");
            if (!sair) return;
        }
        modal.style.display = "none";
    };
}

if (btnSave) {
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
    toast.innerHTML = message.replace(/\n/g, "<br>");

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

const namesInput = document.getElementById('names');
if (namesInput) {
    namesInput.addEventListener('input', function () {
        window.setupWheel();
    });
}

let timer = 0;
let timerInterval = null;
let showSpeechTimer = false;

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        timer++;
        const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
        const seconds = String(timer % 60).padStart(2, '0');
        document.getElementById('speechTimer').textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    pauseTimer();
    timer = 0;
    document.getElementById('speechTimer').textContent = '00:00';
}

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
