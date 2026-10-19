const reportApp = document.getElementById('report-app');
const adminApp = document.getElementById('admin-app');
const myTicketApp = document.getElementById('my-ticket-app');

const reportForm = document.getElementById('report-form');
const sent = document.getElementById('sent');
const submitBtn = document.getElementById('submit');
const targetField = document.getElementById('target-field');
const messageCount = document.getElementById('message-count');
const sentId = document.getElementById('sent-id');
const formError = document.getElementById('form-error');

// Player Active Ticket Elements
const myTicketId = document.getElementById('my-ticket-id');
const myTicketState = document.getElementById('my-ticket-state');
const myTicketTitle = document.getElementById('my-ticket-title');
const myTicketCategory = document.getElementById('my-ticket-category');
const myTicketTime = document.getElementById('my-ticket-time');
const myTicketClaimed = document.getElementById('my-ticket-claimed');
const myTicketThread = document.getElementById('my-ticket-thread');
const myTicketReplyForm = document.getElementById('my-ticket-reply');
const myTicketReplyText = document.getElementById('my-ticket-reply-text');
const btnPlayerCloseTicket = document.getElementById('btn-player-close-ticket');

// Admin Elements
const ticketListEl = document.getElementById('ticket-list');
const ticketDetailEl = document.getElementById('ticket-detail');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const refreshBtn = document.getElementById('refresh');
const tabsEl = document.getElementById('tabs');

const resource = typeof GetParentResourceName === 'function' ? GetParentResourceName() : null;

let activeView = null; // 'report' | 'my-ticket' | 'admin' | null
let currentActivePlayerTicket = null;

// Admin Ticket State
let currentTickets = [];
let selectedTicketId = null;
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'newest';

let currentLocale = {};

const STATUS_LABELS = {
  open: 'Offen',
  progress: 'In Bearbeitung',
  waiting: 'Wartet auf Antwort',
  closed: 'Geschlossen'
};

const CATEGORY_LABELS = {
  question: 'Frage',
  bug: 'Bug',
  player: 'Spieler melden',
  refund: 'Rückerstattung',
  other: 'Sonstiges'
};

let currentCategories = [
  { id: 'question', label: 'Frage', icon: 'question', requireTarget: false },
  { id: 'bug', label: 'Bug', icon: 'bug', requireTarget: false },
  { id: 'player', label: 'Spieler melden', icon: 'player', requireTarget: true },
  { id: 'refund', label: 'Rückerstattung', icon: 'refund', requireTarget: false },
  { id: 'other', label: 'Sonstiges', icon: 'other', requireTarget: false }
];

const BUILTIN_ICONS = {
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  bug: '<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M9 8V6a3 3 0 0 1 6 0v2M4 13h3M17 13h3M5 19l2.5-1.5M19 19l-2.5-1.5M5 7l2.5 1.5M19 7l-2.5 1.5"/>',
  player: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5"/>',
  refund: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><path d="M12 8v8M14.5 9.5h-3.2a1.6 1.6 0 0 0 0 3.2h1.4a1.6 1.6 0 0 1 0 3.2H9.5"/>',
  other: '<path d="M4 6h16v10H9l-5 4z"/>',
  default: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/>'
};

function renderCategoryIcon(icon) {
  if (!icon) return `<svg viewBox="0 0 24 24">${BUILTIN_ICONS.default}</svg>`;
  if (typeof icon === 'string' && icon.trim().startsWith('<svg')) {
    return icon;
  }
  const path = BUILTIN_ICONS[icon] || BUILTIN_ICONS.default;
  return `<svg viewBox="0 0 24 24">${path}</svg>`;
}

function post(event, data = {}) {
  if (!resource) {
    return Promise.resolve({ ok: true });
  }

  return fetch(`https://${resource}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data),
  }).then((res) => res.json()).catch(() => null);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function localeText(key, fallback) {
  return (currentLocale && currentLocale[key]) || fallback || key;
}

function getCategoryLabel(catId, fallbackLabel) {
  if (!catId && !fallbackLabel) return '';
  const searchKey = catId || (fallbackLabel && Object.keys(CATEGORY_LABELS).find((k) => CATEGORY_LABELS[k].toLowerCase() === String(fallbackLabel).toLowerCase()));
  if (searchKey) {
    const locKey = `category_${searchKey}`;
    if (currentLocale && currentLocale[locKey]) {
      return currentLocale[locKey];
    }
    if (CATEGORY_LABELS[searchKey]) {
      return CATEGORY_LABELS[searchKey];
    }
  }
  return fallbackLabel || catId || '';
}

function timeAgo(timestamp) {
  if (!timestamp) return localeText('ui_time_just_now', 'gerade eben');
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return localeText('ui_time_just_now', 'gerade eben');
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return localeText('ui_time_minutes_ago', 'vor %d Min.').replace('%d', mins);
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return localeText('ui_time_hours_ago', 'vor %d Std.').replace('%d', hours);
  }
  const days = Math.floor(diff / 86400);
  return localeText('ui_time_days_ago', 'vor %d Tagen').replace('%d', days);
}

// ========================================================
// THEME & COLOR CUSTOMIZATION
// ========================================================

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.AccentColor) {
    root.style.setProperty('--orange', theme.AccentColor);
    root.style.setProperty('--state-open', theme.AccentColor);
    const rgb = hexToRgb(theme.AccentColor);
    if (rgb) {
      root.style.setProperty('--orange-rgb', rgb);
    }
  }
  if (theme.AccentHover) {
    root.style.setProperty('--orange-hover', theme.AccentHover);
  }
  if (theme.OnAccent) {
    root.style.setProperty('--on-orange', theme.OnAccent);
  }
  if (theme.StatusOpen) {
    root.style.setProperty('--state-open', theme.StatusOpen);
  }
  if (theme.StatusProgress) {
    root.style.setProperty('--state-progress', theme.StatusProgress);
  }
  if (theme.StatusWaiting) {
    root.style.setProperty('--state-waiting', theme.StatusWaiting);
  }
  if (theme.StatusClosed) {
    root.style.setProperty('--state-closed', theme.StatusClosed);
  }
}

// ========================================================
// DYNAMIC CATEGORIES SETUP
// ========================================================

function setCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) return;
  currentCategories = categories;

  categories.forEach((cat) => {
    CATEGORY_LABELS[cat.id] = getCategoryLabel(cat.id, cat.label);
  });

  const categoriesContainer = document.querySelector('.categories');
  if (!categoriesContainer) return;

  const currentSelected = document.querySelector('input[name="category"]:checked')?.value || categories[0]?.id;

  let html = '';
  categories.forEach((cat, idx) => {
    const isChecked = cat.id === currentSelected || (!currentSelected && idx === 0);
    const label = getCategoryLabel(cat.id, cat.label);
    html += `
      <label class="category ${isChecked ? 'is-checked' : ''}">
        <input type="radio" name="category" value="${escapeHtml(cat.id)}" ${isChecked ? 'checked' : ''}>
        ${renderCategoryIcon(cat.icon)}
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  });

  categoriesContainer.innerHTML = html;

  categoriesContainer.querySelectorAll('input[name="category"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      onCategoryChanged(radio.value);
    });
  });

  onCategoryChanged(currentSelected);
}

function onCategoryChanged(catId) {
  const cat = currentCategories.find((c) => c.id === catId);
  const requiresTarget = cat ? !!cat.requireTarget : (catId === 'player');

  if (targetField) {
    targetField.hidden = !requiresTarget;
    const targetInput = targetField.querySelector('input');
    if (targetInput) {
      targetInput.required = requiresTarget;
      if (!requiresTarget) {
        targetInput.value = '';
      }
    }
  }
  updateReport();
}

// ========================================================
// LOCALES APPLICATION (Player UI & Admin Dashboard)
// ========================================================

function applyLocale(locale) {
  if (!locale || typeof locale !== 'object') return;
  currentLocale = locale;

  if (locale.ui_status_open) STATUS_LABELS.open = locale.ui_status_open;
  if (locale.ui_status_progress) STATUS_LABELS.progress = locale.ui_status_progress;
  if (locale.ui_status_waiting) STATUS_LABELS.waiting = locale.ui_status_waiting;
  if (locale.ui_status_closed) STATUS_LABELS.closed = locale.ui_status_closed;

  // --- 1. User Report Form Texts ---
  const reportTitle = document.querySelector('#report-app .brand div strong');
  if (reportTitle && locale.ui_report_title) reportTitle.textContent = locale.ui_report_title;

  const reportSub = document.querySelector('#report-app .brand div span');
  if (reportSub && locale.ui_report_sub) reportSub.textContent = locale.ui_report_sub;

  const topicLegend = document.querySelector('#report-form .field__label');
  if (topicLegend && locale.ui_field_topic) topicLegend.textContent = locale.ui_field_topic;

  const targetLabel = document.querySelector('#target-field .field__label');
  if (targetLabel && locale.ui_field_target) targetLabel.textContent = locale.ui_field_target;

  const targetInput = document.getElementById('target');
  if (targetInput && locale.ui_target_placeholder) targetInput.placeholder = locale.ui_target_placeholder;

  const subjectLabel = document.querySelector('label[for="subject"]');
  if (subjectLabel && locale.ui_field_subject) subjectLabel.textContent = locale.ui_field_subject;

  const subjectInput = document.getElementById('subject');
  if (subjectInput && locale.ui_subject_placeholder) subjectInput.placeholder = locale.ui_subject_placeholder;

  const messageLabel = document.querySelector('label[for="message"]');
  if (messageLabel && locale.ui_field_message) messageLabel.textContent = locale.ui_field_message;

  const messageInput = document.getElementById('message');
  if (messageInput && locale.ui_message_placeholder) messageInput.placeholder = locale.ui_message_placeholder;

  const positionCheck = document.querySelector('.check span:last-child');
  if (positionCheck && locale.ui_send_position) positionCheck.textContent = locale.ui_send_position;

  const cancelBtn = document.getElementById('cancel');
  if (cancelBtn && locale.ui_btn_cancel) cancelBtn.textContent = locale.ui_btn_cancel;

  if (submitBtn && locale.ui_btn_submit) submitBtn.textContent = locale.ui_btn_submit;

  const sentTitle = document.querySelector('.senttitle');
  if (sentTitle && locale.ui_ticket_sent_title) sentTitle.textContent = locale.ui_ticket_sent_title;

  const sentText = document.querySelector('.senttext');
  if (sentText && locale.ui_ticket_sent_desc) {
    const curSentId = document.getElementById('sent-id');
    const curId = curSentId ? curSentId.textContent.replace('#', '').trim() : '';
    if (curId && curId !== '0' && curId !== '---') {
      sentText.innerHTML = locale.ui_ticket_sent_desc.replace('%s', curId);
    }
  }

  const doneBtn = document.getElementById('done');
  if (doneBtn && locale.ui_btn_done) doneBtn.textContent = locale.ui_btn_done;

  // --- 2. Player Active Ticket Texts ---
  const myTicketHeaderSub = document.getElementById('my-ticket-header-sub');
  if (myTicketHeaderSub && locale.ui_my_ticket_sub) myTicketHeaderSub.textContent = locale.ui_my_ticket_sub;

  const myTicketLblCat = document.getElementById('my-ticket-lbl-category');
  if (myTicketLblCat && locale.ui_detail_category) myTicketLblCat.textContent = locale.ui_detail_category;

  const myTicketLblCreated = document.getElementById('my-ticket-lbl-created');
  if (myTicketLblCreated && locale.ui_detail_created) myTicketLblCreated.textContent = locale.ui_detail_created;

  const myTicketLblClaimed = document.getElementById('my-ticket-lbl-claimed');
  if (myTicketLblClaimed && locale.ui_detail_claimed_by) myTicketLblClaimed.textContent = locale.ui_detail_claimed_by;

  if (btnPlayerCloseTicket && locale.ui_btn_close_ticket) {
    btnPlayerCloseTicket.innerHTML = `
      <svg viewBox="0 0 24 24" style="width: 0.95rem; height: 0.95rem;"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      ${escapeHtml(locale.ui_btn_close_ticket)}
    `;
  }

  if (myTicketReplyText && locale.ui_reply_placeholder) {
    myTicketReplyText.placeholder = locale.ui_reply_placeholder;
  }

  const myTicketReplyBtn = document.querySelector('#my-ticket-reply button[type="submit"]');
  if (myTicketReplyBtn && locale.ui_btn_send) myTicketReplyBtn.textContent = locale.ui_btn_send;

  // --- 3. Support Admin Dashboard Texts ---
  const adminHeaderTitle = document.getElementById('admin-header-title');
  if (adminHeaderTitle && locale.ui_admin_title) adminHeaderTitle.textContent = locale.ui_admin_title;

  const adminHeaderSub = document.getElementById('admin-header-sub');
  if (adminHeaderSub && locale.ui_admin_sub) adminHeaderSub.textContent = locale.ui_admin_sub;

  const adminCloseBtn = document.getElementById('admin-close');
  if (adminCloseBtn && locale.ui_btn_done) adminCloseBtn.title = locale.ui_btn_done;

  // Stats Labels & Hints
  const statOpenLabel = document.querySelector('[data-stat-label="open"]');
  if (statOpenLabel && locale.ui_stat_open) statOpenLabel.textContent = locale.ui_stat_open;

  const statOpenHint = document.querySelector('[data-stat-hint="open"]');
  if (statOpenHint && locale.ui_stat_open_hint) statOpenHint.textContent = locale.ui_stat_open_hint;

  const statProgressLabel = document.querySelector('[data-stat-label="progress"]');
  if (statProgressLabel && locale.ui_stat_progress) statProgressLabel.textContent = locale.ui_stat_progress;

  const statProgressHint = document.querySelector('[data-stat-hint="progress"]');
  if (statProgressHint && locale.ui_stat_progress_hint) statProgressHint.textContent = locale.ui_stat_progress_hint;

  const statWaitingLabel = document.querySelector('[data-stat-label="waiting"]');
  if (statWaitingLabel && locale.ui_stat_waiting) statWaitingLabel.textContent = locale.ui_stat_waiting;

  const statWaitingHint = document.querySelector('[data-stat-hint="waiting"]');
  if (statWaitingHint && locale.ui_stat_waiting_hint) statWaitingHint.textContent = locale.ui_stat_waiting_hint;

  const statClosedLabel = document.querySelector('[data-stat-label="closed"]');
  if (statClosedLabel && locale.ui_stat_closed) statClosedLabel.textContent = locale.ui_stat_closed;

  const statClosedHint = document.querySelector('[data-stat-hint="closed"]');
  if (statClosedHint && locale.ui_stat_closed_hint) statClosedHint.textContent = locale.ui_stat_closed_hint;

  // Toolbar
  if (searchInput && locale.ui_admin_search_placeholder) {
    searchInput.placeholder = locale.ui_admin_search_placeholder;
  }

  const tabAllText = document.querySelector('.tab[data-filter="all"] .tab__text');
  if (tabAllText && locale.ui_tab_all) tabAllText.textContent = locale.ui_tab_all;

  const tabOpenText = document.querySelector('.tab[data-filter="open"] .tab__text');
  if (tabOpenText && locale.ui_tab_open) tabOpenText.textContent = locale.ui_tab_open;

  const tabProgressText = document.querySelector('.tab[data-filter="progress"] .tab__text');
  if (tabProgressText && locale.ui_tab_progress) tabProgressText.textContent = locale.ui_tab_progress;

  const tabWaitingText = document.querySelector('.tab[data-filter="waiting"] .tab__text');
  if (tabWaitingText && locale.ui_tab_waiting) tabWaitingText.textContent = locale.ui_tab_waiting;

  const tabClosedText = document.querySelector('.tab[data-filter="closed"] .tab__text');
  if (tabClosedText && locale.ui_tab_closed) tabClosedText.textContent = locale.ui_tab_closed;

  const sortLabel = document.getElementById('sort-label');
  if (sortLabel && locale.ui_sort_label) sortLabel.textContent = locale.ui_sort_label;

  const sortOptNewest = document.getElementById('sort-opt-newest');
  if (sortOptNewest && locale.ui_sort_newest) sortOptNewest.textContent = locale.ui_sort_newest;

  const sortOptOldest = document.getElementById('sort-opt-oldest');
  if (sortOptOldest && locale.ui_sort_oldest) sortOptOldest.textContent = locale.ui_sort_oldest;

  if (refreshBtn && locale.ui_btn_refresh) refreshBtn.title = locale.ui_btn_refresh;

  // Empty State Fallbacks
  const emptyListTitle = document.getElementById('empty-list-title');
  if (emptyListTitle && locale.ui_empty_all_done_title) emptyListTitle.textContent = locale.ui_empty_all_done_title;

  const emptyListDesc = document.getElementById('empty-list-desc');
  if (emptyListDesc && locale.ui_empty_all_done_desc) emptyListDesc.textContent = locale.ui_empty_all_done_desc;

  const emptyDetailTitle = document.getElementById('empty-detail-title');
  if (emptyDetailTitle && locale.ui_detail_empty_title) emptyDetailTitle.textContent = locale.ui_detail_empty_title;

  const emptyDetailDesc = document.getElementById('empty-detail-desc');
  if (emptyDetailDesc && locale.ui_detail_empty_desc) emptyDetailDesc.textContent = locale.ui_detail_empty_desc;

  // Re-render categories in report form with current locale
  if (currentCategories && currentCategories.length > 0) {
    setCategories(currentCategories);
  }

  // Live Views neu rendern falls offen
  if (activeView === 'admin') {
    renderTicketList();
    renderTicketDetail();
  } else if (activeView === 'my-ticket' && currentActivePlayerTicket) {
    showMyTicket(currentActivePlayerTicket);
  }
}

// ========================================================
// CUSTOM TOAST NOTIFICATIONS (TOP LEFT)
// ========================================================

function showToast(title, message, type = 'info', duration = 5000) {
  const container = document.getElementById('notifications');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  } else {
    iconSvg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>';
  }

  toast.innerHTML = `
    <div class="toast__icon">${iconSvg}</div>
    <div class="toast__content">
      <div class="toast__title">${escapeHtml(title || 'Support')}</div>
      <div class="toast__message">${escapeHtml(message || '')}</div>
    </div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => {
      toast.remove();
    }, 350);
  }, duration);
}

// ========================================================
// USER REPORT FORM UI (/support wenn kein Ticket offen ist)
// ========================================================

function resetReport() {
  if (formError) {
    formError.hidden = true;
    formError.textContent = '';
  }
  if (reportForm) {
    reportForm.reset();
    reportForm.hidden = false;
  }
  if (sent) {
    sent.hidden = true;
  }
  if (targetField) {
    targetField.hidden = true;
  }
  updateReport();
}

function showReport() {
  hideAdmin();
  hideMyTicket();
  resetReport();
  if (reportApp) {
    reportApp.classList.add('is-visible');
    reportApp.setAttribute('aria-hidden', 'false');
  }
  activeView = 'report';
}

function hideReport() {
  if (reportApp) {
    reportApp.classList.remove('is-visible');
    reportApp.setAttribute('aria-hidden', 'true');
  }
  if (activeView === 'report') activeView = null;
}

function getReportValues() {
  if (!reportForm) return {};
  const data = new FormData(reportForm);

  return {
    category: data.get('category'),
    target: Number(data.get('target')) || null,
    subject: (data.get('subject') || '').trim(),
    message: (data.get('message') || '').trim(),
    position: data.get('position') === 'on',
  };
}

function isReportValid(report) {
  if (!report.category) return false;
  const cat = currentCategories.find((c) => c.id === report.category);
  const requiresTarget = cat ? !!cat.requireTarget : (report.category === 'player');
  if (requiresTarget && (!report.target || report.target <= 0)) return false;
  return report.subject.length >= 3 && report.message.length >= 5;
}

function updateReport() {
  if (!reportForm) return;
  const report = getReportValues();

  reportForm.querySelectorAll('.category').forEach((el) => {
    const input = el.querySelector('input');
    el.classList.toggle('is-checked', !!(input && input.checked));
  });

  if (targetField) {
    const cat = currentCategories.find((c) => c.id === report.category);
    const requiresTarget = cat ? !!cat.requireTarget : (report.category === 'player');
    targetField.hidden = !requiresTarget;
    if (!requiresTarget) {
      const targetInput = targetField.querySelector('input');
      if (targetInput) targetInput.value = '';
    }
  }

  const length = (reportForm.elements.message && reportForm.elements.message.value) ? reportForm.elements.message.value.length : 0;
  if (messageCount) {
    messageCount.textContent = `${length} / 500`;
    messageCount.classList.toggle('is-full', length >= 500);
  }

  if (submitBtn) {
    submitBtn.disabled = !isReportValid(report);
  }
}

if (reportForm) {
  reportForm.addEventListener('input', updateReport);
  reportForm.addEventListener('change', updateReport);

  reportForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const report = getReportValues();
    if (!isReportValid(report)) return;

    if (formError) {
      formError.hidden = true;
      formError.textContent = '';
    }

    if (submitBtn) submitBtn.disabled = true;

    post('submit', report);

    if (!resource) {
      setTimeout(() => {
        const newMockId = Math.floor(1000 + Math.random() * 9000);
        window.postMessage({
          action: 'ticketResult',
          success: true,
          id: newMockId
        }, '*');
      }, 350);
    }
  });
}

// ========================================================
// PLAYER ACTIVE TICKET UI (/support wenn bereits Ticket offen)
// ========================================================

function showMyTicket(ticket) {
  if (!ticket) return;
  hideReport();
  hideAdmin();

  currentActivePlayerTicket = ticket;

  if (myTicketId) myTicketId.textContent = `#${ticket.id}`;
  if (myTicketState) {
    myTicketState.textContent = STATUS_LABELS[ticket.status] || ticket.status;
    myTicketState.className = `my-ticket__state my-ticket__state--${ticket.status || 'open'}`;
  }
  if (myTicketTitle) myTicketTitle.textContent = ticket.subject || 'Support Ticket';
  if (myTicketCategory) {
    myTicketCategory.textContent = getCategoryLabel(ticket.category, ticket.categoryLabel);
  }
  if (myTicketTime) myTicketTime.textContent = timeAgo(ticket.createdAt);
  if (myTicketClaimed) {
    myTicketClaimed.textContent = ticket.claimedBy ? ticket.claimedBy.name : localeText('ui_waiting_team', 'Wartet auf Teammitglied');
  }

  // Facts Labels übersetzen
  const myTicketLblCat = document.getElementById('my-ticket-lbl-category');
  if (myTicketLblCat) myTicketLblCat.textContent = localeText('ui_detail_category', 'Kategorie');

  const myTicketLblCreated = document.getElementById('my-ticket-lbl-created');
  if (myTicketLblCreated) myTicketLblCreated.textContent = localeText('ui_detail_created', 'Erstellt');

  const myTicketLblClaimed = document.getElementById('my-ticket-lbl-claimed');
  if (myTicketLblClaimed) myTicketLblClaimed.textContent = localeText('ui_detail_claimed_by', 'Bearbeiter');

  const isClosed = ticket.status === 'closed';
  if (btnPlayerCloseTicket) {
    btnPlayerCloseTicket.disabled = isClosed;
    btnPlayerCloseTicket.style.display = isClosed ? 'none' : 'inline-flex';
    btnPlayerCloseTicket.innerHTML = `
      <svg viewBox="0 0 24 24" style="width: 0.95rem; height: 0.95rem;"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      ${escapeHtml(localeText('ui_btn_close_ticket', 'Ticket schließen'))}
    `;
  }
  if (myTicketReplyText) {
    myTicketReplyText.disabled = isClosed;
    myTicketReplyText.placeholder = isClosed ? localeText('ui_closed_placeholder', 'Dieses Ticket ist bereits geschlossen.') : localeText('ui_reply_placeholder', 'Nachricht an den Support schreiben ...');
  }
  if (myTicketReplyForm) {
    const replySubmit = myTicketReplyForm.querySelector('button[type="submit"]');
    if (replySubmit) {
      replySubmit.disabled = isClosed;
      replySubmit.textContent = localeText('ui_btn_send', 'Senden');
    }
  }

  // Nachrichtenverlauf aufbauen (Supporter links, Spieler rechts)
  if (myTicketThread) {
    let messagesHtml = '';
    if (ticket.messages && ticket.messages.length > 0) {
      ticket.messages.forEach((msg) => {
        if (msg.isSystem) {
          messagesHtml += `<p class="message--system">${escapeHtml(msg.text)}</p>`;
        } else if (msg.isTeam) {
          messagesHtml += `
            <div class="message message--team">
              <p class="message__head">
                <span class="message__author">${escapeHtml(msg.sender)} (${localeText('ui_support', 'Support')})</span>
                <span class="message__time">${timeAgo(msg.time)}</span>
              </p>
              <p class="message__text">${escapeHtml(msg.text)}</p>
            </div>
          `;
        } else {
          messagesHtml += `
            <div class="message message--own">
              <p class="message__head">
                <span class="message__author">${localeText('ui_you', 'Du')}</span>
                <span class="message__time">${timeAgo(msg.time)}</span>
              </p>
              <p class="message__text">${escapeHtml(msg.text)}</p>
            </div>
          `;
        }
      });
    }

    myTicketThread.innerHTML = `
      <p class="thread__start">${escapeHtml(localeText('ui_ticket_created_prefix', 'Ticket erstellt'))} ${timeAgo(ticket.createdAt)}</p>
      ${messagesHtml}
    `;

    myTicketThread.scrollTop = myTicketThread.scrollHeight;
  }

  if (myTicketApp) {
    myTicketApp.classList.add('is-visible');
    myTicketApp.setAttribute('aria-hidden', 'false');
  }
  activeView = 'my-ticket';
}

function hideMyTicket() {
  if (myTicketApp) {
    myTicketApp.classList.remove('is-visible');
    myTicketApp.setAttribute('aria-hidden', 'true');
  }
  if (activeView === 'my-ticket') activeView = null;
}

// Spieler schließt sein eigenes Ticket
if (btnPlayerCloseTicket) {
  btnPlayerCloseTicket.addEventListener('click', () => {
    if (!currentActivePlayerTicket) return;
    post('playerCloseTicket', { id: currentActivePlayerTicket.id });
    closeAll();
  });
}

// Spieler antwortet im Ticket
if (myTicketReplyForm) {
  myTicketReplyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentActivePlayerTicket || !myTicketReplyText) return;
    const text = myTicketReplyText.value.trim();
    if (!text) return;

    post('playerReplyTicket', { id: currentActivePlayerTicket.id, text: text });

    if (!resource) {
      currentActivePlayerTicket.messages.push({
        sender: 'Du',
        isTeam: false,
        text: text,
        time: Math.floor(Date.now() / 1000)
      });
      showMyTicket(currentActivePlayerTicket);
    }

    myTicketReplyText.value = '';
  });
}

// ========================================================
// ADMIN UI (/supportadmin)
// ========================================================

function showAdmin(data = {}) {
  hideReport();
  hideMyTicket();

  if (data.user) {
    const userNameEl = document.getElementById('user-name');
    const userIdEl = document.getElementById('user-id');
    if (userNameEl) userNameEl.textContent = data.user.name;
    if (userIdEl) {
      const idFormat = localeText('ui_admin_player_id', 'Spieler-ID %s');
      userIdEl.textContent = idFormat.replace('%s', data.user.id);
    }
  }

  if (data.tickets) {
    currentTickets = data.tickets;
  }
  if (data.counts) {
    setCounts(data.counts);
  }

  renderTicketList();
  renderTicketDetail();

  if (adminApp) {
    adminApp.classList.add('is-visible');
    adminApp.setAttribute('aria-hidden', 'false');
  }
  activeView = 'admin';
}

function hideAdmin() {
  if (adminApp) {
    adminApp.classList.remove('is-visible');
    adminApp.setAttribute('aria-hidden', 'true');
  }
  if (activeView === 'admin') activeView = null;
}

function setCounts(counts = {}) {
  const c = {
    open: counts.open || 0,
    progress: counts.progress || 0,
    waiting: counts.waiting || 0,
    closed: counts.closed || 0,
  };
  const total = c.open + c.progress + c.waiting + c.closed;

  document.querySelectorAll('[data-count="open"]').forEach((el) => { el.textContent = c.open; });
  document.querySelectorAll('[data-count="progress"]').forEach((el) => { el.textContent = c.progress; });
  document.querySelectorAll('[data-count="waiting"]').forEach((el) => { el.textContent = c.waiting; });
  document.querySelectorAll('[data-count="closed"]').forEach((el) => { el.textContent = c.closed; });
  document.querySelectorAll('[data-count="all"]').forEach((el) => { el.textContent = total; });

  const setBar = (key, val) => {
    const el = document.querySelector(`[data-bar="${key}"]`);
    if (el) el.style.width = total > 0 ? `${(val / total) * 100}%` : '0%';
  };
  setBar('open', c.open);
  setBar('progress', c.progress);
  setBar('waiting', c.waiting);
  setBar('closed', c.closed);
}

function getFilteredTickets() {
  return currentTickets.filter((t) => {
    if (currentFilter !== 'all' && t.status !== currentFilter) return false;
    if (currentSearch) {
      const q = currentSearch;
      const idMatch = String(t.id).includes(q);
      const authorMatch = (t.author || '').toLowerCase().includes(q);
      const subMatch = (t.subject || '').toLowerCase().includes(q);
      const msgMatch = (t.message || '').toLowerCase().includes(q);
      const targetMatch = t.target && (String(t.target.id).includes(q) || (t.target.name || '').toLowerCase().includes(q));
      if (!idMatch && !authorMatch && !subMatch && !msgMatch && !targetMatch) return false;
    }
    return true;
  }).sort((a, b) => {
    if (currentSort === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function renderTicketList() {
  if (!ticketListEl) return;
  const filtered = getFilteredTickets();

  if (filtered.length === 0) {
    const isFiltered = currentFilter !== 'all' || currentSearch !== '';
    const emptyTitle = isFiltered
      ? localeText('ui_empty_filtered_title', 'Keine Tickets gefunden.')
      : localeText('ui_empty_all_done_title', 'Alles erledigt.');
    const emptyDesc = isFiltered
      ? localeText('ui_empty_filtered_desc', 'Für diesen Filter liegen aktuell keine Einträge vor.')
      : localeText('ui_empty_all_done_desc', 'Gerade wartet niemand auf Hilfe. Zeit für einen Kaffee.');

    ticketListEl.innerHTML = `
      <div class="empty">
        <svg class="empty__art" viewBox="0 0 220 150" aria-hidden="true">
          <path d="M20 128H200"/>
          <path d="M70 128V96H150V128"/>
          <path d="M58 96H162"/>
          <path class="accent" d="M96 82H122L119 96H99Z"/>
          <path class="accent" d="M122 85C129 85 129 93 121 93"/>
          <path class="steam" d="M105 74C101 68 109 64 105 56"/>
          <path class="steam" d="M113 74C109 68 117 64 113 56"/>
        </svg>
        <p class="empty__title">${escapeHtml(emptyTitle)}</p>
        <p class="empty__text">${escapeHtml(emptyDesc)}</p>
      </div>
    `;
    return;
  }

  ticketListEl.innerHTML = filtered.map((t) => {
    const isSelected = selectedTicketId && Number(selectedTicketId) === t.id;
    const catLabel = getCategoryLabel(t.category, t.categoryLabel);
    const statusText = STATUS_LABELS[t.status] || t.status;
    const idFormat = localeText('ui_admin_player_id', 'ID %s');
    const authorLabel = `${escapeHtml(t.author)} (${idFormat.replace('%s', t.authorId)})`;

    return `
      <div class="ticket-row ${isSelected ? 'is-selected' : ''}" data-ticket-id="${t.id}" data-state="${t.status}">
        <div class="ticket-row__meta">
          <span class="ticket-row__id">#${t.id}</span>
          <span class="ticket-row__status">${escapeHtml(statusText)}</span>
          <span class="ticket-row__time">${timeAgo(t.createdAt)}</span>
        </div>
        <div class="ticket-row__subject">${escapeHtml(t.subject)}</div>
        <div class="ticket-row__author">${authorLabel} • ${escapeHtml(catLabel)}</div>
      </div>
    `;
  }).join('');
}

function selectTicket(id) {
  selectedTicketId = Number(id);
  renderTicketList();
  renderTicketDetail();
}

function renderTicketDetail() {
  if (!ticketDetailEl) return;
  const ticket = currentTickets.find((t) => t.id === selectedTicketId);

  if (!ticket) {
    ticketDetailEl.innerHTML = `
      <div class="empty">
        <img class="empty__logo" src="img/logo.svg" alt="">
        <span class="empty__line"></span>
        <p class="empty__title">${escapeHtml(localeText('ui_detail_empty_title', 'Wähle links ein Ticket.'))}</p>
        <p class="empty__text">${escapeHtml(localeText('ui_detail_empty_desc', 'Hier siehst du den Chatverlauf und kannst direkt Aktionen ausführen.'))}</p>
      </div>
    `;
    return;
  }

  const catLabel = getCategoryLabel(ticket.category, ticket.categoryLabel);
  const statusText = STATUS_LABELS[ticket.status] || ticket.status;
  const idFormat = localeText('ui_admin_player_id', 'ID %s');

  let messagesHtml = '';
  if (ticket.messages && ticket.messages.length > 0) {
    ticket.messages.forEach((msg) => {
      if (msg.isSystem) {
        messagesHtml += `<p class="message--system">${escapeHtml(msg.text)}</p>`;
      } else if (msg.isTeam) {
        messagesHtml += `
          <div class="message message--team">
            <p class="message__head">
              <span class="message__author">${escapeHtml(msg.sender)}</span>
              <span class="message__time">${timeAgo(msg.time)}</span>
            </p>
            <p class="message__text">${escapeHtml(msg.text)}</p>
          </div>
        `;
      } else {
        messagesHtml += `
          <div class="message">
            <p class="message__head">
              <span class="message__author">${escapeHtml(msg.sender)}</span>
              <span class="message__time">${timeAgo(msg.time)}</span>
            </p>
            <p class="message__text">${escapeHtml(msg.text)}</p>
          </div>
        `;
      }
    });
  }

  ticketDetailEl.innerHTML = `
    <article class="ticket" data-state="${ticket.status}">
      <div class="ticket__head">
        <p class="ticket__meta">
          <span class="ticket__id">#${ticket.id}</span>
          <span class="ticket__state">${escapeHtml(statusText)}</span>
          <span>${timeAgo(ticket.createdAt)}</span>
        </p>
        <h2 class="ticket__title">${escapeHtml(ticket.subject)}</h2>
        <dl class="ticket__facts">
          <div><dt>${escapeHtml(localeText('ui_detail_player', 'Spieler'))}</dt><dd>${escapeHtml(ticket.author)} (${idFormat.replace('%s', ticket.authorId)})</dd></div>
          <div><dt>${escapeHtml(localeText('ui_detail_category', 'Kategorie'))}</dt><dd>${escapeHtml(catLabel)}</dd></div>
          ${ticket.target ? `<div><dt>${escapeHtml(localeText('ui_detail_target', 'Gemeldeter Spieler'))}</dt><dd>${escapeHtml(ticket.target.name)} (${idFormat.replace('%s', ticket.target.id)})</dd></div>` : ''}
          ${ticket.coords ? `<div><dt>${escapeHtml(localeText('ui_detail_position', 'Position'))}</dt><dd>X: ${ticket.coords.x}, Y: ${ticket.coords.y}</dd></div>` : `<div><dt>${escapeHtml(localeText('ui_detail_position', 'Position'))}</dt><dd>${escapeHtml(localeText('ui_detail_no_position', 'Keine'))}</dd></div>`}
          ${ticket.claimedBy ? `<div><dt>${escapeHtml(localeText('ui_detail_claimed_by', 'Bearbeiter'))}</dt><dd>${escapeHtml(ticket.claimedBy.name)}</dd></div>` : `<div><dt>${escapeHtml(localeText('ui_detail_claimed_by', 'Bearbeiter'))}</dt><dd>${escapeHtml(localeText('ui_detail_waiting_claim', 'Wartet auf Teammitglied'))}</dd></div>`}
        </dl>
        <div class="ticket__actions">
          ${ticket.status !== 'closed' ? `
            ${ticket.status === 'open' ? `<button class="btn btn--primary" id="btn-claim" type="button">${escapeHtml(localeText('ui_btn_claim', 'Übernehmen'))}</button>` : ''}
            <button class="btn" id="btn-goto" type="button">${escapeHtml(localeText('ui_btn_goto', 'Zum Spieler'))}</button>
            <button class="btn" id="btn-bring" type="button">${escapeHtml(localeText('ui_btn_bring', 'Spieler herholen'))}</button>
            <button class="btn" id="btn-close-ticket" type="button">${escapeHtml(localeText('ui_btn_close', 'Schließen'))}</button>
          ` : `
            <span style="color: var(--state-closed); font-weight: 500; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
              <svg style="width: 1.1rem; height: 1.1rem;" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              ${escapeHtml(localeText('ui_ticket_closed_notice', 'Dieses Ticket ist geschlossen.'))}
            </span>
          `}
        </div>
      </div>

      <div class="thread" id="ticket-thread">
        <p class="thread__start">${escapeHtml(localeText('ui_ticket_created_prefix', 'Ticket erstellt'))} ${timeAgo(ticket.createdAt)}</p>
        ${messagesHtml}
      </div>

      ${ticket.status !== 'closed' ? `
        <form class="reply" id="ticket-reply">
          <textarea rows="1" id="reply-text" placeholder="${escapeHtml(localeText('ui_admin_reply_placeholder', 'Antwort an den Spieler verfassen ...'))}" required></textarea>
          <button class="btn btn--primary" type="submit">${escapeHtml(localeText('ui_btn_send', 'Senden'))}</button>
        </form>
      ` : ''}
    </article>
  `;

  const threadEl = document.getElementById('ticket-thread');
  if (threadEl) {
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  document.getElementById('btn-claim')?.addEventListener('click', () => {
    post('claimTicket', { id: ticket.id });
    if (!resource) {
      ticket.status = 'progress';
      ticket.claimedBy = { id: 1, name: 'Dev Admin' };
      ticket.messages.push({ isSystem: true, text: 'Ticket übernommen von Dev Admin', time: Math.floor(Date.now() / 1000) });
      renderTicketList();
      renderTicketDetail();
    }
  });

  document.getElementById('btn-close-ticket')?.addEventListener('click', () => {
    post('closeTicket', { id: ticket.id });
    if (!resource) {
      ticket.status = 'closed';
      ticket.closedAt = Math.floor(Date.now() / 1000);
      ticket.messages.push({ isSystem: true, text: 'Ticket geschlossen von Dev Admin', time: Math.floor(Date.now() / 1000) });
      renderTicketList();
      renderTicketDetail();
    }
  });

  document.getElementById('btn-goto')?.addEventListener('click', () => {
    post('gotoPlayer', { id: ticket.id });
  });

  document.getElementById('btn-bring')?.addEventListener('click', () => {
    post('bringPlayer', { id: ticket.id });
  });

  const replyForm = document.getElementById('ticket-reply');
  if (replyForm) {
    replyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const replyInput = document.getElementById('reply-text');
      if (!replyInput) return;
      const text = replyInput.value.trim();
      if (!text) return;

      post('replyTicket', { id: ticket.id, text: text });

      if (!resource) {
        ticket.messages.push({
          sender: 'Dev Admin',
          senderId: 1,
          isTeam: true,
          text: text,
          time: Math.floor(Date.now() / 1000)
        });
        ticket.status = 'waiting';
        replyInput.value = '';
        renderTicketList();
        renderTicketDetail();
      } else {
        replyInput.value = '';
      }
    });
  }
}

if (ticketListEl) {
  ticketListEl.addEventListener('click', (e) => {
    const row = e.target.closest('.ticket-row');
    if (!row) return;
    const ticketId = row.dataset.ticketId;
    if (ticketId) {
      selectTicket(ticketId);
    }
  });
}

if (tabsEl) {
  tabsEl.addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (!tab) return;

    tabsEl.querySelectorAll('.tab').forEach((el) => {
      el.classList.toggle('is-active', el === tab);
    });

    currentFilter = tab.dataset.filter || 'all';
    renderTicketList();
  });
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    renderTicketList();
  });
}

if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderTicketList();
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    post('refresh');
  });
}

// ========================================================
// COMMON CLOSE & EVENTS
// ========================================================

function closeAll() {
  hideReport();
  hideMyTicket();
  hideAdmin();
  activeView = null;
  post('close');

  if (sent && !sent.hidden) {
    resetReport();
  }
}

// Buttons
document.getElementById('report-close')?.addEventListener('click', closeAll);
document.getElementById('my-ticket-close')?.addEventListener('click', closeAll);
document.getElementById('cancel')?.addEventListener('click', closeAll);
document.getElementById('done')?.addEventListener('click', closeAll);
document.getElementById('admin-close')?.addEventListener('click', closeAll);

// ESC Key
document.addEventListener('keyup', (event) => {
  if (event.key === 'Escape') {
    const isReportVisible = reportApp && reportApp.classList.contains('is-visible');
    const isMyTicketVisible = myTicketApp && myTicketApp.classList.contains('is-visible');
    const isAdminVisible = adminApp && adminApp.classList.contains('is-visible');

    if (activeView || isReportVisible || isMyTicketVisible || isAdminVisible) {
      closeAll();
    }
  }
});

// NUI Messages
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  switch (data.action) {
    case 'setTheme':
      if (data.theme) {
        applyTheme(data.theme);
      }
      if (data.categories) {
        setCategories(data.categories);
      }
      if (data.locale) {
        applyLocale(data.locale);
      }
      break;

    case 'notify':
      showToast(data.title, data.message, data.type || 'info', data.duration || 5000);
      break;

    case 'open':
      if (data.theme) {
        applyTheme(data.theme);
      }
      if (data.categories) {
        setCategories(data.categories);
      }
      if (data.locale) {
        applyLocale(data.locale);
      }
      if (data.view === 'admin') {
        showAdmin(data);
      } else if (data.view === 'myTicket') {
        showMyTicket(data.ticket);
      } else {
        showReport();
      }
      break;

    case 'updateMyTicket':
      if (activeView === 'my-ticket' && data.ticket) {
        showMyTicket(data.ticket);
      }
      break;

    case 'close':
      hideReport();
      hideMyTicket();
      hideAdmin();
      activeView = null;
      break;

    case 'counts':
      setCounts(data.counts);
      break;

    case 'setTickets':
      currentTickets = data.tickets || [];
      if (selectedTicketId && !currentTickets.some((t) => t.id === selectedTicketId)) {
        selectedTicketId = null;
      }
      renderTicketList();
      renderTicketDetail();
      break;

    case 'ticketResult':
      if (data.success) {
        if (formError) formError.hidden = true;
        const validId = (data.id !== undefined && data.id !== null) ? data.id
          : (data.ticketId !== undefined && data.ticketId !== null) ? data.ticketId
          : (typeof data.result === 'object' && data.result && (data.result.id || data.result.ticketId))
          ? (data.result.id || data.result.ticketId)
          : (typeof data.result === 'number' || (typeof data.result === 'string' && data.result.length > 0)) ? data.result
          : 1000;

        const sentText = document.querySelector('.senttext');
        if (sentText) {
          const template = localeText('ui_ticket_sent_desc', 'Deine Nummer ist <span class="sent__id" id="sent-id">#%s</span>. Wir melden uns, sobald jemand übernimmt.');
          sentText.innerHTML = template.replace('%s', validId);
        }
        const curSentId = document.getElementById('sent-id');
        if (curSentId) {
          curSentId.textContent = `#${validId}`;
        }
        if (reportForm) reportForm.hidden = true;
        if (sent) sent.hidden = false;
        if (submitBtn) submitBtn.disabled = false;
      } else {
        if (formError) {
          formError.textContent = data.message || localeText('ui_ticket_error', 'Ticket konnte nicht erstellt werden.');
          formError.hidden = false;
        }
        if (submitBtn) submitBtn.disabled = false;
      }
      break;
  }
});

// ========================================================
// BROWSER DEV PREVIEW
// ========================================================
if (!resource) {
  const mockPlayerTicket = {
    id: 1048,
    author: 'Dev Spieler',
    authorId: 1,
    category: 'question',
    categoryLabel: 'Frage',
    subject: 'Fahrzeug nach Crash verschwunden',
    message: 'Mein Auto ist nach einem Zusammenstoß im Boden versunken.',
    status: 'progress',
    claimedBy: { id: 2, name: 'Admin Michael' },
    createdAt: Math.floor(Date.now() / 1000) - 600,
    messages: [
      {
        sender: 'Dev Spieler',
        isTeam: false,
        text: 'Mein Auto ist nach einem Zusammenstoß im Boden versunken.',
        time: Math.floor(Date.now() / 1000) - 600
      },
      {
        isSystem: true,
        text: 'Ticket übernommen von Admin Michael',
        time: Math.floor(Date.now() / 1000) - 450
      },
      {
        sender: 'Admin Michael',
        isTeam: true,
        text: 'Hallo! Hast du noch den Fahrzeugschlüssel und das Kennzeichen?',
        time: Math.floor(Date.now() / 1000) - 300
      }
    ]
  };

  currentTickets = [
    { ...mockPlayerTicket },
    {
      id: 1047,
      author: 'Max Mueller',
      authorId: 44,
      category: 'player',
      categoryLabel: 'Spieler melden',
      target: { id: 77, name: 'TrollPlayer' },
      subject: 'RDM am Würfelpark',
      message: 'Spieler 77 hat ohne RP-Hintergrund auf mich geschossen.',
      coords: { x: 180.5, y: -920.3, z: 30.1 },
      status: 'open',
      claimedBy: null,
      createdAt: Math.floor(Date.now() / 1000) - 1200,
      messages: [
        {
          sender: 'Max Mueller',
          senderId: 44,
          isTeam: false,
          text: 'Spieler 77 hat ohne RP-Hintergrund auf mich geschossen.',
          time: Math.floor(Date.now() / 1000) - 1200
        }
      ]
    }
  ];

  selectedTicketId = 1048;

  const devBar = document.createElement('div');
  devBar.style.position = 'fixed';
  devBar.style.top = '1rem';
  devBar.style.left = '50%';
  devBar.style.transform = 'translateX(-50%)';
  devBar.style.zIndex = '99999';
  devBar.style.display = 'flex';
  devBar.style.alignItems = 'center';
  devBar.style.gap = '0.5rem';
  devBar.style.background = 'rgba(23, 19, 15, 0.95)';
  devBar.style.padding = '0.4rem 0.75rem';
  devBar.style.borderRadius = '0.625rem';
  devBar.style.border = '1px solid rgba(255, 236, 214, 0.16)';
  devBar.style.boxShadow = '0 0.5rem 1.5rem rgba(0,0,0,0.6)';
  devBar.innerHTML = `
    <span style="font-size: 0.75rem; color: #f7f2ec; opacity: 0.7; margin-right: 0.25rem;">Preview:</span>
    <button id="dev-btn-create" type="button" style="background: rgba(255, 236, 214, 0.1); color: #f7f2ec; border: 0; padding: 0.35rem 0.85rem; border-radius: 0.4rem; font-size: 0.75rem; font-weight: 600; cursor: pointer;">/support (Neu)</button>
    <button id="dev-btn-myticket" type="button" style="background: var(--orange); color: #1a0f04; border: 0; padding: 0.35rem 0.85rem; border-radius: 0.4rem; font-size: 0.75rem; font-weight: 600; cursor: pointer;">/support (Aktives Ticket)</button>
    <button id="dev-btn-admin" type="button" style="background: rgba(255, 236, 214, 0.1); color: #f7f2ec; border: 0; padding: 0.35rem 0.85rem; border-radius: 0.4rem; font-size: 0.75rem; font-weight: 600; cursor: pointer;">/supportadmin</button>
    <button id="dev-btn-toast" type="button" style="background: rgba(255, 236, 214, 0.1); color: #f7f2ec; border: 0; padding: 0.35rem 0.65rem; border-radius: 0.4rem; font-size: 0.75rem; cursor: pointer;">🔔 Notify</button>
  `;
  document.body.appendChild(devBar);

  const btnCreate = document.getElementById('dev-btn-create');
  const btnMyTicket = document.getElementById('dev-btn-myticket');
  const btnAdmin = document.getElementById('dev-btn-admin');
  const btnToast = document.getElementById('dev-btn-toast');

  function updateDevButtons(active) {
    [btnCreate, btnMyTicket, btnAdmin].forEach((b) => {
      b.style.background = 'rgba(255, 236, 214, 0.1)';
      b.style.color = '#f7f2ec';
    });
    if (active === 'create') {
      btnCreate.style.background = 'var(--orange)';
      btnCreate.style.color = '#1a0f04';
    } else if (active === 'myticket') {
      btnMyTicket.style.background = 'var(--orange)';
      btnMyTicket.style.color = '#1a0f04';
    } else if (active === 'admin') {
      btnAdmin.style.background = 'var(--orange)';
      btnAdmin.style.color = '#1a0f04';
    }
  }

  btnCreate.addEventListener('click', () => {
    showReport();
    updateDevButtons('create');
  });

  btnMyTicket.addEventListener('click', () => {
    showMyTicket(mockPlayerTicket);
    updateDevButtons('myticket');
  });

  btnAdmin.addEventListener('click', () => {
    showAdmin({ user: { name: 'Dev Admin', id: 1 }, counts: { open: 1, progress: 1, waiting: 0, closed: 0 }, tickets: currentTickets });
    updateDevButtons('admin');
  });

  btnToast.addEventListener('click', () => {
    showToast('Support Ticket', 'Admin Michael hat dein Ticket #1048 übernommen.', 'success');
  });

  showMyTicket(mockPlayerTicket);
}
