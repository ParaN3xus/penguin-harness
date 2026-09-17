/**
 * Forms: the Appearance and General settings as preference rows (segmented controls, swatches,
 * switches, a select), a dialog form with every field type (a select, an input with a leading affix,
 * a password, a textarea, a checkbox group, a radio group, a search field), the same form with two
 * field errors, and the settings with the rows a server policy holds disabled. Static stand-ins for
 * W2's form controls and `PrefRow`.
 */
import { fixturesFor } from "../fixtures";
import type { FixtureLang, Fixtures } from "../fixtures";
import { defineModule } from "../module";
import {
  Button,
  Checkbox,
  Field,
  GlyphIcon,
  Input,
  Modal,
  Notice,
  PrefRow,
  Radio,
  RuledSection,
  SearchInput,
  Segmented,
  Select,
  Switch,
  SwatchPicker,
} from "./parts";

/**
 * Local fixture (K3): K-redesign §4.6 adds a `forms` set (values, one invalid field, one disabled)
 * to the fixtures; until #763 does, it lives here in that shape.
 */
const FORMS: Readonly<
  Record<
    FixtureLang,
    {
      general: string;
      language: string;
      languageValue: string;
      sendKey: string;
      sendKeyOptions: readonly string[];
      notify: string;
      notifyHint: string;
      swatches: readonly string[];
      dialog: {
        title: string;
        description: string;
        provider: string;
        providerValue: string;
        baseUrl: string;
        baseUrlValue: string;
        baseUrlInvalid: string;
        baseUrlError: string;
        apiKey: string;
        apiKeyValue: string;
        apiKeyHint: string;
        apiKeyError: string;
        notes: string;
        notesValue: string;
        capabilities: string;
        vision: string;
        tools: string;
        reasoning: string;
        reasoningHint: string;
        pricing: string;
        pricingCatalog: string;
        pricingCatalogHint: string;
        pricingCustom: string;
        defaultModel: string;
        searchModels: string;
        cancel: string;
        submit: string;
        fixToContinue: string;
      };
      managed: { title: string; body: string };
      proxy: string;
      proxyValue: string;
      uploads: string;
      uploadsHint: string;
    }
  >
> = {
  en: {
    general: "General",
    language: "Language",
    languageValue: "English",
    sendKey: "Send with",
    sendKeyOptions: ["Enter", "⌘ Enter"],
    notify: "Notify when a Task finishes",
    notifyHint: "A desktop notification when the window is in the background.",
    swatches: ["Theme default", "Blue", "Green", "Violet", "Rose", "Amber"],
    dialog: {
      title: "Add a model provider",
      description: "Models from this provider join the catalog for every Project.",
      provider: "Provider",
      providerValue: "OpenRouter",
      baseUrl: "Base URL",
      baseUrlValue: "openrouter.ai/api/v1",
      baseUrlInvalid: "openrouter.ai api/v1",
      baseUrlError: "Enter a host and a path, like openrouter.ai/api/v1.",
      apiKey: "API key",
      apiKeyValue: "••••••••••••••••••••",
      apiKeyHint: "Stored encrypted on the server; never shown again.",
      apiKeyError: "An API key is required.",
      notes: "Notes",
      notesValue: "Team key for the docs expert. Rotate every 90 days.",
      capabilities: "Capabilities",
      vision: "Images",
      tools: "Tool calls",
      reasoning: "Reasoning",
      reasoningHint: "Send the thinking-level parameter.",
      pricing: "Pricing",
      pricingCatalog: "From the built-in catalog",
      pricingCatalogHint: "Prices update with each release.",
      pricingCustom: "Custom prices",
      defaultModel: "Default model",
      searchModels: "Search 312 models",
      cancel: "Cancel",
      submit: "Add provider",
      fixToContinue: "Fix the two fields above to continue.",
    },
    managed: {
      title: "Managed by your administrator",
      body: "Proxy and upload settings are set on the server.",
    },
    proxy: "HTTPS proxy",
    proxyValue: "http://proxy.internal:3128",
    uploads: "Largest upload",
    uploadsHint: "Per file, in megabytes.",
  },
  zh: {
    general: "通用",
    language: "语言",
    languageValue: "中文",
    sendKey: "发送方式",
    sendKeyOptions: ["Enter", "⌘ Enter"],
    notify: "Task 完成时通知",
    notifyHint: "窗口在后台时弹出桌面通知。",
    swatches: ["主题默认", "蓝", "绿", "紫", "玫红", "琥珀"],
    dialog: {
      title: "添加模型提供方",
      description: "该提供方的模型会加入所有 Project 的模型库。",
      provider: "提供方",
      providerValue: "OpenRouter",
      baseUrl: "Base URL",
      baseUrlValue: "openrouter.ai/api/v1",
      baseUrlInvalid: "openrouter.ai api/v1",
      baseUrlError: "请输入主机与路径，例如 openrouter.ai/api/v1。",
      apiKey: "API 密钥",
      apiKeyValue: "••••••••••••••••••••",
      apiKeyHint: "加密保存在服务器上，之后不再显示。",
      apiKeyError: "必须填写 API 密钥。",
      notes: "备注",
      notesValue: "文档专家的团队密钥，每 90 天轮换一次。",
      capabilities: "能力",
      vision: "图片",
      tools: "工具调用",
      reasoning: "推理",
      reasoningHint: "发送思考等级参数。",
      pricing: "价格",
      pricingCatalog: "使用内置目录",
      pricingCatalogHint: "价格随每次发布更新。",
      pricingCustom: "自定义价格",
      defaultModel: "默认模型",
      searchModels: "搜索 312 个模型",
      cancel: "取消",
      submit: "添加提供方",
      fixToContinue: "请先修正上面的两个字段。",
    },
    managed: { title: "由管理员统一管理", body: "代理与上传设置在服务器上配置。" },
    proxy: "HTTPS 代理",
    proxyValue: "http://proxy.internal:3128",
    uploads: "单个上传上限",
    uploadsHint: "每个文件，单位 MB。",
  },
};

function SettingsForm({ f, disabled = false }: { f: Fixtures; disabled?: boolean }) {
  const s = f.copy.settings;
  const local = FORMS[f.lang];
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <RuledSection title={s.pages.appearance}>
        <div className="divide-y divide-line-muted">
          <PrefRow
            label={s.theme}
            hint={s.themeInfo}
            control={<Segmented options={[s.light, s.dark, s.system]} value={2} />}
          />
          <PrefRow
            label={s.fontSize}
            control={
              <Segmented options={[s.fontSizes.sm, s.fontSizes.md, s.fontSizes.lg]} value={1} />
            }
          />
          <PrefRow label={s.accent} control={<SwatchPicker value={0} labels={local.swatches} />} />
          <PrefRow label={s.launcher} hint={s.launcherInfo} control={<Switch on />} />
          <PrefRow label={s.toolAliases} info control={<Switch on={false} />} />
        </div>
      </RuledSection>
      {disabled ? (
        <RuledSection title={s.groupServer}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
            <Notice tone="neutral" title={local.managed.title}>
              {local.managed.body}
            </Notice>
            <div className="divide-y divide-line-muted">
              <PrefRow
                label={local.proxy}
                control={<Input value={local.proxyValue} state="disabled" mono />}
              />
              <PrefRow
                label={local.uploads}
                hint={local.uploadsHint}
                control={<Segmented options={["10", "50", "200"]} value={1} disabled />}
              />
              <PrefRow label={s.pages.company} control={<Switch on disabled />} />
            </div>
          </div>
        </RuledSection>
      ) : (
        <RuledSection title={local.general}>
          <div className="divide-y divide-line-muted">
            <PrefRow
              label={local.language}
              control={
                <div className="w-40">
                  <Select value={local.languageValue} />
                </div>
              }
            />
            <PrefRow
              label={local.sendKey}
              control={<Segmented options={local.sendKeyOptions} value={0} />}
            />
            <PrefRow label={local.notify} hint={local.notifyHint} control={<Switch on={false} />} />
          </div>
        </RuledSection>
      )}
    </div>
  );
}

function DialogForm({ f, errors = false }: { f: Fixtures; errors?: boolean }) {
  const d = FORMS[f.lang].dialog;
  return (
    <div className="flex justify-center">
      <Modal
        className="w-full max-w-xl"
        title={d.title}
        description={d.description}
        footer={
          <>
            {errors && (
              <div className="mr-auto">
                <Notice tone="danger" variant="inline">
                  {d.fixToContinue}
                </Notice>
              </div>
            )}
            <Button variant="secondary">{d.cancel}</Button>
            <Button variant="primary" state={errors ? "disabled" : "rest"}>
              {d.submit}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label={d.provider} required>
              <Select value={d.providerValue} />
            </Field>
            <Field label={d.defaultModel}>
              <SearchInput placeholder={d.searchModels} />
            </Field>
          </div>
          <Field label={d.baseUrl} required error={errors ? d.baseUrlError : undefined}>
            <Input
              value={errors ? d.baseUrlInvalid : d.baseUrlValue}
              leading={<span className="font-mono text-xs">https://</span>}
              state={errors ? "error" : "rest"}
              mono
            />
          </Field>
          <Field
            label={d.apiKey}
            required
            hint={d.apiKeyHint}
            error={errors ? d.apiKeyError : undefined}
          >
            <Input
              value={errors ? "" : d.apiKeyValue}
              placeholder="sk-or-…"
              trailing={<GlyphIcon name="eye" size={14} />}
              state={errors ? "focus" : "rest"}
              mono
            />
          </Field>
          <Field label={d.notes}>
            <Input value={d.notesValue} multiline />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <fieldset className="grid grid-cols-[minmax(0,1fr)] gap-2">
              <legend className="mb-2 text-sm font-(--ui-weight-medium) text-fg">
                {d.capabilities}
              </legend>
              <Checkbox checked label={d.vision} />
              <Checkbox checked label={d.tools} />
              <Checkbox checked={false} label={d.reasoning} hint={d.reasoningHint} />
            </fieldset>
            <fieldset className="grid grid-cols-[minmax(0,1fr)] content-start gap-2">
              <legend className="mb-2 text-sm font-(--ui-weight-medium) text-fg">
                {d.pricing}
              </legend>
              <Radio checked label={d.pricingCatalog} hint={d.pricingCatalogHint} />
              <Radio checked={false} label={d.pricingCustom} />
            </fieldset>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const VARIANTS = {
  settings: (f: Fixtures) => <SettingsForm f={f} />,
  "dialog-form": (f: Fixtures) => <DialogForm f={f} />,
  errors: (f: Fixtures) => <DialogForm f={f} errors />,
  disabled: (f: Fixtures) => <SettingsForm f={f} disabled />,
} as const;

export const module = defineModule({
  id: "forms",
  title: "Forms",
  description:
    "The Appearance and General settings as preference rows, and a dialog form with every field type, its errors and its disabled state.",
  width: "wide",
  variants: [
    { key: "settings", title: "Settings" },
    { key: "dialog-form", title: "Dialog form" },
    { key: "errors", title: "Errors" },
    { key: "disabled", title: "Disabled" },
  ],
  parts: [
    "forms-field",
    "forms-input",
    "forms-select",
    "forms-picker-list",
    "forms-checkbox",
    "forms-radio",
    "forms-switch",
    "forms-toggle-row",
    "forms-segmented",
    "forms-search-input",
    "forms-swatch-picker",
    "forms-pref-row",
    "layout-ruled-section",
  ],
  render: (variant, { lang }) =>
    (VARIANTS[variant as keyof typeof VARIANTS] ?? VARIANTS.settings)(fixturesFor(lang)),
});
