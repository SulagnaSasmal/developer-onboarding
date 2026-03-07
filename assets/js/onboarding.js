// Developer Onboarding — state management & interactions

const STEPS = 5;
const STORAGE_KEY = "dev_onboarding";

function getState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function setState(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getState(), ...data }));
}

function getCompletedSteps() {
  return getState().completed_steps || [];
}

function markStepComplete(step) {
  const done = getCompletedSteps();
  if (!done.includes(step)) {
    done.push(step);
    setState({ completed_steps: done });
  }
}

function isStepComplete(step) {
  return getCompletedSteps().includes(step);
}

// Render progress track
function renderProgressTrack(currentStep) {
  const track = document.querySelector(".progress-steps");
  if (!track) return;
  const done = getCompletedSteps();

  const line = track.querySelector(".progress-line-fill");
  if (line) {
    const pct = ((currentStep - 1) / STEPS) * 100;
    line.style.width = pct + "%";
  }

  track.querySelectorAll(".step-dot").forEach((dot) => {
    const s = parseInt(dot.dataset.step);
    dot.classList.remove("active", "done");
    if (done.includes(s) && s !== currentStep) {
      dot.classList.add("done");
      dot.textContent = "";
    } else if (s === currentStep) {
      dot.classList.add("active");
      dot.textContent = s;
    } else {
      dot.textContent = s;
    }
  });

  track.querySelectorAll(".step-label") && document.querySelectorAll(".step-label").forEach((lbl) => {
    const s = parseInt(lbl.dataset.step);
    lbl.classList.remove("active", "done");
    if (done.includes(s) && s !== currentStep) {
      lbl.classList.add("done");
    } else if (s === currentStep) {
      lbl.classList.add("active");
    }
  });
}

// Checklist interaction
function initChecklist(stepKey) {
  const state = getState();
  const checked = state[stepKey] || [];

  document.querySelectorAll(".checklist li").forEach((li, i) => {
    if (checked.includes(i)) {
      li.classList.add("checked");
    }
    li.addEventListener("click", function () {
      this.classList.toggle("checked");
      const newChecked = [];
      document.querySelectorAll(".checklist li").forEach((l, j) => {
        if (l.classList.contains("checked")) newChecked.push(j);
      });
      const update = {};
      update[stepKey] = newChecked;
      setState(update);

      // Check if all items are checked
      const total = document.querySelectorAll(".checklist li").length;
      const doneCount = document.querySelectorAll(".checklist li.checked").length;
      const completeBtn = document.getElementById("complete-step-btn");
      if (completeBtn) {
        completeBtn.disabled = doneCount < total;
        completeBtn.style.opacity = doneCount < total ? "0.5" : "1";
      }
    });
  });

  // Set initial button state
  const total = document.querySelectorAll(".checklist li").length;
  const doneCount = document.querySelectorAll(".checklist li.checked").length;
  const completeBtn = document.getElementById("complete-step-btn");
  if (completeBtn && total > 0) {
    completeBtn.disabled = doneCount < total;
    completeBtn.style.opacity = doneCount < total ? "0.5" : "1";
  }
}

// Code tab switching
function initCodeTabs() {
  document.querySelectorAll(".code-tabs-wrap").forEach((wrap) => {
    const tabs = wrap.querySelectorAll(".code-tab");
    const contents = wrap.querySelectorAll(".code-tab-content");

    if (tabs.length > 0) {
      tabs[0].classList.add("active");
      contents[0].classList.add("active");
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", function () {
        tabs.forEach((t, j) => {
          t.classList.toggle("active", j === i);
          contents[j] && contents[j].classList.toggle("active", j === i);
        });
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initCodeTabs();
});
