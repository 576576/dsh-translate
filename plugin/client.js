/**
 * dsh-translate — Client half（动态 Cordis 插件浏览器端）
 *
 * 与 cordis_define 的 code.client 完全一致：本文件内容作为 async 函数体运行，
 * 返回 Cordis Plugin 对象（inject: ['slots', 'locale']）。
 *
 * 职责：
 *  - 输入框工具行（conversation.input.right）：[源语言▾] [⇄] [目标语言▾] [风格设置]
 *  - 语言菜单：就地锚定、搜索/自定义键入框 + 加号添加（源与目标均可用）、自定义语言可删除、
 *    选中行持久高亮（同加号菜单）；仅翻译模式会话显示
 *  - 风格设置面板（conversation.input.overlay 左上锚点）：与加号/斜杠菜单天然互斥、
 *    点击输入框不收回、开始键入即收回、修改自动保存全局生效（无按钮）
 *  - i18n：locale 字典覆盖插件列出的全部 18 种语言，未命中回退中文
 */
const DEFAULT_CFG = { source: 'auto', target: 'en', style: '' };
const STORAGE_KEY = 'dsh.translate.mode.v3';
const LANGS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'Українська' }
];
const SWAP_LABELS = {
  zh: '交换语言',
  en: 'Swap languages',
  ja: '言語を交換',
  ko: '언어 교환',
  fr: 'Échanger les langues',
  de: 'Sprachen tauschen',
  es: 'Intercambiar idiomas',
  ru: 'Поменять языки',
  pt: 'Trocar idiomas',
  it: 'Scambia lingue',
  ar: 'تبديل اللغتين',
  hi: 'भाषाएँ बदलें',
  th: 'สลับภาษา',
  vi: 'Hoán đổi ngôn ngữ',
  nl: 'Talen omwisselen',
  pl: 'Zamień języki',
  tr: 'Dilleri değiştir',
  uk: 'Поміняти мови'
};
const DICTS = {
  zh: {
    auto: '自动检测',
    searchPlaceholder: '搜索或输入自定义语言…',
    sourceTitle: '原语言',
    targetTitle: '目标语言',
    addTitle: '添加到语言列表（源与目标均可选）',
    deleteTitle: '删除该语言',
    styleButton: '风格设置',
    styleTitle: '翻译风格设置',
    styleHint: '修改后自动保存并全局生效。留空则使用默认风格。',
    stylePlaceholder: '例如：使用地道自然的表达，避免生硬直译；专业术语保持一致。'
  },
  en: {
    auto: 'Auto',
    searchPlaceholder: 'Search or type a custom language…',
    sourceTitle: 'Source language',
    targetTitle: 'Target language',
    addTitle: 'Add to the language list (selectable for both source and target)',
    deleteTitle: 'Delete this language',
    styleButton: 'Style settings',
    styleTitle: 'Translation style settings',
    styleHint: 'Changes are saved automatically and apply globally. Leave empty for the default style.',
    stylePlaceholder: 'e.g. Use natural, idiomatic expressions; keep technical terms consistent.'
  },
  ja: { auto: '自動検出', searchPlaceholder: '検索またはカスタム言語を入力…', sourceTitle: '元の言語', targetTitle: '翻訳先の言語', addTitle: '言語リストに追加（元・翻訳先の両方で選択可能）', deleteTitle: 'この言語を削除', styleButton: 'スタイル設定', styleTitle: '翻訳スタイル設定', styleHint: '変更は自動保存され、すべてのセッションに適用されます。空欄はデフォルトスタイル。', stylePlaceholder: '例：自然で慣用的な表現を使用し、専門用語の一貫性を保つ。' },
  ko: { auto: '자동 감지', searchPlaceholder: '검색 또는 사용자 지정 언어 입력…', sourceTitle: '원본 언어', targetTitle: '대상 언어', addTitle: '언어 목록에 추가 (원본/대상 모두 선택 가능)', deleteTitle: '이 언어 삭제', styleButton: '스타일 설정', styleTitle: '번역 스타일 설정', styleHint: '변경 사항은 자동 저장되며 전역에 적용됩니다. 비워 두면 기본 스타일.', stylePlaceholder: '예: 자연스럽고 관용적인 표현 사용, 전문 용어 일관성 유지.' },
  fr: { auto: 'Détection auto', searchPlaceholder: 'Rechercher ou saisir une langue personnalisée…', sourceTitle: 'Langue source', targetTitle: 'Langue cible', addTitle: 'Ajouter à la liste des langues (sélectionnable pour la source et la cible)', deleteTitle: 'Supprimer cette langue', styleButton: 'Paramètres de style', styleTitle: 'Paramètres du style de traduction', styleHint: "Les modifications sont enregistrées automatiquement et s'appliquent globalement. Laisser vide pour le style par défaut.", stylePlaceholder: 'Ex. : expressions naturelles et idiomatiques, terminologie cohérente.' },
  de: { auto: 'Automatisch', searchPlaceholder: 'Suchen oder eigene Sprache eingeben…', sourceTitle: 'Ausgangssprache', targetTitle: 'Zielsprache', addTitle: 'Zur Sprachenliste hinzufügen (für Quelle und Ziel wählbar)', deleteTitle: 'Diese Sprache löschen', styleButton: 'Stileinstellungen', styleTitle: 'Übersetzungsstil-Einstellungen', styleHint: 'Änderungen werden automatisch gespeichert und gelten global. Leer lassen für den Standardstil.', stylePlaceholder: 'z. B. natürliche, idiomatische Ausdrücke; Fachbegriffe konsistent halten.' },
  es: { auto: 'Detección automática', searchPlaceholder: 'Buscar o escribir un idioma personalizado…', sourceTitle: 'Idioma de origen', targetTitle: 'Idioma de destino', addTitle: 'Añadir a la lista de idiomas (seleccionable para origen y destino)', deleteTitle: 'Eliminar este idioma', styleButton: 'Ajustes de estilo', styleTitle: 'Ajustes de estilo de traducción', styleHint: 'Los cambios se guardan automáticamente y se aplican globalmente. Déjalo vacío para el estilo predeterminado.', stylePlaceholder: 'Ej.: expresiones naturales e idiomáticas; mantener la coherencia de los términos técnicos.' },
  ru: { auto: 'Автоопределение', searchPlaceholder: 'Поиск или ввод своего языка…', sourceTitle: 'Исходный язык', targetTitle: 'Целевой язык', addTitle: 'Добавить в список языков (доступен для исходного и целевого)', deleteTitle: 'Удалить этот язык', styleButton: 'Настройки стиля', styleTitle: 'Настройки стиля перевода', styleHint: 'Изменения сохраняются автоматически и применяются глобально. Оставьте пустым для стиля по умолчанию.', stylePlaceholder: 'Например: естественные идиоматические выражения, единая терминология.' },
  pt: { auto: 'Detecção automática', searchPlaceholder: 'Pesquisar ou digitar um idioma personalizado…', sourceTitle: 'Idioma de origem', targetTitle: 'Idioma de destino', addTitle: 'Adicionar à lista de idiomas (selecionável para origem e destino)', deleteTitle: 'Excluir este idioma', styleButton: 'Configurações de estilo', styleTitle: 'Configurações de estilo de tradução', styleHint: 'As alterações são salvas automaticamente e aplicadas globalmente. Deixe vazio para o estilo padrão.', stylePlaceholder: 'Ex.: expressões naturais e idiomáticas; manter a consistência dos termos técnicos.' },
  it: { auto: 'Rilevamento automatico', searchPlaceholder: 'Cerca o digita una lingua personalizzata…', sourceTitle: 'Lingua di partenza', targetTitle: 'Lingua di destinazione', addTitle: "Aggiungi all'elenco delle lingue (selezionabile per origine e destinazione)", deleteTitle: 'Elimina questa lingua', styleButton: 'Impostazioni stile', styleTitle: 'Impostazioni stile di traduzione', styleHint: 'Le modifiche vengono salvate automaticamente e si applicano a livello globale. Lascia vuoto per lo stile predefinito.', stylePlaceholder: 'Es.: espressioni naturali e idiomatiche; mantieni coerenti i termini tecnici.' },
  ar: { auto: 'كشف تلقائي', searchPlaceholder: 'ابحث أو اكتب لغة مخصصة…', sourceTitle: 'اللغة المصدر', targetTitle: 'اللغة الهدف', addTitle: 'إضافة إلى قائمة اللغات (قابلة للاختيار للمصدر والهدف)', deleteTitle: 'حذف هذه اللغة', styleButton: 'إعدادات النمط', styleTitle: 'إعدادات نمط الترجمة', styleHint: 'تُحفظ التغييرات تلقائيًا وتُطبَّق عالميًا. اتركه فارغًا للنمط الافتراضي.', stylePlaceholder: 'مثال: استخدام تعبيرات طبيعية وسلسة مع الحفاظ على اتساق المصطلحات.' },
  hi: { auto: 'स्वतः पहचान', searchPlaceholder: 'खोजें या अपनी भाषा लिखें…', sourceTitle: 'स्रोत भाषा', targetTitle: 'लक्ष्य भाषा', addTitle: 'भाषा सूची में जोड़ें (स्रोत और लक्ष्य दोनों के लिए चुनने योग्य)', deleteTitle: 'यह भाषा हटाएँ', styleButton: 'शैली सेटिंग', styleTitle: 'अनुवाद शैली सेटिंग', styleHint: 'परिवर्तन स्वतः सहेजे जाते हैं और वैश्विक रूप से लागू होते हैं। डिफ़ॉल्ट शैली के लिए खाली छोड़ें।', stylePlaceholder: 'उदा: स्वाभाविक, मुहावरेदार अभिव्यक्तियाँ; तकनीकी शब्दों में स्थिरता रखें।' },
  th: { auto: 'ตรวจจับอัตโนมัติ', searchPlaceholder: 'ค้นหาหรือพิมพ์ภาษาที่กำหนดเอง…', sourceTitle: 'ภาษาต้นทาง', targetTitle: 'ภาษาเป้าหมาย', addTitle: 'เพิ่มในรายการภาษา (เลือกได้ทั้งต้นทางและเป้าหมาย)', deleteTitle: 'ลบภาษานี้', styleButton: 'ตั้งค่ารูปแบบ', styleTitle: 'ตั้งค่ารูปแบบการแปล', styleHint: 'การเปลี่ยนแปลงจะบันทึกอัตโนมัติและมีผลทั่วโลก เว้นว่างเพื่อใช้รูปแบบเริ่มต้น', stylePlaceholder: 'เช่น ใช้สำนวนที่เป็นธรรมชาติและรักษาความสม่ำเสมอของคำศัพท์เทคนิค' },
  vi: { auto: 'Tự động phát hiện', searchPlaceholder: 'Tìm kiếm hoặc nhập ngôn ngữ tùy chỉnh…', sourceTitle: 'Ngôn ngữ nguồn', targetTitle: 'Ngôn ngữ đích', addTitle: 'Thêm vào danh sách ngôn ngữ (chọn được cho cả nguồn và đích)', deleteTitle: 'Xóa ngôn ngữ này', styleButton: 'Cài đặt phong cách', styleTitle: 'Cài đặt phong cách dịch', styleHint: 'Thay đổi được lưu tự động và áp dụng toàn cục. Để trống để dùng phong cách mặc định.', stylePlaceholder: 'Ví dụ: dùng cách diễn đạt tự nhiên, giữ thuật ngữ nhất quán.' },
  nl: { auto: 'Automatisch detecteren', searchPlaceholder: 'Zoek of typ een aangepaste taal…', sourceTitle: 'Brontaal', targetTitle: 'Doeltaal', addTitle: 'Toevoegen aan de talenlijst (selecteerbaar voor bron en doel)', deleteTitle: 'Deze taal verwijderen', styleButton: 'Stijlinstellingen', styleTitle: 'Vertaalstijlinstellingen', styleHint: 'Wijzigingen worden automatisch opgeslagen en wereldwijd toegepast. Leeg laten voor de standaardstijl.', stylePlaceholder: 'Bijv. natuurlijke, idiomatische uitdrukkingen; houd vaktermen consistent.' },
  pl: { auto: 'Automatyczne wykrywanie', searchPlaceholder: 'Szukaj lub wpisz własny język…', sourceTitle: 'Język źródłowy', targetTitle: 'Język docelowy', addTitle: 'Dodaj do listy języków (wybieralny dla źródła i celu)', deleteTitle: 'Usuń ten język', styleButton: 'Ustawienia stylu', styleTitle: 'Ustawienia stylu tłumaczenia', styleHint: 'Zmiany są zapisywane automatycznie i mają zastosowanie globalnie. Pozostaw puste, aby użyć stylu domyślnego.', stylePlaceholder: 'Np. naturalne, idiomatyczne wyrażenia; zachowaj spójność terminów technicznych.' },
  tr: { auto: 'Otomatik algılama', searchPlaceholder: 'Ara veya özel bir dil yazın…', sourceTitle: 'Kaynak dil', targetTitle: 'Hedef dil', addTitle: 'Dil listesine ekle (kaynak ve hedef için seçilebilir)', deleteTitle: 'Bu dili sil', styleButton: 'Stil ayarları', styleTitle: 'Çeviri stili ayarları', styleHint: 'Değişiklikler otomatik kaydedilir ve genel olarak uygulanır. Varsayılan stil için boş bırakın.', stylePlaceholder: 'Örn: doğal, deyimsel ifadeler; teknik terimleri tutarlı tutun.' },
  uk: { auto: 'Автовизначення', searchPlaceholder: 'Пошук або введення власної мови…', sourceTitle: 'Мова оригіналу', targetTitle: 'Цільова мова', addTitle: 'Додати до списку мов (доступна для оригіналу та перекладу)', deleteTitle: 'Видалити цю мову', styleButton: 'Налаштування стилю', styleTitle: 'Налаштування стилю перекладу', styleHint: 'Зміни зберігаються автоматично та застосовуються глобально. Залиште порожнім для стилю за замовчуванням.', stylePlaceholder: 'Напр.: природні, ідіоматичні вирази; зберігайте послідовність термінів.' }
};

function loadState() {
  const base = { cfg: { ...DEFAULT_CFG }, custom: [] };
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (v && typeof v === 'object') {
          base.cfg = { ...DEFAULT_CFG, ...v };
          base.custom = Array.isArray(v.custom)
            ? v.custom.filter((c) => c && typeof c.code === 'string' && typeof c.label === 'string')
            : [];
        }
      }
    }
  } catch (e) { /* ignore */ }
  return base;
}

let state = { ...loadState(), dialogOpen: false, menu: null };
const subs = new Set();
function getState() { return state; }
function setState(patch) {
  state = { ...state, ...patch };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state.cfg, custom: state.custom }));
    }
  } catch (e) { /* ignore */ }
  for (const fn of Array.from(subs)) {
    try { fn(state); } catch (e) { /* ignore */ }
  }
}
function subscribe(fn) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}
function useCfg() { return React.useSyncExternalStore(subscribe, getState); }

return {
  inject: ['slots', 'locale'],
  apply(ctx) {
    const locale = ctx.locale;
    ctx.effect(() => locale.register('dsh-translate', DICTS), 'dsh-translate: dicts');
    const t = locale.bind('dsh-translate');
    function useLocaleTick() {
      return React.useSyncExternalStore(
        (fn) => locale.subscribe(fn),
        () => locale.getSnapshot()
      );
    }

    const CSS = [
      '.dtr-tools{display:inline-flex;align-items:center;gap:2px;min-width:0}',
      '.dtr-root{position:relative;display:inline-flex;min-width:0}',
      '.dtr-trigger{min-width:0;max-width:200px;height:28px;color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;background:transparent;border:none;border-radius:24px;outline:none;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex;align-items:center;gap:4px}',
      '.dtr-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dtr-trigger.dtr-active{color:var(--dsw-alias-brand-primary)}',
      '.dtr-trigger-label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}',
      '.dtr-chevron{flex:none;color:var(--dsw-alias-label-caption);transition:transform .12s;display:inline-flex}',
      '.dtr-chevron.dtr-open{transform:rotate(180deg)}',
      '.dtr-swap{height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:transparent;border:none;border-radius:24px;outline:none;padding:0 6px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex;align-items:center;user-select:none;-webkit-user-select:none}',
      '.dtr-swap:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dtr-swap:disabled{opacity:.4;cursor:default}',
      '.dtr-menu{position:absolute;bottom:calc(100% + 8px);left:0;z-index:100;min-width:max(220px,100%);border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:12px;padding:4px;display:flex;flex-direction:column;gap:2px}',
      '.dtr-menu-searchrow{display:flex;align-items:center;gap:4px;padding:0 2px 4px}',
      '.dtr-menu-search{flex:1;min-width:0;border:1px solid var(--dsw-alias-border-inverted);color:var(--dsw-alias-label-primary);background:transparent;border-radius:8px;outline:none;padding:5px 8px;font-size:13px}',
      '.dtr-menu-search:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dtr-menu-add{flex:none;width:26px;height:26px;border:1px solid var(--dsw-alias-border-inverted);color:var(--dsw-alias-label-primary);background:transparent;border-radius:8px;cursor:pointer;font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center}',
      '.dtr-menu-add:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dtr-menu-add:disabled{opacity:.4;cursor:default}',
      '.dtr-menu-list{display:flex;flex-direction:column;gap:2px;overflow-y:auto;max-height:260px}',
      '.dtr-menu-row{display:flex;align-items:center;gap:2px}',
      '.dtr-menu-item{flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;background:transparent;text-align:left;white-space:nowrap}',
      '.dtr-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dtr-menu-item.dtr-selected{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dtr-menu-del{flex:none;width:24px;height:24px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;border-radius:6px;font-size:14px;line-height:1;display:inline-flex;align-items:center;justify-content:center}',
      '.dtr-menu-del:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}',
      '.dtr-style-card{z-index:100;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);min-width:min(320px,100%);max-width:100%;max-height:min(60vh,520px);box-shadow:var(--dsw-shadow-lv3);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;position:absolute;bottom:calc(100% + 4px);left:0;color:var(--dsw-alias-label-primary)}',
      '.dtr-style-title{margin:0;font-size:12px;font-weight:500;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.dtr-style-input{width:100%;box-sizing:border-box;min-height:96px;max-height:200px;resize:vertical;background:transparent;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-inverted);border-radius:8px;outline:none;padding:6px 8px;font-size:13px;font-family:inherit}',
      '.dtr-style-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dtr-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}'
    ].join('\n');

    ctx.effect(() => styles.insert(CSS), 'dsh-translate: styles');

    function LangMenu({ kind }) {
      const s = useCfg();
      const cfg = s.cfg;
      const custom = s.custom;
      useLocaleTick();
      const rootRef = React.useRef(null);
      const open = s.menu === kind;
      const [query, setQuery] = React.useState('');
      React.useEffect(() => {
        if (open) setQuery('');
      }, [open]);
      React.useEffect(() => {
        if (!open) return;
        const closeOutside = (e) => {
          if (rootRef.current && !rootRef.current.contains(e.target)) setState({ menu: null });
        };
        const onKey = (e) => { if (e.key === 'Escape') setState({ menu: null }); };
        document.addEventListener('mousedown', closeOutside);
        document.addEventListener('keydown', onKey);
        return () => {
          document.removeEventListener('mousedown', closeOutside);
          document.removeEventListener('keydown', onKey);
        };
      }, [open]);
      const allOptions = kind === 'source'
        ? [{ code: 'auto', label: t('auto') }, ...LANGS, ...custom]
        : [...LANGS, ...custom];
      const current = kind === 'source' ? cfg.source : cfg.target;
      const label = (allOptions.find((l) => l.code === current) || allOptions[0]).label;
      const q = query.trim().toLowerCase();
      const filtered = q === '' ? allOptions : allOptions.filter((l) => l.label.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
      const exists = allOptions.some((l) => l.code.toLowerCase() === q || l.label.toLowerCase() === q);
      const canAdd = q !== '' && !exists;
      const addCustom = () => {
        if (!canAdd) return;
        const name = query.trim();
        setState({
          custom: [...custom, { code: name, label: name }],
          cfg: { ...cfg, [kind === 'source' ? 'source' : 'target']: name },
          menu: null
        });
      };
      const removeCustom = (code) => {
        const nextCustom = custom.filter((c) => c.code !== code);
        const nextCfg = { ...cfg };
        if (nextCfg.source === code) nextCfg.source = 'auto';
        if (nextCfg.target === code) nextCfg.target = 'en';
        setState({ custom: nextCustom, cfg: nextCfg });
      };
      const pick = (code) => setState({ cfg: { ...cfg, [kind === 'source' ? 'source' : 'target']: code }, menu: null });
      return React.createElement('div', { ref: rootRef, className: 'dtr-root' },
        React.createElement('button', {
          type: 'button',
          className: 'dtr-trigger',
          title: kind === 'source' ? t('sourceTitle') : t('targetTitle'),
          onClick: () => setState({ menu: open ? null : kind })
        },
          React.createElement('span', { className: 'dtr-trigger-label' }, label),
          React.createElement('svg', { className: 'dtr-chevron' + (open ? ' dtr-open' : ''), viewBox: '0 0 12 12', width: '12', height: '12', 'aria-hidden': true },
            React.createElement('path', { d: 'M3 4.5L6 7.5L9 4.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' })
          )
        ),
        open ? React.createElement('div', { className: 'dtr-menu' },
          React.createElement('div', { className: 'dtr-menu-searchrow' },
            React.createElement('input', {
              className: 'dtr-menu-search',
              autoFocus: true,
              value: query,
              placeholder: t('searchPlaceholder'),
              onChange: (e) => setQuery(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }
            }),
            React.createElement('button', {
              type: 'button',
              className: 'dtr-menu-add',
              title: t('addTitle'),
              disabled: !canAdd,
              onClick: addCustom
            }, '+')
          ),
          React.createElement('div', { className: 'dtr-menu-list' },
            filtered.map((l) => {
              const selected = l.code === current;
              const isCustom = custom.some((c) => c.code === l.code);
              return React.createElement('div', { key: l.code, className: 'dtr-menu-row' },
                React.createElement('button', {
                  type: 'button',
                  className: 'dtr-menu-item' + (selected ? ' dtr-selected' : ''),
                  onClick: () => pick(l.code)
                },
                  React.createElement('span', null, l.label)
                ),
                isCustom ? React.createElement('button', {
                  type: 'button',
                  className: 'dtr-menu-del',
                  title: t('deleteTitle'),
                  onClick: (e) => { e.stopPropagation(); removeCustom(l.code); }
                }, '×') : null
              );
            })
          )
        ) : null
      );
    }

    function TranslateControls(props) {
      const s = useCfg();
      const cfg = s.cfg;
      useLocaleTick();
      const sessionId = props.sessionId;
      const useSessions = props.useSessions || (() => undefined);
      const presetId = useSessions((snap) => (sessionId ? snap.byId[sessionId]?.agentPreset : undefined));
      const active = presetId === 'translate';
      React.useEffect(() => {
        if (!active) return;
        let cancelled = false;
        let retryTimer = null;
        let attempts = 0;
        const save = () => {
          host.call('saveSettings', { source: cfg.source, target: cfg.target, style: cfg.style }).then((res) => {
            if (cancelled) return;
            if (!res || !res.ok) {
              console.log('[dsh-translate] saveSettings 失败: ' + ((res && res.error) || '未知错误'));
              attempts += 1;
              if (attempts <= 5) retryTimer = setTimeout(save, 1000);
            }
          }).catch((e) => {
            if (cancelled) return;
            console.log('[dsh-translate] saveSettings 异常: ' + String(e));
            attempts += 1;
            if (attempts <= 5) retryTimer = setTimeout(save, 1000);
          });
        };
        save();
        return () => {
          cancelled = true;
          if (retryTimer) clearTimeout(retryTimer);
        };
      }, [active, cfg.source, cfg.target, cfg.style]);
      if (!active) return null;
      const sourceAuto = cfg.source === 'auto';
      const swapProps = sourceAuto
        ? { disabled: true }
        : { disabled: false, title: SWAP_LABELS[cfg.source] || 'Swap languages' };
      return React.createElement('div', { className: 'dtr-tools' },
        React.createElement(LangMenu, { kind: 'source' }),
        React.createElement('button', {
          type: 'button',
          className: 'dtr-swap',
          ...swapProps,
          onClick: () => setState({ cfg: { ...cfg, source: cfg.target, target: cfg.source } })
        }, '⇄'),
        React.createElement(LangMenu, { kind: 'target' }),
        React.createElement('button', {
          type: 'button',
          className: 'dtr-trigger' + (s.dialogOpen ? ' dtr-active' : ''),
          title: t('styleTitle'),
          onClick: (e) => {
            if (s.dialogOpen) {
              setState({ dialogOpen: false });
              return;
            }
            const card = e.currentTarget ? e.currentTarget.closest('[data-composer-card]') : null;
            const ta = card ? card.querySelector('textarea') : null;
            if (ta) {
              try {
                ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
              } catch (err) { /* ignore */ }
            }
            setState({ dialogOpen: true });
          }
        },
          React.createElement('span', { className: 'dtr-trigger-label' }, t('styleButton'))
        )
      );
    }

    function StyleSettingsPanel(props) {
      const s = useCfg();
      useLocaleTick();
      const open = s.dialogOpen;
      const rootRef = React.useRef(null);
      const draftRef = React.useRef(s.cfg.style);
      const timerRef = React.useRef(null);
      const [draft, setDraft] = React.useState(s.cfg.style);
      React.useEffect(() => {
        if (open) {
          draftRef.current = s.cfg.style;
          setDraft(s.cfg.style);
        }
      }, [open, s.cfg.style]);
      React.useEffect(() => () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        const cur = getState();
        const style = draftRef.current.trim();
        if (style !== cur.cfg.style) setState({ cfg: { ...cur.cfg, style } });
      }, []);
      const commit = (closePanel) => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        const cur = getState();
        const style = draftRef.current.trim();
        if (style !== cur.cfg.style) setState({ cfg: { ...cur.cfg, style } });
        if (closePanel) setState({ dialogOpen: false });
      };
      const onDraft = (e) => {
        const value = e.target.value;
        draftRef.current = value;
        setDraft(value);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => commit(false), 300);
      };
      React.useEffect(() => {
        if (!open) return;
        let observer = null;
        const anchor = rootRef.current ? rootRef.current.parentNode : null;
        if (anchor && typeof MutationObserver !== 'undefined') {
          observer = new MutationObserver(() => {
            if (anchor.children.length > 1) commit(true);
          });
          observer.observe(anchor, { childList: true });
        }
        const onPointerDown = (ev) => {
          if (!(ev.target instanceof Node)) return;
          if (rootRef.current && rootRef.current.contains(ev.target)) return;
          const card = rootRef.current ? rootRef.current.closest('[data-composer-card]') : null;
          if (card && card.contains(ev.target)) return;
          commit(true);
        };
        const onInput = (ev) => {
          if (!(ev.target instanceof Node)) return;
          if (rootRef.current && rootRef.current.contains(ev.target)) return;
          const card = rootRef.current ? rootRef.current.closest('[data-composer-card]') : null;
          if (card && card.contains(ev.target)) commit(true);
        };
        const onKey = (e) => { if (e.key === 'Escape') commit(true); };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('input', onInput, true);
        document.addEventListener('keydown', onKey);
        return () => {
          if (observer) observer.disconnect();
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('input', onInput, true);
          document.removeEventListener('keydown', onKey);
        };
      }, [open]);
      if (!open) return null;
      return React.createElement('div', { ref: rootRef, className: 'dtr-style-card' },
        React.createElement('div', { className: 'dtr-style-title' }, t('styleTitle')),
        React.createElement('textarea', {
          className: 'dtr-style-input',
          autoFocus: true,
          value: draft,
          onChange: onDraft,
          placeholder: t('stylePlaceholder')
        }),
        React.createElement('div', { className: 'dtr-hint' }, t('styleHint'))
      );
    }

    ctx.effect(() => ctx.slots.register({ name: 'conversation.input.right', id: 'translate-mode', order: 0, label: '翻译模式' }, TranslateControls), 'dsh-translate: tools');
    ctx.effect(() => ctx.slots.register({ name: 'conversation.input.overlay', id: 'translate-style', order: 10, label: '翻译风格设置' }, StyleSettingsPanel), 'dsh-translate: style panel');
  }
};
