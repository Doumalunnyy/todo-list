(() => {
  'use strict';

  const STORAGE_KEY = 'po-poryadku.tasks.v1';
  const form = document.querySelector('#task-form');
  const input = document.querySelector('#task-input');
  const error = document.querySelector('#input-error');
  const list = document.querySelector('#task-list');
  const warning = document.querySelector('#storage-warning');
  const storageNote = document.querySelector('#storage-note');
  const announcer = document.querySelector('#announcer');
  let storageBlocked = false;
  let tasks = loadTasks();

  function showStorageWarning(message) {
    warning.textContent = message;
    warning.hidden = false;
    storageNote.textContent = 'Сохранение задач недоступно';
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      const data = JSON.parse(raw);
      const ids = new Set();
      const valid = Array.isArray(data) && data.every(task => {
        if (!task || typeof task.id !== 'string' || !task.id || ids.has(task.id)
          || typeof task.text !== 'string' || !task.text.trim()
          || typeof task.completed !== 'boolean') return false;
        ids.add(task.id);
        return true;
      });
      if (!valid) throw new Error('Invalid stored tasks');
      return data;
    } catch {
      // Preserve unreadable data instead of silently overwriting it.
      storageBlocked = true;
      showStorageWarning('Не удалось прочитать сохранённые задачи. Исходные данные не изменены. Новые задачи пока доступны только до закрытия или обновления страницы.');
      return [];
    }
  }

  function saveTasks() {
    if (storageBlocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      warning.hidden = true;
      storageNote.textContent = 'Задачи сохраняются в этом браузере';
    } catch {
      showStorageWarning('Браузер не смог сохранить изменения. Они могут потеряться после обновления страницы. Проверьте разрешения и свободное место в браузере.');
    }
  }

  function makeTaskRow(task) {
    const item = document.createElement('li');
    item.className = `task-item${task.completed ? ' is-complete' : ''}`;
    item.dataset.id = task.id;

    const label = document.createElement('label');
    label.className = 'task-label';
    const checkArea = document.createElement('span');
    checkArea.className = 'check-area';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkArea.append(checkbox);
    const text = document.createElement('span');
    text.className = 'task-text';
    // User text is always rendered as text, never as HTML.
    text.textContent = task.text;
    label.append(checkArea, text);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.setAttribute('aria-label', `Удалить задачу: ${task.text}`);
    remove.title = 'Удалить задачу';
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>';
    item.append(label, remove);
    return item;
  }

  function updateSummary() {
    const completed = tasks.filter(task => task.completed).length;
    document.querySelector('#total-count').textContent = tasks.length;
    document.querySelector('#progress-text').textContent = tasks.length
      ? `${completed} из ${tasks.length} выполнено${completed === tasks.length ? ' · Всё готово!' : ''}`
      : 'Начните с одного дела';
    document.querySelector('#empty-state').hidden = tasks.length > 0;
    document.querySelector('#progress-track').hidden = tasks.length === 0;
    document.querySelector('#progress-fill').style.width = `${tasks.length ? completed / tasks.length * 100 : 0}%`;
  }

  function renderAll() {
    list.replaceChildren(...tasks.map(makeTaskRow));
    updateSummary();
  }

  function clearInputError() {
    error.hidden = true;
    input.removeAttribute('aria-invalid');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      error.textContent = 'Сначала напишите, что нужно сделать.';
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    clearInputError();
    const task = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      completed: false,
    };
    tasks.push(task);
    list.append(makeTaskRow(task));
    saveTasks();
    updateSummary();
    input.value = '';
    input.focus();
    announcer.textContent = `Задача добавлена. Всего задач: ${tasks.length}.`;
  });

  input.addEventListener('input', clearInputError);

  list.addEventListener('change', event => {
    if (!event.target.matches('.task-checkbox')) return;
    const item = event.target.closest('.task-item');
    const task = tasks.find(task => task.id === item.dataset.id);
    if (!task) return;
    task.completed = event.target.checked;
    item.classList.toggle('is-complete', task.completed);
    saveTasks();
    updateSummary();
    announcer.textContent = task.completed ? 'Задача выполнена.' : 'Задача снова активна.';
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('.delete-button');
    if (!button) return;
    const item = button.closest('.task-item');
    const nextFocus = (item.nextElementSibling ?? item.previousElementSibling)?.querySelector('.delete-button');
    tasks = tasks.filter(task => task.id !== item.dataset.id);
    item.remove();
    saveTasks();
    updateSummary();
    (nextFocus ?? input).focus();
    announcer.textContent = `Задача удалена. Осталось задач: ${tasks.length}.`;
  });

  // Keep open tabs consistent when another tab saves a change.
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    storageBlocked = false;
    warning.hidden = true;
    storageNote.textContent = 'Задачи сохраняются в этом браузере';
    tasks = loadTasks();
    renderAll();
    announcer.textContent = 'Список обновлён в другой вкладке.';
  });

  renderAll();
})();
