// ui.js — wiring for the dashboard and the question screen.

import { EXAMPLES } from "../data/examples.js?v=8";
import { generateQuestion } from "./generator.js?v=8";
import { RULES } from "./rules.js?v=8";

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
  form.classList.remove("choices-two-column");

  if (q.layout === "two_column") {
    renderTwoColumnChoices(form, q);
  } else {
    renderSingleColumnChoices(form, q);
  }

  $("#submit").disabled = true;
  $("#submit").classList.remove("hidden");
  $("#new-question").classList.add("hidden");
  $("#feedback").classList.add("hidden");
  $("#explanation-tab").classList.add("hidden");
  $("#explanation-correct").innerHTML = "";
  $("#explanation-chosen").innerHTML = "";
  $("#explanation-chosen").classList.add("hidden");
}

function makeChoiceInput(index) {
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "choice";
  input.value = String(index);
  input.addEventListener("change", () => {
    state.chosenSlotIndex = index;
    $("#submit").disabled = false;
  });
  return input;
}

function renderSingleColumnChoices(form, q) {
  q.choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = "choice";
    label.dataset.index = String(index);

    const slot = document.createElement("span");
    slot.className = "choice-label";
    slot.textContent = `${choice.label}.`;

    const text = document.createElement("span");
    text.className = "choice-text";
    text.textContent = choice.displayText;

    label.appendChild(makeChoiceInput(index));
    label.appendChild(slot);
    label.appendChild(text);
    form.appendChild(label);
  });
}

function renderTwoColumnChoices(form, q) {
  form.classList.add("choices-two-column");

  const header = document.createElement("div");
  header.className = "choice choice-header";
  // Spacer to align with the radio + label column of the choice rows.
  const spacer = document.createElement("span");
  spacer.className = "choice-header-spacer";
  const xHead = document.createElement("span");
  xHead.className = "choice-col choice-col-x";
  xHead.textContent = q.xLabel;
  const yHead = document.createElement("span");
  yHead.className = "choice-col choice-col-y";
  yHead.textContent = q.yLabel;
  header.appendChild(spacer);
  header.appendChild(xHead);
  header.appendChild(yHead);
  form.appendChild(header);

  q.choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = "choice choice-paired";
    label.dataset.index = String(index);

    const slot = document.createElement("span");
    slot.className = "choice-label";
    slot.textContent = `${choice.label}.`;

    const xCell = document.createElement("span");
    xCell.className = "choice-col choice-col-x";
    xCell.textContent = choice.xText;

    const yCell = document.createElement("span");
    yCell.className = "choice-col choice-col-y";
    yCell.textContent = choice.yText;

    label.appendChild(makeChoiceInput(index));
    label.appendChild(slot);
    label.appendChild(xCell);
    label.appendChild(yCell);
    form.appendChild(label);
  });
}

function submitAnswer() {
  if (state.chosenSlotIndex === null) return;
  const q = state.currentQuestion;
  const chosen = q.choices[state.chosenSlotIndex];
  const correctIndex = q.correctSlotIndex;
  const correctChoice = q.choices[correctIndex];

  // Lock and color the choices.
  for (const labelEl of $$(".choice:not(.choice-header)", $("#choices"))) {
    labelEl.classList.add("locked");
    const input = $('input[type="radio"]', labelEl);
    if (input) input.disabled = true;
    const index = Number(labelEl.dataset.index);
    if (index === correctIndex) labelEl.classList.add("correct");
    if (index === state.chosenSlotIndex && !chosen.isCorrect) {
      labelEl.classList.add("incorrect-chosen");
    }
  }

  // Merge ctx (case may override example).
  const ctx = {
    ...state.currentExample.ctx,
    ...(state.currentCase.ctx ?? {}),
  };
  const params = q.params;

  if (q.layout === "two_column") {
    renderTwoColumnFeedback(q, chosen, correctChoice, ctx, params);
  } else {
    renderSingleColumnFeedback(q, chosen, correctChoice, ctx, params);
  }

  $("#explanation-tab").classList.remove("hidden");
  $("#submit").classList.add("hidden");
  $("#new-question").classList.remove("hidden");
}

function renderSingleColumnFeedback(q, chosen, correctChoice, ctx, params) {
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
}

function renderTwoColumnFeedback(q, chosen, correctChoice, ctx, params) {
  const feedback = $("#feedback");
  feedback.classList.remove("hidden", "correct", "incorrect");

  if (chosen.isCorrect) {
    feedback.classList.add("correct");
    feedback.textContent =
      `Correct. ${q.xLabel} = ${correctChoice.xText}, ` +
      `${q.yLabel} = ${correctChoice.yText}.`;
  } else {
    feedback.classList.add("incorrect");
    const wrongParts = [];
    if (!chosen.xIsCorrect) wrongParts.push(q.xLabel);
    if (!chosen.yIsCorrect) wrongParts.push(q.yLabel);
    const wrongDesc =
      wrongParts.length === 2
        ? "both columns"
        : `the ${wrongParts[0]} column`;
    feedback.textContent =
      `Incorrect — you got ${wrongDesc} wrong. Correct answer is ` +
      `${correctChoice.label}: ${correctChoice.xText} / ${correctChoice.yText}.`;
  }

  // Always show why X correct and why Y correct.
  const xCorrectRule = RULES[q.choices[q.correctSlotIndex].xRuleId];
  const yCorrectRule = RULES[q.choices[q.correctSlotIndex].yRuleId];
  $("#explanation-correct").innerHTML =
    `<h3>${q.xLabel}: ${correctChoice.xText} is correct</h3>` +
    `<p>${xCorrectRule.explain(params, ctx)}</p>` +
    `<h3>${q.yLabel}: ${correctChoice.yText} is correct</h3>` +
    `<p>${yCorrectRule.explain(params, ctx)}</p>`;

  // If chosen X or Y is wrong, explain each part separately.
  if (chosen.isCorrect) {
    $("#explanation-chosen").classList.add("hidden");
    $("#explanation-chosen").innerHTML = "";
  } else {
    const sections = [];
    if (!chosen.xIsCorrect) {
      const chosenXRule = RULES[chosen.xRuleId];
      sections.push(
        `<h3>Your ${q.xLabel} answer (${chosen.xText}) is incorrect</h3>` +
          `<p>${chosenXRule.explain(params, ctx)}</p>`,
      );
    }
    if (!chosen.yIsCorrect) {
      const chosenYRule = RULES[chosen.yRuleId];
      sections.push(
        `<h3>Your ${q.yLabel} answer (${chosen.yText}) is incorrect</h3>` +
          `<p>${chosenYRule.explain(params, ctx)}</p>`,
      );
    }
    $("#explanation-chosen").classList.remove("hidden");
    $("#explanation-chosen").innerHTML = sections.join("");
  }
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
