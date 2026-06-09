// --- Global Application State ---
let questionBank = [];
let quizQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = []; // Records user's answer for each question in the quiz
let startTime = null;
let timerInterval = null;

// --- DOM Elements ---
const elHomeView = document.getElementById('view-home');
const elQuizView = document.getElementById('view-quiz');
const elResultView = document.getElementById('view-result');
const elGuideView = document.getElementById('view-guide');

const navHome = document.getElementById('nav-btn-home');
const navGuide = document.getElementById('nav-btn-guide');
const btnThemeToggle = document.getElementById('theme-toggle-btn');
const iconDark = btnThemeToggle.querySelector('.theme-icon-dark');
const iconLight = btnThemeToggle.querySelector('.theme-icon-light');

// Home view controls
const btnStartQuiz = document.getElementById('start-quiz-btn');
const btnGoToGuide = document.getElementById('go-to-guide-btn');
const elTotalQuestionsCount = document.getElementById('total-questions-count');

// Quiz view elements
const elQuizProgressText = document.getElementById('quiz-progress-text');
const elQuizProgressPercent = document.getElementById('quiz-progress-percent');
const elQuizProgressFill = document.getElementById('quiz-progress-fill');
const elQuizQuestionText = document.getElementById('quiz-question-text');
const elQuizOptionsContainer = document.getElementById('quiz-options-container');
const elQuizExplanationPanel = document.getElementById('quiz-explanation-panel');
const elExplanationIcon = document.getElementById('explanation-icon');
const elExplanationStatusText = document.getElementById('explanation-status-text');
const elCorrectAnswerLetter = document.getElementById('correct-answer-letter');
const elQuizExplanationText = document.getElementById('quiz-explanation-text');
const btnNextQuestion = document.getElementById('next-question-btn');

// Result view elements
const elResultScoreText = document.getElementById('result-score-text');
const elScoreCircleFill = document.getElementById('score-circle-fill');
const elResultTitle = document.getElementById('result-title');
const elResultSubtitle = document.getElementById('result-subtitle');
const elResultCorrectCount = document.getElementById('result-correct-count');
const elResultIncorrectCount = document.getElementById('result-incorrect-count');
const elResultTimeText = document.getElementById('result-time-text');
const btnRestartQuiz = document.getElementById('restart-quiz-btn');
const btnResultGoHome = document.getElementById('result-go-home-btn');
const elResultReviewList = document.getElementById('result-review-list');

// Guide view elements
const elGuideSearchInput = document.getElementById('guide-search-input');
const btnClearSearch = document.getElementById('clear-search-btn');
const elGuideQuestionsList = document.getElementById('guide-questions-list');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadQuestions();
    setupEventListeners();
});

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcons(savedTheme);
}

function updateThemeToggleIcons(theme) {
    if (theme === 'dark') {
        iconDark.style.display = 'none';
        iconLight.style.display = 'block';
    } else {
        iconDark.style.display = 'block';
        iconLight.style.display = 'none';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcons(newTheme);
}

// --- Data Fetching ---
async function loadQuestions() {
    try {
        // Check if questionBankData is loaded from questions.js (bypasses local file:// CORS issues)
        if (typeof questionBankData !== 'undefined') {
            questionBank = questionBankData;
            console.log('Successfully loaded questions from questions.js (Local Script Mode)');
        } else {
            // Fallback to fetching questions.json (Server Mode)
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error('Could not fetch questions.json');
            }
            questionBank = await response.json();
            console.log('Successfully loaded questions from questions.json (HTTP Fetch Mode)');
        }

        // Update total count on home page
        if (elTotalQuestionsCount) {
            elTotalQuestionsCount.textContent = questionBank.length;
        }

        // Render study guide
        renderStudyGuide(questionBank);
    } catch (error) {
        console.error('Error loading questions:', error);
        elTotalQuestionsCount.textContent = '?';
        alert('載入題目資料庫失敗，請確認 questions.js 或 questions.json 是否存在。');
    }
}

// --- View Router ---
function showView(viewName) {
    // Hide all view sections
    const views = [elHomeView, elQuizView, elResultView, elGuideView];
    views.forEach(v => {
        if (v) {
            v.classList.remove('active');
            v.style.display = 'none'; // Ensure display none is set to prevent occupying layout space
        }
    });

    // Remove active class from nav links
    navHome.classList.remove('active');
    navGuide.classList.remove('active');

    // Show selected view
    let targetView;
    if (viewName === 'home') {
        targetView = elHomeView;
        navHome.classList.add('active');
    } else if (viewName === 'quiz') {
        targetView = elQuizView;
    } else if (viewName === 'result') {
        targetView = elResultView;
    } else if (viewName === 'guide') {
        targetView = elGuideView;
        navGuide.classList.add('active');
    }

    if (targetView) {
        // Trigger display first, then set active class for transition
        targetView.style.display = 'block';
        window.scrollTo({ top: 0 });
        setTimeout(() => {
            targetView.classList.add('active');
        }, 50);
    }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Nav bar actions
    navHome.addEventListener('click', () => showView('home'));
    navGuide.addEventListener('click', () => showView('guide'));
    btnThemeToggle.addEventListener('click', toggleTheme);

    // Home view actions
    btnStartQuiz.addEventListener('click', startQuiz);
    btnGoToGuide.addEventListener('click', () => showView('guide'));

    // Quiz view actions
    btnNextQuestion.addEventListener('click', advanceQuiz);

    // Result view actions
    btnRestartQuiz.addEventListener('click', startQuiz);
    btnResultGoHome.addEventListener('click', () => showView('home'));

    // Search action in Guide
    elGuideSearchInput.addEventListener('input', handleSearch);
    btnClearSearch.addEventListener('click', () => {
        elGuideSearchInput.value = '';
        btnClearSearch.style.display = 'none';
        renderStudyGuide(questionBank);
        elGuideSearchInput.focus();
    });
}

// --- Quiz Logic ---

// Helper function to shuffle array in place
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startQuiz() {
    if (questionBank.length === 0) {
        alert('題庫無題目，無法開始測驗。');
        return;
    }

    // 1. Shuffling and picking up to 10 questions
    const shuffledBank = shuffle([...questionBank]);
    quizQuestions = shuffledBank.slice(0, Math.min(10, shuffledBank.length));

    // 2. Reset states
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    startTime = new Date();

    // Start interval timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateQuizTimer, 1000);

    // 3. Switch View
    showView('quiz');

    // 4. Load First Question
    loadQuestion(0);
}

function updateQuizTimer() {
    // Just tracks time, no visual timer in quiz to maintain simplicity, 
    // but tracks total time for results.
}

function loadQuestion(index) {
    const qData = quizQuestions[index];

    // Scroll back to top for the new question
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Progress UI
    const totalQ = quizQuestions.length;
    const progressPercent = Math.round(((index + 1) / totalQ) * 100);
    elQuizProgressText.textContent = `第 ${index + 1} / ${totalQ} 題`;
    elQuizProgressPercent.textContent = `${progressPercent}%`;
    elQuizProgressFill.style.width = `${progressPercent}%`;

    // Question UI
    elQuizQuestionText.innerHTML = qData.question;

    // Clear and build options
    elQuizOptionsContainer.innerHTML = '';
    elQuizExplanationPanel.classList.add('hidden');
    btnNextQuestion.classList.add('hidden');

    Object.entries(qData.options).forEach(([letter, text]) => {
        const optionBtn = document.createElement('button');
        optionBtn.className = 'option-btn';
        optionBtn.setAttribute('data-letter', letter);
        optionBtn.innerHTML = `
            <span class="option-badge">${letter}</span>
            <span class="option-text">${text}</span>
        `;

        optionBtn.addEventListener('click', () => handleOptionSelect(letter, optionBtn));
        elQuizOptionsContainer.appendChild(optionBtn);
    });
}

function handleOptionSelect(selectedLetter, clickedBtn) {
    const qData = quizQuestions[currentQuestionIndex];
    const correctLetter = qData.answer;
    const isCorrect = selectedLetter === correctLetter;

    // Disable all options
    const optionButtons = elQuizOptionsContainer.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
        btn.classList.add('disabled');
        const letter = btn.getAttribute('data-letter');

        if (letter === correctLetter) {
            // Reveal correct answer in green
            btn.classList.add('reveal-correct');
        } else if (letter === selectedLetter) {
            // Highlight user selected answer in red (if wrong)
            btn.classList.add('selected-incorrect');
        } else {
            // Dim other unselected answers
            btn.classList.add('dimmed');
        }
    });

    if (isCorrect) {
        clickedBtn.classList.remove('reveal-correct');
        clickedBtn.classList.add('selected-correct');
        score++;

        // Style explanation panel green
        elQuizExplanationPanel.className = 'explanation-panel correct-theme';
        elExplanationIcon.className = 'fa-solid fa-circle-check';
        elExplanationStatusText.textContent = '回答正確！';
    } else {
        // Style explanation panel red
        elQuizExplanationPanel.className = 'explanation-panel incorrect-theme';
        elExplanationIcon.className = 'fa-solid fa-circle-xmark';
        elExplanationStatusText.textContent = '回答錯誤。';
    }

    // Populate explanation details
    elCorrectAnswerLetter.textContent = `${correctLetter}. ${qData.options[correctLetter]}`;
    elQuizExplanationText.innerHTML = qData.explanation;

    // Record user answer for results recap
    userAnswers.push({
        questionId: qData.id,
        question: qData.question,
        options: qData.options,
        correctAnswer: correctLetter,
        userAnswer: selectedLetter,
        isCorrect: isCorrect,
        explanation: qData.explanation
    });

    // Reveal elements
    elQuizExplanationPanel.classList.remove('hidden');

    // Scroll to top so the user can easily see correctness and explanation
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update Next Button Text
    if (currentQuestionIndex === quizQuestions.length - 1) {
        btnNextQuestion.innerHTML = `<span>查看結果</span> <i class="fa-solid fa-square-poll-vertical"></i>`;
    } else {
        btnNextQuestion.innerHTML = `<span>下一題</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
    btnNextQuestion.classList.remove('hidden');
}

function advanceQuiz() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) {
        loadQuestion(currentQuestionIndex);
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    if (timerInterval) clearInterval(timerInterval);

    // Calculate time taken
    const endTime = new Date();
    const timeDiff = Math.abs(endTime - startTime); // ms
    const totalSeconds = Math.floor(timeDiff / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const timeStr = `${minutes}:${seconds}`;

    // Update Result Score Overlay
    elResultScoreText.textContent = score;
    elResultCorrectCount.textContent = `${score} 題`;
    elResultIncorrectCount.textContent = `${quizQuestions.length - score} 題`;
    elResultTimeText.textContent = timeStr;

    // Title / Subtitle updates based on performance
    const percentage = (score / quizQuestions.length) * 100;
    if (percentage === 100) {
        elResultTitle.textContent = '太完美了！🎉';
        elResultSubtitle.textContent = '恭喜你答對所有題目，準備好拿高分了！';
    } else if (percentage >= 80) {
        elResultTitle.textContent = '表現亮眼！⭐';
        elResultSubtitle.textContent = '答對了大部分題目，再稍微複習一下就完美了。';
    } else if (percentage >= 60) {
        elResultTitle.textContent = '順利及格！👍';
        elResultSubtitle.textContent = '及格了，可以看看答錯的題目並加強複習。';
    } else {
        elResultTitle.textContent = '再接再厲！💪';
        elResultSubtitle.textContent = '需要再熟悉一下觀念喔，多練習幾次一定會進步！';
    }

    // Set SVG Score Circle Fill animation
    const circleCircumference = 2 * Math.PI * 54; // 339.292
    const strokeDashoffset = circleCircumference - (circleCircumference * score) / quizQuestions.length;
    elScoreCircleFill.style.strokeDasharray = `${circleCircumference}`;
    elScoreCircleFill.style.strokeDashoffset = `${circleCircumference}`;

    // Show View
    showView('result');

    // Smooth dashoffset animation
    setTimeout(() => {
        elScoreCircleFill.style.strokeDashoffset = `${strokeDashoffset}`;
    }, 150);

    // Render Review List
    renderReviewList();
}

function renderReviewList() {
    elResultReviewList.innerHTML = '';

    userAnswers.forEach((ans, index) => {
        const reviewCard = document.createElement('div');
        reviewCard.className = `review-card ${ans.isCorrect ? 'correct' : 'incorrect'}`;

        const reviewId = `review-exp-${index}`;

        reviewCard.innerHTML = `
            <div class="review-question-header">
                <h4 class="review-question-text">${index + 1}. ${ans.question}</h4>
                <div class="status-indicator-badge">
                    <i class="fa-solid ${ans.isCorrect ? 'fa-check' : 'fa-xmark'}"></i>
                    <span>${ans.isCorrect ? '答對' : '答錯'}</span>
                </div>
            </div>
            
            <div class="review-details">
                <p class="review-choice ${ans.isCorrect ? 'user-pick-correct' : 'user-pick-incorrect'}">
                    你的回答：<span>${ans.userAnswer}. ${ans.options[ans.userAnswer]}</span>
                </p>
                ${!ans.isCorrect ? `
                <p class="review-choice correct-ans">
                    正確答案：<span>${ans.correctAnswer}. ${ans.options[ans.correctAnswer]}</span>
                </p>
                ` : ''}
            </div>

            <button class="review-toggle-exp" data-target="${reviewId}">
                <i class="fa-solid fa-chevron-down"></i> <span>顯示解析</span>
            </button>

            <div id="${reviewId}" class="review-explanation hidden">
                <strong>解析：</strong> ${ans.explanation}
            </div>
        `;

        // Add event listener to toggle explanation
        const toggleBtn = reviewCard.querySelector('.review-toggle-exp');
        const explanationDiv = reviewCard.querySelector(`#${reviewId}`);
        toggleBtn.addEventListener('click', () => {
            const isHidden = explanationDiv.classList.contains('hidden');
            if (isHidden) {
                explanationDiv.classList.remove('hidden');
                toggleBtn.querySelector('i').className = 'fa-solid fa-chevron-up';
                toggleBtn.querySelector('span').textContent = '收起解析';
            } else {
                explanationDiv.classList.add('hidden');
                toggleBtn.querySelector('i').className = 'fa-solid fa-chevron-down';
                toggleBtn.querySelector('span').textContent = '顯示解析';
            }
        });

        elResultReviewList.appendChild(reviewCard);
    });
}

// --- Study Guide Logic ---
function renderStudyGuide(questions) {
    elGuideQuestionsList.innerHTML = '';

    if (questions.length === 0) {
        elGuideQuestionsList.innerHTML = `
            <div class="card glass-card no-results-card">
                <i class="fa-regular fa-folder-open"></i>
                <h3>找不到相關題目</h3>
                <p>試試看其他關鍵字，或是清除搜尋篩選器。</p>
            </div>
        `;
        return;
    }

    questions.forEach((qData) => {
        const guideCard = document.createElement('div');
        guideCard.className = 'card glass-card guide-card';

        // Generate options markup
        let optionsMarkup = '';
        Object.entries(qData.options).forEach(([letter, text]) => {
            const isCorrect = letter === qData.answer;
            optionsMarkup += `
                <div class="guide-opt-item ${isCorrect ? 'is-correct' : ''}">
                    <span class="guide-opt-letter">${letter}</span>
                    <span class="guide-opt-text">${text}</span>
                </div>
            `;
        });

        guideCard.innerHTML = `
            <div class="guide-question-header">
                <h3 class="guide-question-text">${qData.question}</h3>
                <span class="guide-qid-badge">ID: ${qData.id}</span>
            </div>
            
            <div class="guide-options-grid">
                ${optionsMarkup}
            </div>
            
            <div class="guide-explanation-box">
                <div class="guide-exp-header">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>正確答案：${qData.answer} 詳解與概念說明</span>
                </div>
                <p class="guide-exp-body">${qData.explanation}</p>
            </div>
        `;

        elGuideQuestionsList.appendChild(guideCard);
    });
}

function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();

    if (query === '') {
        btnClearSearch.style.display = 'none';
        renderStudyGuide(questionBank);
        return;
    }

    btnClearSearch.style.display = 'block';

    const filtered = questionBank.filter(q => {
        // Search question text
        if (q.question.toLowerCase().includes(query)) return true;

        // Search explanation
        if (q.explanation.toLowerCase().includes(query)) return true;

        // Search option text
        let foundOption = false;
        Object.values(q.options).forEach(optText => {
            if (optText.toLowerCase().includes(query)) {
                foundOption = true;
            }
        });
        if (foundOption) return true;

        return false;
    });

    renderStudyGuide(filtered);
}
