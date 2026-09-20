/**
 * Forms: the Appearance and General settings as preference rows (segmented controls, swatches,
 * switches, a select), a dialog form with every field type (a select, an input with a leading affix,
 * a password, a textarea, a checkbox group, a radio group, a search field), the same form with two
 * field errors, and the settings with the rows a server policy holds disabled. Static stand-ins for
 * W2's form controls and `PrefRow`.
 */
import type { ReactNode } from "react";
import { fixturesFor } from "../fixtures";
import type { Fixtures, FormFieldFixture } from "../fixtures";
import { defineModule } from "../module";
import type { SceneSpec } from "../module";
import { reached, useScene } from "../scene";
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
  arriving,
  useArrivals,
} from "./parts";

const FILL: SceneSpec = {
  frames: [
    { key: "appearance", title: "Appearance", hold: 1600 },
    { key: "general", title: "General", hold: 1600 },
  ],
};

/**
 * The settings, and the scene that fills them: the Appearance rows land one after another, each
 * control already on the value it holds; then the General section arrives under them — the page
 * this variant shows when nothing is playing.
 */
function SettingsForm({ f, disabled = false }: { f: Fixtures; disabled?: boolean }) {
  const clock = useScene();
  const s = f.copy.settings;
  const auth = f.copy.auth;
  // The one field a server policy holds: shown, explained, not editable.
  const held = f.forms.fields.find((field) => field.disabled);
  const appearance: readonly [string, ReactNode][] = [
    [
      "theme",
      <PrefRow
        label={s.theme}
        hint={s.themeInfo}
        control={<Segmented options={[s.light, s.dark, s.system]} value={2} />}
      />,
    ],
    [
      "font-size",
      <PrefRow
        label={s.fontSize}
        control={<Segmented options={[s.fontSizes.sm, s.fontSizes.md, s.fontSizes.lg]} value={1} />}
      />,
    ],
    [
      "accent",
      <PrefRow label={s.accent} control={<SwatchPicker value={0} swatches={f.forms.swatches} />} />,
    ],
    ["launcher", <PrefRow label={s.launcher} hint={s.launcherInfo} control={<Switch on />} />],
    ["tool-aliases", <PrefRow label={s.toolAliases} info control={<Switch on={false} />} />],
  ];
  const landed = useArrivals(appearance.length, "appearance");
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <RuledSection title={s.pages.appearance}>
        <div className="divide-y divide-line-muted">
          {appearance.slice(0, landed).map(([key, row]) => (
            <div key={key} data-reveal={arriving(clock, "appearance")}>
              {row}
            </div>
          ))}
        </div>
      </RuledSection>
      {!reached(clock, "general") ? null : disabled ? (
        <RuledSection title={s.groupServer}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
            <Notice tone="neutral" title={s.managedTitle}>
              {s.managedBody}
            </Notice>
            <div className="divide-y divide-line-muted">
              {held && (
                <PrefRow
                  label={held.label}
                  hint={held.hint}
                  control={<Input value={held.value} state="disabled" mono />}
                />
              )}
              <PrefRow
                label={s.pages.uploads}
                hint={s.uploadsInfo}
                control={<Segmented options={s.uploadSizes} value={1} disabled />}
              />
              <PrefRow label={s.pages.company} control={<Switch on disabled />} />
            </div>
          </div>
        </RuledSection>
      ) : (
        <RuledSection title={s.pages.general}>
          <div className="divide-y divide-line-muted">
            <PrefRow
              label={auth.language}
              control={
                <div className="w-40">
                  <Select value={f.lang === "zh" ? auth.langZh : auth.langEn} />
                </div>
              }
            />
            <PrefRow label={s.sendWith} control={<Segmented options={s.sendKeys} value={0} />} />
            <PrefRow label={s.notify} hint={s.notifyInfo} control={<Switch on={false} />} />
          </div>
        </RuledSection>
      )}
    </div>
  );
}

/**
 * One field of the dialog in its kind's control. `filled` is whether the invalid field holds a
 * value yet — before the form is filled in, its placeholder shows — and `errors` whether the form
 * has been sent and said what is wrong.
 */
function FormField({
  field,
  filled,
  errors,
}: {
  field: FormFieldFixture;
  filled: boolean;
  errors: boolean;
}) {
  const invalid = field.error !== undefined;
  const value = invalid && !filled ? "" : field.value;
  const control =
    field.kind === "select" ? (
      <Select value={value} />
    ) : field.kind === "textarea" ? (
      <Input value={value} placeholder={field.placeholder} multiline />
    ) : (
      <Input
        value={value}
        placeholder={field.placeholder}
        leading={
          field.prefix === undefined ? undefined : (
            <span className="font-mono text-xs">{field.prefix}</span>
          )
        }
        trailing={field.kind === "password" ? <GlyphIcon name="eye" size={14} /> : undefined}
        state={invalid && errors ? "error" : "rest"}
        mono
      />
    );
  return (
    <Field
      label={field.label}
      required={field.required}
      hint={field.hint}
      error={errors ? field.error : undefined}
    >
      {control}
    </Field>
  );
}

function DialogForm({
  f,
  errors = false,
  filled = errors,
}: {
  f: Fixtures;
  errors?: boolean;
  /** Whether the fields hold their values; a form says what is wrong only once it is filled in. */
  filled?: boolean;
}) {
  const form = f.forms;
  const [first, ...rest] = form.fields.filter((field) => !field.disabled);
  return (
    <div className="flex justify-center">
      <Modal
        className="w-full max-w-xl"
        title={form.title}
        description={form.description}
        footer={
          <>
            {errors && (
              <div className="mr-auto">
                <Notice tone="danger" variant="inline">
                  {form.errorSummary}
                </Notice>
              </div>
            )}
            <Button variant="secondary" size="sm">
              {form.cancel}
            </Button>
            <Button variant="primary" size="sm" state={errors ? "disabled" : "rest"}>
              {form.submit}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            {first && <FormField field={first} filled={filled} errors={errors} />}
            <Field label={form.search.label}>
              <SearchInput placeholder={form.search.placeholder} />
            </Field>
          </div>
          {rest.map((field) => (
            <FormField key={field.name} field={field} filled={filled} errors={errors} />
          ))}
          <div className="grid grid-cols-2 gap-4">
            {form.groups.map((group) => (
              <fieldset
                key={group.label}
                className="grid grid-cols-[minmax(0,1fr)] content-start gap-2"
              >
                <legend className="mb-2 text-sm font-(--ui-weight-medium) text-fg">
                  {group.label}
                </legend>
                {group.choices.map((choice) =>
                  group.kind === "checkboxes" ? (
                    <Checkbox
                      key={choice.label}
                      checked={choice.checked}
                      label={choice.label}
                      hint={choice.hint}
                    />
                  ) : (
                    <Radio
                      key={choice.label}
                      checked={choice.checked}
                      label={choice.label}
                      hint={choice.hint}
                    />
                  ),
                )}
              </fieldset>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

const VALIDATE: SceneSpec = {
  frames: [
    { key: "filled", title: "Filled", hold: 1400 },
    { key: "errors", title: "Errors", hold: 1600 },
  ],
};

/**
 * The same dialog, filled in and sent: the fields hold their values with the form still willing to
 * take them; then it is sent, the two that do not pass say what is wrong and the submit button is
 * held — the state this variant shows when nothing is playing.
 */
function Validate({ f }: { f: Fixtures }) {
  const clock = useScene();
  return <DialogForm f={f} filled errors={reached(clock, "errors")} />;
}

const VARIANTS = {
  settings: (f: Fixtures) => <SettingsForm f={f} />,
  "dialog-form": (f: Fixtures) => <DialogForm f={f} />,
  errors: (f: Fixtures) => <Validate f={f} />,
  disabled: (f: Fixtures) => <SettingsForm f={f} disabled />,
} as const;

export const module = defineModule({
  id: "forms",
  title: "Forms",
  description:
    "The Appearance and General settings as preference rows, and a dialog form with every field type, its errors and its disabled state.",
  width: "wide",
  variants: [
    { key: "settings", title: "Settings", scene: FILL },
    { key: "dialog-form", title: "Dialog form" },
    { key: "errors", title: "Errors", scene: VALIDATE },
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
