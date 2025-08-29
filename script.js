let starded = 0;
// MATRIX BACKGROUND
const canvasBg = document.getElementById("matrixCanvas");
const ctxBg = canvasBg.getContext("2d");

let allParticles = []; // todas as partículas de todos os foguetes
let fireworksAnimation = null;

canvasBg.height = window.innerHeight;
canvasBg.width = window.innerWidth;

const letters = "イエス・キリストは昨日も今日も永遠に同じである".split("");
const fontSize = 14;
const columns = canvasBg.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

let sparkleParticles = [];

function createSparkles() {
    for (let i = 0; i < 20; i++) {
        sparkleParticles.push({
            x: 300 + Math.random() * 600 - 300,
            y: 300 + Math.random() * 600 - 300,
            radius: Math.random() * 2 + 1,
            alpha: Math.random(),
            deltaAlpha: 0.02
        });
    }
}

function drawSparkles() {
    for (let p of sparkleParticles) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(0,255,0,${p.alpha})`;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.alpha += p.deltaAlpha;
        if (p.alpha >= 1 || p.alpha <= 0) p.deltaAlpha *= -1;
    }
}

function drawMatrix() {
    ctxBg.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctxBg.fillRect(0, 0, canvasBg.width, canvasBg.height);

    ctxBg.fillStyle = "#0F0";
    ctxBg.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctxBg.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvasBg.height || Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(drawMatrix, 50);

const fwCanvas = document.getElementById('fireworksCanvas');
const fwCtx = fwCanvas.getContext('2d');
fwCanvas.width = window.innerWidth;
fwCanvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    fwCanvas.width = window.innerWidth;
    fwCanvas.height = window.innerHeight;
});

// ROLETAS
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const sound = document.getElementById('sound');
sound.volume = 0.3;
const spinSound = document.getElementById('spinSound');
spinSound.volume = 1;

let entries = [];
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

function setupWheel() {
    const input = document.getElementById('names').value;
    if (!input) {
		showToast("Informe pelo menos um nome para gerar a roleta!", "info");
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
    drawWheel();
    document.getElementById('spinBtn').style.display = 'block';
	showToast("Roleta gerada com sucesso!", "info");
	resetTimer(); // reseta para 00:00
}

let blinkFatiaId = null; // fatia que vai "respirar"

function drawWheel(blinkId = null, alpha = 1) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
        ctx.moveTo(300, 300);
        ctx.arc(300, 300, 300, angle, angle + arc, false);
        ctx.lineTo(300, 300);
        ctx.fill();

        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px Arial';
        ctx.translate(
            300 + Math.cos(angle + arc / 2) * 180,
            300 + Math.sin(angle + arc / 2) * 180
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

function spin() {
	if (entries.length > 0) {
		startTimer(); // inicia a contagem
		setTimeout(() => {
			starded = 1;
			const spinBtn = document.getElementById('spinBtn');
			clearInterval(idleAnimation);
			idleAnimation = null;
			spinBtn.disabled = true;
			spinAngleStart = Math.random() * 10 + 25;
			spinTime = 0;

			const configuredTime = parseInt(localStorage.getItem("spinTime")) || 5000;
			spinTimeTotal = configuredTime;

			rotateWheel();
		}, 1500);
	} else {
		showToast("Essa rodada terminou, gere novamente a roleta para continuar!", "info");
	}
}

let lastTickAngle = 0; // nova variável global para controlar ticks

function rotateWheel() {
    spinTime += 30;
    if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
    }

    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI) / 180;

    // calcula quantas fatias foram cruzadas
    const crossedSlices = Math.floor(startAngle / arc) - Math.floor(lastTickAngle / arc);

    if (crossedSlices !== 0) {
        spinSound.currentTime = 0;
        spinSound.volume = 0.5;
        spinSound.play();
        lastTickAngle = startAngle; // atualiza a referência
    }

    drawWheel();
    spinTimeout = setTimeout(rotateWheel, 30);
}

function stopRotateWheel() {
    clearTimeout(spinTimeout);
    spinSound.pause();
    spinSound.currentTime = 0;

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
    document.getElementById('winner').innerHTML = `<strong>${entry.name}</strong>`;
    document.getElementById('modal').style.display = 'flex';

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

function animateIdle() {
    if (idleAnimation) return;
    idleAnimation = setInterval(() => {
        startAngle += 0.002;
        canvas.style.transform = `rotateY(${Math.sin(startAngle) * 5}deg) rotateX(${Math.cos(startAngle) * 5}deg)`;
        drawWheel();
        drawSparkles();
    }, 30);
}

// Extra: rastro estilo matrix
let trails = [];
document.addEventListener("mousemove", (e) => {
    let trail = document.createElement("div");
    trail.className = "matrix-trail";
    trail.style.left = e.pageX + "px";
    trail.style.top = e.pageY + "px";
    document.body.appendChild(trail);

    setTimeout(() => {
        trail.remove();
    }, 500);
});

// CSS dos rastros adicionados via JS
const style = document.createElement("style");
style.innerHTML = `
  .matrix-trail {
    position: fixed;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #00ff00;
    box-shadow: 0 0 8px #00ff00;
    pointer-events: none;
    transform: translate(-50%, -50%);
    opacity: 0.7;
    animation: fadeTrail 0.5s linear forwards;
  }
  @keyframes fadeTrail {
    from { opacity: 0.7; transform: scale(1); }
    to { opacity: 0; transform: scale(0.3); }
  }
`;
document.head.appendChild(style);

// script.js (adicione ao final do arquivo, ou onde concentra seus handlers)
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

// Abrir e fechar modal
const modal = document.getElementById("configModal");
const btnOpen = document.getElementById("openConfig");
const btnClose = document.getElementById("closeModal");
const btnSave = document.getElementById("saveConfig");

btnOpen.onclick = () => modal.style.display = "block";
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

btnSave.onclick = () => {
    const fireworksCount = parseInt(document.getElementById("fireworksCount").value);
    const spinTime = parseInt(document.getElementById("spinTime").value) * 1000;
	const checkbox = document.getElementById('toggleSpeechTimer');

	showSpeechTimer = checkbox.checked;

	if (fireworksCount < 1 || !fireworksCount) {
		showToast("Número de foguetes deve ser maior ou igual a 1 (um)!", "warning");
		return false;
	}

	if (spinTime < 1 || !spinTime) {
		showToast("O tempo de execução deve ser de pelo menos 1 (um) segundo!", "warning");
		return false;
	}
	
    localStorage.setItem("fireworksCount", fireworksCount);
    localStorage.setItem("spinTime", spinTime);
	document.getElementById('speechTimer').style.display = showSpeechTimer ? 'block' : 'none';

    showToast("Configurações salvas!", "success");

	if (fireworksCount > 10) {
		showToast("Quantos foguetes!!! Cuidado, estamos quase chamando os bombeiros.", "info", 10000);
	}

	if (spinTime < 7000) {
		showToast("Cuidado! Girar tão rápido pode causar tontura virtual.", "info", 10000);
	}
	
	if (spinTime > 29000) {
		showToast("Ah, claro… vamos deixar a roleta girando até o café esfriar.", "info", 10000);
	}
	
    modal.style.display = "none";
};

const numericInputs = document.querySelectorAll('#fireworksCount, #spinTime');

numericInputs.forEach(input => {
    input.addEventListener('input', () => {
        // Remove qualquer caractere que não seja dígito
        input.value = input.value.replace(/\D/g, '');
    });
});

document.addEventListener('contextmenu', function (e) {
	e.preventDefault();
});

function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // animação de entrada
    setTimeout(() => toast.classList.add("show"), 50);

    // animação de saída
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => container.removeChild(toast), 500);
    }, duration);
  }
  
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

// Inicialização
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
    drawWheel();
    animateIdle();
};
