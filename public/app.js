'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const form = $('#quest-form');
  const goalInput = $('#goal');
  const counter = $('#goal-counter');
  const generateButton = $('#generate-btn');
  const errorBox = $('#form-error');
  const accessRow = $('#access-row');
  const accessInput = $('#access-code');
  const resultArea = $('#result-area');
  const loadingView = $('#loading-view');
  const questView = $('#quest-view');
  const missionList = $('#mission-list');
  const toast = $('#toast');

  const SAMPLE_QUEST = {
    quest_title: '지식의 탑을 정복하라!',
    quest_story: '시험의 마왕이 코앞까지 다가왔다! 흩어진 지식을 모아 작은 관문을 돌파하고, 마지막 시험의 문을 열어보자.',
    difficulty: 'NORMAL',
    total_minutes: 30,
    missions: [
      { title: '모험가의 장비 준비', description: '교재와 필기도구를 책상 위에 놓고 휴대폰을 멀리 둔다.', minutes: 3 },
      { title: '지식의 조각 수집', description: '시험 범위에서 중요한 개념 세 가지를 찾아 한 줄씩 적는다.', minutes: 10 },
      { title: '훈련장 돌파', description: '연습 문제 두 개를 풀고 정답을 확인한다.', minutes: 12 },
      { title: '최종 보스: 약점 공략', description: '틀리거나 헷갈린 부분 하나를 다시 설명해 본다.', minutes: 5 }
    ],
    completion_message: '대단해요! 지식의 탑 정상에 도착했어요. 오늘의 작은 승리를 축하해요!'
  };

  const DIFFICULTY_NAMES = { EASY: '🌱 EASY', NORMAL: '⚡ NORMAL', HARD: '🔥 HARD' };
  const MISSION_XP = [20, 20, 20, 40];
  let currentQuest = null;
  let completed = [false, false, false, false];
  let isLoading = false;
  let toastTimer = null;
  let isSample = false;

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    showToast(message);
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  function validateGoal() {
    const goal = goalInput.value.trim();
    counter.textContent = `${goalInput.value.length} / 300`;
    counter.style.color = goal.length > 300 ? '#ff98c5' : '';
    generateButton.disabled = isLoading || goal.length < 5 || goal.length > 300;
    return goal.length >= 5 && goal.length <= 300;
  }

  function scrollToResult() {
    resultArea.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function questToText() {
    if (!currentQuest) return '';
    const lines = [
      `[QUEST MODE] ${currentQuest.quest_title}`,
      currentQuest.quest_story,
      `난이도: ${currentQuest.difficulty} · 선택 시간: ${currentQuest.total_minutes}분`,
      ''
    ];
    currentQuest.missions.forEach((mission, index) => {
      lines.push(`${index === 3 ? '[보스 미션]' : `[서브 미션 ${index + 1}]`} ${mission.title} (${mission.minutes}분, +${MISSION_XP[index]} XP)`);
      lines.push(mission.description);
      lines.push('');
    });
    lines.push(`[완료 메시지] ${currentQuest.completion_message}`);
    return lines.join('\n');
  }

  function updateProgress() {
    const total = completed.reduce((sum, done, i) => sum + (done ? MISSION_XP[i] : 0), 0);
    const doneCount = completed.filter(Boolean).length;
    $('#xp-value').textContent = String(total);
    $('#xp-progress').setAttribute('aria-valuenow', String(total));
    $('#progress-fill').style.width = `${total}%`;
    $('#mission-count').textContent = String(doneCount);
    $('#progress-label').textContent = doneCount === 4 ? '모든 미션 완료!' : doneCount === 0 ? '모험이 시작됐어요!' : `${doneCount}개의 미션을 돌파했어요!`;
    $('#progress-tip').textContent = doneCount === 4 ? '오늘의 모든 도전을 완료했어요. 멋진 모험이었어요!' : doneCount === 0 ? '하나씩 체크하면 경험치가 쌓여요.' : `${4 - doneCount}개의 미션이 남았어요. 서두르지 않아도 괜찮아요.`;
    const clear = doneCount === 4;
    $('#clear-panel').hidden = !clear;
    $('#clear-message').textContent = clear ? currentQuest.completion_message : '';
  }

  function updateMissionButton(button, index) {
    const done = completed[index];
    button.classList.toggle('is-done', done);
    button.setAttribute('aria-pressed', String(done));
    button.querySelector('.mission-checkbox').textContent = done ? '✓' : '';
    button.querySelector('.mission-xp').textContent = done ? `✓ +${MISSION_XP[index]} XP` : `+${MISSION_XP[index]} XP`;
    button.setAttribute('aria-label', `${index === 3 ? '보스 미션' : `서브 미션 ${index + 1}`}: ${currentQuest.missions[index].title}, ${done ? '완료됨. 완료 취소하기' : '미완료. 완료 처리하기'}`);
  }

  function renderMissions() {
    missionList.replaceChildren();
    currentQuest.missions.forEach((mission, index) => {
      const button = element('button', `mission${index === 3 ? ' is-boss' : ''}`);
      button.type = 'button';
      const checkbox = element('span', 'mission-checkbox');
      checkbox.setAttribute('aria-hidden', 'true');
      const main = element('span', 'mission-body');
      const type = element('span', 'mission-type', index === 3 ? '⚔ FINAL BOSS' : `SUB QUEST 0${index + 1}`);
      const title = element('strong', '', mission.title);
      const desc = element('span', 'mission-desc', mission.description);
      main.append(type, title, desc);
      const side = element('span', 'mission-side');
      side.append(element('span', 'mission-time', `◷ ${mission.minutes}분`), element('span', 'mission-xp'));
      button.append(checkbox, main, side);
      updateMissionButton(button, index);
      button.addEventListener('click', () => {
        const wasClear = completed.every(Boolean);
        completed[index] = !completed[index];
        updateMissionButton(button, index);
        updateProgress();
        if (!wasClear && completed.every(Boolean)) showToast('🏆 QUEST CLEAR! 100 XP를 획득했어요!');
      });
      missionList.append(button);
    });
  }

  function renderQuest(quest, sample = false) {
    currentQuest = quest;
    completed = [false, false, false, false];
    isSample = sample;
    $('#quest-title').textContent = quest.quest_title;
    $('#quest-story').textContent = quest.quest_story;
    $('#quest-difficulty').textContent = DIFFICULTY_NAMES[quest.difficulty] || quest.difficulty;
    $('#quest-duration').textContent = `◷ ${quest.total_minutes} MIN`;
    const label = $('#quest-label');
    label.textContent = sample ? 'SAMPLE QUEST · 체험용' : 'NEW QUEST UNLOCKED';
    label.classList.toggle('sample-label', sample);
    renderMissions();
    updateProgress();
    resultArea.hidden = false;
    loadingView.hidden = true;
    questView.hidden = false;
    scrollToResult();
  }

  function shouldDiscard() {
    return !!currentQuest && completed.some(Boolean) && !window.confirm('진행 중인 퀘스트가 초기화됩니다. 새 퀘스트를 만들까요?');
  }

  async function generate(event) {
    event.preventDefault();
    if (isLoading) return;
    clearError();
    if (!validateGoal()) { showError('목표를 5~300자로 입력해 주세요.'); goalInput.focus(); return; }
    const data = new FormData(form);
    const payload = {
      goal: goalInput.value.trim(),
      duration: Number(data.get('duration')),
      difficulty: String(data.get('difficulty')),
      energy: String(data.get('energy'))
    };
    isLoading = true;
    validateGoal();
    $('#demo-btn').disabled = true;
    resultArea.hidden = false;
    loadingView.hidden = false;
    questView.hidden = true;
    scrollToResult();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (!accessRow.hidden && accessInput.value.trim()) headers['x-access-code'] = accessInput.value.trim();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 52_000);
      let response;
      try {
        response = await fetch('/api/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } finally { clearTimeout(timeout); }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.code === 'ACCESS_CODE_REQUIRED') {
          accessRow.hidden = false;
          accessInput.value = '';
          accessInput.focus();
        }
        throw new Error(typeof result.error === 'string' ? result.error : `요청에 실패했습니다. (HTTP ${response.status})`);
      }
      // 서버가 검증한 결과만 이용하지만 클라이언트에서도 최소 구조를 확인한다.
      if (!result || !Array.isArray(result.missions) || result.missions.length !== 4) {
        throw new Error('퀘스트 결과를 표시할 수 없습니다. 다시 시도해 주세요.');
      }
      renderQuest(result, false);
      showToast('✨ 새로운 퀘스트가 도착했어요!');
    } catch (error) {
      const message = error?.name === 'AbortError' ? '생성 시간이 너무 오래 걸렸습니다. 다시 시도해 주세요.' : (error?.message || '네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
      showError(message);
      loadingView.hidden = true;
      if (currentQuest) {
        questView.hidden = false;
      } else {
        resultArea.hidden = true;
      }
      if (accessRow.hidden) goalInput.focus();
    } finally {
      isLoading = false;
      $('#demo-btn').disabled = false;
      validateGoal();
    }
  }

  form.addEventListener('submit', generate);
  goalInput.addEventListener('input', () => { clearError(); validateGoal(); });
  document.querySelectorAll('[data-example]').forEach((button) => {
    button.addEventListener('click', () => {
      goalInput.value = button.dataset.example;
      validateGoal();
      clearError();
      goalInput.focus();
    });
  });

  $('#demo-btn').addEventListener('click', () => {
    if (isLoading || shouldDiscard()) return;
    clearError();
    renderQuest(SAMPLE_QUEST, true);
    showToast('🎮 샘플 퀘스트예요. 실제 Gemini 호출은 하지 않았어요.');
  });

  $('#reset-btn').addEventListener('click', () => {
    if (shouldDiscard()) return;
    currentQuest = null;
    completed = [false, false, false, false];
    isSample = false;
    resultArea.hidden = true;
    questView.hidden = true;
    clearError();
    goalInput.focus();
    document.querySelector('.workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('✦ 새로운 모험을 준비할 수 있어요!');
  });

  $('#copy-btn').addEventListener('click', async () => {
    if (!currentQuest) return;
    try {
      await navigator.clipboard.writeText(questToText());
      showToast('📋 퀘스트가 클립보드에 복사되었어요!');
    } catch {
      showToast('복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.');
    }
  });

  validateGoal();
})();
