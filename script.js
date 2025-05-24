// Elements
const courseForm = document.getElementById('courseForm');
const coursesTable = document.getElementById('coursesTable');
const coursesBody = coursesTable.querySelector('tbody');
const gpaResult = document.getElementById('gpaResult');
const cumulativeGPA = document.getElementById('cumulativeGPA');
const courseNameInput = document.getElementById('courseName');
const termsContainer = document.getElementById('termsContainer');
const addTermBtn = document.getElementById('addTermBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const prevTermSummaryForm = document.getElementById('prevTermSummaryForm');
const prevTermNameInput = document.getElementById('prevTermName');
const prevTermCreditsInput = document.getElementById('prevTermCredits');
const prevTermGPAInput = document.getElementById('prevTermGPA');
const exportCSVBtn = document.getElementById('exportCSVBtn');
const prevTermsBtn = document.getElementById('prevTermsBtn');

let terms = {};
let currentTerm = null;
let termCounter = 0;
let showingPrevTerms = false; // tracks which view is active

// Force uppercase on course name input
courseNameInput.addEventListener('input', () => {
  courseNameInput.value = courseNameInput.value.toUpperCase();
});

// Load from localStorage if any
function loadData() {
  const saved = localStorage.getItem('bogaziciGPAData');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.terms) {
        terms = data.terms;
        termCounter = data.termCounter || Object.keys(terms).length;
        currentTerm = data.currentTerm || Object.keys(terms)[0];
        showingPrevTerms = data.showingPrevTerms || false;
      }
    } catch {
      // ignore parse errors
    }
  }
}

// Save to localStorage
function saveData() {
  const data = { terms, termCounter, currentTerm, showingPrevTerms };
  localStorage.setItem('bogaziciGPAData', JSON.stringify(data));
}

// Dark mode load/save
function loadDarkMode() {
  const saved = localStorage.getItem('bogaziciGPADarkMode');
  if (saved === 'true') {
    document.body.classList.add('dark');
    darkModeToggle.textContent = 'Light Mode';
  }
}
function saveDarkMode(enabled) {
  localStorage.setItem('bogaziciGPADarkMode', enabled ? 'true' : 'false');
}

// Term names auto generator
function createTermName(num) {
  return `Term ${num}`;
}

// Render term buttons (only normal terms)
function renderTermButtons() {
  // Remove all buttons except addTermBtn and prevTermsBtn
  [...termsContainer.querySelectorAll('.term-btn')].forEach(btn => {
    if (btn !== addTermBtn && btn !== prevTermsBtn) btn.remove();
  });

  if (showingPrevTerms) return; // hide normal terms buttons when showing previous terms

  // Add buttons for normal terms only (exclude summaries)
  Object.entries(terms).forEach(([term, data]) => {
    if (!data.summary) {
      const btn = document.createElement('button');
      btn.textContent = term;
      btn.className = 'term-btn';
      if (term === currentTerm) btn.classList.add('active');
      btn.addEventListener('click', () => {
        if (term !== currentTerm) {
          currentTerm = term;
          updateUI();
        }
      });
      termsContainer.insertBefore(btn, addTermBtn);
    }
  });
}

// Show previous terms summary list
function showPreviousTermsView() {
  showingPrevTerms = true;
  // Hide course form, courses table, export button, add term button
  courseForm.style.display = 'none';
  coursesTable.style.display = 'none';
  exportCSVBtn.style.display = 'none';
  addTermBtn.style.display = 'none';

  // Clear GPA result, cumulative GPA will still show
  gpaResult.style.display = 'none';

  // Remove active class from term buttons (if any)
  [...termsContainer.querySelectorAll('.term-btn')].forEach(btn => btn.classList.remove('active'));
  prevTermsBtn.classList.add('active');

  // Render previous terms summary list below termsContainer
  renderPreviousTermsSummary();

  saveData();
}

// Show normal terms view
function showNormalTermsView() {
  showingPrevTerms = false;
  courseForm.style.display = 'block';
  exportCSVBtn.style.display = 'inline-block';
  addTermBtn.style.display = 'inline-block';

  // Remove previous terms summary list if exists
  const prevSummaryDiv = document.getElementById('prevTermsSummaryList');
  if (prevSummaryDiv) prevSummaryDiv.remove();

  prevTermsBtn.classList.remove('active');

  // Restore term buttons and select currentTerm
  renderTermButtons();

  // Show courses for current term
  updateTable();

  saveData();
}

// Render previous terms summary list with edit and remove buttons
function renderPreviousTermsSummary() {
  // Remove old list if exists
  const oldList = document.getElementById('prevTermsSummaryList');
  if (oldList) oldList.remove();

  const div = document.createElement('div');
  div.id = 'prevTermsSummaryList';
  div.style.marginTop = '1em';

  const header = document.createElement('h3');
  header.textContent = 'Previous Terms Summary List';
  div.appendChild(header);

  // Filter summaries
  const summaries = Object.entries(terms).filter(([term, data]) => data.summary);

  if (summaries.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No previous term summaries added.';
    div.appendChild(p);
  } else {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '0.5em';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background-color: var(--dark-blue); color:white;">
        <th>Term Name</th>
        <th>Total Credits</th>
        <th>GPA</th>
        <th>Actions</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    summaries.forEach(([term, data]) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #ccc';

      tr.innerHTML = `
        <td>${term}</td>
        <td>${data.summary.credits}</td>
        <td>${data.summary.gpa.toFixed(2)}</td>
        <td>
          <button class="action-btn edit-prev-btn" data-term="${term}">Edit</button>
          <button class="action-btn remove-prev-btn" data-term="${term}">Remove</button>
        </td>`;

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    div.appendChild(table);
  }

  // Back to normal terms button
  const backBtn = document.createElement('button');
  backBtn.textContent = 'Back to Terms';
  backBtn.style.marginTop = '1em';
  backBtn.style.padding = '0.5em 1em';
  backBtn.style.cursor = 'pointer';
  backBtn.addEventListener('click', () => {
    showNormalTermsView();
  });

  div.appendChild(backBtn);

  termsContainer.insertAdjacentElement('afterend', div);
}

// Edit previous term summary (opens prompt dialogs)
function editPreviousTermSummary(term) {
  const data = terms[term].summary;
  if (!data) return;

  const newName = prompt('Edit term name:', term);
  if (!newName) return;

  const newCredits = prompt('Edit total credits:', data.credits);
  if (!newCredits || isNaN(newCredits) || newCredits <= 0) return;

  const newGPA = prompt('Edit term GPA:', data.gpa);
  if (!newGPA || isNaN(newGPA) || newGPA < 0 || newGPA > 4) return;

  // Delete old term if name changed
  if (newName !== term) {
    delete terms[term];
  }

  terms[newName] = {
    summary: {
      credits: parseFloat(newCredits),
      gpa: parseFloat(newGPA),
    },
  };

  renderPreviousTermsSummary();
  saveData();
}

// Event listeners for previous terms summary edit/remove
document.body.addEventListener('click', (e) => {
  if (e.target.classList.contains('edit-prev-btn')) {
    const term = e.target.getAttribute('data-term');
    editPreviousTermSummary(term);
  } else if (e.target.classList.contains('remove-prev-btn')) {
    const term = e.target.getAttribute('data-term');
    if (confirm(`Remove previous term summary "${term}"?`)) {
      delete terms[term];
      renderPreviousTermsSummary();
      saveData();
    }
  }
});

// Update UI depending on view
function updateUI() {
  if (showingPrevTerms) {
    showPreviousTermsView();
  } else {
    renderTermButtons();
    updateTable();
  }
  updateCumulativeGPA();
  saveData();
}

// Update current term table with courses and edit/remove
function updateTable() {
  if (!currentTerm || !terms[currentTerm]) {
    coursesTable.style.display = 'none';
    gpaResult.style.display = 'none';
    return;
  }

  const termData = terms[currentTerm];
  if (termData.summary) {
    coursesTable.style.display = 'none';
    gpaResult.style.display = 'block';
    gpaResult.textContent = `${currentTerm} Summary — GPA: ${termData.summary.gpa.toFixed(2)}, Credits: ${termData.summary.credits}`;
    return;
  }

  if (!termData.courses || termData.courses.length === 0) {
    coursesTable.style.display = 'none';
    gpaResult.style.display = 'none';
    return;
  }

  const courses = termData.courses;
  coursesTable.style.display = 'table';
  coursesBody.innerHTML = '';

  let totalPoints = 0;
  let totalCreditsCounted = 0;
  let totalCreditsAll = 0;

  courses.forEach((c, index) => {
    const isPF = c.grade === 'PF';
    const pfDisplay = isPF ? 'Yes' : 'No';
    const gradeDisplay = isPF ? '-' : c.grade;

    if (c.isEditing) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input class="edit-input" type="text" maxlength="10" value="${c.name}" /></td>
        <td><input class="edit-input" type="number" min="1" max="20" value="${c.credits}" /></td>
        <td>
          <select class="edit-input grade-select">
            <option value="">Select grade</option>
            <option value="4">AA</option>
            <option value="3.5">BA</option>
            <option value="3">BB</option>
            <option value="2.5">CB</option>
            <option value="2">CC</option>
            <option value="1.5">DC</option>
            <option value="1">DD</option>
            <option value="0">F</option>
            <option value="PF">Pass/Fail</option>
          </select>
        </td>
        <td><span>${pfDisplay}</span></td>
        <td>
          <button class="action-btn save-btn" data-index="${index}">Save</button>
          <button class="action-btn cancel-btn" data-index="${index}">Cancel</button>
        </td>
      `;
      coursesBody.appendChild(tr);
      tr.querySelector('.grade-select').value = c.grade;
    } else {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.name}</td>
        <td>${c.credits}</td>
        <td>${gradeDisplay}</td>
        <td>${pfDisplay}</td>
        <td>
          <button class="action-btn edit-btn" data-index="${index}">Edit</button>
          <button class="action-btn remove-btn" data-index="${index}">Remove</button>
        </td>
      `;
      coursesBody.appendChild(tr);

      totalCreditsAll += c.credits;
      if (!isPF) {
        totalPoints += c.credits * parseFloat(c.grade);
        totalCreditsCounted += c.credits;
      }
    }
  });

  const gpa = totalCreditsCounted === 0 ? 0 : (totalPoints / totalCreditsCounted);
  gpaResult.style.display = 'block';
  gpaResult.textContent = `${currentTerm} GPA: ${gpa.toFixed(2)} (Credits counted: ${totalCreditsCounted} / Total credits: ${totalCreditsAll})`;
}

// Calculate and update cumulative GPA
function updateCumulativeGPA() {
  let totalPoints = 0;
  let totalCreditsCounted = 0;
  let totalCreditsAll = 0;

  Object.values(terms).forEach(termData => {
    if (termData.summary) {
      totalCreditsAll += termData.summary.credits;
      totalPoints += termData.summary.gpa * termData.summary.credits;
      totalCreditsCounted += termData.summary.credits;
    } else if (termData.courses) {
      termData.courses.forEach(c => {
        totalCreditsAll += c.credits;
        if (c.grade !== 'PF') {
          totalPoints += c.credits * parseFloat(c.grade);
          totalCreditsCounted += c.credits;
        }
      });
    }
  });

  if (totalCreditsCounted === 0) {
    cumulativeGPA.style.display = 'none';
    return;
  }

  const cumGPA = totalPoints / totalCreditsCounted;
  cumulativeGPA.style.display = 'block';
  cumulativeGPA.textContent = `Cumulative GPA: ${cumGPA.toFixed(2)} (Credits counted: ${totalCreditsCounted} / Total credits: ${totalCreditsAll})`;
}

// Table buttons events (edit/save/cancel/remove)
coursesBody.addEventListener('click', e => {
  const target = e.target;
  const index = parseInt(target.getAttribute('data-index'));
  if (target.classList.contains('remove-btn')) {
    if (currentTerm && terms[currentTerm] && terms[currentTerm].courses) {
      terms[currentTerm].courses.splice(index, 1);
      updateUI();
    }
  } else if (target.classList.contains('edit-btn')) {
    if (currentTerm && terms[currentTerm] && terms[currentTerm].courses) {
      terms[currentTerm].courses.forEach(c => c.isEditing = false);
      terms[currentTerm].courses[index].isEditing = true;
      updateTable();
    }
  } else if (target.classList.contains('cancel-btn')) {
    if (currentTerm && terms[currentTerm] && terms[currentTerm].courses) {
      terms[currentTerm].courses[index].isEditing = false;
      updateTable();
    }
  } else if (target.classList.contains('save-btn')) {
    if (currentTerm && terms[currentTerm] && terms[currentTerm].courses) {
      const tr = target.closest('tr');
      const inputs = tr.querySelectorAll('input.edit-input, select.edit-input');
      const newName = inputs[0].value.trim().toUpperCase();
      const newCredits = parseInt(inputs[1].value);
      const newGrade = inputs[2].value;

      if (!newName || !newCredits || !newGrade) {
        alert('Please fill all fields with valid values.');
        return;
      }

      terms[currentTerm].courses[index] = {
        name: newName,
        credits: newCredits,
        grade: newGrade,
        isEditing: false
      };
      updateUI();
    }
  }
});

// Add new course form submit
courseForm.addEventListener('submit', e => {
  e.preventDefault();

  const name = courseNameInput.value.trim();
  const credits = parseInt(document.getElementById('credits').value);
  const grade = document.getElementById('grade').value;

  if (!name || !credits || !grade) return;

  if (!currentTerm) {
    alert('Please add a term first.');
    return;
  }

  if (!terms[currentTerm]) terms[currentTerm] = { courses: [] };
  if (!terms[currentTerm].courses) terms[currentTerm].courses = [];

  terms[currentTerm].courses.push({ name, credits, grade });
  updateUI();

  courseForm.reset();
  courseNameInput.focus();
});

// Add new term button click
addTermBtn.addEventListener('click', () => {
  termCounter++;
  const newTermName = createTermName(termCounter);
  terms[newTermName] = { courses: [] };
  currentTerm = newTermName;
  showingPrevTerms = false;
  updateUI();
});

// Dark mode toggle
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  darkModeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  saveDarkMode(isDark);
});

// Load dark mode on start
loadDarkMode();

// Load saved data on start
loadData();

// If no terms, add default
if (!currentTerm || !terms[currentTerm]) {
  addTermBtn.click();
} else {
  updateUI();
}

// Previous term summary form submit
prevTermSummaryForm.addEventListener('submit', e => {
  e.preventDefault();

  const name = prevTermNameInput.value.trim();
  const credits = parseInt(prevTermCreditsInput.value);
  const gpa = parseFloat(prevTermGPAInput.value);

  if (!name || !credits || isNaN(gpa) || gpa < 0 || gpa > 4) {
    alert('Please enter valid term name, credits and GPA (0.00 - 4.00).');
    return;
  }

  // Add summary term, do not mix with normal terms
  terms[name] = { summary: { credits, gpa } };

  currentTerm = name;  // For convenience, but does not show courses

  showingPrevTerms = true;
  showPreviousTermsView();

  prevTermSummaryForm.reset();
});

// Export current term CSV
exportCSVBtn.addEventListener('click', () => {
  if (!currentTerm || !terms[currentTerm]) {
    alert('No term selected.');
    return;
  }
  if (showingPrevTerms) {
    alert('Cannot export CSV while viewing previous terms summary.');
    return;
  }
  const termData = terms[currentTerm];
  if (termData.summary) {
    alert('Cannot export CSV for summary-only term.');
    return;
  }
  if (!termData.courses || termData.courses.length === 0) {
    alert('No courses in current term.');
    return;
  }

  let csv = 'Course,Credits,Grade,Pass/Fail\n';
  termData.courses.forEach(c => {
    csv += `"${c.name}",${c.credits},"${c.grade}","${c.grade === 'PF' ? 'Yes' : 'No'}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentTerm.replace(/\s+/g,'_')}_courses.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Prev Terms Summary button click
prevTermsBtn.addEventListener('click', () => {
  if (!showingPrevTerms) {
    showPreviousTermsView();
  }
});
