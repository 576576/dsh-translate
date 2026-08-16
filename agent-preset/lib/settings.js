/**
 * 翻译模式设置变量提供者（随翻译模式预设目录携带）。
 *
 * 每次组装系统提示词时读取 <DSH_HOME>/translate-settings.json，
 * 为 persona 中的 {{translatesource}} / {{translatetarget}} / {{translatestyle}}
 * 提供当前值；文件缺失或字段为空时返回默认值（自动检测 / English / 自然忠实）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const name = 'translate-settings';
const inject = ['systemPrompt'];

const HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const SETTINGS_FILE = join(HOME, 'translate-settings.json');

function readSettings() {
	try {
		const raw = readFileSync(SETTINGS_FILE, 'utf8');
		const value = JSON.parse(raw);
		return {
			source: typeof value.source === 'string' && value.source ? value.source : '',
			target: typeof value.target === 'string' && value.target ? value.target : '',
			style: typeof value.style === 'string' ? value.style : ''
		};
	} catch {
		return { source: '', target: '', style: '' };
	}
}

function apply(ctx) {
	ctx.systemPrompt.variable('translatesource', () => {
		const value = readSettings().source;
		return value === 'auto' ? '自动检测' : (value || '自动检测');
	});
	ctx.systemPrompt.variable('translatetarget', () => readSettings().target || 'English');
	ctx.systemPrompt.variable('translatestyle', () => readSettings().style || '自然、忠实、通顺');
}

export { apply, inject, name };
