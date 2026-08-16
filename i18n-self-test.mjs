// 翻译模式 i18n 自测：复刻 dsh-client-locale LocaleRuntime.lookup/translate 逻辑，
// 使用与插件 pkg-27 完全一致的 DICTS 数据，对 18 种语言 × 全部键做断言。
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

// 复刻 LocaleRuntime.lookup：active 语言 → zh 回退 → 原 key
const KEYS = ['auto', 'searchPlaceholder', 'sourceTitle', 'targetTitle', 'addTitle', 'deleteTitle', 'styleButton', 'styleTitle', 'styleHint', 'stylePlaceholder'];
const LANGS = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it', 'ar', 'hi', 'th', 'vi', 'nl', 'pl', 'tr', 'uk'];

function lookup(active, key) {
  return DICTS[active]?.[key] ?? DICTS['zh']?.[key] ?? key;
}

let failures = 0;
const rows = [];
for (const loc of LANGS) {
  const missing = [];
  const leaked = [];
  for (const key of KEYS) {
    const v = lookup(loc, key);
    if (v === undefined || v === '') missing.push(key);
    else if (v === key) leaked.push(key);
    else if (loc !== 'zh' && v === DICTS['zh'][key]) leaked.push(key + '(zh回退)');
  }
  const ok = missing.length === 0 && leaked.length === 0;
  if (!ok) failures += 1;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${loc.padEnd(3)} ${ok ? '' : '缺:' + missing.join(',') + ' 泄漏:' + leaked.join(',')}`);
}
console.log(rows.join('\n'));
console.log('---');
console.log('样例: ja.auto =', lookup('ja', 'auto'), '| uk.searchPlaceholder =', lookup('uk', 'searchPlaceholder'), '| en.styleButton =', lookup('en', 'styleButton'));
console.log(failures === 0 ? 'ALL PASS (18 locales x 10 keys)' : failures + ' LOCALES FAILED');
process.exit(failures === 0 ? 0 : 1);
