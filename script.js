const DEV_CONFIG = {
  minWinRate: 20,
  maxWinRate: 50,
  betCap: 5000,
  houseEdgeRate: 5
};

const state = {
  balance: 10000,
  bet: 100,
  pick: 'Tài',
  devRate: DEV_CONFIG.houseEdgeRate,
  history: []
};

const balanceEl = document.getElementById('balance');
const betAmountEl = document.getElementById('betAmount');
const devRateEl = document.getElementById('devRate');
const resultTextEl = document.getElementById('resultText');
const totalTextEl = document.getElementById('totalText');
const historyListEl = document.getElementById('historyList');
const rollBtn = document.getElementById('rollBtn');
const addBalanceBtn = document.getElementById('addBalanceBtn');
const pickButtons = document.querySelectorAll('.pick-btn');
const diceEls = Array.from(document.querySelectorAll('.die'));

const faceRotations = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: 0, y: 90, z: 0 },
  3: { x: 0, y: -90, z: 0 },
  4: { x: -90, y: 0, z: 0 },
  5: { x: 90, y: 0, z: 0 },
  6: { x: 0, y: 180, z: 0 }
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function buildDiceMarkup(value) {
  const dots = Array.from({ length: value }, (_, i) => '<span class="dot"></span>').join('');
  return `
    <div class="dice-scene">
      <div class="cube">
        <div class="cube__face cube__face--front face-${value}">${dots}</div>
        <div class="cube__face cube__face--back face-${value}">${dots}</div>
        <div class="cube__face cube__face--right face-${value}">${dots}</div>
        <div class="cube__face cube__face--left face-${value}">${dots}</div>
        <div class="cube__face cube__face--top face-${value}">${dots}</div>
        <div class="cube__face cube__face--bottom face-${value}">${dots}</div>
      </div>
    </div>
  `;
}

function setDieFace(dieEl, value) {
  dieEl.innerHTML = buildDiceMarkup(value);
  const cube = dieEl.querySelector('.cube');
  const rotation = faceRotations[value] || faceRotations[1];
  cube.style.transform = `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`;
}

function updateBalance() {
  balanceEl.textContent = formatMoney(state.balance);
}

function updatePickButtons() {
  pickButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pick === state.pick);
  });
}

function renderHistory() {
  if (!state.history.length) {
    historyListEl.innerHTML = '<li>Chưa có ván nào.</li>';
    return;
  }

  historyListEl.innerHTML = state.history
    .slice(0, 6)
    .map((item) => `<li>${item}</li>`)
    .join('');
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function randomDieRotation() {
  const x = Math.floor(Math.random() * 360);
  const y = Math.floor(Math.random() * 360);
  const z = Math.floor(Math.random() * 360);
  return { x, y, z };
}

function rollDice() {
  return Array.from({ length: 3 }, randomDie);
}

function isTai(total) {
  return total >= 11 && total <= 18;
}

function calculatePlayerWinChance(betAmount) {
  const maxCap = Math.max(DEV_CONFIG.betCap, 1);
  const normalized = clamp(betAmount / maxCap, 0, 1);
  const range = DEV_CONFIG.maxWinRate - DEV_CONFIG.minWinRate;
  return DEV_CONFIG.maxWinRate - normalized * range;
}

function randomWeightedResult(betAmount) {
  const winChance = calculatePlayerWinChance(betAmount);
  const playerWins = Math.random() * 100 < winChance;
  return { playerWins, winChance };
}

function setMessage(text) {
  resultTextEl.textContent = text;
}

function animateDiceRoll(diceValues, callback) {
  const stepCount = 12;
  let step = 0;

  diceEls.forEach((dieEl) => {
    dieEl.classList.add('is-rolling');
  });

  const interval = setInterval(() => {
    step += 1;

    diceEls.forEach((dieEl, index) => {
      const cube = dieEl.querySelector('.cube');
      const randomRotation = randomDieRotation();
      if (cube) {
        cube.style.transform = `rotateX(${randomRotation.x}deg) rotateY(${randomRotation.y}deg) rotateZ(${randomRotation.z}deg)`;
      }

      if (step >= stepCount) {
        setDieFace(dieEl, diceValues[index]);
      }
    });

    if (step >= stepCount) {
      clearInterval(interval);
      diceEls.forEach((dieEl) => {
        dieEl.classList.remove('is-rolling');
      });
      callback();
    }
  }, 80);
}

function handlePickChange(nextPick) {
  state.pick = nextPick;
  updatePickButtons();
}

pickButtons.forEach((btn) => {
  btn.addEventListener('click', () => handlePickChange(btn.dataset.pick));
});

betAmountEl.addEventListener('input', () => {
  const value = Number(betAmountEl.value) || 0;
  state.bet = Math.max(10, value);
  betAmountEl.value = state.bet;
});

devRateEl.addEventListener('input', () => {
  const value = Number(devRateEl.value) || 0;
  state.devRate = clamp(value, 0, 50);
  devRateEl.value = state.devRate.toFixed(1).replace(/\.0$/, '');
});

addBalanceBtn.addEventListener('click', () => {
  state.balance += 500;
  updateBalance();
});

rollBtn.addEventListener('click', () => {
  const bet = Number(betAmountEl.value) || 0;
  if (bet <= 0) {
    setMessage('Cược phải lớn hơn 0');
    return;
  }

  if (bet > state.balance) {
    setMessage('Ví không đủ tiền!');
    return;
  }

  state.bet = bet;
  state.devRate = clamp(Number(devRateEl.value) || 0, 0, 50);
  devRateEl.value = state.devRate.toFixed(1).replace(/\.0$/, '');

  const dice = rollDice();
  const total = dice.reduce((sum, value) => sum + value, 0);
  const shouldTai = isTai(total);
  const weightedResult = randomWeightedResult(bet);
  const finalUserWin = weightedResult.playerWins && state.pick === (shouldTai ? 'Tài' : 'Xỉu');
  const oppositePick = state.pick === 'Tài' ? 'Xỉu' : 'Tài';
  const houseCut = state.devRate / 100;
  const payout = Math.round(bet * 1.96 * (1 - houseCut));

  rollBtn.disabled = true;
  rollBtn.textContent = 'Đang quay...';

  animateDiceRoll(dice, () => {
    const previousBalance = state.balance;

    if (finalUserWin) {
      state.balance = previousBalance - bet + payout;
      setMessage(`Bạn thắng! ${state.pick} - ${total}`);
      totalTextEl.textContent = `Tổng: ${total} | Tỷ lệ thắng: ${weightedResult.winChance.toFixed(1)}% | Tiền thưởng: ${formatMoney(payout)}`;
      state.history.unshift(`Thắng | ${state.pick} | Tổng ${total} | +${formatMoney(payout)}`);
    } else {
      state.balance = previousBalance - bet;
      const winner = shouldTai ? 'Tài' : 'Xỉu';
      setMessage(`Bạn thua! ${winner} - ${total}`);
      totalTextEl.textContent = `Tổng: ${total} | Tỷ lệ thắng: ${weightedResult.winChance.toFixed(1)}% | Mất: ${formatMoney(bet)}`;
      state.history.unshift(`Thua | ${state.pick} | Tổng ${total} | -${formatMoney(bet)}`);
    }

    updateBalance();
    renderHistory();
    rollBtn.disabled = false;
    rollBtn.textContent = 'Quay tài xỉu';
  });
});

diceEls.forEach((dieEl) => setDieFace(dieEl, 1));

updateBalance();
updatePickButtons();
renderHistory();
