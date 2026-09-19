# A keyless model entry borrows an environment variable only for the vendor's own endpoint

- **Date:** 2026-09-18
- **Type:** fix
- **Scope:** `core`, `server`, `web`, `docs`
- **PR:** [#794](https://github.com/Prism-Shadow/penguin-harness/pull/794)
- **Breaking:** yes — a model entry with no `api_key` in a gateway group (TokenDance, OpenRouter, Fireworks AI, SiliconFlow, Qwen Pay-As-You-Go, Qwen Token Plan), in `custom`, `vllm` or a user-created group, or a vendor entry with a `base_url` of its own, no longer reads `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` (or any vendor variable) from the server environment; Sessions, the connection test, the group speed test, the vision probe, protocol detection and the endpoint listing refuse it instead

[中文版](2026-09-18-gateway-no-env-keys.zh.md)

AgentHub's clients read a vendor's environment variable whenever they are handed no key, whatever
base URL they were pointed at. A keyless row in a gateway group therefore sent the user's own OpenAI
or Anthropic key to the gateway: one group speed test on a mixed-protocol gateway made 27 requests,
7 carrying the Anthropic key and 20 the OpenAI key, and the model dialog's key field, once any
Anthropic row had shown the variable was set, told a gateway row to "leave empty to use the
ANTHROPIC_API_KEY env var". PenguinHarness now decides itself whether a keyless entry may lean on
the environment, before any client exists, and the rule is about the **destination**, not the
group's name: an environment key goes only where the environment put it.

## Details

- Core's `resolveModelCredential` is the one place the decision is made, and every client the
  harness builds goes through it: Session creation and resume, the vision describer, the
  connectivity and speed probes, the vision probe, the utility completion and the endpoint
  listing. A keyless entry is allowed the routed client's variable when it has no base URL (the
  client's default endpoint is the vendor's own, or the `*_BASE_URL` the user set beside the key),
  or when its base URL is one of that vendor's own official endpoints (the catalog pins the
  DeepSeek and MiniMax rows this way). Anything else is refused with "Model
  `<provider>/<id>` has no API key … set the API key on the model entry", which the server files
  under `model_credential_missing` like the SDKs' own missing-credential errors.
- Where the fallback is allowed the client is still handed no key and reads the variable itself,
  exactly as before — a vendor row loses nothing, including a Bedrock `ANTHROPIC_BASE_URL` with no
  `ANTHROPIC_API_KEY`. The Penguin Go relay's provider-scoped `PENGUIN_GO_API_KEY`, which no
  AgentHub client knows, is read by the harness and passed explicitly for every row of that group;
  unset, the row is refused rather than left to the client's vendor variable. That closes the same
  hole for Sessions on keyless relay rows, which the probes had already guarded.
- The models API reports `envKey` and the masked `envKeyMasked` preview only for entries the rule
  allows a fallback, so the card's "key configured" reading and the dialog's hint follow the
  refusal. The dialog resolves the hint from the row as drafted — group, id, protocol and base
  URL — and the group-level "Set key" dialog names a variable only for vendor groups and Penguin
  Go.
- Protocol detection and the add-group listing lend a bare endpoint the protocol's variable on
  the same terms: the vendor's own URL only. A gateway or a private
  server is probed anonymously (a protocol-shaped 401 still identifies the route), and a listing
  with no usable key is refused before a client exists.
- The `custom` group's Atria Dawn Preview preset, which used to read `ANTHROPIC_API_KEY`, now
  needs its own key like every other custom row.

## Compatibility

What stops working: a Session, connection test, speed test, vision probe, protocol detection or
model import on an entry that has no `api_key` and points anywhere other than the vendor's own
endpoint — every gateway group row, every `custom`, `vllm` or user-created row with its own base URL,
and a vendor row re-pointed at a proxy — now fails with "has no API key" where it used to run on
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` from the server environment. A self-hosted
server that accepts any bearer token is affected too: `OPENAI_API_KEY=dummy` in the environment no
longer covers it.

What to do: put the key on the row — **Model settings → API key**, the group header's **Set key**,
or `penguin config model add … --api-key <key>`. A self-hosted or custom server that used to run on
`OPENAI_API_KEY` + `OPENAI_BASE_URL` in the environment while the row carried its own base URL is
exactly this case: environment keys are for official endpoints only, so that key goes on the row.
A row with **no** base URL is untouched and still follows AgentHub's own env pairing (`*_API_KEY`
with `*_BASE_URL`). Nothing on disk changes shape and no migration runs; entries that already carry
a key are untouched.

There is no compatibility code, so there is no `backward-compatibility` entry for this batch.
