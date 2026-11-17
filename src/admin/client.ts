import {
  createIcons,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Hash,
  Inbox,
  LogOut,
  NotebookPen,
  Plus,
  Search,
  Tag,
  Trash2,
  UserRound,
  X,
} from 'lucide';
import {
  statuses,
  type Idea,
  type IdeaInput,
  type IdeaList,
  type Status,
} from './types';

const icons = {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Hash,
  Inbox,
  LogOut,
  NotebookPen,
  Plus,
  Search,
  Tag,
  Trash2,
  UserRound,
  X,
};
function iconize() {
  createIcons({ icons, attrs: { 'aria-hidden': 'true' } });
}
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const form = $<HTMLFormElement>('idea-form');
const shell = $('idea-app');
const title = $<HTMLTextAreaElement>('title');
const notes = $<HTMLTextAreaElement>('notes');
const statusInput = $<HTMLSelectElement>('idea-status');
const statusFilter = $<HTMLSelectElement>('status-filter');
const tagInput = $<HTMLInputElement>('tag-input');
const list = $('idea-list');
let current: Idea | null = null;
let tags: string[] = [];
let baseline = '';
let selectedTag = '';
let page = 1;
let busy = false;
let selecting = false;
let loading: AbortController | undefined;
let lastList: IdeaList | undefined;
let toastTimer: ReturnType<typeof setTimeout>;
let searchTimer: ReturnType<typeof setTimeout>;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function icon(name: string) {
  const element = el('i');
  element.dataset.lucide = name;
  return element;
}
function iconButton(name: string, label: string, action: () => void) {
  const button = el('button', 'icon-button');
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.append(icon(name));
  button.addEventListener('click', action);
  return button;
}
function input(): IdeaInput {
  return {
    title: title.value.trim(),
    notes: notes.value,
    status: statusInput.value as Status,
    tags: [...tags],
    references: [
      ...document.querySelectorAll<HTMLInputElement>('.reference-url'),
    ]
      .map((row) => row.value.trim())
      .filter(Boolean),
  };
}
function dirty() {
  return (
    !form.hidden &&
    (JSON.stringify(input()) !== baseline || !!tagInput.value.trim())
  );
}
function updateDirty() {
  $('save-state').textContent = busy
    ? '保存中…'
    : dirty()
      ? '未保存'
      : '保存済み';
  $('save-state').classList.toggle('dirty', dirty());
}
function notice(message: string, login = false) {
  $('notice-text').textContent = message;
  $('notice').hidden = false;
  $('login-again').hidden = !login;
  $('retry').hidden = login;
}
function toast(message: string) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => {
    $('toast').hidden = true;
  }, 3000);
}
class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/admin/api/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'IdeaAdmin',
      ...options.headers,
    },
    credentials: 'same-origin',
    redirect: 'manual',
  });
  if (!response.headers.get('Content-Type')?.includes('application/json'))
    throw new RequestError(
      401,
      'ログインをやり直してください。入力内容はこの画面に残っています。',
    );
  const data = await response.json();
  if (!response.ok)
    throw new RequestError(
      response.status,
      data.error || '操作に失敗しました。',
    );
  return data as T;
}
function report(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return;
  notice(
    error instanceof RequestError
      ? error.message
      : '接続できませんでした。入力内容を保持したまま、再度お試しください。',
    error instanceof RequestError && error.status === 401,
  );
}
function confirmDialog(id: string, value: string): Promise<boolean> {
  const dialog = $<HTMLDialogElement>(id);
  return new Promise((resolve) => {
    dialog.addEventListener(
      'close',
      () => resolve(dialog.returnValue === value),
      { once: true },
    );
    dialog.returnValue = 'cancel';
    dialog.showModal();
  });
}
async function canLeave() {
  return (
    !busy &&
    !selecting &&
    (!dirty() || (await confirmDialog('discard-dialog', 'discard')))
  );
}
function showBusy(value: boolean) {
  busy = value;
  $<HTMLFieldSetElement>('editor-fields').disabled = value;
  for (const id of [
    'save-idea',
    'delete-idea',
    'new-idea',
    'empty-new',
    'back-list',
  ])
    $<HTMLButtonElement>(id).disabled = value;
  form.setAttribute('aria-busy', String(value));
  updateDirty();
}
function formatDate(value: string, full = false) {
  return new Intl.DateTimeFormat(
    'ja-JP',
    full
      ? {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : { month: 'numeric', day: 'numeric' },
  ).format(new Date(value));
}
function renderTags() {
  const container = $('editor-tags');
  container.replaceChildren();
  tags.forEach((tag) => {
    const chip = el('span', 'tag-chip', tag);
    chip.append(
      iconButton('x', `${tag}を外す`, () => {
        tags = tags.filter((value) => value !== tag);
        renderTags();
        updateDirty();
      }),
    );
    container.append(chip);
  });
  iconize();
}
function addReference(value = '') {
  if ($('references').children.length >= 20) {
    notice('参考リンクは20件まで追加できます。');
    return;
  }
  const row = el('div', 'reference-row');
  const field = el('input', 'reference-url');
  field.type = 'url';
  field.placeholder = 'https://';
  field.maxLength = 2048;
  field.value = value;
  field.setAttribute('aria-label', '参考URL');
  const link = el('a', 'icon-button');
  link.title = '参考リンクを開く';
  link.setAttribute('aria-label', '参考リンクを開く');
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.append(icon('external-link'));
  const updateLink = () => {
    try {
      const parsed = new URL(field.value);
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password
      )
        throw Error();
      link.href = parsed.href;
      link.removeAttribute('aria-disabled');
    } catch {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
    }
  };
  field.addEventListener('input', updateLink);
  updateLink();
  row.append(
    field,
    link,
    iconButton('x', '参考リンクを外す', () => {
      row.remove();
      updateDirty();
    }),
  );
  $('references').append(row);
  iconize();
}
function showEditor(idea: Idea | null) {
  current = idea;
  form.reset();
  tags = [...(idea?.tags || [])];
  title.value = idea?.title || '';
  notes.value = idea?.notes || '';
  statusInput.value = idea?.status || 'idea';
  renderTags();
  $('references').replaceChildren();
  (idea?.references || []).forEach((url) => addReference(url));
  $('editor-mode').textContent = idea ? '編集中' : '新しいアイデア';
  $('delete-idea').hidden = !idea;
  $('updated-at').textContent = idea
    ? `最終更新: ${formatDate(idea.updated_at, true)}`
    : '';
  $('created-at').textContent = idea
    ? `作成日: ${formatDate(idea.created_at, true)}`
    : '';
  form.hidden = false;
  $('editor-empty').hidden = true;
  shell.classList.add('editing');
  baseline = JSON.stringify(input());
  updateDirty();
  if (lastList) renderRows(lastList);
}
function renderRows(data: IdeaList) {
  list.replaceChildren();
  if (!data.items.length) {
    const any = Object.values(data.counts).some(Boolean);
    list.append(
      el(
        'div',
        'list-state',
        any
          ? '条件に一致するアイデアはありません。'
          : 'アイデアはまだありません。',
      ),
    );
  }
  data.items.forEach((idea) => {
    const row = el(
      'button',
      `idea-row${current?.id === idea.id ? ' selected' : ''}`,
    );
    row.type = 'button';
    row.setAttribute('aria-pressed', String(current?.id === idea.id));
    row.append(
      el('span', 'idea-title', idea.title),
      el('span', 'idea-excerpt', idea.notes || 'メモなし'),
    );
    const footer = el('span', 'idea-row-footer');
    const chips = el('span', 'row-tags');
    idea.tags
      .slice(0, 2)
      .forEach((tag) => chips.append(el('span', 'row-tag', tag)));
    const state = el('span', 'row-status');
    state.append(
      el('span', `status-dot ${idea.status}`),
      document.createTextNode(statuses[idea.status]),
    );
    footer.append(
      chips,
      state,
      el('span', 'row-date', formatDate(idea.updated_at)),
    );
    row.append(footer);
    row.addEventListener('click', async () => {
      if (current?.id === idea.id) {
        shell.classList.add('editing');
        return;
      }
      if (!(await canLeave())) return;
      selecting = true;
      showBusy(true);
      try {
        showEditor(await api<Idea>(`ideas/${idea.id}`));
      } catch (error) {
        report(error);
      } finally {
        selecting = false;
        showBusy(false);
      }
    });
    list.append(row);
  });
}
function renderList(data: IdeaList) {
  lastList = data;
  page = data.page;
  renderRows(data);
  const count = Object.values(data.counts).reduce((a, b) => a + b, 0);
  $('total-count').textContent = `${count}件`;
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((node) => {
    node.textContent = String(
      node.dataset.count === 'all'
        ? count
        : data.counts[node.dataset.count as Status],
    );
  });
  document.querySelectorAll<HTMLElement>('[data-status]').forEach((node) => {
    node.classList.toggle('active', node.dataset.status === statusFilter.value);
    node.setAttribute(
      'aria-pressed',
      String(node.dataset.status === statusFilter.value),
    );
  });
  const tagContainer = $('sidebar-tags');
  tagContainer.replaceChildren();
  if (!data.tags.length)
    tagContainer.append(el('span', 'muted', 'まだありません'));
  data.tags.forEach((tag) => {
    const button = el(
      'button',
      `sidebar-tag${tag === selectedTag ? ' active' : ''}`,
      tag,
    );
    button.setAttribute('aria-pressed', String(tag === selectedTag));
    button.addEventListener('click', () => {
      selectedTag = selectedTag === tag ? '' : tag;
      page = 1;
      void load();
    });
    tagContainer.append(button);
  });
  const mobileTags = $<HTMLSelectElement>('mobile-tag-filter');
  const allTags = el('option', '', 'すべてのタグ');
  allTags.value = '';
  mobileTags.replaceChildren(allTags);
  [...new Set([...data.tags, ...(selectedTag ? [selectedTag] : [])])].forEach(
    (tag) => {
      const option = el('option', '', tag);
      option.value = tag;
      mobileTags.append(option);
    },
  );
  mobileTags.value = selectedTag;
  $('active-tag').hidden = !selectedTag;
  $('active-tag-name').textContent = `# ${selectedTag}`;
  $('page-label').textContent = data.total
    ? `${(page - 1) * data.pageSize + 1}–${Math.min(page * data.pageSize, data.total)} / ${data.total}件`
    : '0件';
  $<HTMLButtonElement>('prev-page').disabled = page <= 1;
  $<HTMLButtonElement>('next-page').disabled =
    page * data.pageSize >= data.total;
}
async function load() {
  loading?.abort();
  const controller = new AbortController();
  loading = controller;
  list.setAttribute('aria-busy', 'true');
  const params = new URLSearchParams({
    q: $<HTMLInputElement>('search').value,
    status: statusFilter.value,
    tag: selectedTag,
    sort: $<HTMLSelectElement>('sort').value,
    page: String(page),
  });
  try {
    const data = await api<IdeaList>(`ideas?${params}`, {
      signal: controller.signal,
    });
    if (!controller.signal.aborted) renderList(data);
  } catch (error) {
    if (!controller.signal.aborted) {
      report(error);
      if (!lastList)
        list.replaceChildren(el('div', 'list-state', '読み込めませんでした。'));
    }
  } finally {
    if (loading === controller) list.setAttribute('aria-busy', 'false');
  }
}
async function newIdea() {
  if (!(await canLeave())) return;
  showEditor(null);
  title.focus();
}
$('new-idea').addEventListener('click', () => void newIdea());
$('empty-new').addEventListener('click', () => void newIdea());
$('back-list').addEventListener('click', async () => {
  if (!(await canLeave())) return;
  if (current) showEditor(current);
  else {
    form.reset();
    form.hidden = true;
    $('editor-empty').hidden = false;
  }
  shell.classList.remove('editing');
});
$('dismiss-notice').addEventListener('click', () => {
  $('notice').hidden = true;
});
$('retry').addEventListener('click', async () => {
  if (!(await canLeave())) return;
  $('notice').hidden = true;
  if (current) {
    try {
      showEditor(await api<Idea>(`ideas/${current.id}`));
    } catch (error) {
      report(error);
    }
  }
  await load();
});
$('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page = 1;
    void load();
  }, 200);
});
statusFilter.addEventListener('change', () => {
  page = 1;
  void load();
});
$('mobile-tag-filter').addEventListener('change', () => {
  selectedTag = $<HTMLSelectElement>('mobile-tag-filter').value;
  page = 1;
  void load();
});
$('sort').addEventListener('change', () => {
  page = 1;
  void load();
});
document
  .querySelectorAll<HTMLButtonElement>('[data-status]')
  .forEach((button) =>
    button.addEventListener('click', () => {
      statusFilter.value = button.dataset.status || '';
      page = 1;
      void load();
    }),
  );
$('clear-tag').addEventListener('click', () => {
  selectedTag = '';
  page = 1;
  void load();
});
$('prev-page').addEventListener('click', () => {
  page--;
  void load();
});
$('next-page').addEventListener('click', () => {
  page++;
  void load();
});
function addTag() {
  const tag = tagInput.value.trim();
  if (!tag) return true;
  const duplicate = tags.some(
    (value) => value.toLowerCase() === tag.toLowerCase(),
  );
  if (!duplicate && tags.length >= 12) {
    notice('タグは12件まで追加できます。');
    return false;
  }
  if (!duplicate) tags.push(tag);
  tagInput.value = '';
  renderTags();
  updateDirty();
  tagInput.focus();
  return true;
}
$('add-tag').addEventListener('click', addTag);
tagInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTag();
  }
});
$('add-reference').addEventListener('click', () => {
  addReference();
  $('references')
    .querySelector<HTMLInputElement>('.reference-row:last-child input')
    ?.focus();
});
form.addEventListener('input', updateDirty);
form.addEventListener('change', updateDirty);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  if (!addTag()) return;
  const data = input();
  if (!data.title) {
    title.setCustomValidity('タイトルを入力してください。');
    title.reportValidity();
    title.setCustomValidity('');
    return;
  }
  showBusy(true);
  $('notice').hidden = true;
  try {
    const saved = await api<Idea>(current ? `ideas/${current.id}` : 'ideas', {
      method: current ? 'PUT' : 'POST',
      body: JSON.stringify({
        ...data,
        ...(current ? { revision: current.revision } : {}),
      }),
    });
    showEditor(saved);
    toast('保存しました');
    await load();
  } catch (error) {
    report(error);
  } finally {
    showBusy(false);
  }
});
$('delete-idea').addEventListener('click', async () => {
  if (!current || busy) return;
  $('delete-title').textContent = current.title;
  if (!(await confirmDialog('delete-dialog', 'delete'))) return;
  showBusy(true);
  try {
    await api(`ideas/${current.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ revision: current.revision }),
    });
    current = null;
    form.hidden = true;
    $('editor-empty').hidden = false;
    shell.classList.remove('editing');
    baseline = '';
    toast('削除しました');
    await load();
  } catch (error) {
    report(error);
  } finally {
    showBusy(false);
  }
});
window.addEventListener('beforeunload', (event) => {
  if (dirty() || busy) event.preventDefault();
});
iconize();
void load();
