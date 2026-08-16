/**
 * dsh-plugin-translate — Client half (static local plugin bundle).
 *
 * Loaded through the web client module system (dsh.client declaration),
 * rendered under 设置 → 插件. Replaces the dynamic trsl-2 client.
 *
 * Responsibilities:
 *  - Input tool row (conversation.input.right): [源语言▾] [⇄] [目标语言▾] [风格设置]
 *  - Language menu: anchored in place, search/custom-typed entry + add button
 *    (shared by source and target), custom languages deletable, selected row
 *    persistently highlighted; shown only in translate-mode sessions; when
 *    "allow same" is off, source and target menus exclude each other.
 *  - Style panel (conversation.input.overlay, anchored top-left of the input):
 *    mutually exclusive with the +/slash menus, not dismissed by clicking the
 *    input, dismissed when typing starts, auto-saved globally (no buttons);
 *    style presets save/apply/delete.
 *  - Settings page (settings.section): "Translation mode" — preferred source/
 *    target languages, allow same language toggle, style preset management.
 *  - i18n: locale dictionaries for all 18 plugin-listed languages (swap title,
 *    settings page and preset copy included), falling back to Chinese.
 *  - Settings persistence: POSTs to /dsh-translate/settings (host route).
 */
window.__ModuleLoader__.load({
	id: "dsh-plugin-translate",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const React = react;

		const DEFAULT_CFG = { source: 'auto', target: 'en', style: '', allowSame: true };
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
				noPresets: '暂无预设'
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
				noPresets: 'No presets yet'
			},
			ja: { auto: '自動検出', searchPlaceholder: '検索またはカスタム言語を入力…', sourceTitle: '元の言語', targetTitle: '翻訳先の言語', addTitle: '言語リストに追加（元・翻訳先の両方で選択可能）', deleteTitle: 'この言語を削除', styleButton: 'スタイル設定', styleTitle: '翻訳スタイル設定', styleHint: '変更は自動保存され、すべてのセッションに適用されます。空欄はデフォルトスタイル。', stylePlaceholder: '例：自然で慣用的な表現を使用し、専門用語の一貫性を保つ。', swapTitle: '言語を交換', settingsTitle: '翻訳モード', prefSource: '優先する元の言語', prefTarget: '優先する翻訳先の言語', allowSame: '元の言語と翻訳先の言語が同じでも許可', allowSameHint: 'オフにすると、元と翻訳先を同じ言語にできません。', stylePresetsTitle: 'スタイルプリセット', savePreset: 'プリセットとして保存', presetNamePlaceholder: 'プリセット名…', applyPreset: '適用', deletePreset: 'このプリセットを削除', noPresets: 'プリセットはまだありません' },
			ko: { auto: '자동 감지', searchPlaceholder: '검색 또는 사용자 지정 언어 입력…', sourceTitle: '원본 언어', targetTitle: '대상 언어', addTitle: '언어 목록에 추가 (원본/대상 모두 선택 가능)', deleteTitle: '이 언어 삭제', styleButton: '스타일 설정', styleTitle: '번역 스타일 설정', styleHint: '변경 사항은 자동 저장되며 전역에 적용됩니다. 비워 두면 기본 스타일.', stylePlaceholder: '예: 자연스럽고 관용적인 표현 사용, 전문 용어 일관성 유지.', swapTitle: '언어 교환', settingsTitle: '번역 모드', prefSource: '기본 원본 언어', prefTarget: '기본 대상 언어', allowSame: '원본 언어와 대상 언어가 같아도 허용', allowSameHint: '끄면 원본과 대상을 같은 언어로 선택할 수 없습니다.', stylePresetsTitle: '스타일 프리셋', savePreset: '프리셋으로 저장', presetNamePlaceholder: '프리셋 이름…', applyPreset: '적용', deletePreset: '이 프리셋 삭제', noPresets: '아직 프리셋 없음' },
			fr: { auto: 'Détection auto', searchPlaceholder: 'Rechercher ou saisir une langue personnalisée…', sourceTitle: 'Langue source', targetTitle: 'Langue cible', addTitle: 'Ajouter à la liste des langues (sélectionnable pour la source et la cible)', deleteTitle: 'Supprimer cette langue', styleButton: 'Paramètres de style', styleTitle: 'Paramètres du style de traduction', styleHint: "Les modifications sont enregistrées automatiquement et s'appliquent globalement. Laisser vide pour le style par défaut.", stylePlaceholder: 'Ex. : expressions naturelles et idiomatiques, terminologie cohérente.', swapTitle: 'Échanger les langues', settingsTitle: 'Mode de traduction', prefSource: 'Langue source préférée', prefTarget: 'Langue cible préférée', allowSame: 'Autoriser la même langue source et cible', allowSameHint: 'Désactivé : la source et la cible ne peuvent pas être identiques.', stylePresetsTitle: 'Préréglages de style', savePreset: 'Enregistrer comme préréglage', presetNamePlaceholder: 'Nom du préréglage…', applyPreset: 'Appliquer', deletePreset: 'Supprimer ce préréglage', noPresets: 'Aucun préréglage pour le moment' },
			de: { auto: 'Automatisch', searchPlaceholder: 'Suchen oder eigene Sprache eingeben…', sourceTitle: 'Ausgangssprache', targetTitle: 'Zielsprache', addTitle: 'Zur Sprachenliste hinzufügen (für Quelle und Ziel wählbar)', deleteTitle: 'Diese Sprache löschen', styleButton: 'Stileinstellungen', styleTitle: 'Übersetzungsstil-Einstellungen', styleHint: 'Änderungen werden automatisch gespeichert und gelten global. Leer lassen für den Standardstil.', stylePlaceholder: 'z. B. natürliche, idiomatische Ausdrücke; Fachbegriffe konsistent halten.', swapTitle: 'Sprachen tauschen', settingsTitle: 'Übersetzungsmodus', prefSource: 'Bevorzugte Ausgangssprache', prefTarget: 'Bevorzugte Zielsprache', allowSame: 'Gleiche Ausgangs- und Zielsprache erlauben', allowSameHint: 'Ausgeschaltet: Quelle und Ziel können nicht dieselbe Sprache sein.', stylePresetsTitle: 'Stilvorlagen', savePreset: 'Als Vorlage speichern', presetNamePlaceholder: 'Name der Vorlage…', applyPreset: 'Übernehmen', deletePreset: 'Diese Vorlage löschen', noPresets: 'Noch keine Vorlagen' },
			es: { auto: 'Detección automática', searchPlaceholder: 'Buscar o escribir un idioma personalizado…', sourceTitle: 'Idioma de origen', targetTitle: 'Idioma de destino', addTitle: 'Añadir a la lista de idiomas (seleccionable para origen y destino)', deleteTitle: 'Eliminar este idioma', styleButton: 'Ajustes de estilo', styleTitle: 'Ajustes de estilo de traducción', styleHint: 'Los cambios se guardan automáticamente y se aplican globalmente. Déjalo vacío para el estilo predeterminado.', stylePlaceholder: 'Ej.: expresiones naturales e idiomáticas; mantener la coherencia de los términos técnicos.', swapTitle: 'Intercambiar idiomas', settingsTitle: 'Modo de traducción', prefSource: 'Idioma de origen preferido', prefTarget: 'Idioma de destino preferido', allowSame: 'Permitir el mismo idioma de origen y destino', allowSameHint: 'Desactivado: origen y destino no pueden ser el mismo idioma.', stylePresetsTitle: 'Ajustes preestablecidos de estilo', savePreset: 'Guardar como ajuste preestablecido', presetNamePlaceholder: 'Nombre del ajuste…', applyPreset: 'Aplicar', deletePreset: 'Eliminar este ajuste', noPresets: 'Aún no hay ajustes' },
			ru: { auto: 'Автоопределение', searchPlaceholder: 'Поиск или ввод своего языка…', sourceTitle: 'Исходный язык', targetTitle: 'Целевой язык', addTitle: 'Добавить в список языков (доступен для исходного и целевого)', deleteTitle: 'Удалить этот язык', styleButton: 'Настройки стиля', styleTitle: 'Настройки стиля перевода', styleHint: 'Изменения сохраняются автоматически и применяются глобально. Оставьте пустым для стиля по умолчанию.', stylePlaceholder: 'Например: естественные идиоматические выражения, единая терминология.', swapTitle: 'Поменять языки', settingsTitle: 'Режим перевода', prefSource: 'Предпочтительный исходный язык', prefTarget: 'Предпочтительный целевой язык', allowSame: 'Разрешить одинаковые исходный и целевой языки', allowSameHint: 'При выключении исходный и целевой языки не могут совпадать.', stylePresetsTitle: 'Пресеты стиля', savePreset: 'Сохранить как пресет', presetNamePlaceholder: 'Имя пресета…', applyPreset: 'Применить', deletePreset: 'Удалить этот пресет', noPresets: 'Пока нет пресетов' },
			pt: { auto: 'Detecção automática', searchPlaceholder: 'Pesquisar ou digitar um idioma personalizado…', sourceTitle: 'Idioma de origem', targetTitle: 'Idioma de destino', addTitle: 'Adicionar à lista de idiomas (selecionável para origem e destino)', deleteTitle: 'Excluir este idioma', styleButton: 'Configurações de estilo', styleTitle: 'Configurações de estilo de tradução', styleHint: 'As alterações são salvas automaticamente e aplicadas globalmente. Deixe vazio para o estilo padrão.', stylePlaceholder: 'Ex.: expressões naturais e idiomáticas; manter a consistência dos termos técnicos.', swapTitle: 'Trocar idiomas', settingsTitle: 'Modo de tradução', prefSource: 'Idioma de origem preferido', prefTarget: 'Idioma de destino preferido', allowSame: 'Permitir o mesmo idioma de origem e destino', allowSameHint: 'Desativado: origem e destino não podem ser o mesmo idioma.', stylePresetsTitle: 'Predefinições de estilo', savePreset: 'Salvar como predefinição', presetNamePlaceholder: 'Nome da predefinição…', applyPreset: 'Aplicar', deletePreset: 'Excluir esta predefinição', noPresets: 'Ainda sem predefinições' },
			it: { auto: 'Rilevamento automatico', searchPlaceholder: 'Cerca o digita una lingua personalizzata…', sourceTitle: 'Lingua di partenza', targetTitle: 'Lingua di destinazione', addTitle: "Aggiungi all'elenco delle lingue (selezionabile per origine e destinazione)", deleteTitle: 'Elimina questa lingua', styleButton: 'Impostazioni stile', styleTitle: 'Impostazioni stile di traduzione', styleHint: 'Le modifiche vengono salvate automaticamente e si applicano a livello globale. Lascia vuoto per lo stile predefinito.', stylePlaceholder: 'Es.: espressioni naturali e idiomatiche; mantieni coerenti i termini tecnici.', swapTitle: 'Scambia lingue', settingsTitle: 'Modalità di traduzione', prefSource: 'Lingua di partenza preferita', prefTarget: 'Lingua di destinazione preferita', allowSame: 'Consenti stessa lingua di partenza e destinazione', allowSameHint: 'Disattivato: partenza e destinazione non possono coincidere.', stylePresetsTitle: 'Preimpostazioni di stile', savePreset: 'Salva come preimpostazione', presetNamePlaceholder: 'Nome preimpostazione…', applyPreset: 'Applica', deletePreset: 'Elimina questa preimpostazione', noPresets: 'Nessuna preimpostazione' },
			ar: { auto: 'كشف تلقائي', searchPlaceholder: 'ابحث أو اكتب لغة مخصصة…', sourceTitle: 'اللغة المصدر', targetTitle: 'اللغة الهدف', addTitle: 'إضافة إلى قائمة اللغات (قابلة للاختيار للمصدر والهدف)', deleteTitle: 'حذف هذه اللغة', styleButton: 'إعدادات النمط', styleTitle: 'إعدادات نمط الترجمة', styleHint: 'تُحفظ التغييرات تلقائيًا وتُطبَّق عالميًا. اتركه فارغًا للنمط الافتراضي.', stylePlaceholder: 'مثال: استخدام تعبيرات طبيعية وسلسة مع الحفاظ على اتساق المصطلحات.', swapTitle: 'تبديل اللغتين', settingsTitle: 'وضع الترجمة', prefSource: 'لغة المصدر المفضلة', prefTarget: 'لغة الهدف المفضلة', allowSame: 'السماح بنفس لغة المصدر والهدف', allowSameHint: 'عند الإيقاف، لا يمكن أن تكون المصدر والهدف بنفس اللغة.', stylePresetsTitle: 'قوالب النمط', savePreset: 'حفظ كقالب', presetNamePlaceholder: 'اسم القالب…', applyPreset: 'تطبيق', deletePreset: 'حذف هذا القالب', noPresets: 'لا توجد قوالب بعد' },
			hi: { auto: 'स्वतः पहचान', searchPlaceholder: 'खोजें या अपनी भाषा लिखें…', sourceTitle: 'स्रोत भाषा', targetTitle: 'लक्ष्य भाषा', addTitle: 'भाषा सूची में जोड़ें (स्रोत और लक्ष्य दोनों के लिए चुनने योग्य)', deleteTitle: 'यह भाषा हटाएँ', styleButton: 'शैली सेटिंग', styleTitle: 'अनुवाद शैली सेटिंग', styleHint: 'परिवर्तन स्वतः सहेजे जाते हैं और वैश्विक रूप से लागू होते हैं। डिफ़ॉल्ट शैली के लिए खाली छोड़ें।', stylePlaceholder: 'उदा: स्वाभाविक, मुहावरेदार अभिव्यक्तियाँ; तकनीकी शब्दों में स्थिरता रखें।', swapTitle: 'भाषाएँ बदलें', settingsTitle: 'अनुवाद मोड', prefSource: 'पसंदीदा स्रोत भाषा', prefTarget: 'पसंदीदा लक्ष्य भाषा', allowSame: 'स्रोत और लक्ष्य भाषा समान होने दें', allowSameHint: 'बंद होने पर स्रोत और लक्ष्य एक ही भाषा नहीं हो सकते।', stylePresetsTitle: 'शैली प्रीसेट', savePreset: 'प्रीसेट के रूप में सहेजें', presetNamePlaceholder: 'प्रीसेट का नाम…', applyPreset: 'लागू करें', deletePreset: 'यह प्रीसेट हटाएँ', noPresets: 'अभी कोई प्रीसेट नहीं' },
			th: { auto: 'ตรวจจับอัตโนมัติ', searchPlaceholder: 'ค้นหาหรือพิมพ์ภาษาที่กำหนดเอง…', sourceTitle: 'ภาษาต้นทาง', targetTitle: 'ภาษาเป้าหมาย', addTitle: 'เพิ่มในรายการภาษา (เลือกได้ทั้งต้นทางและเป้าหมาย)', deleteTitle: 'ลบภาษานี้', styleButton: 'ตั้งค่ารูปแบบ', styleTitle: 'ตั้งค่ารูปแบบการแปล', styleHint: 'การเปลี่ยนแปลงจะบันทึกอัตโนมัติและมีผลทั่วโลก เว้นว่างเพื่อใช้รูปแบบเริ่มต้น', stylePlaceholder: 'เช่น ใช้สำนวนที่เป็นธรรมชาติและรักษาความสม่ำเสมอของคำศัพท์เทคนิค', swapTitle: 'สลับภาษา', settingsTitle: 'โหมดการแปล', prefSource: 'ภาษาต้นทางที่ต้องการ', prefTarget: 'ภาษาเป้าหมายที่ต้องการ', allowSame: 'อนุญาตให้ภาษาต้นทางและเป้าหมายเหมือนกัน', allowSameHint: 'เมื่อปิด ภาษาต้นทางและเป้าหมายต้องไม่เหมือนกัน', stylePresetsTitle: 'รูปแบบที่ตั้งไว้', savePreset: 'บันทึกเป็นรูปแบบ', presetNamePlaceholder: 'ชื่อรูปแบบ…', applyPreset: 'ใช้', deletePreset: 'ลบรูปแบบนี้', noPresets: 'ยังไม่มีรูปแบบ' },
			vi: { auto: 'Tự động phát hiện', searchPlaceholder: 'Tìm kiếm hoặc nhập ngôn ngữ tùy chỉnh…', sourceTitle: 'Ngôn ngữ nguồn', targetTitle: 'Ngôn ngữ đích', addTitle: 'Thêm vào danh sách ngôn ngữ (chọn được cho cả nguồn và đích)', deleteTitle: 'Xóa ngôn ngữ này', styleButton: 'Cài đặt phong cách', styleTitle: 'Cài đặt phong cách dịch', styleHint: 'Thay đổi được lưu tự động và áp dụng toàn cục. Để trống để dùng phong cách mặc định.', stylePlaceholder: 'Ví dụ: dùng cách diễn đạt tự nhiên, giữ thuật ngữ nhất quán.', swapTitle: 'Hoán đổi ngôn ngữ', settingsTitle: 'Chế độ dịch', prefSource: 'Ngôn ngữ nguồn ưa thích', prefTarget: 'Ngôn ngữ đích ưa thích', allowSame: 'Cho phép ngôn ngữ nguồn và đích giống nhau', allowSameHint: 'Khi tắt, ngôn ngữ nguồn và đích không thể giống nhau.', stylePresetsTitle: 'Mẫu phong cách', savePreset: 'Lưu thành mẫu', presetNamePlaceholder: 'Tên mẫu…', applyPreset: 'Áp dụng', deletePreset: 'Xóa mẫu này', noPresets: 'Chưa có mẫu nào' },
			nl: { auto: 'Automatisch detecteren', searchPlaceholder: 'Zoek of typ een aangepaste taal…', sourceTitle: 'Brontaal', targetTitle: 'Doeltaal', addTitle: 'Toevoegen aan de talenlijst (selecteerbaar voor bron en doel)', deleteTitle: 'Deze taal verwijderen', styleButton: 'Stijlinstellingen', styleTitle: 'Vertaalstijlinstellingen', styleHint: 'Wijzigingen worden automatisch opgeslagen en wereldwijd toegepast. Leeg laten voor de standaardstijl.', stylePlaceholder: 'Bijv. natuurlijke, idiomatische uitdrukkingen; houd vaktermen consistent.', swapTitle: 'Talen omwisselen', settingsTitle: 'Vertaalmodus', prefSource: 'Voorkeur brontaal', prefTarget: 'Voorkeur doeltaal', allowSame: 'Zelfde bron- en doeltaal toestaan', allowSameHint: 'Uitgeschakeld: bron en doel kunnen niet dezelfde taal zijn.', stylePresetsTitle: 'Stijlpresets', savePreset: 'Opslaan als preset', presetNamePlaceholder: 'Naam van preset…', applyPreset: 'Toepassen', deletePreset: 'Deze preset verwijderen', noPresets: 'Nog geen presets' },
			pl: { auto: 'Automatyczne wykrywanie', searchPlaceholder: 'Szukaj lub wpisz własny język…', sourceTitle: 'Język źródłowy', targetTitle: 'Język docelowy', addTitle: 'Dodaj do listy języków (wybieralny dla źródła i celu)', deleteTitle: 'Usuń ten język', styleButton: 'Ustawienia stylu', styleTitle: 'Ustawienia stylu tłumaczenia', styleHint: 'Zmiany są zapisywane automatycznie i mają zastosowanie globalnie. Pozostaw puste, aby użyć stylu domyślnego.', stylePlaceholder: 'Np. naturalne, idiomatyczne wyrażenia; zachowaj spójność terminów technicznych.', swapTitle: 'Zamień języki', settingsTitle: 'Tryb tłumaczenia', prefSource: 'Preferowany język źródłowy', prefTarget: 'Preferowany język docelowy', allowSame: 'Zezwól na ten sam język źródłowy i docelowy', allowSameHint: 'Gdy wyłączone, źródło i cel nie mogą być tym samym językiem.', stylePresetsTitle: 'Predefiniowane style', savePreset: 'Zapisz jako preset', presetNamePlaceholder: 'Nazwa presetu…', applyPreset: 'Zastosuj', deletePreset: 'Usuń ten preset', noPresets: 'Brak presetów' },
			tr: { auto: 'Otomatik algılama', searchPlaceholder: 'Ara veya özel bir dil yazın…', sourceTitle: 'Kaynak dil', targetTitle: 'Hedef dil', addTitle: 'Dil listesine ekle (kaynak ve hedef için seçilebilir)', deleteTitle: 'Bu dili sil', styleButton: 'Stil ayarları', styleTitle: 'Çeviri stili ayarları', styleHint: 'Değişiklikler otomatik kaydedilir ve genel olarak uygulanır. Varsayılan stil için boş bırakın.', stylePlaceholder: 'Örn: doğal, deyimsel ifadeler; teknik terimleri tutarlı tutun.', swapTitle: 'Dilleri değiştir', settingsTitle: 'Çeviri modu', prefSource: 'Tercih edilen kaynak dil', prefTarget: 'Tercih edilen hedef dil', allowSame: 'Aynı kaynak ve hedef dile izin ver', allowSameHint: 'Kapalıyken kaynak ve hedef aynı dil olamaz.', stylePresetsTitle: 'Stil ön ayarları', savePreset: 'Ön ayar olarak kaydet', presetNamePlaceholder: 'Ön ayar adı…', applyPreset: 'Uygula', deletePreset: 'Bu ön ayarı sil', noPresets: 'Henüz ön ayar yok' },
			uk: { auto: 'Автовизначення', searchPlaceholder: 'Пошук або введення власної мови…', sourceTitle: 'Мова оригіналу', targetTitle: 'Цільова мова', addTitle: 'Додати до списку мов (доступна для оригіналу та перекладу)', deleteTitle: 'Видалити цю мову', styleButton: 'Налаштування стилю', styleTitle: 'Налаштування стилю перекладу', styleHint: 'Зміни зберігаються автоматично та застосовуються глобально. Залиште порожнім для стилю за замовчуванням.', stylePlaceholder: 'Напр.: природні, ідіоматичні вирази; зберігайте послідовність термінів.', swapTitle: 'Поміняти мови', settingsTitle: 'Режим перекладу', prefSource: 'Бажана мова оригіналу', prefTarget: 'Бажана цільова мова', allowSame: 'Дозволити однакову мову оригіналу та перекладу', allowSameHint: 'Коли вимкнено, оригінал і переклад не можуть бути однією мовою.', stylePresetsTitle: 'Пресети стилю', savePreset: 'Зберегти як пресет', presetNamePlaceholder: 'Назва пресету…', applyPreset: 'Застосувати', deletePreset: 'Видалити цей пресет', noPresets: 'Пресетів ще немає' }
		};

		function loadState() {
			const base = { cfg: { ...DEFAULT_CFG }, custom: [], stylePresets: [] };
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
							base.stylePresets = Array.isArray(v.stylePresets)
								? v.stylePresets.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.style === 'string')
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
					localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state.cfg, custom: state.custom, stylePresets: state.stylePresets }));
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

		const inject = ["slots", "locale"];
		function apply(ctx) {
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
				'.dtr-trigger.dtr-pill{padding:0 8px}',
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
				'.dtr-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
				'.dtr-presets{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--dsw-alias-border-inverted);padding-top:8px}',
				'.dtr-preset-list{display:flex;flex-direction:column;gap:4px;max-height:140px;overflow-y:auto}',
				'.dtr-preset-row{display:flex;align-items:center;gap:4px}',
				'.dtr-preset-name{flex:1;min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
				'.dtr-preset-btn{flex:none;border:1px solid var(--dsw-alias-border-inverted);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;font-size:11px;line-height:16px;padding:1px 6px;cursor:pointer;white-space:nowrap}',
				'.dtr-preset-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
				'.dtr-preset-btn:disabled{opacity:.4;cursor:default}',
				'.dtr-preset-del{flex:none;width:20px;height:20px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;border-radius:5px;font-size:12px;line-height:1;display:inline-flex;align-items:center;justify-content:center}',
				'.dtr-preset-del:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}',
				'.dtr-preset-save{display:flex;align-items:center;gap:4px}',
				'.dtr-preset-name-input{flex:1;min-width:0;border:1px solid var(--dsw-alias-border-inverted);color:var(--dsw-alias-label-primary);background:transparent;border-radius:6px;outline:none;padding:3px 6px;font-size:12px}',
				'.dtr-preset-name-input:focus{border-color:var(--dsw-alias-brand-primary)}',
				'.dtr-preset-chips{display:flex;flex-wrap:wrap;gap:6px}',
				'.dtr-preset-chip{display:inline-flex;align-items:center;gap:4px;height:26px;max-width:100%;padding:0 6px 0 12px;border-radius:14px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;cursor:pointer;user-select:none;-webkit-user-select:none}',
				'.dtr-preset-chip:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}',
				'.dtr-preset-chip-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}',
				'.dtr-preset-chip-x{flex:none;width:16px;height:16px;border:none;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:12px;line-height:1;display:inline-flex;align-items:center;justify-content:center;padding:0}',
				'.dtr-preset-chip-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}',
				'.dtr-settings{display:flex;flex-direction:column;width:100%}',
				'.dtr-row{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}',
				'.dtr-rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}',
				'.dtr-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}',
				'.dtr-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}',
				'.dtr-sel{background:var(--dsw-alias-bg-module-platform);height:36px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:18px;align-items:center;gap:12px;padding:0 14px;font-size:14px;line-height:22px;display:inline-flex}',
				'.dtr-sel:hover{background:var(--dsw-alias-interactive-bg-hover)}',
				'.dtr-block{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:16px 0;display:flex}',
				'.dtr-toggle{flex:none;width:36px;height:20px;border-radius:10px;border:none;background:var(--dsw-alias-bg-module-platform);cursor:pointer;position:relative;transition:background .15s;padding:0}',
				'.dtr-toggle.dtr-on{background:var(--dsw-alias-brand-primary)}',
				'.dtr-toggle-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-specific-menu);transition:transform .15s;box-shadow:0 1px 2px rgba(0,0,0,.25)}',
				'.dtr-toggle.dtr-on .dtr-toggle-knob{transform:translateX(16px)}'
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
				const s = useCfg();
				React.useEffect(() => {
					if (s.cfg.allowSame === false && s.cfg.source !== 'auto' && s.cfg.source === s.cfg.target) {
						setState({ cfg: { ...s.cfg, source: 'auto' } });
					}
				}, [s.cfg.allowSame, s.cfg.source, s.cfg.target]);
			}

			function LangMenu({ kind, variant }) {
				const s = useCfg();
				const cfg = s.cfg;
				const custom = s.custom;
				useLocaleTick();
				useCfgGuard();
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
						className: variant === 'settings' ? 'dtr-sel' : 'dtr-trigger',
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

			function StylePresets({ variant }) {
				const s = useCfg();
				useLocaleTick();
				const presets = s.stylePresets || [];
				const [name, setName] = React.useState('');
				const savePreset = () => {
					const n = name.trim();
					if (!n) return;
					const cur = getState();
					const list = [...(cur.stylePresets || [])];
					const idx = list.findIndex((p) => p.name === n);
					if (idx >= 0) list[idx] = { ...list[idx], style: cur.cfg.style };
					else list.push({ id: 'dsp-' + Date.now().toString(36), name: n, style: cur.cfg.style });
					setState({ stylePresets: list });
					setName('');
				};
				const applyPreset = (p) => {
					const cur = getState();
					if (p.style !== cur.cfg.style) setState({ cfg: { ...cur.cfg, style: p.style } });
				};
				const removePreset = (id) => {
					const cur = getState();
					setState({ stylePresets: (cur.stylePresets || []).filter((p) => p.id !== id) });
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
									className: 'dtr-preset-chip',
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
				// 设置页内：管理列表（名称 + 应用 + 删除）+ 保存行
				return React.createElement('div', { className: 'dtr-presets' },
					React.createElement('div', { className: 'dtr-preset-list' },
						presets.length === 0
							? React.createElement('div', { className: 'dtr-desc' }, t('noPresets'))
							: presets.map((p) => React.createElement('div', { key: p.id, className: 'dtr-preset-row' },
								React.createElement('span', { className: 'dtr-preset-name', title: p.style }, p.name),
								React.createElement('button', {
									type: 'button',
									className: 'dtr-preset-btn',
									title: t('applyPreset'),
									onClick: () => applyPreset(p)
								}, t('applyPreset')),
								React.createElement('button', {
									type: 'button',
									className: 'dtr-preset-del',
									title: t('deletePreset'),
									onClick: (e) => { e.stopPropagation(); removePreset(p.id); }
								}, '×')
							))
					),
					saveRow
				);
			}

			function TranslateControls(props) {
				const s = useCfg();
				const cfg = s.cfg;
				useLocaleTick();
				useCfgGuard();
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
						fetch('/dsh-translate/settings', {
							method: 'POST',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({ source: cfg.source, target: cfg.target, style: cfg.style })
						}).then((res) => res.ok ? res.json() : null).then((r) => {
							if (cancelled) return;
							if (!r || !r.ok) {
								console.log('[dsh-translate] saveSettings 失败: ' + ((r && r.error) || '未知错误'));
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
					: { disabled: false, title: t('swapTitle') };
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
						className: 'dtr-trigger dtr-pill' + (s.dialogOpen ? ' dtr-active' : ''),
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
					React.createElement('div', { className: 'dtr-hint' }, t('styleHint')),
					React.createElement(StylePresets, { variant: 'chips' })
				);
			}

			function SettingsPage(props) {
				const s = useCfg();
				const cfg = s.cfg;
				useLocaleTick();
				useCfgGuard();
				return React.createElement('div', { className: 'dtr-settings' },
					React.createElement('div', { className: 'dtr-row' },
						React.createElement('div', { className: 'dtr-rowText' },
							React.createElement('div', { className: 'dtr-title' }, t('prefSource'))
						),
						React.createElement(LangMenu, { kind: 'source', variant: 'settings' })
					),
					React.createElement('div', { className: 'dtr-row' },
						React.createElement('div', { className: 'dtr-rowText' },
							React.createElement('div', { className: 'dtr-title' }, t('prefTarget'))
						),
						React.createElement(LangMenu, { kind: 'target', variant: 'settings' })
					),
					React.createElement('div', { className: 'dtr-row' },
						React.createElement('div', { className: 'dtr-rowText' },
							React.createElement('div', { className: 'dtr-title' }, t('allowSame')),
							React.createElement('div', { className: 'dtr-desc' }, t('allowSameHint'))
						),
						React.createElement('button', {
							type: 'button',
							className: 'dtr-toggle' + (cfg.allowSame !== false ? ' dtr-on' : ''),
							'aria-pressed': cfg.allowSame !== false,
							title: t('allowSame'),
							onClick: () => setState({ cfg: { ...cfg, allowSame: cfg.allowSame === false } })
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

			ctx.effect(() => ctx.slots.inject('conversation.input.right', () => ctx.slots.register({ name: 'conversation.input.right', id: 'translate-mode', order: 0, label: '翻译模式' }, TranslateControls)), 'dsh-translate: tools');
			ctx.effect(() => ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({ name: 'conversation.input.overlay', id: 'translate-style', order: 10, label: '翻译风格设置' }, StyleSettingsPanel)), 'dsh-translate: style panel');
			ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'translate-settings', order: 80, label: () => t('settingsTitle') }, SettingsPage)), 'dsh-translate: settings page');
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
