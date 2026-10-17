/**
 * dsh-plugin-translate — Client half (static local plugin bundle).
 *
 * Loaded through the web client module system (dsh.client declaration),
 * rendered under 设置 → 插件. Replaces the dynamic trsl-2 client.
 *
 * Responsibilities:
 *  - Input tool row (conversation.input.right): [源语言▾] [⇄] [目标语言▾] [风格设置▾]
 *  - Every control opens the same native menu card immediately above its own
 *    trigger (bottom: calc(100% + 4px)); target-language and style menus align
 *    to the right edge so they stay inside the window. One popup at a time per
 *    session: opening one closes the others.
 *  - Language menu: search/custom-typed entry + add button (shared by source and
 *    target), custom languages deletable, selection shown by a trailing check
 *    mark; shown only in translate-mode sessions; when "allow same" is off,
 *    source and target menus exclude each other.
 *  - Style menu: textarea auto-saves globally (no buttons); clicking inside the
 *    menu never closes it, a pointerdown outside it or Escape closes it; style
 *    presets save/apply/delete.
 *  - Settings page (settings.section): "Translation mode" — preferred source/
 *    target languages, allow same language toggle, style preset management.
 *  - i18n: locale dictionaries for all 18 plugin-listed languages (swap title,
 *    settings page and preset copy included), falling back to Chinese.
 *  - State: persistent data (cfg/custom/stylePresets) lives in the data store;
 *    open menu/dialog lives in a separate UI store keyed per session.
 *  - Settings persistence: GET /dsh-translate/settings on mount (keeps the
 *    localStorage first-paint cache when it fails), then a 300ms-debounced POST
 *    of the complete settings payload to the same host route on every change.
 */
window.__ModuleLoader__.load({
	id: "dsh-plugin-translate",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const React = react;

		const DEFAULT_CFG = { source: 'auto', target: 'auto', style: '', allowSame: true };
		const STORAGE_KEY = 'dsh.translate.mode.v4';
		const SETTINGS_URL = '/dsh-translate/settings';
		// Active UI locale reported by the client locale service; target 'auto'
		// resolves against it on the Host prompt-assembly side.
		let localeService = null;
		let hydrated = false;
		function currentLocaleId() {
			try {
				const snap = localeService && localeService.getSnapshot ? localeService.getSnapshot() : null;
				return snap && typeof snap.active === 'string' ? snap.active : '';
			} catch (e) {
				return '';
			}
		}
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
		const DICTS = {
			zh: {
				auto: '自动检测', autoTarget: '自动',
				searchPlaceholder: '搜索或输入自定义语言…',
				sourceTitle: '原语言',
				targetTitle: '目标语言',
				addTitle: '添加到语言列表（源与目标均可选）',
				deleteTitle: '删除该语言',
				styleButton: '风格设置',
				styleTitle: '翻译风格设置',
				styleHint: '修改后自动保存并全局生效。留空则使用默认风格。',
				stylePlaceholder: '例如：使用地道自然的表达，避免生硬直译；专业术语保持一致。',
				swapTitle: '交换语言',
				settingsTitle: '翻译模式',
				prefSource: '首选项源语言',
				prefTarget: '首选项目标语言',
				allowSame: '允许源和目标语言相同',
				allowSameHint: '关闭后，源语言和目标语言不能选择同一种语言。',
				stylePresetsTitle: '风格预设',
				savePreset: '保存为预设',
				presetNamePlaceholder: '预设名称…',
				applyPreset: '应用',
				deletePreset: '删除该预设',
				noPresets: '暂无预设', editPreset: '编辑预设', saveChanges: '保存修改', clearAllPresets: '清除所有预设'
			},
			en: {
				auto: 'Auto', autoTarget: 'Auto',
				searchPlaceholder: 'Search or type a custom language…',
				sourceTitle: 'Source language',
				targetTitle: 'Target language',
				addTitle: 'Add to the language list (selectable for both source and target)',
				deleteTitle: 'Delete this language',
				styleButton: 'Style settings',
				styleTitle: 'Translation style settings',
				styleHint: 'Changes are saved automatically and apply globally. Leave empty for the default style.',
				stylePlaceholder: 'e.g. Use natural, idiomatic expressions; keep technical terms consistent.',
				swapTitle: 'Swap languages',
				settingsTitle: 'Translation mode',
				prefSource: 'Preferred source language',
				prefTarget: 'Preferred target language',
				allowSame: 'Allow same source and target language',
				allowSameHint: 'When off, source and target cannot be the same language.',
				stylePresetsTitle: 'Style presets',
				savePreset: 'Save as preset',
				presetNamePlaceholder: 'Preset name…',
				applyPreset: 'Apply',
				deletePreset: 'Delete this preset',
				noPresets: 'No presets yet', editPreset: 'Edit preset', saveChanges: 'Save changes', clearAllPresets: 'Clear all presets'
			},
			ja: { auto: '自動検出', autoTarget: '自動', searchPlaceholder: '検索またはカスタム言語を入力…', sourceTitle: '元の言語', targetTitle: '翻訳先の言語', addTitle: '言語リストに追加（元・翻訳先の両方で選択可能）', deleteTitle: 'この言語を削除', styleButton: 'スタイル設定', styleTitle: '翻訳スタイル設定', styleHint: '変更は自動保存され、すべてのセッションに適用されます。空欄はデフォルトスタイル。', stylePlaceholder: '例：自然で慣用的な表現を使用し、専門用語の一貫性を保つ。', swapTitle: '言語を交換', settingsTitle: '翻訳モード', prefSource: '優先する元の言語', prefTarget: '優先する翻訳先の言語', allowSame: '元の言語と翻訳先の言語が同じでも許可', allowSameHint: 'オフにすると、元と翻訳先を同じ言語にできません。', stylePresetsTitle: 'スタイルプリセット', savePreset: 'プリセットとして保存', presetNamePlaceholder: 'プリセット名…', applyPreset: '適用', deletePreset: 'このプリセットを削除', noPresets: 'プリセットはまだありません', editPreset: 'プリセットを編集', saveChanges: '変更を保存', clearAllPresets: 'すべてのプリセットを削除' },
			ko: { auto: '자동 감지', autoTarget: '자동', searchPlaceholder: '검색 또는 사용자 지정 언어 입력…', sourceTitle: '원본 언어', targetTitle: '대상 언어', addTitle: '언어 목록에 추가 (원본/대상 모두 선택 가능)', deleteTitle: '이 언어 삭제', styleButton: '스타일 설정', styleTitle: '번역 스타일 설정', styleHint: '변경 사항은 자동 저장되며 전역에 적용됩니다. 비워 두면 기본 스타일.', stylePlaceholder: '예: 자연스럽고 관용적인 표현 사용, 전문 용어 일관성 유지.', swapTitle: '언어 교환', settingsTitle: '번역 모드', prefSource: '기본 원본 언어', prefTarget: '기본 대상 언어', allowSame: '원본 언어와 대상 언어가 같아도 허용', allowSameHint: '끄면 원본과 대상을 같은 언어로 선택할 수 없습니다.', stylePresetsTitle: '스타일 프리셋', savePreset: '프리셋으로 저장', presetNamePlaceholder: '프리셋 이름…', applyPreset: '적용', deletePreset: '이 프리셋 삭제', noPresets: '아직 프리셋 없음', editPreset: '프리셋 편집', saveChanges: '변경 저장', clearAllPresets: '모든 프리셋 지우기' },
			fr: { auto: 'Détection auto', autoTarget: 'Auto', searchPlaceholder: 'Rechercher ou saisir une langue personnalisée…', sourceTitle: 'Langue source', targetTitle: 'Langue cible', addTitle: 'Ajouter à la liste des langues (sélectionnable pour la source et la cible)', deleteTitle: 'Supprimer cette langue', styleButton: 'Paramètres de style', styleTitle: 'Paramètres du style de traduction', styleHint: "Les modifications sont enregistrées automatiquement et s'appliquent globalement. Laisser vide pour le style par défaut.", stylePlaceholder: 'Ex. : expressions naturelles et idiomatiques, terminologie cohérente.', swapTitle: 'Échanger les langues', settingsTitle: 'Mode de traduction', prefSource: 'Langue source préférée', prefTarget: 'Langue cible préférée', allowSame: 'Autoriser la même langue source et cible', allowSameHint: 'Désactivé : la source et la cible ne peuvent pas être identiques.', stylePresetsTitle: 'Préréglages de style', savePreset: 'Enregistrer comme préréglage', presetNamePlaceholder: 'Nom du préréglage…', applyPreset: 'Appliquer', deletePreset: 'Supprimer ce préréglage', noPresets: 'Aucun préréglage pour le moment', editPreset: 'Modifier le préréglage', saveChanges: 'Enregistrer les modifications', clearAllPresets: 'Effacer tous les préréglages' },
			de: { auto: 'Automatisch', autoTarget: 'Automatisch', searchPlaceholder: 'Suchen oder eigene Sprache eingeben…', sourceTitle: 'Ausgangssprache', targetTitle: 'Zielsprache', addTitle: 'Zur Sprachenliste hinzufügen (für Quelle und Ziel wählbar)', deleteTitle: 'Diese Sprache löschen', styleButton: 'Stileinstellungen', styleTitle: 'Übersetzungsstil-Einstellungen', styleHint: 'Änderungen werden automatisch gespeichert und gelten global. Leer lassen für den Standardstil.', stylePlaceholder: 'z. B. natürliche, idiomatische Ausdrücke; Fachbegriffe konsistent halten.', swapTitle: 'Sprachen tauschen', settingsTitle: 'Übersetzungsmodus', prefSource: 'Bevorzugte Ausgangssprache', prefTarget: 'Bevorzugte Zielsprache', allowSame: 'Gleiche Ausgangs- und Zielsprache erlauben', allowSameHint: 'Ausgeschaltet: Quelle und Ziel können nicht dieselbe Sprache sein.', stylePresetsTitle: 'Stilvorlagen', savePreset: 'Als Vorlage speichern', presetNamePlaceholder: 'Name der Vorlage…', applyPreset: 'Übernehmen', deletePreset: 'Diese Vorlage löschen', noPresets: 'Noch keine Vorlagen', editPreset: 'Vorlage bearbeiten', saveChanges: 'Änderungen speichern', clearAllPresets: 'Alle Vorlagen löschen' },
			es: { auto: 'Detección automática', autoTarget: 'Automático', searchPlaceholder: 'Buscar o escribir un idioma personalizado…', sourceTitle: 'Idioma de origen', targetTitle: 'Idioma de destino', addTitle: 'Añadir a la lista de idiomas (seleccionable para origen y destino)', deleteTitle: 'Eliminar este idioma', styleButton: 'Ajustes de estilo', styleTitle: 'Ajustes de estilo de traducción', styleHint: 'Los cambios se guardan automáticamente y se aplican globalmente. Déjalo vacío para el estilo predeterminado.', stylePlaceholder: 'Ej.: expresiones naturales e idiomáticas; mantener la coherencia de los términos técnicos.', swapTitle: 'Intercambiar idiomas', settingsTitle: 'Modo de traducción', prefSource: 'Idioma de origen preferido', prefTarget: 'Idioma de destino preferido', allowSame: 'Permitir el mismo idioma de origen y destino', allowSameHint: 'Desactivado: origen y destino no pueden ser el mismo idioma.', stylePresetsTitle: 'Ajustes preestablecidos de estilo', savePreset: 'Guardar como ajuste preestablecido', presetNamePlaceholder: 'Nombre del ajuste…', applyPreset: 'Aplicar', deletePreset: 'Eliminar este ajuste', noPresets: 'Aún no hay ajustes', editPreset: 'Editar ajuste', saveChanges: 'Guardar cambios', clearAllPresets: 'Borrar todos los ajustes' },
			ru: { auto: 'Автоопределение', autoTarget: 'Авто', searchPlaceholder: 'Поиск или ввод своего языка…', sourceTitle: 'Исходный язык', targetTitle: 'Целевой язык', addTitle: 'Добавить в список языков (доступен для исходного и целевого)', deleteTitle: 'Удалить этот язык', styleButton: 'Настройки стиля', styleTitle: 'Настройки стиля перевода', styleHint: 'Изменения сохраняются автоматически и применяются глобально. Оставьте пустым для стиля по умолчанию.', stylePlaceholder: 'Например: естественные идиоматические выражения, единая терминология.', swapTitle: 'Поменять языки', settingsTitle: 'Режим перевода', prefSource: 'Предпочтительный исходный язык', prefTarget: 'Предпочтительный целевой язык', allowSame: 'Разрешить одинаковые исходный и целевой языки', allowSameHint: 'При выключении исходный и целевой языки не могут совпадать.', stylePresetsTitle: 'Пресеты стиля', savePreset: 'Сохранить как пресет', presetNamePlaceholder: 'Имя пресета…', applyPreset: 'Применить', deletePreset: 'Удалить этот пресет', noPresets: 'Пока нет пресетов', editPreset: 'Изменить пресет', saveChanges: 'Сохранить изменения', clearAllPresets: 'Очистить все пресеты' },
			pt: { auto: 'Detecção automática', autoTarget: 'Automático', searchPlaceholder: 'Pesquisar ou digitar um idioma personalizado…', sourceTitle: 'Idioma de origem', targetTitle: 'Idioma de destino', addTitle: 'Adicionar à lista de idiomas (selecionável para origem e destino)', deleteTitle: 'Excluir este idioma', styleButton: 'Configurações de estilo', styleTitle: 'Configurações de estilo de tradução', styleHint: 'As alterações são salvas automaticamente e aplicadas globalmente. Deixe vazio para o estilo padrão.', stylePlaceholder: 'Ex.: expressões naturais e idiomáticas; manter a consistência dos termos técnicos.', swapTitle: 'Trocar idiomas', settingsTitle: 'Modo de tradução', prefSource: 'Idioma de origem preferido', prefTarget: 'Idioma de destino preferido', allowSame: 'Permitir o mesmo idioma de origem e destino', allowSameHint: 'Desativado: origem e destino não podem ser o mesmo idioma.', stylePresetsTitle: 'Predefinições de estilo', savePreset: 'Salvar como predefinição', presetNamePlaceholder: 'Nome da predefinição…', applyPreset: 'Aplicar', deletePreset: 'Excluir esta predefinição', noPresets: 'Ainda sem predefinições', editPreset: 'Editar predefinição', saveChanges: 'Salvar alterações', clearAllPresets: 'Limpar todas as predefinições' },
			it: { auto: 'Rilevamento automatico', autoTarget: 'Automatico', searchPlaceholder: 'Cerca o digita una lingua personalizzata…', sourceTitle: 'Lingua di partenza', targetTitle: 'Lingua di destinazione', addTitle: "Aggiungi all'elenco delle lingue (selezionabile per origine e destinazione)", deleteTitle: 'Elimina questa lingua', styleButton: 'Impostazioni stile', styleTitle: 'Impostazioni stile di traduzione', styleHint: 'Le modifiche vengono salvate automaticamente e si applicano a livello globale. Lascia vuoto per lo stile predefinito.', stylePlaceholder: 'Es.: espressioni naturali e idiomatiche; mantieni coerenti i termini tecnici.', swapTitle: 'Scambia lingue', settingsTitle: 'Modalità di traduzione', prefSource: 'Lingua di partenza preferita', prefTarget: 'Lingua di destinazione preferita', allowSame: 'Consenti stessa lingua di partenza e destinazione', allowSameHint: 'Disattivato: partenza e destinazione non possono coincidere.', stylePresetsTitle: 'Preimpostazioni di stile', savePreset: 'Salva come preimpostazione', presetNamePlaceholder: 'Nome preimpostazione…', applyPreset: 'Applica', deletePreset: 'Elimina questa preimpostazione', noPresets: 'Nessuna preimpostazione', editPreset: 'Modifica preimpostazione', saveChanges: 'Salva modifiche', clearAllPresets: 'Cancella tutte le preimpostazioni' },
			ar: { auto: 'كشف تلقائي', autoTarget: 'تلقائي', searchPlaceholder: 'ابحث أو اكتب لغة مخصصة…', sourceTitle: 'اللغة المصدر', targetTitle: 'اللغة الهدف', addTitle: 'إضافة إلى قائمة اللغات (قابلة للاختيار للمصدر والهدف)', deleteTitle: 'حذف هذه اللغة', styleButton: 'إعدادات النمط', styleTitle: 'إعدادات نمط الترجمة', styleHint: 'تُحفظ التغييرات تلقائيًا وتُطبَّق عالميًا. اتركه فارغًا للنمط الافتراضي.', stylePlaceholder: 'مثال: استخدام تعبيرات طبيعية وسلسة مع الحفاظ على اتساق المصطلحات.', swapTitle: 'تبديل اللغتين', settingsTitle: 'وضع الترجمة', prefSource: 'لغة المصدر المفضلة', prefTarget: 'لغة الهدف المفضلة', allowSame: 'السماح بنفس لغة المصدر والهدف', allowSameHint: 'عند الإيقاف، لا يمكن أن تكون المصدر والهدف بنفس اللغة.', stylePresetsTitle: 'قوالب النمط', savePreset: 'حفظ كقالب', presetNamePlaceholder: 'اسم القالب…', applyPreset: 'تطبيق', deletePreset: 'حذف هذا القالب', noPresets: 'لا توجد قوالب بعد', editPreset: 'تعديل القالب', saveChanges: 'حفظ التغييرات', clearAllPresets: 'مسح جميع القوالب' },
			hi: { auto: 'स्वतः पहचान', autoTarget: 'स्वतः', searchPlaceholder: 'खोजें या अपनी भाषा लिखें…', sourceTitle: 'स्रोत भाषा', targetTitle: 'लक्ष्य भाषा', addTitle: 'भाषा सूची में जोड़ें (स्रोत और लक्ष्य दोनों के लिए चुनने योग्य)', deleteTitle: 'यह भाषा हटाएँ', styleButton: 'शैली सेटिंग', styleTitle: 'अनुवाद शैली सेटिंग', styleHint: 'परिवर्तन स्वतः सहेजे जाते हैं और वैश्विक रूप से लागू होते हैं। डिफ़ॉल्ट शैली के लिए खाली छोड़ें।', stylePlaceholder: 'उदा: स्वाभाविक, मुहावरेदार अभिव्यक्तियाँ; तकनीकी शब्दों में स्थिरता रखें।', swapTitle: 'भाषाएँ बदलें', settingsTitle: 'अनुवाद मोड', prefSource: 'पसंदीदा स्रोत भाषा', prefTarget: 'पसंदीदा लक्ष्य भाषा', allowSame: 'स्रोत और लक्ष्य भाषा समान होने दें', allowSameHint: 'बंद होने पर स्रोत और लक्ष्य एक ही भाषा नहीं हो सकते।', stylePresetsTitle: 'शैली प्रीसेट', savePreset: 'प्रीसेट के रूप में सहेजें', presetNamePlaceholder: 'प्रीसेट का नाम…', applyPreset: 'लागू करें', deletePreset: 'यह प्रीसेट हटाएँ', noPresets: 'अभी कोई प्रीसेट नहीं', editPreset: 'प्रीसेट संपादित करें', saveChanges: 'परिवर्तन सहेजें', clearAllPresets: 'सभी प्रीसेट हटाएँ' },
			th: { auto: 'ตรวจจับอัตโนมัติ', autoTarget: 'อัตโนมัติ', searchPlaceholder: 'ค้นหาหรือพิมพ์ภาษาที่กำหนดเอง…', sourceTitle: 'ภาษาต้นทาง', targetTitle: 'ภาษาเป้าหมาย', addTitle: 'เพิ่มในรายการภาษา (เลือกได้ทั้งต้นทางและเป้าหมาย)', deleteTitle: 'ลบภาษานี้', styleButton: 'ตั้งค่ารูปแบบ', styleTitle: 'ตั้งค่ารูปแบบการแปล', styleHint: 'การเปลี่ยนแปลงจะบันทึกอัตโนมัติและมีผลทั่วโลก เว้นว่างเพื่อใช้รูปแบบเริ่มต้น', stylePlaceholder: 'เช่น ใช้สำนวนที่เป็นธรรมชาติและรักษาความสม่ำเสมอของคำศัพท์เทคนิค', swapTitle: 'สลับภาษา', settingsTitle: 'โหมดการแปล', prefSource: 'ภาษาต้นทางที่ต้องการ', prefTarget: 'ภาษาเป้าหมายที่ต้องการ', allowSame: 'อนุญาตให้ภาษาต้นทางและเป้าหมายเหมือนกัน', allowSameHint: 'เมื่อปิด ภาษาต้นทางและเป้าหมายต้องไม่เหมือนกัน', stylePresetsTitle: 'รูปแบบที่ตั้งไว้', savePreset: 'บันทึกเป็นรูปแบบ', presetNamePlaceholder: 'ชื่อรูปแบบ…', applyPreset: 'ใช้', deletePreset: 'ลบรูปแบบนี้', noPresets: 'ยังไม่มีรูปแบบ', editPreset: 'แก้ไขรูปแบบ', saveChanges: 'บันทึกการเปลี่ยนแปลง', clearAllPresets: 'ล้างรูปแบบทั้งหมด' },
			vi: { auto: 'Tự động phát hiện', autoTarget: 'Tự động', searchPlaceholder: 'Tìm kiếm hoặc nhập ngôn ngữ tùy chỉnh…', sourceTitle: 'Ngôn ngữ nguồn', targetTitle: 'Ngôn ngữ đích', addTitle: 'Thêm vào danh sách ngôn ngữ (chọn được cho cả nguồn và đích)', deleteTitle: 'Xóa ngôn ngữ này', styleButton: 'Cài đặt phong cách', styleTitle: 'Cài đặt phong cách dịch', styleHint: 'Thay đổi được lưu tự động và áp dụng toàn cục. Để trống để dùng phong cách mặc định.', stylePlaceholder: 'Ví dụ: dùng cách diễn đạt tự nhiên, giữ thuật ngữ nhất quán.', swapTitle: 'Hoán đổi ngôn ngữ', settingsTitle: 'Chế độ dịch', prefSource: 'Ngôn ngữ nguồn ưa thích', prefTarget: 'Ngôn ngữ đích ưa thích', allowSame: 'Cho phép ngôn ngữ nguồn và đích giống nhau', allowSameHint: 'Khi tắt, ngôn ngữ nguồn và đích không thể giống nhau.', stylePresetsTitle: 'Mẫu phong cách', savePreset: 'Lưu thành mẫu', presetNamePlaceholder: 'Tên mẫu…', applyPreset: 'Áp dụng', deletePreset: 'Xóa mẫu này', noPresets: 'Chưa có mẫu nào', editPreset: 'Chỉnh sửa mẫu', saveChanges: 'Lưu thay đổi', clearAllPresets: 'Xóa tất cả mẫu' },
			nl: { auto: 'Automatisch detecteren', autoTarget: 'Automatisch', searchPlaceholder: 'Zoek of typ een aangepaste taal…', sourceTitle: 'Brontaal', targetTitle: 'Doeltaal', addTitle: 'Toevoegen aan de talenlijst (selecteerbaar voor bron en doel)', deleteTitle: 'Deze taal verwijderen', styleButton: 'Stijlinstellingen', styleTitle: 'Vertaalstijlinstellingen', styleHint: 'Wijzigingen worden automatisch opgeslagen en wereldwijd toegepast. Leeg laten voor de standaardstijl.', stylePlaceholder: 'Bijv. natuurlijke, idiomatische uitdrukkingen; houd vaktermen consistent.', swapTitle: 'Talen omwisselen', settingsTitle: 'Vertaalmodus', prefSource: 'Voorkeur brontaal', prefTarget: 'Voorkeur doeltaal', allowSame: 'Zelfde bron- en doeltaal toestaan', allowSameHint: 'Uitgeschakeld: bron en doel kunnen niet dezelfde taal zijn.', stylePresetsTitle: 'Stijlpresets', savePreset: 'Opslaan als preset', presetNamePlaceholder: 'Naam van preset…', applyPreset: 'Toepassen', deletePreset: 'Deze preset verwijderen', noPresets: 'Nog geen presets', editPreset: 'Preset bewerken', saveChanges: 'Wijzigingen opslaan', clearAllPresets: 'Alle presets wissen' },
			pl: { auto: 'Automatyczne wykrywanie', autoTarget: 'Automatyczny', searchPlaceholder: 'Szukaj lub wpisz własny język…', sourceTitle: 'Język źródłowy', targetTitle: 'Język docelowy', addTitle: 'Dodaj do listy języków (wybieralny dla źródła i celu)', deleteTitle: 'Usuń ten język', styleButton: 'Ustawienia stylu', styleTitle: 'Ustawienia stylu tłumaczenia', styleHint: 'Zmiany są zapisywane automatycznie i mają zastosowanie globalnie. Pozostaw puste, aby użyć stylu domyślnego.', stylePlaceholder: 'Np. naturalne, idiomatyczne wyrażenia; zachowaj spójność terminów technicznych.', swapTitle: 'Zamień języki', settingsTitle: 'Tryb tłumaczenia', prefSource: 'Preferowany język źródłowy', prefTarget: 'Preferowany język docelowy', allowSame: 'Zezwól na ten sam język źródłowy i docelowy', allowSameHint: 'Gdy wyłączone, źródło i cel nie mogą być tym samym językiem.', stylePresetsTitle: 'Predefiniowane style', savePreset: 'Zapisz jako preset', presetNamePlaceholder: 'Nazwa presetu…', applyPreset: 'Zastosuj', deletePreset: 'Usuń ten preset', noPresets: 'Brak presetów', editPreset: 'Edytuj preset', saveChanges: 'Zapisz zmiany', clearAllPresets: 'Wyczyść wszystkie presety' },
			tr: { auto: 'Otomatik algılama', autoTarget: 'Otomatik', searchPlaceholder: 'Ara veya özel bir dil yazın…', sourceTitle: 'Kaynak dil', targetTitle: 'Hedef dil', addTitle: 'Dil listesine ekle (kaynak ve hedef için seçilebilir)', deleteTitle: 'Bu dili sil', styleButton: 'Stil ayarları', styleTitle: 'Çeviri stili ayarları', styleHint: 'Değişiklikler otomatik kaydedilir ve genel olarak uygulanır. Varsayılan stil için boş bırakın.', stylePlaceholder: 'Örn: doğal, deyimsel ifadeler; teknik terimleri tutarlı tutun.', swapTitle: 'Dilleri değiştir', settingsTitle: 'Çeviri modu', prefSource: 'Tercih edilen kaynak dil', prefTarget: 'Tercih edilen hedef dil', allowSame: 'Aynı kaynak ve hedef dile izin ver', allowSameHint: 'Kapalıyken kaynak ve hedef aynı dil olamaz.', stylePresetsTitle: 'Stil ön ayarları', savePreset: 'Ön ayar olarak kaydet', presetNamePlaceholder: 'Ön ayar adı…', applyPreset: 'Uygula', deletePreset: 'Bu ön ayarı sil', noPresets: 'Henüz ön ayar yok', editPreset: 'Ön ayarı düzenle', saveChanges: 'Değişiklikleri kaydet', clearAllPresets: 'Tüm ön ayarları temizle' },
			uk: { auto: 'Автовизначення', autoTarget: 'Авто', searchPlaceholder: 'Пошук або введення власної мови…', sourceTitle: 'Мова оригіналу', targetTitle: 'Цільова мова', addTitle: 'Додати до списку мов (доступна для оригіналу та перекладу)', deleteTitle: 'Видалити цю мову', styleButton: 'Налаштування стилю', styleTitle: 'Налаштування стилю перекладу', styleHint: 'Зміни зберігаються автоматично та застосовуються глобально. Залиште порожнім для стилю за замовчуванням.', stylePlaceholder: 'Напр.: природні, ідіоматичні вирази; зберігайте послідовність термінів.', swapTitle: 'Поміняти мови', settingsTitle: 'Режим перекладу', prefSource: 'Бажана мова оригіналу', prefTarget: 'Бажана цільова мова', allowSame: 'Дозволити однакову мову оригіналу та перекладу', allowSameHint: 'Коли вимкнено, оригінал і переклад не можуть бути однією мовою.', stylePresetsTitle: 'Пресети стилю', savePreset: 'Зберегти як пресет', presetNamePlaceholder: 'Назва пресету…', applyPreset: 'Застосувати', deletePreset: 'Видалити цей пресет', noPresets: 'Пресетів ще немає', editPreset: 'Редагувати пресет', saveChanges: 'Зберегти зміни', clearAllPresets: 'Очистити всі пресети' }
		};

		function normalizeSettings(raw) {
			const base = { cfg: { ...DEFAULT_CFG }, custom: [], stylePresets: [] };
			if (!raw || typeof raw !== 'object') return base;
			const cfg = raw.cfg && typeof raw.cfg === 'object' ? raw.cfg : raw;
			base.cfg = {
				source: typeof cfg.source === 'string' && cfg.source ? cfg.source : DEFAULT_CFG.source,
				target: typeof cfg.target === 'string' && cfg.target ? cfg.target : DEFAULT_CFG.target,
				style: typeof cfg.style === 'string' ? cfg.style : '',
				allowSame: cfg.allowSame !== false
			};
			base.custom = Array.isArray(raw.custom)
				? raw.custom.filter((c) => c && typeof c.code === 'string' && typeof c.label === 'string')
				: [];
			base.stylePresets = Array.isArray(raw.stylePresets)
				? raw.stylePresets.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.style === 'string')
				: [];
			base.uiLocale = typeof raw.uiLocale === 'string' ? raw.uiLocale : '';
			return base;
		}

		function loadCache() {
			try {
				if (typeof localStorage !== 'undefined') {
					const raw = localStorage.getItem(STORAGE_KEY);
					if (raw) return normalizeSettings(JSON.parse(raw));
				}
			} catch (e) { /* ignore */ }
			return normalizeSettings(null);
		}

		// 持久数据 store：只保存 cfg/custom/stylePresets，负责写 localStorage 缓存并 POST 回宿主。
		let data = loadCache();
		const dataSubs = new Set();
		let saveTimer = null;
		let saveSeq = 0;

		function notify(subs) {
			for (const fn of Array.from(subs)) {
				try { fn(); } catch (e) { /* ignore */ }
			}
		}

		function writeCache() {
			try {
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data.cfg, custom: data.custom, stylePresets: data.stylePresets, uiLocale: data.uiLocale }));
				}
			} catch (e) { /* ignore */ }
		}

		function settingsPayload() {
			return {
				source: data.cfg.source,
				target: data.cfg.target,
				style: data.cfg.style,
				allowSame: data.cfg.allowSame !== false,
				custom: data.custom,
				stylePresets: data.stylePresets,
				uiLocale: currentLocaleId() || data.uiLocale || ''
			};
		}

		function persistNow() {
			saveTimer = null;
			if (typeof fetch !== 'function') return;
			const seq = ++saveSeq;
			try {
				fetch(SETTINGS_URL, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(settingsPayload())
				}).then((res) => (res.ok ? res.json() : null)).then((r) => {
					// 仅在没有更新一次保存排队时回填，避免覆盖较新的本地输入。
					if (seq !== saveSeq || saveTimer) return;
					if (r && r.ok && r.settings && typeof r.settings === 'object') applyRemoteData(r.settings);
				}).catch(() => {});
			} catch (e) { /* ignore */ }
		}

		function schedulePersist() {
			if (saveTimer) clearTimeout(saveTimer);
			saveTimer = setTimeout(persistNow, 300);
		}

		function getData() { return data; }

		function setData(patch) {
			data = { ...data, ...patch };
			writeCache();
			schedulePersist();
			notify(dataSubs);
		}

		function applyRemoteData(settings) {
			data = normalizeSettings(settings);
			writeCache();
			notify(dataSubs);
		}

		function subscribeData(fn) {
			dataSubs.add(fn);
			return () => { dataSubs.delete(fn); };
		}

		function useData() { return React.useSyncExternalStore(subscribeData, getData); }

		// UI 状态 store：menu/dialog 按 uiKey（会话）隔离，不持久化。
		let ui = { menu: {}, dialog: {} };
		const uiSubs = new Set();
		function getUi() { return ui; }
		function setUiMenu(uiKey, kind) {
			// 同一会话只保留一个浮层：打开语言菜单会收起风格菜单。
			ui = { ...ui, menu: { ...ui.menu, [uiKey]: kind }, dialog: kind ? { ...ui.dialog, [uiKey]: false } : ui.dialog };
			notify(uiSubs);
		}
		function setUiDialog(uiKey, open) {
			ui = { ...ui, dialog: { ...ui.dialog, [uiKey]: open }, menu: open ? { ...ui.menu, [uiKey]: null } : ui.menu };
			notify(uiSubs);
		}
		function subscribeUi(fn) {
			uiSubs.add(fn);
			return () => { uiSubs.delete(fn); };
		}
		function useUi() { return React.useSyncExternalStore(subscribeUi, getUi); }
		function uiKeyFor(sessionId) { return sessionId ? 'session:' + String(sessionId) : 'default'; }

		const inject = ["slots", "locale"];
		function apply(ctx) {
			const locale = ctx.locale;
			localeService = locale;
			ctx.effect(() => locale.register('dsh-translate', DICTS), 'dsh-translate: dicts');
			const t = locale.bind('dsh-translate');
			function useLocaleTick() {
				return React.useSyncExternalStore(
					(fn) => locale.subscribe(fn),
					() => locale.getSnapshot()
				);
			}

			// 挂载时以宿主设置为准（GET /dsh-translate/settings）；请求失败则保留 localStorage 首屏缓存。
			ctx.effect(() => {
				let cancelled = false;
				if (typeof fetch === 'function') {
					fetch(SETTINGS_URL, { method: 'GET' })
						.then((res) => (res.ok ? res.json() : null))
						.then((r) => {
							if (cancelled) return;
							const settings = r && typeof r === 'object' && r.settings && typeof r.settings === 'object' ? r.settings : r;
							if (!settings || typeof settings !== 'object') return;
							const known = ['source', 'target', 'style', 'allowSame', 'custom', 'stylePresets'];
							if (!known.some((k) => Object.prototype.hasOwnProperty.call(settings, k))) return;
							applyRemoteData(settings);
							hydrated = true;
						})
						.catch(() => { hydrated = true; });
				}
				return () => { cancelled = true; };
			}, 'dsh-translate: settings load');

			// UI 语言变化时同步给宿主：target=auto 的规则需要知道界面语言。
			ctx.effect(() => {
				const republish = () => {
					if (!hydrated) return;
					const active = currentLocaleId();
					if (!active || active === data.uiLocale) return;
					data = { ...data, uiLocale: active };
					writeCache();
					schedulePersist();
				};
				republish();
				return locale.subscribe(republish);
			}, 'dsh-translate: ui locale');

			// 插件卸载时丢弃尚未发出的 debounce 保存。
			ctx.effect(() => () => {
				if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
			}, 'dsh-translate: settings flush');

			const CSS = [
				'.dtr-tools{display:inline-flex;align-items:center;gap:4px;min-width:0}',
				'.dtr-root{position:relative;display:inline-flex;min-width:0}',
				'.dtr-trigger{border-radius:var(--dsw-radius-sm);min-width:0;max-width:200px;height:28px;color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;background:transparent;border:none;outline:none;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex;align-items:center;gap:4px;font-family:inherit}',
				'.dtr-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
				'.dtr-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',
				'.dtr-trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}',
				'.dtr-trigger.dtr-active{color:var(--dsw-alias-brand-primary)}',
				'.dtr-trigger-label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}',
				'.dtr-chevron{flex:none;color:var(--dsw-alias-label-caption);transition:transform .12s;display:inline-flex}',
				'.dtr-chevron.dtr-open{transform:rotate(180deg)}',
				'.dtr-swap{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:transparent;border:none;border-radius:var(--dsw-radius-sm);outline:none;padding:0;display:inline-flex;align-items:center;justify-content:center}',
				'.dtr-swap:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
				'.dtr-swap:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',
				'.dtr-swap:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}',
				'.dtr-style-trigger{margin-left:8px}',
				'.dtr-menu{position:absolute;bottom:calc(100% + 4px);left:0;z-index:100;box-sizing:border-box;width:max-content;min-width:min(240px,100vw - 32px);max-width:min(360px,100vw - 32px);max-height:min(360px,100vh - 96px);border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);box-shadow:var(--dsw-elevation-prominent);border:0;padding:4px;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);overflow:hidden}',
				'.dtr-menu-down{top:calc(100% + 4px);bottom:auto}',
				'.dtr-menu-right{left:auto;right:0}',
				'.dtr-menu-searchrow{flex:0 0 auto;display:flex;align-items:center;gap:2px;margin:2px 0 3px}',
				'.dtr-menu-search{flex:1;min-width:0;border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-primary);background:transparent;border:.5px solid transparent;outline:none;padding:5px 7px;font-size:12px;line-height:18px;font-family:inherit}',
				'.dtr-menu-search:focus{border-color:var(--dsw-alias-border-l1)}',
				'.dtr-menu-search::placeholder{color:var(--dsw-alias-label-caption)}',
				'.dtr-menu-add{flex:none;width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:transparent;border:none;border-radius:50%;outline:none;padding:0;display:inline-flex;align-items:center;justify-content:center}',
				'.dtr-menu-add:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
				'.dtr-menu-add:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}',
				'.dtr-menu-add:disabled{opacity:.4;cursor:default}',
				'.dtr-menu-list{min-height:0;overflow-y:auto;display:flex;flex-direction:column}',
				'.dtr-menu-row{display:flex;align-items:center;gap:2px}',
				'.dtr-menu-item{flex:1;min-width:0;box-sizing:border-box;border-radius:var(--dsw-radius-md);min-height:34px;color:inherit;text-align:left;cursor:pointer;background:transparent;border:none;outline:none;display:flex;align-items:center;gap:6px;padding:5px 7px;font-size:13px;line-height:18px;white-space:nowrap;font-family:inherit}',
				'.dtr-menu-item:hover,.dtr-menu-item:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}',
				'.dtr-menu-item-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
				'.dtr-check{color:var(--dsw-alias-label-primary);flex:0 0 14px;display:grid;place-items:center}',
				'.dtr-check svg{width:14px;height:14px}',
				'.dtr-menu-del{flex:none;width:24px;height:24px;border:none;background:transparent;color:var(--dsw-alias-label-caption);cursor:pointer;border-radius:50%;padding:0;display:inline-flex;align-items:center;justify-content:center}',
				'.dtr-menu-del:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}',
				'.dtr-style-menu{left:auto;right:0;width:min(320px,calc(100vw - 32px));max-height:min(70vh,520px);padding:10px 12px;gap:8px;overflow-y:auto;overflow-x:hidden}',
				'.dtr-style-input{width:100%;box-sizing:border-box;min-height:96px;max-height:200px;resize:vertical;background:transparent;color:var(--dsw-alias-label-primary);border:.5px solid var(--dsw-alias-border-inverted);border-radius:var(--dsw-radius-md);outline:none;padding:6px 8px;font-size:12px;line-height:18px;font-family:inherit}',
				'.dtr-style-input:focus{border-color:var(--dsw-alias-state-business-primary)}',
				'.dtr-style-input::placeholder{color:var(--dsw-alias-label-caption)}',
				'.dtr-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
				'.dtr-presets{display:flex;flex-direction:column;gap:6px;border-top:.5px solid var(--dsw-alias-border-l2);padding-top:8px}',
				'.dtr-preset-save{display:flex;align-items:center;gap:4px}',
				'.dtr-preset-name-input{flex:1;min-width:0;color:var(--dsw-alias-label-primary);background:transparent;border:.5px solid var(--dsw-alias-border-inverted);border-radius:var(--dsw-radius-md);outline:none;padding:4px 7px;font-size:12px;line-height:18px;font-family:inherit}',
				'.dtr-preset-name-input:focus{border-color:var(--dsw-alias-state-business-primary)}',
				'.dtr-preset-name-input::placeholder{color:var(--dsw-alias-label-caption)}',
				'.dtr-preset-btn{flex:none;background:transparent;border:.5px solid var(--dsw-alias-border-inverted);border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-primary);font-size:11px;line-height:16px;padding:2px 7px;cursor:pointer;white-space:nowrap;font-family:inherit}',
				'.dtr-preset-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
				'.dtr-preset-btn:disabled{opacity:.4;cursor:default}',
				'.dtr-preset-del{flex:none;width:20px;height:20px;border:none;background:transparent;color:var(--dsw-alias-label-caption);cursor:pointer;border-radius:50%;font-size:12px;line-height:1;display:inline-flex;align-items:center;justify-content:center;padding:0}',
				'.dtr-preset-del:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}',
				'.dtr-preset-chips{display:flex;flex-wrap:wrap;gap:6px}',
				'.dtr-preset-chip{display:inline-flex;align-items:center;gap:4px;height:26px;max-width:100%;padding:0 4px 0 10px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;cursor:pointer;user-select:none;-webkit-user-select:none;border:.5px solid transparent;box-sizing:border-box}',
				'.dtr-preset-chip:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}',
				'.dtr-preset-chip.dtr-chip-active{border-color:var(--dsw-alias-brand-primary)}',
				'.dtr-preset-chip-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}',
				'.dtr-preset-chip-x{flex:none;width:16px;height:16px;border:none;border-radius:50%;background:transparent;color:var(--dsw-alias-label-caption);cursor:pointer;font-size:12px;line-height:1;display:inline-flex;align-items:center;justify-content:center;padding:0}',
				'.dtr-preset-chip-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}',
				'.dtr-preset-edit{display:flex;flex-direction:column;gap:6px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:8px}',
				'.dtr-preset-edit-style{width:100%;box-sizing:border-box;min-height:56px;max-height:120px;resize:vertical;background:transparent;color:var(--dsw-alias-label-primary);border:.5px solid var(--dsw-alias-border-inverted);border-radius:var(--dsw-radius-md);outline:none;padding:5px 8px;font-size:12px;line-height:18px;font-family:inherit}',
				'.dtr-preset-edit-style:focus{border-color:var(--dsw-alias-state-business-primary)}',
				'.dtr-preset-edit-actions{display:flex;justify-content:flex-end}',
				'.dtr-preset-clear{display:flex;justify-content:flex-end}',
				'.dtr-preset-clear-btn{color:var(--dsw-alias-state-error-primary)}',
				'.dtr-settings{display:flex;flex-direction:column;width:100%}',
				'.dtr-row{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}',
				'.dtr-rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}',
				'.dtr-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}',
				'.dtr-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}',
				'.dtr-sel{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-module-platform);height:36px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;outline:none;align-items:center;gap:12px;padding:0 14px;font-size:14px;line-height:22px;display:inline-flex}',
				'.dtr-sel:hover{background:var(--dsw-alias-interactive-bg-hover)}',
				'.dtr-block{border-bottom:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:16px 0;display:flex}',
				'.dtr-toggle{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;border:0;border-radius:999px;background:var(--dsw-alias-border-l3);cursor:pointer}',
				'.dtr-toggle.dtr-on{background:var(--dsw-alias-brand-primary)}',
				'.dtr-toggle:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
				'.dtr-toggle-knob{display:block;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-switch-thumb);transition:transform .12s ease}',
				'.dtr-toggle.dtr-on .dtr-toggle-knob{background:var(--dsw-alias-label-primary-foreground);transform:translate(16px)}',
			].join('\n');

			ctx.effect(() => {
				const style = document.createElement('style');
				style.dataset.plugin = 'dsh-plugin-translate';
				style.dataset.pluginCss = 'dsh-plugin-translate/styles';
				style.textContent = CSS;
				document.head.appendChild(style);
				return () => {
					style.remove();
				};
			}, 'dsh-translate: styles');

			function useCfgGuard() {
				const s = useData();
				React.useEffect(() => {
					if (s.cfg.allowSame === false && s.cfg.source !== 'auto' && s.cfg.source === s.cfg.target) {
						setData({ cfg: { ...s.cfg, source: 'auto' } });
					}
				}, [s.cfg.allowSame, s.cfg.source, s.cfg.target]);
			}

			function LangMenu({ kind, variant, sessionId, uiKey }) {
				const s = useData();
				const cfg = s.cfg;
				const custom = s.custom;
				const ui = useUi();
				useLocaleTick();
				useCfgGuard();
				const rootRef = React.useRef(null);
				const menuKey = uiKey || uiKeyFor(sessionId);
				const open = ui.menu[menuKey] === kind;
				const [query, setQuery] = React.useState('');
				React.useEffect(() => {
					if (open) setQuery('');
				}, [open]);
				React.useEffect(() => {
					if (!open) return;
					const closeOutside = (e) => {
						if (rootRef.current && !rootRef.current.contains(e.target)) setUiMenu(menuKey, null);
					};
					const onKey = (e) => { if (e.key === 'Escape') setUiMenu(menuKey, null); };
					document.addEventListener('mousedown', closeOutside);
					document.addEventListener('keydown', onKey);
					return () => {
						document.removeEventListener('mousedown', closeOutside);
						document.removeEventListener('keydown', onKey);
					};
				}, [open, menuKey]);
				const allOptions = kind === 'source'
					? [{ code: 'auto', label: t('auto') }, ...LANGS, ...custom]
					: [{ code: 'auto', label: t('autoTarget') }, ...LANGS, ...custom];
				const current = kind === 'source' ? cfg.source : cfg.target;
				const other = kind === 'source' ? cfg.target : cfg.source;
				const options = cfg.allowSame === false && other !== 'auto'
					? allOptions.filter((l) => l.code !== other)
					: allOptions;
				const label = (options.find((l) => l.code === current) || options[0] || allOptions[0]).label;
				const q = query.trim().toLowerCase();
				const filtered = q === '' ? options : options.filter((l) => l.label.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
				const exists = options.some((l) => l.code.toLowerCase() === q || l.label.toLowerCase() === q);
				const canAdd = q !== '' && !exists;
				const addCustom = () => {
					if (!canAdd) return;
					const name = query.trim();
					setData({
						custom: [...custom, { code: name, label: name }],
						cfg: { ...cfg, [kind === 'source' ? 'source' : 'target']: name }
					});
					setUiMenu(menuKey, null);
				};
				const removeCustom = (code) => {
					const nextCustom = custom.filter((c) => c.code !== code);
					const nextCfg = { ...cfg };
					if (nextCfg.source === code) nextCfg.source = 'auto';
					if (nextCfg.target === code) nextCfg.target = 'en';
					setData({ custom: nextCustom, cfg: nextCfg });
				};
				const pick = (code) => {
					setData({ cfg: { ...cfg, [kind === 'source' ? 'source' : 'target']: code } });
					setUiMenu(menuKey, null);
				};
				return React.createElement('div', { ref: rootRef, className: 'dtr-root' },
					React.createElement('button', {
						type: 'button',
						className: variant === 'settings' ? 'dtr-sel' : 'dtr-trigger',
						title: kind === 'source' ? t('sourceTitle') : t('targetTitle'),
						'aria-haspopup': 'menu',
						'aria-expanded': open,
						onClick: () => setUiMenu(menuKey, open ? null : kind)
					},
						React.createElement('span', { className: 'dtr-trigger-label' }, label),
						React.createElement('svg', { className: 'dtr-chevron' + (open ? ' dtr-open' : ''), viewBox: '0 0 12 12', width: '12', height: '12', 'aria-hidden': true },
							React.createElement('path', { d: 'M3 4.5L6 7.5L9 4.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' })
						)
					),
					open ? React.createElement('div', { role: 'menu', 'aria-label': kind === 'source' ? t('sourceTitle') : t('targetTitle'), className: 'dtr-menu' + (variant === 'settings' ? ' dtr-menu-down' : '') + (variant === 'settings' || kind === 'target' ? ' dtr-menu-right' : '') },
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
							}, React.createElement('svg', { viewBox: '0 0 14 14', width: 14, height: 14, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' },
								React.createElement('path', { d: 'M7 3v8M3 7h8' })
							))
						),
						React.createElement('div', { className: 'dtr-menu-list' },
							filtered.map((l) => {
								const selected = l.code === current;
								const isCustom = custom.some((c) => c.code === l.code);
								return React.createElement('div', { key: l.code, className: 'dtr-menu-row' },
									React.createElement('button', {
										type: 'button',
										role: 'menuitem',
										className: 'dtr-menu-item' + (selected ? ' dtr-selected' : ''),
										onClick: () => pick(l.code)
									},
										React.createElement('span', { className: 'dtr-menu-item-label' }, l.label),
										selected ? React.createElement('span', { className: 'dtr-check' },
											React.createElement('svg', { viewBox: '0 0 14 14', width: 14, height: 14, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
												React.createElement('path', { d: 'M2.5 7.5l3 3 6-7' })
											)
										) : null
									),
									isCustom ? React.createElement('button', {
										type: 'button',
										className: 'dtr-menu-del',
										title: t('deleteTitle'),
										onClick: (e) => { e.stopPropagation(); removeCustom(l.code); }
									}, React.createElement('svg', { viewBox: '0 0 12 12', width: 12, height: 12, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' },
										React.createElement('path', { d: 'M3 3l6 6M9 3l-6 6' })
									)) : null
								);
							})
						)
					) : null
				);
			}

			function StylePresets({ variant }) {
				const s = useData();
				useLocaleTick();
				const presets = s.stylePresets || [];
				const [name, setName] = React.useState('');
				const [editId, setEditId] = React.useState(null);
				const [editName, setEditName] = React.useState('');
				const [editStyle, setEditStyle] = React.useState('');
				const startEdit = (p) => {
					setEditId(p.id);
					setEditName(p.name);
					setEditStyle(p.style);
				};
				const saveEdit = () => {
					if (!editName.trim()) return;
					const cur = getData();
					const list = (cur.stylePresets || []).map((p) => p.id === editId ? { ...p, name: editName.trim(), style: editStyle } : p);
					setData({ stylePresets: list });
					setEditId(null);
				};
				const clearAll = () => {
					setData({ stylePresets: [] });
					setEditId(null);
				};
				const savePreset = () => {
					const n = name.trim();
					if (!n) return;
					const cur = getData();
					const list = [...(cur.stylePresets || [])];
					const idx = list.findIndex((p) => p.name === n);
					if (idx >= 0) list[idx] = { ...list[idx], style: cur.cfg.style };
					else list.push({ id: 'dsp-' + Date.now().toString(36), name: n, style: cur.cfg.style });
					setData({ stylePresets: list });
					setName('');
				};
				const applyPreset = (p) => {
					const cur = getData();
					if (p.style !== cur.cfg.style) setData({ cfg: { ...cur.cfg, style: p.style } });
				};
				const removePreset = (id) => {
					const cur = getData();
					setData({ stylePresets: (cur.stylePresets || []).filter((p) => p.id !== id) });
				};
				const saveRow = React.createElement('div', { className: 'dtr-preset-save' },
					React.createElement('input', {
						className: 'dtr-preset-name-input',
						value: name,
						placeholder: t('presetNamePlaceholder'),
						onChange: (e) => setName(e.target.value),
						onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); savePreset(); } }
					}),
					React.createElement('button', {
						type: 'button',
						className: 'dtr-preset-btn',
						disabled: !name.trim(),
						onClick: savePreset
					}, t('savePreset'))
				);
				if (variant === 'chips') {
					// 风格面板内：保存输入框在上，预设为横向胶囊（预设名即按钮，点击应用，× 删除）
					return React.createElement('div', { className: 'dtr-presets' },
						saveRow,
						presets.length === 0
							? React.createElement('div', { className: 'dtr-desc' }, t('noPresets'))
							: React.createElement('div', { className: 'dtr-preset-chips' },
								presets.map((p) => React.createElement('span', {
									key: p.id,
									className: 'dtr-preset-chip' + (s.cfg.style !== '' && p.style === s.cfg.style ? ' dtr-chip-active' : ''),
									title: p.style,
									onClick: () => applyPreset(p)
								},
									React.createElement('span', { className: 'dtr-preset-chip-name' }, p.name),
									React.createElement('button', {
										type: 'button',
										className: 'dtr-preset-chip-x',
										title: t('deletePreset'),
										onClick: (e) => { e.stopPropagation(); removePreset(p.id); }
									}, '×')
								))
							)
					);
				}
				// 设置页内：预设为胶囊（点击选中编辑，× 删除）+ 编辑区（保存修改）+ 清除所有预设
				const selected = presets.find((p) => p.id === editId) || null;
				return React.createElement('div', { className: 'dtr-presets' },
					presets.length === 0
						? React.createElement('div', { className: 'dtr-desc' }, t('noPresets'))
						: React.createElement('div', { className: 'dtr-preset-chips' },
							presets.map((p) => React.createElement('span', {
								key: p.id,
								className: 'dtr-preset-chip' + (p.id === editId ? ' dtr-chip-active' : ''),
								title: p.style,
								onClick: () => startEdit(p)
							},
								React.createElement('span', { className: 'dtr-preset-chip-name' }, p.name),
								React.createElement('button', {
									type: 'button',
									className: 'dtr-preset-chip-x',
									title: t('deletePreset'),
									onClick: (e) => {
										e.stopPropagation();
										removePreset(p.id);
										if (p.id === editId) setEditId(null);
									}
								}, '×')
							))
						),
					selected
						? React.createElement('div', { className: 'dtr-preset-edit' },
							React.createElement('div', { className: 'dtr-desc' }, t('editPreset')),
							React.createElement('input', {
								className: 'dtr-preset-name-input',
								value: editName,
								placeholder: t('presetNamePlaceholder'),
								onChange: (e) => setEditName(e.target.value)
							}),
							React.createElement('textarea', {
								className: 'dtr-preset-edit-style',
								value: editStyle,
								placeholder: t('stylePlaceholder'),
								onChange: (e) => setEditStyle(e.target.value)
							}),
							React.createElement('div', { className: 'dtr-preset-edit-actions' },
								React.createElement('button', {
									type: 'button',
									className: 'dtr-preset-btn',
									disabled: !editName.trim(),
									onClick: saveEdit
								}, t('saveChanges'))
							)
						)
						: null,
					React.createElement('div', { className: 'dtr-preset-clear' },
						React.createElement('button', {
							type: 'button',
							className: 'dtr-preset-btn dtr-preset-clear-btn',
							disabled: presets.length === 0,
							onClick: clearAll
						}, t('clearAllPresets'))
					)
				);
			}

			function TranslateControls(props) {
				const s = useData();
				const cfg = s.cfg;
				useLocaleTick();
				useCfgGuard();
				const sessionId = props.sessionId;
				const uiKey = uiKeyFor(sessionId);
				const useSessions = props.useSessions || (() => undefined);
				const presetId = useSessions((snap) => {
					if (!sessionId) return undefined;
					const value = snap.byId[sessionId]?.projectionValues?.agentPreset;
					return typeof value === 'string' ? value : undefined;
				});
				const active = presetId === 'translate';
				if (!active) return null;
				const sourceAuto = cfg.source === 'auto';
				const swapProps = sourceAuto
					? { disabled: true }
					: { disabled: false, title: t('swapTitle') };
				return React.createElement('div', { className: 'dtr-tools' },
					React.createElement(LangMenu, { kind: 'source', sessionId, uiKey }),
					React.createElement('button', {
						type: 'button',
						className: 'dtr-swap',
						...swapProps,
						onClick: () => setData({ cfg: { ...cfg, source: cfg.target, target: cfg.source } })
					}, React.createElement('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
						React.createElement('path', { d: 'M3 5.5h8.5M9.5 3.5l2 2-2 2' }),
						React.createElement('path', { d: 'M13 10.5H4.5M6.5 8.5l-2 2 2 2' })
					)),
					React.createElement(LangMenu, { kind: 'target', sessionId, uiKey }),
					React.createElement(StyleMenu, { sessionId, uiKey })
				);
			}

			function StyleMenu({ sessionId, uiKey }) {
				const s = useData();
				const ui = useUi();
				useLocaleTick();
				const open = !!ui.dialog[uiKey];
				// 当前风格正好等于某个具名预设时，触发器显示该预设名而不是「风格设置」。
				const activePreset = s.cfg.style === ''
					? null
					: (s.stylePresets || []).find((p) => p && p.style === s.cfg.style) || null;
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
					const cur = getData();
					const style = draftRef.current.trim();
					if (style !== cur.cfg.style) setData({ cfg: { ...cur.cfg, style } });
				}, []);
				const commit = (close) => {
					if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
					const cur = getData();
					const style = draftRef.current.trim();
					if (style !== cur.cfg.style) setData({ cfg: { ...cur.cfg, style } });
					if (close) setUiDialog(uiKey, false);
				};
				const onDraft = (e) => {
					const value = e.target.value;
					draftRef.current = value;
					setDraft(value);
					if (timerRef.current) clearTimeout(timerRef.current);
					timerRef.current = setTimeout(() => commit(false), 300);
				};
				// 与语言菜单一致：浮层内点击不关闭，浮层外 pointerdown 或 Escape 关闭。
				React.useEffect(() => {
					if (!open) return;
					const onPointerDown = (ev) => {
						if (!(ev.target instanceof Node)) return;
						if (rootRef.current && rootRef.current.contains(ev.target)) return;
						commit(true);
					};
					const onKey = (e) => { if (e.key === 'Escape') commit(true); };
					document.addEventListener('pointerdown', onPointerDown, true);
					document.addEventListener('keydown', onKey);
					return () => {
						document.removeEventListener('pointerdown', onPointerDown, true);
						document.removeEventListener('keydown', onKey);
					};
				}, [open]);
				return React.createElement('div', { ref: rootRef, className: 'dtr-root' },
					React.createElement('button', {
						type: 'button',
						className: 'dtr-trigger dtr-style-trigger' + (open ? ' dtr-active' : ''),
						title: t('styleTitle'),
						'aria-expanded': open,
						'aria-haspopup': 'dialog',
						onClick: () => (open ? commit(true) : setUiDialog(uiKey, true))
					},
						React.createElement('span', { className: 'dtr-trigger-label' }, activePreset ? activePreset.name : t('styleButton')),
						React.createElement('svg', { className: 'dtr-chevron' + (open ? ' dtr-open' : ''), viewBox: '0 0 12 12', width: '12', height: '12', 'aria-hidden': true },
							React.createElement('path', { d: 'M3 4.5L6 7.5L9 4.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' })
						)
					),
					open ? React.createElement('div', { className: 'dtr-menu dtr-style-menu' },
						React.createElement('textarea', {
							className: 'dtr-style-input',
							autoFocus: true,
							value: draft,
							onChange: onDraft,
							placeholder: t('stylePlaceholder')
						}),
						React.createElement('div', { className: 'dtr-hint' }, t('styleHint')),
						React.createElement(StylePresets, { variant: 'chips' })
					) : null
				);
			}
			function SettingsPage(props) {
				const s = useData();
				const cfg = s.cfg;
				useLocaleTick();
				useCfgGuard();
				return React.createElement('div', { className: 'dtr-settings' },
					React.createElement('div', { className: 'dtr-row' },
						React.createElement('div', { className: 'dtr-rowText' },
							React.createElement('div', { className: 'dtr-title' }, t('prefSource'))
						),
						React.createElement(LangMenu, { kind: 'source', variant: 'settings', uiKey: 'settings' })
					),
					React.createElement('div', { className: 'dtr-row' },
						React.createElement('div', { className: 'dtr-rowText' },
							React.createElement('div', { className: 'dtr-title' }, t('prefTarget'))
						),
						React.createElement(LangMenu, { kind: 'target', variant: 'settings', uiKey: 'settings' })
					),
					React.createElement('div', { className: 'dtr-row' },
						React.createElement('div', { className: 'dtr-rowText' },
							React.createElement('div', { className: 'dtr-title' }, t('allowSame')),
							React.createElement('div', { className: 'dtr-desc' }, t('allowSameHint'))
						),
						React.createElement('button', {
							type: 'button',
							className: 'dtr-toggle' + (cfg.allowSame !== false ? ' dtr-on' : ''),
							role: 'switch',
							'aria-checked': cfg.allowSame !== false,
							title: t('allowSame'),
							onClick: () => setData({ cfg: { ...cfg, allowSame: cfg.allowSame === false } })
						},
							React.createElement('span', { className: 'dtr-toggle-knob' })
						)
					),
					React.createElement('div', { className: 'dtr-block' },
						React.createElement('div', { className: 'dtr-title' }, t('stylePresetsTitle')),
						React.createElement(StylePresets, null)
					)
				);
			}

			ctx.effect(() => ctx.slots.inject('conversation.input.right', () => ctx.slots.register({ name: 'conversation.input.right', id: 'translate-mode', order: 0, label: () => t('settingsTitle') }, TranslateControls)), 'dsh-translate: tools');
			ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'translate-settings', order: 80, label: () => t('settingsTitle') }, SettingsPage)), 'dsh-translate: settings page');
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
