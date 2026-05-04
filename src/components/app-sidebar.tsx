"use client"

import * as React from "react"
import {
  GalleryVerticalEndIcon,
  GaugeIcon,
  MoonIcon,
  SatelliteIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  TramFrontIcon,
  UserRoundCheckIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
import {
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
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
  "o4-mini",
  "deepseek-chat",
  "qwen-plus",
]

const LLM_PROVIDER_OPTIONS = Object.entries(LLM_PROVIDER_PRESETS) as Array<
  [LlmProviderId, (typeof LLM_PROVIDER_PRESETS)[LlmProviderId]]
>

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
  const [modelOptions, setModelOptions] = React.useState<string[]>(
    COMMON_LLM_MODEL_OPTIONS,
  )
  const [connectionStatus, setConnectionStatus] = React.useState<
    "idle" | "testing" | "success" | "error"
  >("idle")
  const [connectionMessage, setConnectionMessage] = React.useState("")
  const visibleModelOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          [llmSettings.model, ...modelOptions, ...COMMON_LLM_MODEL_OPTIONS]
            .map((model) => model.trim())
            .filter(Boolean),
        ),
      ),
    [llmSettings.model, modelOptions],
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
    teams: [
      {
        name: "Milan GIS",
        logo: <GalleryVerticalEndIcon />,
        plan: "Layer Platform",
      },
    ],
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
            title: "Intervention priority",
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
          {
            title: "GTFS/NeTEx dependency",
            url: "#",
            layerId: "analysis-transit-dependency",
            isActive: activeLayerId === "analysis-transit-dependency",
          },
          {
            title: "Hotspot clusters",
            url: "#",
            layerId: "analysis-hotspot-clusters",
            isActive: activeLayerId === "analysis-hotspot-clusters",
          },
          {
            title: "Critical transit stops",
            url: "#",
            layerId: "analysis-critical-transit-stops",
            isActive: activeLayerId === "analysis-critical-transit-stops",
          },
        ],
      },
      {
        id: "vulnerability",
        title: "Vulnerability",
        url: "#",
        icon: <ShieldIcon />,
        isActive: activeId === "vulnerability",
        items: [
          {
            title: "age vulnerability",
            url: "#",
            layerId: "vulnerability-age",
            isActive: activeLayerId === "vulnerability-age",
          },
          {
            title: "employment vulnerability",
            url: "#",
            layerId: "vulnerability-employment",
            isActive: activeLayerId === "vulnerability-employment",
          },
          {
            title: "gender vulnerability",
            url: "#",
            layerId: "vulnerability-gender",
            isActive: activeLayerId === "vulnerability-gender",
          },
          {
            title: "education vulnerability",
            url: "#",
            layerId: "vulnerability-education",
            isActive: activeLayerId === "vulnerability-education",
          },
          {
            title: "citizenship vulnerability",
            url: "#",
            layerId: "vulnerability-citizenship",
            isActive: activeLayerId === "vulnerability-citizenship",
          },
          {
            title: "vulnerability index",
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
            title: "Public Transport Accessibility Level (PTAL)",
            url: "#",
            layerId: "ptal-public-transport-accessibility-level",
            isActive:
              activeLayerId === "ptal-public-transport-accessibility-level",
          },
          {
            title: "Public Transport Opportunity Level (PTOL)",
            url: "#",
            layerId: "ptal-public-transport-opportunity-level",
            isActive:
              activeLayerId === "ptal-public-transport-opportunity-level",
          },
          {
            title: "Stops",
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
        icon: <UserRoundCheckIcon />,
        isActive: activeId === "services",
        items: [
          {
            title: "Essential service points",
            url: "#",
            layerId: "services-essential-service-points",
            isActive: activeLayerId === "services-essential-service-points",
          },
          {
            title: "Essential service accessibility",
            url: "#",
            layerId: "services-essential-service-accessibility",
            isActive:
              activeLayerId === "services-essential-service-accessibility",
          },
          {
            title: "Essential service gap",
            url: "#",
            layerId: "services-essential-service-gap",
            isActive: activeLayerId === "services-essential-service-gap",
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
            title: "SDGSAT-1 night lights",
            url: "#",
            layerId: "earth-observation-sdgsat1-night-lights",
            isActive:
              activeLayerId === "earth-observation-sdgsat1-night-lights",
          },
          {
            title: "Artificial land-cover",
            url: "#",
            layerId: "earth-observation-artificial-land-cover",
            isActive:
              activeLayerId === "earth-observation-artificial-land-cover",
          },
          {
            title: "Green/open land-cover",
            url: "#",
            layerId: "earth-observation-green-open-land-cover",
            isActive:
              activeLayerId === "earth-observation-green-open-land-cover",
          },
          {
            title: "Built-up density",
            url: "#",
            layerId: "earth-observation-built-up-density",
            isActive: activeLayerId === "earth-observation-built-up-density",
          },
          {
            title: "Urban growth 2010-2020",
            url: "#",
            layerId: "earth-observation-urban-growth-2010-2020",
            isActive:
              activeLayerId ===
              "earth-observation-urban-growth-2010-2020",
          },
        ],
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="relative min-h-14 pr-11 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pr-2">
        <div className="group-data-[collapsible=icon]:hidden">
          <TeamSwitcher teams={data.teams} />
        </div>
        <SidebarTrigger
          title="Toggle navigation"
          className="absolute top-3 right-2 rounded-lg border border-sidebar-border bg-sidebar shadow-sm group-data-[collapsible=icon]:top-3 group-data-[collapsible=icon]:right-1/2 group-data-[collapsible=icon]:translate-x-1/2"
        />
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
              <SheetContent side="right" className="w-[360px] sm:max-w-[360px]">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Configure a provider, base URL, API key and model for the
                    analysis chatbox.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
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
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Provider
                    </label>
                    <Select
                      value={llmSettings.provider}
                      onValueChange={(provider) => {
                        const providerId = provider as LlmProviderId
                        const preset = LLM_PROVIDER_PRESETS[providerId]

                        onLlmSettingsChange({
                          ...llmSettings,
                          provider: providerId,
                          baseUrl: preset.baseUrl,
                          model: preset.defaultModel,
                        })
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {LLM_PROVIDER_OPTIONS.map(([id, preset]) => (
                            <SelectItem key={id} value={id}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Base URL
                    </label>
                    <Input
                      value={llmSettings.baseUrl}
                      placeholder="https://api.openai.com/v1"
                      onChange={(event) =>
                        onLlmSettingsChange({
                          ...llmSettings,
                          provider: "openai-compatible",
                          baseUrl: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Model
                    </label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testLlmConnection}
                        disabled={
                          connectionStatus === "testing" ||
                          !llmSettings.baseUrl.trim() ||
                          !llmSettings.apiKey.trim()
                        }
                      >
                        {connectionStatus === "testing" ? "Loading" : "Models"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      API key
                    </label>
                    <Input
                      type="password"
                      value={llmSettings.apiKey}
                      placeholder="sk-..."
                      onChange={(event) =>
                        onLlmSettingsChange({
                          ...llmSettings,
                          apiKey: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Temperature
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={llmSettings.temperature}
                      onChange={(event) =>
                        onLlmSettingsChange({
                          ...llmSettings,
                          temperature: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        onLlmSettingsChange({
                          ...llmSettings,
                          provider: "openai",
                          baseUrl: LLM_PROVIDER_PRESETS.openai.baseUrl,
                          model: llmSettings.model || LLM_PROVIDER_PRESETS.openai.defaultModel,
                        })
                      }
                    >
                      OpenAI default
                    </Button>
                  </div>
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
                  <p className="text-xs leading-5 text-muted-foreground">
                    The key is stored in this browser for the local dashboard
                    workflow and sent only when you ask the assistant.
                  </p>
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
