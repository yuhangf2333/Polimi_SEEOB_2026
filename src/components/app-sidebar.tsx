"use client"

import * as React from "react"
import Image from "next/image"
import {
  BadgeCheckIcon,
  BotIcon,
  BracesIcon,
  GaugeIcon,
  HandHeartIcon,
  MoonIcon,
  SatelliteIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
  TramFrontIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NavMain } from "@/components/nav-main"
import {
  DEFAULT_LLM_SETTINGS,
  LLM_PROVIDER_PRESETS,
  type LlmProviderId,
  type LlmSettings,
} from "@/lib/llm-settings"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"

type PrimaryFunctionId =
  | "ptal"
  | "services"
  | "vulnerability"
  | "earth-observation"
  | "ai-agent"

type ThemeMode = "dark" | "light"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeId: PrimaryFunctionId
  activeLayerId: string | null
  theme: ThemeMode
  llmSettings: LlmSettings
  onFunctionSelect: (id: PrimaryFunctionId) => void
  onLayerSelect: (id: string) => void
  onThemeChange: (theme: ThemeMode) => void
  onLlmSettingsChange: (settings: LlmSettings) => void
}

const COMMON_LLM_MODEL_OPTIONS = [
  "mimo-v2-omni",
  "gpt-5-mini",
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "use-custom-model",
]

const LLM_PROVIDER_OPTIONS = Object.entries(LLM_PROVIDER_PRESETS) as Array<
  [LlmProviderId, (typeof LLM_PROVIDER_PRESETS)[LlmProviderId]]
>

type ConnectionStatus = "idle" | "testing" | "success" | "error"
type ModelOptionsSource = "preset" | "remote"

const providerIconMap: Record<LlmProviderId, LucideIcon> = {
  xiaomi: BadgeCheckIcon,
  openai: BotIcon,
  google: SparklesIcon,
  "openai-compatible": BracesIcon,
}

function ProviderCard({
  providerId,
  label,
  description,
  active,
  enabled,
  onSelect,
  onEnabledChange,
}: {
  providerId: LlmProviderId
  label: string
  description: string
  active: boolean
  enabled: boolean
  onSelect: (providerId: LlmProviderId) => void
  onEnabledChange: (enabled: boolean) => void
}) {
  const ProviderIcon = providerIconMap[providerId]

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    onSelect(providerId)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-provider-card={providerId}
      className={[
        "relative flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary/5 text-foreground dark:bg-primary/10"
          : "border-border text-foreground hover:bg-muted/60 dark:hover:bg-muted/30",
      ].join(" ")}
      onClick={() => onSelect(providerId)}
      onKeyDown={handleKeyDown}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={[
            "grid size-7 shrink-0 place-items-center rounded-full border",
            active
              ? "border-primary/30 bg-primary text-primary-foreground"
              : "border-border bg-muted text-muted-foreground",
          ].join(" ")}
        >
          <ProviderIcon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {description}
          </span>
        </span>
      </span>
      <Switch
        checked={active && enabled}
        onCheckedChange={onEnabledChange}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}

function ProviderEditor({
  llmSettings,
  visibleModelOptions,
  connectionStatus,
  connectionMessage,
  onLlmSettingsChange,
  onTestConnection,
}: {
  llmSettings: LlmSettings
  visibleModelOptions: string[]
  connectionStatus: ConnectionStatus
  connectionMessage: string
  onLlmSettingsChange: (settings: LlmSettings) => void
  onTestConnection: () => void
}) {
  const providerPreset =
    LLM_PROVIDER_PRESETS[llmSettings.provider] ?? LLM_PROVIDER_PRESETS.xiaomi
  const providerId = llmSettings.provider
  const isDefaultProvider = providerId === DEFAULT_LLM_SETTINGS.provider

  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card p-3 text-card-foreground"
      data-readonly-default-provider={isDefaultProvider ? "true" : undefined}
    >
      <div className="mb-3 min-w-0">
        <div className="text-base font-semibold">{providerPreset.label}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {providerPreset.description}
        </p>
      </div>

      <div className="grid min-h-0 gap-3 overflow-y-auto pr-1">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 dark:bg-muted/25">
          <div>
            <div className="text-sm font-medium">Enable AI</div>
            <div className="text-xs text-muted-foreground">
              Shows the dashboard chatbox in Analysis.
            </div>
          </div>
          <Switch
            checked={llmSettings.enabled}
            onCheckedChange={(enabled) =>
              onLlmSettingsChange({
                ...llmSettings,
                enabled,
              })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Name</label>
          <Input value={providerPreset.label} readOnly disabled={isDefaultProvider} />
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Description</label>
          <Input
            value={providerPreset.description}
            readOnly
            disabled={isDefaultProvider}
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium">API Key</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTestConnection}
              disabled={
                isDefaultProvider ||
                connectionStatus === "testing" ||
                !llmSettings.baseUrl.trim()
              }
            >
              {connectionStatus === "testing" ? "Testing" : "Test connection"}
            </Button>
          </div>
          <Input
            type="password"
            value={llmSettings.apiKey}
            placeholder={
              isDefaultProvider ? "Built-in server default" : "Server configured"
            }
            readOnly={isDefaultProvider}
            disabled={isDefaultProvider}
            onChange={(event) =>
              onLlmSettingsChange({
                ...llmSettings,
                apiKey: event.target.value,
              })
            }
          />
          {connectionMessage ? (
            <p
              className={
                connectionStatus === "error"
                  ? "text-xs leading-5 text-destructive"
                  : "text-xs leading-5 text-muted-foreground"
              }
            >
              {connectionMessage}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Base URL</label>
          <Input
            value={llmSettings.baseUrl}
            placeholder={providerPreset.baseUrl}
            readOnly={isDefaultProvider}
            disabled={isDefaultProvider}
            onChange={(event) =>
              onLlmSettingsChange({
                ...llmSettings,
                baseUrl: event.target.value,
              })
            }
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium">Model</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTestConnection}
              disabled={
                isDefaultProvider ||
                connectionStatus === "testing" ||
                !llmSettings.baseUrl.trim()
              }
            >
              Models
            </Button>
          </div>
          {isDefaultProvider ? (
            <Input value={llmSettings.model} readOnly disabled />
          ) : (
            <>
              <Select
                value={llmSettings.model}
                onValueChange={(model) =>
                  onLlmSettingsChange({
                    ...llmSettings,
                    model,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {visibleModelOptions.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                value={llmSettings.model}
                placeholder="Input custom model name"
                onChange={(event) =>
                  onLlmSettingsChange({
                    ...llmSettings,
                    model: event.target.value,
                  })
                }
              />
            </>
          )}
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Temperature</label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={llmSettings.temperature}
            readOnly={isDefaultProvider}
            disabled={isDefaultProvider}
            onChange={(event) =>
              onLlmSettingsChange({
                ...llmSettings,
                temperature: Number(event.target.value),
              })
            }
          />
        </div>

        <details className="group rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Feature provider
          </summary>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Analysis chat uses this provider for dashboard interpretation.
          </p>
        </details>

        <details className="group rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Advanced options
          </summary>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isDefaultProvider
              ? "Default uses the built-in Xiaomi configuration and cannot be edited here."
              : "Leave the key empty to use the server-configured credential. A browser key overrides it only for this local dashboard."}
          </p>
        </details>
      </div>
    </div>
  )
}

export function AppSidebar({
  activeId,
  activeLayerId,
  theme,
  llmSettings,
  onFunctionSelect,
  onLayerSelect,
  onThemeChange,
  onLlmSettingsChange,
  ...props
}: AppSidebarProps) {
  const initialProviderPreset =
    LLM_PROVIDER_PRESETS[llmSettings.provider] ?? LLM_PROVIDER_PRESETS.xiaomi
  const [modelOptions, setModelOptions] = React.useState<string[]>(
    initialProviderPreset.modelOptions,
  )
  const [modelOptionsSource, setModelOptionsSource] =
    React.useState<ModelOptionsSource>("preset")
  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>("idle")
  const [connectionMessage, setConnectionMessage] = React.useState("")
  const activeProviderPreset =
    LLM_PROVIDER_PRESETS[llmSettings.provider] ?? LLM_PROVIDER_PRESETS.xiaomi
  const visibleModelOptions = React.useMemo(() => {
    const sourceModels =
      modelOptionsSource === "remote"
        ? modelOptions
        : [
            ...modelOptions,
            ...activeProviderPreset.modelOptions,
            ...COMMON_LLM_MODEL_OPTIONS,
          ]

    const models =
      modelOptionsSource === "remote" && modelOptions.includes(llmSettings.model)
        ? sourceModels
        : [llmSettings.model, ...sourceModels]

    return Array.from(
      new Set(models.map((model) => model.trim()).filter(Boolean)),
    )
  }, [
    activeProviderPreset.modelOptions,
    llmSettings.model,
    modelOptions,
    modelOptionsSource,
  ])
  const logoSrc =
    theme === "dark" ? "/images/night_limen.svg" : "/images/day_limen.svg"

  const selectLlmProvider = React.useCallback(
    (providerId: LlmProviderId) => {
      const preset = LLM_PROVIDER_PRESETS[providerId]

      setModelOptions(preset.modelOptions)
      setModelOptionsSource("preset")
      setConnectionStatus("idle")
      setConnectionMessage("")
      const nextSettings =
        providerId === DEFAULT_LLM_SETTINGS.provider
          ? {
              ...DEFAULT_LLM_SETTINGS,
              enabled: true,
            }
          : {
              ...llmSettings,
              enabled: true,
              provider: providerId,
              baseUrl: preset.baseUrl,
              model: preset.defaultModel,
              temperature: llmSettings.temperature,
            }

      onLlmSettingsChange(nextSettings)
    },
    [llmSettings, onLlmSettingsChange],
  )

  const testLlmConnection = React.useCallback(async () => {
    setConnectionStatus("testing")
    setConnectionMessage("Testing endpoint...")

    try {
      const response = await fetch("/api/llm/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: llmSettings.baseUrl,
          apiKey: llmSettings.apiKey,
        }),
      })
      const data = (await response.json()) as {
        models?: string[]
        error?: string
        detail?: string
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Connection test failed")
      }

      const nextModels = data.models?.length
        ? data.models
        : COMMON_LLM_MODEL_OPTIONS
      setModelOptions(nextModels)
      setModelOptionsSource(data.models?.length ? "remote" : "preset")
      setConnectionStatus("success")
      setConnectionMessage(`${nextModels.length} models available`)

      if (!nextModels.includes(llmSettings.model)) {
        onLlmSettingsChange({
          ...llmSettings,
          model: nextModels[0] ?? "gpt-4o-mini",
        })
      }
    } catch (error) {
      setConnectionStatus("error")
      setConnectionMessage(
        error instanceof Error ? error.message : "Connection test failed",
      )
    }
  }, [llmSettings, onLlmSettingsChange])

  const data = {
    navMain: [
      {
        id: "ai-agent",
        title: "Analysis",
        url: "#",
        icon: <GaugeIcon />,
        isActive: activeId === "ai-agent",
        items: [
          {
            title: "Dashboard",
            url: "#",
            layerId: "analysis-dashboard",
            isActive: activeLayerId === "analysis-dashboard",
          },
          {
            title: "Intervention priority index",
            url: "#",
            layerId: "analysis-intervention-priority",
            isActive: activeLayerId === "analysis-intervention-priority",
          },
          {
            title: "Hotspot score",
            url: "#",
            layerId: "analysis-hotspot-score",
            isActive: activeLayerId === "analysis-hotspot-score",
          },
          {
            title: "Data confidence",
            url: "#",
            layerId: "analysis-data-confidence",
            isActive: activeLayerId === "analysis-data-confidence",
          },
          {
            title: "Typology",
            url: "#",
            layerId: "analysis-typology",
            isActive: activeLayerId === "analysis-typology",
          },
        ],
      },
      {
        id: "vulnerability",
        title: "Vulnerability",
        url: "#",
        icon: <UsersRoundIcon />,
        isActive: activeId === "vulnerability",
        items: [
          {
            title: "Elderly vulnerability",
            url: "#",
            layerId: "vulnerability-elderly",
            isActive: activeLayerId === "vulnerability-elderly",
          },
          {
            title: "Employment vulnerability",
            url: "#",
            layerId: "vulnerability-employment",
            isActive: activeLayerId === "vulnerability-employment",
          },
          {
            title: "Education vulnerability",
            url: "#",
            layerId: "vulnerability-education",
            isActive: activeLayerId === "vulnerability-education",
          },
          {
            title: "Citizenship vulnerability",
            url: "#",
            layerId: "vulnerability-citizenship",
            isActive: activeLayerId === "vulnerability-citizenship",
          },
          {
            title: "Income vulnerability",
            url: "#",
            layerId: "vulnerability-income",
            isActive: activeLayerId === "vulnerability-income",
          },
          {
            title: "Motorisation",
            url: "#",
            layerId: "vulnerability-motorisation",
            isActive: activeLayerId === "vulnerability-motorisation",
          },
          {
            title: "Low car access",
            url: "#",
            layerId: "vulnerability-low-car-access",
            isActive: activeLayerId === "vulnerability-low-car-access",
          },
          {
            title: "Car dependency stress",
            url: "#",
            layerId: "vulnerability-car-dependency-stress",
            isActive: activeLayerId === "vulnerability-car-dependency-stress",
          },
          {
            title: "Social vulnerability index",
            url: "#",
            layerId: "vulnerability-index",
            isActive: activeLayerId === "vulnerability-index",
          },
        ],
      },
      {
        id: "ptal",
        title: "Public Accessibility",
        url: "#",
        icon: <TramFrontIcon />,
        isActive: activeId === "ptal",
        items: [
          {
            title: "Public transport accessibility",
            url: "#",
            layerId: "ptal-public-transport-accessibility",
            isActive:
              activeLayerId === "ptal-public-transport-accessibility",
          },
          {
            title: "Public transport deficit",
            url: "#",
            layerId: "ptal-public-transport-deficit",
            isActive: activeLayerId === "ptal-public-transport-deficit",
          },
          {
            title: "Service frequency",
            url: "#",
            layerId: "ptal-service-frequency",
            isActive: activeLayerId === "ptal-service-frequency",
          },
          {
            title: "Line availability",
            url: "#",
            layerId: "ptal-line-availability",
            isActive: activeLayerId === "ptal-line-availability",
          },
          {
            title: "ptal",
            url: "#",
            layerId: "ptal-ptal-100m-gtfs-netex",
            isActive: activeLayerId === "ptal-ptal-100m-gtfs-netex",
          },
          {
            title: "ptol",
            url: "#",
            layerId: "ptal-ptol-100m-gtfs-netex",
            isActive: activeLayerId === "ptal-ptol-100m-gtfs-netex",
          },
          {
            title: "Stops all",
            url: "#",
            layerId: "ptal-stops-all",
            isActive: activeLayerId === "ptal-stops-all",
          },
        ],
      },
      {
        id: "services",
        title: "Essential Services",
        url: "#",
        icon: <HandHeartIcon />,
        isActive: activeId === "services",
        items: [
          {
            title: "Essential services accessibility",
            url: "#",
            layerId: "services-essential-services-accessibility",
            isActive:
              activeLayerId ===
              "services-essential-services-accessibility",
          },
          {
            title: "Essential services deficit",
            url: "#",
            layerId: "services-essential-service-deficit",
            isActive: activeLayerId === "services-essential-service-deficit",
          },
          {
            title: "Health access",
            url: "#",
            layerId: "services-health-access",
            isActive: activeLayerId === "services-health-access",
          },
          {
            title: "School access",
            url: "#",
            layerId: "services-school-access",
            isActive: activeLayerId === "services-school-access",
          },
          {
            title: "Job access",
            url: "#",
            layerId: "services-job-access",
            isActive: activeLayerId === "services-job-access",
          },
          {
            title: "Grocery access",
            url: "#",
            layerId: "services-grocery-access",
            isActive: activeLayerId === "services-grocery-access",
          },
          {
            title: "Services points",
            url: "#",
            layerId: "services-points-all",
            isActive: activeLayerId === "services-points-all",
          },
        ],
      },
      {
        id: "earth-observation",
        title: "Earth Observation",
        url: "#",
        icon: <SatelliteIcon />,
        isActive: activeId === "earth-observation",
        items: [
          {
            title: "EO territorial disadvantage",
            url: "#",
            layerId: "earth-observation-territorial-disadvantage",
            isActive:
              activeLayerId ===
              "earth-observation-territorial-disadvantage",
          },
          {
            title: "Population demand",
            url: "#",
            layerId: "earth-observation-population-demand",
            isActive:
              activeLayerId === "earth-observation-population-demand",
          },
          {
            title: "Built-up density",
            url: "#",
            layerId: "earth-observation-built-up-density",
            isActive:
              activeLayerId === "earth-observation-built-up-density",
          },
          {
            title: "Artificial land cover",
            url: "#",
            layerId: "earth-observation-artificial-land-cover",
            isActive:
              activeLayerId === "earth-observation-artificial-land-cover",
          },
          {
            title: "Artificial land cover 100m",
            url: "#",
            layerId: "earth-observation-artificial-land-cover-100m",
            isActive:
              activeLayerId ===
              "earth-observation-artificial-land-cover-100m",
          },
          {
            title: "Nighttime lights",
            url: "#",
            layerId: "earth-observation-nighttime-lights",
            isActive: activeLayerId === "earth-observation-nighttime-lights",
          },
          {
            title: "Nighttime lights 100m",
            url: "#",
            layerId: "earth-observation-nighttime-lights-100m",
            isActive:
              activeLayerId === "earth-observation-nighttime-lights-100m",
          },
          {
            title: "Road density",
            url: "#",
            layerId: "earth-observation-road-density",
            isActive: activeLayerId === "earth-observation-road-density",
          },
          {
            title: "Intersection density",
            url: "#",
            layerId: "earth-observation-intersection-density",
            isActive:
              activeLayerId === "earth-observation-intersection-density",
          },
          {
            title: "Road connectivity",
            url: "#",
            layerId: "earth-observation-road-connectivity",
            isActive:
              activeLayerId === "earth-observation-road-connectivity",
          },
          {
            title: "Green land",
            url: "#",
            layerId: "earth-observation-green-land",
            isActive: activeLayerId === "earth-observation-green-land",
          },
          {
            title: "Urban growth",
            url: "#",
            layerId: "earth-observation-urban-growth",
            isActive: activeLayerId === "earth-observation-urban-growth",
          },
        ],
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="min-h-[4.5rem] px-5 py-2 group-data-[collapsible=icon]:px-2">
        <div className="flex min-h-12 w-full items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center group-data-[collapsible=icon]:hidden">
            <Image
              src={logoSrc}
              alt="LIMEN"
              width={168}
              height={40}
              loading="eager"
              unoptimized
              className="object-contain"
            />
          </div>
          <SidebarTrigger
            title="Toggle navigation"
            className="relative z-30 rounded-lg border-0 bg-transparent text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:not-aria-[haspopup]:translate-y-0"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={data.navMain}
          onSelect={(id) => onFunctionSelect(id as PrimaryFunctionId)}
          onLayerSelect={onLayerSelect}
        />
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:items-center">
        <SidebarMenu className="flex-row items-center justify-between group-data-[collapsible=icon]:flex-col">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
              className="size-8 justify-center p-0"
              onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span className="sr-only">
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Sheet>
              <SheetTrigger asChild>
                <SidebarMenuButton
                  tooltip="Settings"
                  className="size-8 justify-center p-0"
                >
                  <SettingsIcon />
                  <span className="sr-only">Settings</span>
                </SidebarMenuButton>
              </SheetTrigger>
              <SheetContent
                side="left"
                className={[
                  theme === "dark" ? "dark" : "",
                  "gap-0 p-0 data-[side=left]:w-[min(100vw,54rem)] data-[side=left]:sm:max-w-[54rem]",
                ].join(" ")}
              >
                <SheetHeader className="border-b px-4 py-4">
                  <SheetTitle>API Providers</SheetTitle>
                  <SheetDescription>
                    Configure the OpenAI-compatible provider used by the
                    Analysis chatbox.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid min-h-0 flex-1 grid-cols-[15rem_minmax(0,1fr)] gap-4 overflow-hidden p-4 max-md:grid-cols-1">
                  <div className="flex min-h-0 flex-col gap-3">
                    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
                      {LLM_PROVIDER_OPTIONS.map(([providerId, preset]) => (
                        <ProviderCard
                          key={providerId}
                          providerId={providerId}
                          label={preset.label}
                          description={preset.description}
                          active={llmSettings.provider === providerId}
                          enabled={llmSettings.enabled}
                          onSelect={selectLlmProvider}
                          onEnabledChange={(enabled) => {
                            if (llmSettings.provider !== providerId) {
                              selectLlmProvider(providerId)
                              return
                            }

                            onLlmSettingsChange({
                              ...llmSettings,
                              enabled,
                            })
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <ProviderEditor
                    llmSettings={llmSettings}
                    visibleModelOptions={visibleModelOptions}
                    connectionStatus={connectionStatus}
                    connectionMessage={connectionMessage}
                    onLlmSettingsChange={onLlmSettingsChange}
                    onTestConnection={testLlmConnection}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
