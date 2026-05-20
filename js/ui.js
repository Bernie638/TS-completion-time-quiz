// ui.js — wiring for the dashboard and the question screen.

import { EXAMPLES } from "../data/examples.js?v=6";
import { generateQuestion } from "./generator.js?v=6";
import { RULES } from "./rules.js?v=6";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  selectedExampleIds: new Set(),
  currentExample: null,
  currentCase: null,
  currentQuestion: null,
  chosenSlotIndex: null,
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function renderDashboard() {
  const list = $("#example-list");
  list.innerHTML = "";
  for (const ex of EXAMPLES) {
    const label = document.createElement("label");
    if (!ex.available) label.classList.add("disabled");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = ex.id;
    cb.disabled = !ex.available;
    cb.addEventListener("change", () => {
      if (cb.checked) state.selectedExampleIds.add(ex.id);
      else state.selectedExampleIds.delete(ex.id);
      updateStartButton();
    });

    label.appendChild(cb);
    label.appendChild(
      document.createTextNode(
        ` ${ex.id}${ex.available ? "" : " (coming soon)"}`,
      ),
    );
    list.appendChild(label);
  }
}

function updateStartButton() {
  $("#start").disabled = state.selectedExampleIds.size === 0;
}

function wireDashboard() {
  $("#select-all").addEventListener("click", () => {
    for (const cb of $$('#example-list input[type="checkbox"]')) {
      if (cb.disabled) continue;
      cb.checked = true;
      state.selectedExampleIds.add(cb.value);
    }
    updateStartButton();
  });

  $("#start").addEventListener("click", () => {
    if (state.selectedExampleIds.size === 0) return;
    showQuestionScreen();
    newQuestion();
  });

  $("#back-to-dashboard").addEventListener("click", () => {
    showDashboard();
  });
}

function showQuestionScreen() {
  $("#dashboard").classList.add("hidden");
  $("#question-screen").classList.remove("hidden");
}

function showDashboard() {
  $("#dashboard").classList.remove("hidden");
  $("#question-screen").classList.add("hidden");
  switchToTab("question");
}

// ---------------------------------------------------------------------------
// Reference tab: inject the LCO table fragment for the current example.
// ---------------------------------------------------------------------------

async function loadLcoTableFragment(url) {
  try {
    // Cache-bust the fragment so edits show up on plain reload.
    const resp = await fetch(`${url}?v=${Date.now()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } catch (err) {
    return `<p class="note">Unable to load reference table (${err.message}).</p>`;
  }
}

async function updateReferencePanel(exampleSpec, caseSpec) {
  const container = $("#lco-table-container");
  // Cases can override the LCO table fragment (e.g. the modified 72-hr
  // variant of Example 1.3-4). Falls back to the example-level default.
  const url =
    caseSpec?.reference?.lcoTableHtml ?? exampleSpec.reference.lcoTableHtml;
  container.innerHTML = await loadLcoTableFragment(url);
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function wireTabs() {
  $("#tabs").addEventListener("click", (event) => {
    const btn = event.target.closest(".tab");
    if (!btn || btn.classList.contains("hidden")) return;
    switchToTab(btn.dataset.tab);
  });
}

function switchToTab(name) {
  for (const btn of $$(".tab")) {
    btn.classList.toggle("active", btn.dataset.tab === name);
  }
  for (const panel of $$(".tab-panel")) {
    panel.classList.toggle("active", panel.dataset.panel === name);
  }
}

// ---------------------------------------------------------------------------
// Question lifecycle
// ---------------------------------------------------------------------------

function pickRandomExample() {
  const candidates = EXAMPLES.filter(
    (e) => e.available && state.selectedExampleIds.has(e.id),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickRandomCase(exampleSpec) {
  const cases = exampleSpec.cases;
  return cases[Math.floor(Math.random() * cases.length)];
}

async function newQuestion() {
  const exampleEntry = pickRandomExample();
  if (!exampleEntry) {
    showDashboard();
    return;
  }
  const exampleSpec = exampleEntry.spec;
  const caseSpec = pickRandomCase(exampleSpec);

  state.currentExample = exampleSpec;
  state.currentCase = caseSpec;
  state.currentQuestion = generateQuestion(exampleSpec, caseSpec);
  state.chosenSlotIndex = null;

  await updateReferencePanel(exampleSpec, caseSpec);
  renderQuestion();
  switchToTab("question");
}

function renderQuestion() {
  const q = state.currentQuestion;

  $("#stem").textContent = q.stem;

  const form = $("#choices");
  form.innerHTML = "";
  q.choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = "choice";
    label.dataset.index = String(index);

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "choice";
    input.value = String(index);
    input.addEventListener("change", () => {
      state.chosenSlotIndex = index;
      $("#submit").disabled = false;
    });

    const slot = document.createElement("span");
    slot.className = "choice-label";
    slot.textContent = `${choice.label}.`;

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = choice.displayText;

    label.appendChild(input);
    label.appendChild(slot);
    label.appendChild(text);
    form.appendChild(label);
  });

  $("#submit").disabled = true;
  $("#submit").classList.remove("hidden");
  $("#new-question").classList.add("hidden");
  $("#feedback").classList.add("hidden");
  $("#explanation-tab").classList.add("hidden");
  $("#explanation-correct").innerHTML = "";
  $("#explanation-chosen").innerHTML = "";
  $("#explanation-chosen").classList.add("hidden");
}

function submitAnswer() {
  if (state.chosenSlotIndex === null) return;
  const q = state.currentQuestion;
  const chosen = q.choices[state.chosenSlotIndex];
  const correctIndex = q.correctSlotIndex;
  const correctChoice = q.choices[correctIndex];

  // Lock and color the choices.
  for (const labelEl of $$(".choice", $("#choices"))) {
    labelEl.classList.add("locked");
    const input = $('input[type="radio"]', labelEl);
    input.disabled = true;
    const index = Number(labelEl.dataset.index);
    if (index === correctIndex) labelEl.classList.add("correct");
    if (index === state.chosenSlotIndex && !chosen.isCorrect) {
      labelEl.classList.add("incorrect-chosen");
    }
  }

  // Feedback banner.
  const feedback = $("#feedback");
  feedback.classList.remove("hidden", "correct", "incorrect");
  if (chosen.isCorrect) {
    feedback.classList.add("correct");
    feedback.textContent =
      `Correct. The latest required time is ${correctChoice.displayText}.`;
  } else {
    feedback.classList.add("incorrect");
    feedback.textContent =
      `Incorrect. The correct answer is ${correctChoice.label}: ${correctChoice.displayText}.`;
  }

  // Explanation tab.
  const ctx = state.currentExample.ctx;
  const params = q.params;
  const correctRule = RULES[correctChoice.ruleId];
  $("#explanation-correct").innerHTML =
    `<h3>Why ${correctChoice.label} (${correctChoice.displayText}) is correct</h3>` +
    `<p>${correctRule.explain(params, ctx)}</p>`;
  if (!chosen.isCorrect) {
    const chosenRule = RULES[chosen.ruleId];
    $("#explanation-chosen").classList.remove("hidden");
    $("#explanation-chosen").innerHTML =
      `<h3>Why ${chosen.label} (${chosen.displayText}) is incorrect</h3>` +
      `<p>${chosenRule.explain(params, ctx)}</p>`;
  } else {
    $("#explanation-chosen").classList.add("hidden");
    $("#explanation-chosen").innerHTML = "";
  }
  $("#explanation-tab").classList.remove("hidden");

  $("#submit").classList.add("hidden");
  $("#new-question").classList.remove("hidden");
}

function wireQuestionScreen() {
  $("#submit").addEventListener("click", submitAnswer);
  $("#new-question").addEventListener("click", () => {
    newQuestion();
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

renderDashboard();
wireDashboard();
wireTabs();
wireQuestionScreen();
updateStartButton();
