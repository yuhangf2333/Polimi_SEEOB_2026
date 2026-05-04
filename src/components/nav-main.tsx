"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

export function NavMain({
  items,
  onSelect,
  onLayerSelect,
}: {
  items: {
    id?: string
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    disabled?: boolean
    items?: {
      title: string
      url: string
      layerId?: string
      isActive?: boolean
    }[]
  }[]
  onSelect?: (id: string) => void
  onLayerSelect?: (id: string) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasItems = Boolean(item.items?.length)

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={item.isActive}
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.id && !item.disabled) onSelect?.(item.id)
                    }}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                    {hasItems ? (
                      <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    ) : null}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {hasItems ? (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={subItem.isActive}
                          >
                            <a
                              href={subItem.url}
                              onClick={(event) => {
                                if (!subItem.layerId) return
                                event.preventDefault()
                                if (item.id && !item.disabled) {
                                  onSelect?.(item.id)
                                }
                                onLayerSelect?.(subItem.layerId)
                              }}
                            >
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
