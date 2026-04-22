"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronsUpDown,
  FileText,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Plus,
  Settings,
  Trash2,
  UserPen,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSession } from "@/contexts/SessionContext";
import { CreateOrganizationDialog } from "@/components/CreateOrganizationDialog";

const sidebarVariants = {
  open: {
    width: "17rem",
  },
  closed: {
    width: "3.5rem",
  },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      x: { stiffness: 100 },
    },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppSidebar() {
  const isHovering = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(() => !isHovering.current);
  const [chatExpanded, setChatExpanded] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Keep sidebar open if cursor is still hovering after a route change
  useEffect(() => {
    if (isHovering.current) {
      setIsCollapsed(false);
    }
  }, [pathname]);
  const { user, signOut } = useAuth();
  const { activeOrg, organizations, setActiveOrg } = useOrganization();
  const {
    sessions,
    activeSession,
    setActiveSession,
    isLoading: sessionsLoading,
    createNewSession,
    deleteSession,
  } = useSession();

  const displayName = user?.email ?? "Usuário";
  const initials = displayName.split("@")[0].slice(0, 2).toUpperCase();
  const orgInitial =
    activeOrg?.name?.charAt(0).toUpperCase() ??
    (organizations.length === 0 ? "—" : "O");

  const isDashboardActive = pathname === "/" || pathname === "/dashboard";
  const isChatActive = pathname?.startsWith("/chat");

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  function handleSelectSession(session: typeof activeSession) {
    setActiveSession(session);
    if (pathname !== "/chat") {
      router.push("/chat");
    }
  }

  async function handleNewSession() {
    await createNewSession();
    if (pathname !== "/chat") {
      router.push("/chat");
    }
  }

  return (
    <motion.div
      className={cn(
        "sidebar fixed left-0 z-40 h-full shrink-0 border-r border-neutral-800",
      )}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => {
        isHovering.current = true;
        setIsCollapsed(false);
      }}
      onMouseLeave={() => {
        isHovering.current = false;
        setIsCollapsed(true);
      }}
    >
      <motion.div
        className="relative z-40 flex text-muted-foreground h-full shrink-0 flex-col bg-[#111111] transition-all"
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            {/* Logo */}
            <div className="flex w-full shrink-0 items-center justify-center border-b border-neutral-800 px-2 py-3">
              {isCollapsed ? (
                <img
                  src="/image/Delta-AI-Sidebar.png"
                  alt="Delta-AI"
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <img
                  src="/image/Delta-AI-expandido.png"
                  alt="Delta-AI"
                  className="h-10 object-contain"
                />
              )}
            </div>

            {/* Organization switcher */}
            <div className="flex h-[58px] w-full shrink-0 border-b p-2.5">
              <div className="mt-[1.5px] flex w-full">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-full" asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex w-fit items-center gap-2 px-2 cursor-pointer"
                    >
                      <Avatar className="rounded size-5">
                        <AvatarFallback className="text-[9px]">
                          {orgInitial}
                        </AvatarFallback>
                      </Avatar>
                      <motion.li
                        variants={variants}
                        className="flex w-fit items-center gap-2"
                      >
                        {!isCollapsed && (
                          <>
                            <p
                              className={cn(
                                "text-sm font-medium",
                                organizations.length === 0
                                  ? "text-muted-foreground italic whitespace-nowrap"
                                  : "truncate max-w-[120px]",
                              )}
                            >
                              {organizations.length === 0
                                ? "Nenhuma organização"
                                : (activeOrg?.name ?? "Organização")}
                            </p>
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                          </>
                        )}
                      </motion.li>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {organizations.map((org) => (
                      <DropdownMenuItem
                        key={org.id}
                        className={cn(
                          "flex items-center gap-2",
                          org.id === activeOrg?.id && "bg-accent font-semibold",
                        )}
                        onClick={() => setActiveOrg(org)}
                      >
                        <Avatar className="rounded size-4">
                          <AvatarFallback className="text-[8px]">
                            {org.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {org.name}
                      </DropdownMenuItem>
                    ))}
                    {organizations.length > 0 && <DropdownMenuSeparator />}
                    <CreateOrganizationDialog>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        Criar organização
                      </DropdownMenuItem>
                    </CreateOrganizationDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Navigation links */}
            <div className="flex h-full w-full flex-col">
              <div className="flex grow flex-col">
                <ScrollArea className="h-16 grow p-2">
                  <div className={cn("flex w-full flex-col gap-1")}>
                    {/* Dashboard link */}
                    <Link
                      href="/dashboard"
                      className={cn(
                        "flex h-9 w-full flex-row items-center rounded-md px-2 py-1.5 transition cursor-pointer hover:bg-muted hover:text-primary",
                        isDashboardActive && "bg-muted text-emerald-400",
                      )}
                    >
                      <LayoutDashboard className="h-5 w-5 shrink-0" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Início</p>
                        )}
                      </motion.li>
                    </Link>

                    {/* Chat menu with sessions submenu */}
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          if (isCollapsed) {
                            router.push("/chat");
                          } else {
                            setChatExpanded((prev) => !prev);
                          }
                        }}
                        className={cn(
                          "flex h-9 w-full flex-row items-center rounded-md px-2 py-1.5 transition cursor-pointer hover:bg-muted hover:text-primary",
                          isChatActive && "bg-muted text-emerald-400",
                        )}
                      >
                        <MessagesSquare className="h-5 w-5 shrink-0" />
                        <motion.li variants={variants} className="flex-1">
                          {!isCollapsed && (
                            <div className="ml-2 flex items-center justify-between">
                              <p className="text-sm font-medium">Chat</p>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 text-muted-foreground/60 transition-transform duration-200",
                                  !chatExpanded && "-rotate-90",
                                )}
                              />
                            </div>
                          )}
                        </motion.li>
                      </button>

                      {/* Sessions submenu */}
                      {!isCollapsed && (
                        <AnimatePresence initial={false}>
                          {chatExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-neutral-800 pl-2">
                                {/* New session button */}
                                <button
                                  type="button"
                                  onClick={handleNewSession}
                                  className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-sm font-medium text-white cursor-pointer hover:bg-emerald-500 transition mb-1"
                                  aria-label="Nova sessão"
                                >
                                  <Plus className="h-4 w-4" />
                                  Novo Chat
                                </button>

                                {/* Session list */}
                                <ScrollArea className="max-h-[40vh]">
                                  {sessionsLoading && (
                                    <p className="px-1 py-2 text-xs text-muted-foreground text-center">
                                      Carregando...
                                    </p>
                                  )}

                                  {!sessionsLoading &&
                                    sessions.length === 0 && (
                                      <p className="px-1 py-2 text-xs text-muted-foreground text-center">
                                        Nenhuma sessão.
                                      </p>
                                    )}

                                  {sessions.map((session) => (
                                    <div
                                      key={session.id}
                                      className={cn(
                                        "group relative flex w-full items-start rounded px-2 py-1.5 transition hover:bg-muted",
                                        session.id === activeSession?.id &&
                                          "bg-emerald-950 text-emerald-300",
                                      )}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSelectSession(session)
                                        }
                                        className="flex flex-1 min-w-0 flex-col gap-0 text-left cursor-pointer"
                                      >
                                        <span className="text-[13px] font-medium truncate block w-full">
                                          {session.title || "Sessão sem título"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatDate(session.created_at)}
                                        </span>
                                      </button>

                                      {confirmDeleteId === session.id ? (
                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              deleteSession(session.id);
                                              setConfirmDeleteId(null);
                                            }}
                                            className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-medium"
                                            title="Confirmar exclusão"
                                          >
                                            Sim
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setConfirmDeleteId(null)
                                            }
                                            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="Cancelar"
                                          >
                                            Não
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteId(session.id);
                                          }}
                                          className="shrink-0 ml-1 mt-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 cursor-pointer transition-opacity"
                                          aria-label="Excluir sessão"
                                          title="Excluir sessão"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </ScrollArea>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>

                    <Link
                      href="/documents"
                      className={cn(
                        "flex h-9 w-full flex-row items-center rounded-md px-2 py-1.5 transition cursor-pointer hover:bg-muted hover:text-primary",
                        pathname?.startsWith("/documents") &&
                          "bg-muted text-emerald-400",
                      )}
                    >
                      <FileText className="h-5 w-5 shrink-0" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Documentos</p>
                        )}
                      </motion.li>
                    </Link>

                    {activeOrg && (
                      <>
                        <Separator className="w-full" />
                        <Link
                          href={`/organizations/${activeOrg.id}/settings`}
                          className={cn(
                            "flex h-9 w-full flex-row items-center rounded-md px-2 py-1.5 transition cursor-pointer hover:bg-muted hover:text-primary",
                            pathname?.startsWith("/organizations") &&
                              "bg-muted text-emerald-400",
                          )}
                        >
                          <Settings className="h-5 w-5 shrink-0" />
                          <motion.li variants={variants}>
                            {!isCollapsed && (
                              <p className="ml-2 text-sm font-medium">
                                Configurações
                              </p>
                            )}
                          </motion.li>
                        </Link>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* User account section */}
              <div className="flex flex-col p-2">
                <div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="w-full">
                      <div className="flex h-9 w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 transition cursor-pointer hover:bg-muted hover:text-primary">
                        <Avatar className="size-5">
                          <AvatarFallback className="text-[9px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <motion.li
                          variants={variants}
                          className="flex w-full items-center gap-2"
                        >
                          {!isCollapsed && (
                            <>
                              <p className="text-sm font-medium truncate max-w-[120px]">
                                {displayName}
                              </p>
                              <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/50" />
                            </>
                          )}
                        </motion.li>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={5}>
                      <div className="flex flex-row items-center gap-2 p-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[11px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {displayName}
                          </span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <UserPen className="h-4 w-4" /> Editar Perfil
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" /> Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}
