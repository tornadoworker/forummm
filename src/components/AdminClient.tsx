'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatTimeAgo, formatCustomDate } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Shield,
  ShieldCheck,
  Folder,
  Tag,
  LifeBuoy,
  History,
  Activity,
  Settings,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit,
  Download,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Clock,
  Server,
  Database,
  BarChart2,
  Save,
  Check,
  AlertTriangle,
  RotateCcw,
  UserX,
  UserCheck,
  Ban,
  MessageSquare,
  MicOff,
  Edit3,
  User,
  Swords
} from 'lucide-react';
import {
  ModOverviewView,
  ModPostsView,
  ModUsersView,
  ModReportsView,
  ModWarningsView,
  ModBansView,
  ModLogsView,
} from '@/components/AdminModerationViews';
import {
  AdminCompetitionsView,
  AdminIntegrationsView,
} from '@/components/AdminIntegrationsAndCompetitionsViews';
import { WarnUserModal, BanUserModal } from '@/components/ModerationModals';

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'forums'
  | 'prefixes'
  | 'tickets'
  | 'audit'
  | 'settings'
  | 'competitions'
  | 'integrations'
  | 'mod-overview'
  | 'mod-posts'
  | 'mod-users'
  | 'mod-reports'
  | 'mod-warnings'
  | 'mod-bans'
  | 'mod-logs';

interface AdminClientProps {
  currentUser: any;
  stats: any;
  users: any[];
  roles: any[];
  categories: any[];
  prefixes: any[];
  tickets: any[];
  auditLogs: any[];
  systemInfo: {
    nodeVersion: string;
    platform: string;
    environment: string;
    serverAddress: string;
  };
  reports?: any[];
  warnings?: any[];
  banRecords?: any[];
  moderatedThreads?: any[];
  moderatedPosts?: any[];
  competitions?: any[];
  competitionMatches?: any[];
  integrationConfigs?: any[];
  integrationLogs?: any[];
}

export default function AdminClient({
  currentUser,
  stats,
  users: initialUsers,
  roles: initialRoles,
  categories: initialCategories,
  prefixes: initialPrefixes,
  tickets: initialTickets,
  auditLogs: initialAuditLogs,
  systemInfo,
  reports: initialReports = [],
  warnings: initialWarnings = [],
  banRecords: initialBanRecords = [],
  moderatedThreads: initialModeratedThreads = [],
  moderatedPosts: initialModeratedPosts = [],
  competitions = [],
  competitionMatches = [],
  integrationConfigs = [],
  integrationLogs = [],
}: AdminClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Feedback
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Moderation States
  const [reportsList, setReportsList] = useState(initialReports);
  const [warningsList, setWarningsList] = useState(initialWarnings);
  const [banRecordsList, setBanRecordsList] = useState(initialBanRecords);
  const [moderatedThreadsList, setModeratedThreadsList] = useState(initialModeratedThreads);
  const [moderatedPostsList, setModeratedPostsList] = useState(initialModeratedPosts);

  // Moderation Modals State in ACP
  const [acpWarnModalUser, setAcpWarnModalUser] = useState<any | null>(null);
  const [acpBanModalUser, setAcpBanModalUser] = useState<any | null>(null);
  const [acpBanType, setAcpBanType] = useState<'BAN' | 'MUTE'>('BAN');

  // 1. Benutzerverwaltung State
  const [usersList, setUsersList] = useState(initialUsers);
  const [userSearch, setUserSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [banModalUser, setBanModalUser] = useState<any | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [renameModalUser, setRenameModalUser] = useState<any | null>(null);
  const [newUsernameInput, setNewUsernameInput] = useState('');

  // 2. Rollenverwaltung State
  const [rolesList, setRolesList] = useState(initialRoles);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleForm, setRoleForm] = useState({
    displayName: '',
    name: '',
    color: '#8B5CF6',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    priority: 10,
  });
  const [rolePermissions, setRolePermissions] = useState<any>({});
  const [savingRole, setSavingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  // 3. Forenkanäle State
  const [categories, setCategories] = useState(initialCategories);
  const [newForumName, setNewForumName] = useState('');
  const [newForumDesc, setNewForumDesc] = useState('');
  const [newForumCategoryId, setNewForumCategoryId] = useState(initialCategories[0]?.id || '');
  const [newForumParentId, setNewForumParentId] = useState('');
  const [newForumRules, setNewForumRules] = useState('');
  const [creatingForum, setCreatingForum] = useState(false);
  const [editingForum, setEditingForum] = useState<any | null>(null);

  // 4. Präfixe State
  const [prefixesList, setPrefixesList] = useState(initialPrefixes);
  const [newPrefixName, setNewPrefixName] = useState('');
  const [newPrefixColor, setNewPrefixColor] = useState('#8B5CF6');
  const [newPrefixIsActive, setNewPrefixIsActive] = useState(true);
  const [newPrefixIsRequired, setNewPrefixIsRequired] = useState(false);
  const [newPrefixOrder, setNewPrefixOrder] = useState(0);
  const [creatingPrefix, setCreatingPrefix] = useState(false);
  const [editingPrefix, setEditingPrefix] = useState<any | null>(null);

  // 5. Support Tickets State
  const [ticketsList, setTicketsList] = useState(initialTickets);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');

  // 6. Audit Logs State
  const [auditLogsList, setAuditLogsList] = useState(initialAuditLogs);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditPage, setAuditPage] = useState(1);
  const itemsPerPage = 20;

  // 7. Systemeinstellungen State
  const [communityName, setCommunityName] = useState('Vega Crimelife');
  const [fivemAddress, setFivemAddress] = useState(systemInfo.serverAddress);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [savingSystem, setSavingSystem] = useState(false);

  const showMsg = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Benutzer aktualisieren (Rolle / Ban)
  const handleUserUpdate = async (userId: string, data: any) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });
      const resData = await res.json();
      if (!res.ok) {
        showMsg(resData.error || 'Fehler beim Aktualisieren.', true);
      } else {
        showMsg('Benutzerkonto erfolgreich aktualisiert.');
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...resData.user } : u))
        );
        setBanModalUser(null);
      }
    } catch {
      showMsg('Verbindung zum Server fehlgeschlagen.', true);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Rollenverwaltung Funktionen
  const startCreateRole = () => {
    setIsCreatingRole(true);
    setEditingRole(null);
    setRoleForm({
      displayName: '',
      name: '',
      color: '#8B5CF6',
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      priority: 10,
    });
    setRolePermissions({
      canCreateThreads: true,
      canEditPosts: false,
      canDeletePosts: false,
      canPinThreads: false,
      canCloseThreads: false,
      canMoveThreads: false,
      canManageCategories: false,
      canManageRoles: false,
      canAccessAdmin: false,
      canManageTickets: false,
      canViewInternalNotes: false,
      canBanUsers: false,
      canWarnUsers: false,
      canMuteUsers: false,
      canModerateForum: false,
      canEditWiki: false,
    });
  };

  const applyRolePreset = (type: 'admin' | 'moderator' | 'supporter' | 'member' | 'all' | 'none') => {
    if (type === 'all' || type === 'admin') {
      setRolePermissions({
        canAccessAdmin: true,
        canManageRoles: true,
        canManageCategories: true,
        canModerateForum: true,
        canPinThreads: true,
        canCloseThreads: true,
        canMoveThreads: true,
        canEditPosts: true,
        canDeletePosts: true,
        canBanUsers: true,
        canWarnUsers: true,
        canMuteUsers: true,
        canManageTickets: true,
        canViewInternalNotes: true,
        canEditWiki: true,
        canCreateThreads: true,
      });
      if (isCreatingRole && !roleForm.displayName) {
        setRoleForm((prev) => ({ ...prev, color: '#EF4444', badgeBg: 'rgba(239, 68, 68, 0.15)', priority: 80 }));
      }
    } else if (type === 'moderator') {
      setRolePermissions({
        canAccessAdmin: false,
        canManageRoles: false,
        canManageCategories: false,
        canModerateForum: true,
        canPinThreads: true,
        canCloseThreads: true,
        canMoveThreads: true,
        canEditPosts: true,
        canDeletePosts: true,
        canBanUsers: true,
        canWarnUsers: true,
        canMuteUsers: true,
        canManageTickets: true,
        canViewInternalNotes: true,
        canEditWiki: true,
        canCreateThreads: true,
      });
      if (isCreatingRole && !roleForm.displayName) {
        setRoleForm((prev) => ({ ...prev, color: '#8B5CF6', badgeBg: 'rgba(139, 92, 246, 0.15)', priority: 50 }));
      }
    } else if (type === 'supporter') {
      setRolePermissions({
        canAccessAdmin: false,
        canManageRoles: false,
        canManageCategories: false,
        canModerateForum: false,
        canPinThreads: false,
        canCloseThreads: false,
        canMoveThreads: false,
        canEditPosts: false,
        canDeletePosts: false,
        canBanUsers: false,
        canWarnUsers: true,
        canMuteUsers: true,
        canManageTickets: true,
        canViewInternalNotes: true,
        canEditWiki: false,
        canCreateThreads: true,
      });
      if (isCreatingRole && !roleForm.displayName) {
        setRoleForm((prev) => ({ ...prev, color: '#3B82F6', badgeBg: 'rgba(59, 130, 246, 0.15)', priority: 40 }));
      }
    } else if (type === 'member') {
      setRolePermissions({
        canAccessAdmin: false,
        canManageRoles: false,
        canManageCategories: false,
        canModerateForum: false,
        canPinThreads: false,
        canCloseThreads: false,
        canMoveThreads: false,
        canEditPosts: false,
        canDeletePosts: false,
        canBanUsers: false,
        canWarnUsers: false,
        canMuteUsers: false,
        canManageTickets: false,
        canViewInternalNotes: false,
        canEditWiki: false,
        canCreateThreads: true,
      });
      if (isCreatingRole && !roleForm.displayName) {
        setRoleForm((prev) => ({ ...prev, color: '#94A3B8', badgeBg: 'rgba(148, 163, 184, 0.15)', priority: 10 }));
      }
    } else {
      setRolePermissions({
        canAccessAdmin: false,
        canManageRoles: false,
        canManageCategories: false,
        canModerateForum: false,
        canPinThreads: false,
        canCloseThreads: false,
        canMoveThreads: false,
        canEditPosts: false,
        canDeletePosts: false,
        canBanUsers: false,
        canWarnUsers: false,
        canMuteUsers: false,
        canManageTickets: false,
        canViewInternalNotes: false,
        canEditWiki: false,
        canCreateThreads: false,
      });
    }
  };

  const startEditRole = (role: any) => {
    setIsCreatingRole(false);
    setEditingRole(role);
    setRoleForm({
      displayName: role.displayName || '',
      name: role.name || '',
      color: role.color || '#8B5CF6',
      badgeBg: role.badgeBg || 'rgba(139, 92, 246, 0.15)',
      priority: role.priority ?? 10,
    });
    setRolePermissions({
      canCreateThreads: Boolean(role.canCreateThreads),
      canEditPosts: Boolean(role.canEditPosts),
      canDeletePosts: Boolean(role.canDeletePosts),
      canPinThreads: Boolean(role.canPinThreads),
      canCloseThreads: Boolean(role.canCloseThreads),
      canMoveThreads: Boolean(role.canMoveThreads),
      canManageCategories: Boolean(role.canManageCategories),
      canManageRoles: Boolean(role.canManageRoles),
      canAccessAdmin: Boolean(role.canAccessAdmin),
      canManageTickets: Boolean(role.canManageTickets),
      canViewInternalNotes: Boolean(role.canViewInternalNotes),
      canBanUsers: Boolean(role.canBanUsers),
      canWarnUsers: Boolean(role.canWarnUsers),
      canMuteUsers: Boolean(role.canMuteUsers),
      canModerateForum: Boolean(role.canModerateForum),
      canEditWiki: Boolean(role.canEditWiki),
    });
  };

  const handleSaveRole = async () => {
    if (!editingRole && !isCreatingRole) return;
    setSavingRole(true);
    try {
      if (isCreatingRole) {
        const res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: roleForm.displayName,
            name: roleForm.name,
            color: roleForm.color,
            badgeBg: roleForm.badgeBg,
            priority: Number(roleForm.priority) || 10,
            permissions: rolePermissions,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showMsg(data.error || 'Fehler beim Erstellen der Rolle.', true);
        } else {
          showMsg(`Rolle "${data.role.displayName}" erfolgreich erstellt.`);
          setRolesList((prev) => [data.role, ...prev].sort((a, b) => b.priority - a.priority));
          setIsCreatingRole(false);
        }
      } else {
        const res = await fetch('/api/admin/roles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleId: editingRole.id,
            displayName: roleForm.displayName,
            color: roleForm.color,
            badgeBg: roleForm.badgeBg,
            priority: Number(roleForm.priority),
            permissions: rolePermissions,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showMsg(data.error || 'Fehler beim Speichern der Rolle.', true);
        } else {
          showMsg(`Rolle "${data.role.displayName}" erfolgreich aktualisiert.`);
          setRolesList((prev) =>
            prev
              .map((r) => (r.id === editingRole.id ? { ...r, ...data.role } : r))
              .sort((a, b) => b.priority - a.priority)
          );
          setEditingRole(null);
        }
      }
    } catch {
      showMsg('Serverfehler beim Speichern der Rolle.', true);
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (
      !confirm(
        `Möchtest du die Rolle "${roleName}" wirklich löschen? Zugeordnete Benutzer werden automatisch auf die Standard-Rolle "USER" zurückgesetzt.`
      )
    ) {
      return;
    }
    setDeletingRoleId(roleId);
    try {
      const res = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Fehler beim Löschen der Rolle.', true);
      } else {
        showMsg(`Rolle "${roleName}" erfolgreich gelöscht.`);
        setRolesList((prev) => prev.filter((r) => r.id !== roleId));
      }
    } catch {
      showMsg('Serverfehler beim Löschen der Rolle.', true);
    } finally {
      setDeletingRoleId(null);
    }
  };

  // Foren neu laden
  const reloadForums = async () => {
    try {
      const res = await fetch('/api/admin/forums');
      const data = await res.json();
      if (res.ok && data.categories) {
        setCategories(data.categories);
      }
    } catch {}
  };

  // Kanal oder Unterforum erstellen
  const handleCreateForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForumName.trim()) return;
    setCreatingForum(true);

    try {
      const res = await fetch('/api/admin/forums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: newForumCategoryId || categories[0]?.id,
          parentId: newForumParentId || null,
          name: newForumName.trim(),
          description: newForumDesc.trim(),
          rules: newForumRules.trim() || null,
          icon: 'MessageSquare',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Fehler beim Erstellen des Kanals.', true);
      } else {
        showMsg('Forenkanal erfolgreich hinzugefügt.');
        setNewForumName('');
        setNewForumDesc('');
        setNewForumParentId('');
        setNewForumRules('');
        await reloadForums();
      }
    } catch {
      showMsg('Serverfehler.', true);
    } finally {
      setCreatingForum(false);
    }
  };

  // Kanal aktualisieren
  const handleUpdateForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForum || !editingForum.name.trim()) return;

    try {
      const res = await fetch('/api/admin/forums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forumId: editingForum.id,
          name: editingForum.name.trim(),
          description: editingForum.description?.trim() || null,
          rules: editingForum.rules?.trim() || null,
          parentId: editingForum.parentId || null,
          categoryId: editingForum.categoryId,
          order: editingForum.order || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Fehler beim Aktualisieren des Kanals.', true);
      } else {
        showMsg('Forenkanal erfolgreich aktualisiert.');
        setEditingForum(null);
        await reloadForums();
      }
    } catch {
      showMsg('Serverfehler.', true);
    }
  };

  // Kanal löschen
  const handleDeleteForum = async (forumId: string) => {
    if (!confirm('Möchtest du diesen Forenkanal wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/admin/forums?forumId=${forumId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Fehler beim Löschen des Kanals.', true);
      } else {
        showMsg('Forenkanal gelöscht.');
        await reloadForums();
      }
    } catch {
      showMsg('Serverfehler.', true);
    }
  };

  // Präfixe neu laden
  const reloadPrefixes = async () => {
    try {
      const res = await fetch('/api/admin/prefixes');
      const data = await res.json();
      if (res.ok && data.prefixes) {
        setPrefixesList(data.prefixes);
      }
    } catch {}
  };

  // Neuen Präfix erstellen
  const handleCreatePrefix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefixName.trim()) return;
    setCreatingPrefix(true);

    try {
      const res = await fetch('/api/admin/prefixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPrefixName.trim(),
          color: newPrefixColor,
          bgColor: `${newPrefixColor}33`,
          isActive: newPrefixIsActive,
          isRequired: newPrefixIsRequired,
          order: Number(newPrefixOrder) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Fehler beim Erstellen des Präfix.', true);
      } else {
        showMsg('Themen-Präfix erfolgreich hinzugefügt.');
        setNewPrefixName('');
        await reloadPrefixes();
      }
    } catch {
      showMsg('Serverfehler.', true);
    } finally {
      setCreatingPrefix(false);
    }
  };

  // Präfix aktualisieren
  const handleUpdatePrefix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrefix || !editingPrefix.name.trim()) return;

    try {
      const res = await fetch('/api/admin/prefixes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefixId: editingPrefix.id,
          name: editingPrefix.name.trim(),
          color: editingPrefix.color,
          bgColor: editingPrefix.bgColor || `${editingPrefix.color}33`,
          isActive: editingPrefix.isActive,
          isRequired: editingPrefix.isRequired,
          order: Number(editingPrefix.order) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Fehler beim Aktualisieren des Präfix.', true);
      } else {
        showMsg('Präfix erfolgreich aktualisiert.');
        setEditingPrefix(null);
        await reloadPrefixes();
      }
    } catch {
      showMsg('Serverfehler.', true);
    }
  };

  // Präfix löschen
  const handleDeletePrefix = async (prefixId: string) => {
    if (!confirm('Möchtest du diesen Präfix wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/admin/prefixes?prefixId=${prefixId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || 'Fehler beim Löschen des Präfix.', true);
      } else {
        showMsg('Präfix gelöscht.');
        await reloadPrefixes();
      }
    } catch {
      showMsg('Serverfehler.', true);
    }
  };

  // Schnell-Umschaltung Präfix aktiv
  const handleTogglePrefixActive = async (prefix: any) => {
    try {
      const res = await fetch('/api/admin/prefixes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefixId: prefix.id,
          name: prefix.name,
          color: prefix.color,
          bgColor: prefix.bgColor,
          isActive: !prefix.isActive,
          isRequired: prefix.isRequired,
          order: prefix.order,
        }),
      });
      if (res.ok) {
        showMsg(`Präfix ${prefix.isActive ? 'deaktiviert' : 'aktiviert'}.`);
        await reloadPrefixes();
      }
    } catch {}
  };

  // Filter Benutzer
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = selectedRoleFilter ? u.roleId === selectedRoleFilter : true;
      const matchesStatus =
        selectedStatusFilter === 'BANNED'
          ? u.isBanned
          : selectedStatusFilter === 'ACTIVE'
          ? !u.isBanned
          : true;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersList, userSearch, selectedRoleFilter, selectedStatusFilter]);

  // Filter Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogsList.filter((log) => {
      const matchesSearch =
        (log.details || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.user?.username || '').toLowerCase().includes(auditSearch.toLowerCase());
      const matchesAction =
        auditActionFilter === 'ALL' ? true : log.action === auditActionFilter;
      return matchesSearch && matchesAction;
    });
  }, [auditLogsList, auditSearch, auditActionFilter]);

  // CSV Export für Audit Logs
  const handleExportAuditCsv = () => {
    const headers = ['Zeitpunkt', 'Ereignis', 'Benutzer', 'E-Mail', 'Details'];
    const rows = filteredAuditLogs.map((log) => [
      new Date(log.createdAt).toLocaleString('de-DE'),
      log.action,
      log.user?.username || 'System',
      log.user?.email || '-',
      `"${(log.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vega_crimelife_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Moderations Handlers
  const handleResolveReport = async (reportId: string, status: string, note?: string) => {
    try {
      const res = await fetch('/api/moderation/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status, resolutionNote: note }),
      });
      if (res.ok) {
        showMsg(`Meldung als ${status} markiert.`);
        setReportsList((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status, resolutionNote: note } : r))
        );
      }
    } catch {
      showMsg('Fehler beim Aktualisieren der Meldung.', true);
    }
  };

  const handleThreadModAction = async (threadId: string, action: string, data?: any) => {
    try {
      const res = await fetch('/api/moderation/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, action, ...data }),
      });
      const resData = await res.json();
      if (!res.ok) {
        showMsg(resData.error || 'Fehler bei der Moderation.', true);
      } else {
        showMsg('Thema erfolgreich aktualisiert.');
        setModeratedThreadsList((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, ...resData.thread } : t))
        );
      }
    } catch {
      showMsg('Serverfehler.', true);
    }
  };

  const handlePostModAction = async (postId: string, action: string, data?: any) => {
    try {
      const res = await fetch('/api/moderation/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, ...data }),
      });
      const resData = await res.json();
      if (!res.ok) {
        showMsg(resData.error || 'Fehler bei der Beitrags-Moderation.', true);
      } else {
        showMsg('Beitrag erfolgreich aktualisiert.');
        setModeratedPostsList((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, ...resData.post } : p))
        );
      }
    } catch {
      showMsg('Serverfehler.', true);
    }
  };

  const handleRevokeWarning = async (warningId: string) => {
    try {
      const res = await fetch('/api/moderation/warnings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warningId }),
      });
      if (res.ok) {
        showMsg('Verwarnung erfolgreich zurückgenommen.');
        setWarningsList((prev) =>
          prev.map((w) => (w.id === warningId ? { ...w, isRevoked: true } : w))
        );
      }
    } catch {
      showMsg('Fehler beim Zurücknehmen der Verwarnung.', true);
    }
  };

  const handleRevokeBan = async (userId: string, type: 'BAN' | 'MUTE') => {
    try {
      const res = await fetch('/api/moderation/bans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type }),
      });
      if (res.ok) {
        showMsg(`${type === 'MUTE' ? 'Schreibsperre' : 'Kontosperre'} erfolgreich aufgehoben.`);
        setBanRecordsList((prev) =>
          prev.map((b) => (b.userId === userId && b.type === type ? { ...b, isActive: false } : b))
        );
        setUsersList((prev) =>
          prev.map((u) => {
            if (u.id !== userId) return u;
            if (type === 'MUTE') return { ...u, isMuted: false };
            return { ...u, isBanned: false };
          })
        );
      }
    } catch {
      showMsg('Fehler beim Aufheben der Sperre.', true);
    }
  };

  // Navigationsstruktur
  const navGroups = [
    {
      title: 'Übersicht',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'audit', label: 'Audit Logs', icon: Activity },
      ],
    },
    {
      title: 'Moderation',
      items: [
        { id: 'mod-overview', label: 'Moderationsübersicht', icon: Shield },
        { id: 'mod-posts', label: 'Beiträge & Themen', icon: MessageSquare },
        { id: 'mod-users', label: 'Benutzer moderieren', icon: UserX },
        { id: 'mod-reports', label: 'Meldungen', icon: AlertTriangle },
        { id: 'mod-warnings', label: 'Verwarnungen', icon: AlertCircle },
        { id: 'mod-bans', label: 'Sperren', icon: Ban },
        { id: 'mod-logs', label: 'Moderationsprotokolle', icon: History },
      ],
    },
    {
      title: 'Community',
      items: [
        { id: 'users', label: 'Benutzerverwaltung', icon: Users },
        { id: 'roles', label: 'Rollen & Rechte', icon: ShieldCheck },
        { id: 'forums', label: 'Forenkanäle', icon: Folder },
        { id: 'prefixes', label: 'Themen-Präfixe', icon: Tag },
      ],
    },
    {
      title: 'Gaming & API',
      items: [
        { id: 'competitions', label: 'Wettbewerbe & Duelle', icon: Swords },
        { id: 'integrations', label: 'Integrationsstatus & API', icon: Server },
      ],
    },
    {
      title: 'Support',
      items: [{ id: 'tickets', label: 'Support Tickets', icon: LifeBuoy }],
    },
    {
      title: 'System',
      items: [{ id: 'settings', label: 'Systemeinstellungen', icon: Settings }],
    },
  ];

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F5] flex flex-col font-sans">
      {/* 1. OBERER ACP HEADER (Höhe: 60px) */}
      <header className="h-[60px] bg-[#111111] border-b border-[#292929] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] rounded-[6px]"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* ACP Logo & Titel */}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Vega Crimelife Logo"
              className="h-8 w-auto object-contain shrink-0"
            />
            <span className="font-extrabold text-sm tracking-wider text-[#F5F5F5] uppercase">
              Vega Crimelife <span className="text-[#8B5CF6]">ACP</span>
            </span>
          </div>

          <span className="text-[#525252] hidden sm:inline">•</span>

          {/* Breadcrumb Navigation */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#A3A3A3]">
            <span>Administration</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#525252]" />
            <span className="text-[#F5F5F5] font-medium capitalize">
              {activeTab === 'dashboard'
                ? 'Dashboard'
                : activeTab === 'users'
                ? 'Benutzer'
                : activeTab === 'roles'
                ? 'Rollen'
                : activeTab === 'forums'
                ? 'Foren'
                : activeTab === 'prefixes'
                ? 'Präfixe'
                : activeTab === 'tickets'
                ? 'Tickets'
                : activeTab === 'competitions'
                ? 'Wettbewerbe & Duelle'
                : activeTab === 'integrations'
                ? 'Integrationsstatus & API'
                : activeTab === 'audit'
                ? 'Audit Logs'
                : 'Einstellungen'}
            </span>
          </div>
        </div>

        {/* Rechte Aktionen */}
        <div className="flex items-center gap-3">
          {/* Admin Profil Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[#161616] border border-[#292929] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-[#F5F5F5]">{currentUser.username}</span>
            <span className="text-[10px] text-[#8B5CF6] font-medium hidden sm:inline">
              ({currentUser.role?.displayName || 'Projektleitung'})
            </span>
          </div>

          {/* Zurück zum Forum */}
          <Link
            href="/"
            className="h-8 px-3 bg-[#161616] hover:bg-[#202020] text-[#A3A3A3] hover:text-[#F5F5F5] text-xs font-medium rounded-[6px] border border-[#292929] transition inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Zum Forum</span>
          </Link>
        </div>
      </header>

      {/* Globales Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-16 right-6 z-50 p-3 rounded-[6px] text-xs shadow-2xl flex items-center gap-2 border ${
            feedback.isError
              ? 'bg-red-950/90 border-red-500/40 text-red-200'
              : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 2. HAUPTBEREICH: SIDEBAR (250px) & CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LINKE SIDEBAR (250px) */}
        <aside
          className={`w-[250px] shrink-0 bg-[#111111] border-r border-[#292929] flex flex-col justify-between transition-all duration-200 z-30 ${
            sidebarOpen ? 'fixed inset-y-0 left-0 top-[60px]' : 'hidden md:flex'
          }`}
        >
          <div className="p-3.5 space-y-4 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <span className="px-2.5 text-[10px] text-[#737373] uppercase font-bold tracking-wider">
                  {group.title}
                </span>

                <div className="space-y-0.5 pt-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id as AdminTab);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[6px] transition text-left ${
                          isActive
                            ? 'bg-[#161616] text-[#F5F5F5] border-l-2 border-[#8B5CF6] pl-2.5'
                            : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616]'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-[#8B5CF6]' : 'text-[#737373]'
                          }`}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3.5 border-t border-[#292929] text-[11px] text-[#737373] space-y-1">
            <div className="flex items-center justify-between">
              <span>ACP Version</span>
              <span className="font-mono text-[#F5F5F5]">2.0 Stable</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Node Environment</span>
              <span className="text-[#8B5CF6]">{systemInfo.environment}</span>
            </div>
          </div>
        </aside>

        {/* RECHTER INHALTSBEREICH (CONTENT-FLÄCHEN #161616, MAX 1500px) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#090909]">
          <div className="max-w-[1500px] mx-auto space-y-6">
            {/* ========================================================================= */}
            {/* TAB 1: DASHBOARD */}
            {/* ========================================================================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-[#F5F5F5]">ACP Dashboard</h1>
                  <p className="text-xs text-[#A3A3A3]">
                    Zentrale Übersicht und Status des Vega Crimelife Community Forums.
                  </p>
                </div>

                {/* Kompakte Statistik-Karten (6 Kennzahlen) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                    <span className="text-[11px] text-[#737373] block">Mitglieder</span>
                    <span className="text-lg font-bold text-[#F5F5F5]">{stats.usersCount}</span>
                  </div>
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                    <span className="text-[11px] text-[#737373] block">Aktiv (Frei)</span>
                    <span className="text-lg font-bold text-emerald-400">{stats.activeUsersCount}</span>
                  </div>
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                    <span className="text-[11px] text-[#737373] block">Themen</span>
                    <span className="text-lg font-bold text-[#F5F5F5]">{stats.threadsCount}</span>
                  </div>
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                    <span className="text-[11px] text-[#737373] block">Beiträge</span>
                    <span className="text-lg font-bold text-[#F5F5F5]">{stats.postsCount}</span>
                  </div>
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                    <span className="text-[11px] text-[#737373] block">Offene Tickets</span>
                    <span className="text-lg font-bold text-[#8B5CF6]">{stats.openTicketsCount}</span>
                  </div>
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                    <span className="text-[11px] text-[#737373] block">Gesperrt</span>
                    <span className="text-lg font-bold text-red-400">{stats.bannedUsersCount}</span>
                  </div>
                </div>

                {/* 2-Spalten Grid: Letzte Aktivitäten & Systeminfos */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Letzte Audit-Aktivitäten (2 Spalten breit) */}
                  <div className="lg:col-span-2 bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden">
                    <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#8B5CF6]" />
                        <h2 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wide">
                          Letzte System- & Moderationsaktivitäten
                        </h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('audit')}
                        className="text-[11px] text-[#8B5CF6] hover:text-[#7C3AED] transition font-medium"
                      >
                        Alle Logs ansehen
                      </button>
                    </div>

                    <div className="divide-y divide-[#292929] text-xs">
                      {auditLogsList.slice(0, 7).map((log) => (
                        <div key={log.id} className="p-3 hover:bg-[#202020] transition flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-[#8B5CF6] bg-[#111111] px-1.5 py-0.2 rounded border border-[#292929]">
                                {log.action}
                              </span>
                              <span className="font-medium text-[#F5F5F5]">
                                {log.user?.username || 'System'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#A3A3A3] truncate">{log.details}</p>
                          </div>
                          <span className="text-[10px] text-[#737373] shrink-0">
                            {formatTimeAgo(log.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Systeminformationen (1 Spalte) */}
                  <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 space-y-4">
                    <div className="border-b border-[#292929] pb-2 flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#8B5CF6]" />
                      <h2 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wide">
                        Systeminformationen
                      </h2>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-[#292929]/50">
                        <span className="text-[#A3A3A3]">Node.js Runtime</span>
                        <span className="font-mono text-[#F5F5F5]">{systemInfo.nodeVersion}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#292929]/50">
                        <span className="text-[#A3A3A3]">Betriebssystem</span>
                        <span className="text-[#F5F5F5] capitalize">{systemInfo.platform}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#292929]/50">
                        <span className="text-[#A3A3A3]">Datenbank</span>
                        <span className="text-[#F5F5F5]">SQLite via Prisma ORM</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#292929]/50">
                        <span className="text-[#A3A3A3]">Server-IP (FiveM)</span>
                        <span className="font-mono text-[#8B5CF6]">{systemInfo.serverAddress}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#A3A3A3]">Authentifizierung</span>
                        <span className="text-emerald-400">JWT (Jose) + RBAC</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: BENUTZERVERWALTUNG */}
            {/* ========================================================================= */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-[#F5F5F5]">Benutzerverwaltung</h1>
                    <p className="text-xs text-[#A3A3A3]">
                      Übersicht, Rollenverwaltung und Moderation aller registrierten Konten.
                    </p>
                  </div>
                  <span className="text-xs text-[#737373]">
                    Gefiltert: {filteredUsers.length} von {usersList.length} Mitgliedern
                  </span>
                </div>

                {/* Filter- & Suchleiste */}
                <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-3 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Benutzername oder E-Mail suchen..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 pl-9 text-xs text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-3.5" />
                  </div>

                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="">Alle Rollen</option>
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.displayName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="ALL">Alle Status</option>
                    <option value="ACTIVE">Nur Aktive</option>
                    <option value="BANNED">Nur Gesperrte</option>
                  </select>
                </div>

                {/* Benutzertabelle */}
                <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden text-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#111111] border-b border-[#292929] text-[11px] uppercase font-semibold text-[#737373]">
                        <tr>
                          <th className="px-4 py-3">Benutzer</th>
                          <th className="px-4 py-3">E-Mail</th>
                          <th className="px-4 py-3">Rolle</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Registriert</th>
                          <th className="px-4 py-3 text-right">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#292929]">
                        {filteredUsers.map((u) => {
                          const isCurrentUser = u.id === currentUser.id;
                          const isProjectLead = u.role.name === 'PROJEKTLEITUNG';

                          return (
                            <tr key={u.id} className="hover:bg-[#202020] transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  {u.avatarUrl ? (
                                    <img
                                      src={u.avatarUrl}
                                      alt=""
                                      className="w-7 h-7 rounded-full object-cover border border-[#292929]"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6] font-bold text-[10px]">
                                      {u.username.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <Link
                                        href={`/user/${u.username}`}
                                        className="font-bold text-[#F5F5F5] hover:text-[#8B5CF6] transition block"
                                      >
                                        {u.username}
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRenameModalUser(u);
                                          setNewUsernameInput(u.username);
                                        }}
                                        title="Benutzername ändern (Admin)"
                                        className="text-[#737373] hover:text-[#8B5CF6] transition p-0.5"
                                      >
                                        <Edit3 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                    {u.displayName && (
                                      <span className="text-[10px] text-[#737373]">
                                        {u.displayName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-[#A3A3A3] font-mono text-[11px]">
                                {u.email}
                              </td>

                              <td className="px-4 py-3">
                                <select
                                  disabled={isCurrentUser || (isProjectLead && currentUser.role.name !== 'PROJEKTLEITUNG')}
                                  value={u.roleId}
                                  onChange={(e) => handleUserUpdate(u.id, { roleId: e.target.value })}
                                  className="h-7 bg-[#101010] border border-[#292929] rounded px-2 text-[11px] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                                >
                                  {rolesList.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.displayName}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="px-4 py-3">
                                {u.isBanned ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/40 text-red-400 border border-red-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                    <span>Gesperrt</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Aktiv</span>
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-[#737373] text-[11px]">
                                {new Date(u.createdAt).toLocaleDateString('de-DE')}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {!isCurrentUser && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (u.isBanned) {
                                        handleUserUpdate(u.id, { isBanned: false });
                                      } else {
                                        setBanModalUser(u);
                                        setBanReasonInput('');
                                      }
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-medium rounded border transition ${
                                      u.isBanned
                                        ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
                                        : 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-500/30'
                                    }`}
                                  >
                                    {u.isBanned ? 'Entsperren' : 'Sperren'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sperr-Modal */}
                {banModalUser && (
                  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-4 shadow-2xl">
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-red-400">
                          Benutzer sperren: {banModalUser.username}
                        </h3>
                        <p className="text-xs text-[#A3A3A3]">
                          Gesperrte Benutzer können sich nicht mehr anmelden oder Beiträge verfassen.
                        </p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <label className="block text-[#F5F5F5] font-medium">Sperrgrund:</label>
                        <textarea
                          rows={3}
                          value={banReasonInput}
                          onChange={(e) => setBanReasonInput(e.target.value)}
                          placeholder="z.B. Regelverstoß Paragraph 4..."
                          className="w-full bg-[#101010] border border-[#292929] rounded-[6px] p-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setBanModalUser(null)}
                          className="px-3.5 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] bg-[#111111] rounded-[6px] border border-[#292929]"
                        >
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUserUpdate(banModalUser.id, {
                              isBanned: true,
                              banReason: banReasonInput,
                            })
                          }
                          className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-[6px]"
                        >
                          Sperre bestätigen
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Umbenennungs-Modal */}
                {renameModalUser && (
                  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#8B5CF6]" />
                          <h3 className="text-base font-bold text-[#F5F5F5]">
                            Benutzername ändern (Admin)
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRenameModalUser(null)}
                          className="text-[#737373] hover:text-[#F5F5F5]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-[#A3A3A3] space-y-1">
                        <p>
                          Aktueller Name: <strong className="text-[#F5F5F5] font-mono">{renameModalUser.username}</strong>
                        </p>
                        <p className="text-[11px] text-[#737373]">
                          Als Administrator darfst du Namen jederzeit ohne 90-Tage-Wartezeit festlegen.
                        </p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <label className="block text-[#F5F5F5] font-medium">Neuer Benutzername:</label>
                        <input
                          type="text"
                          value={newUsernameInput}
                          onChange={(e) => setNewUsernameInput(e.target.value)}
                          placeholder="z. B. NeuerBenutzername"
                          className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>

                      <div className="flex justify-end gap-2.5 pt-2 border-t border-[#292929]">
                        <button
                          type="button"
                          onClick={() => setRenameModalUser(null)}
                          className="px-3.5 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] bg-[#111111] rounded-[6px] border border-[#292929]"
                        >
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          disabled={!newUsernameInput.trim() || newUsernameInput.trim() === renameModalUser.username}
                          onClick={async () => {
                            await handleUserUpdate(renameModalUser.id, {
                              username: newUsernameInput.trim(),
                            });
                            setRenameModalUser(null);
                          }}
                          className="px-4 py-1.5 text-xs font-medium text-white bg-[#8B5CF6] hover:bg-[#A78BFA] rounded-[6px] disabled:opacity-40"
                        >
                          Name speichern
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: ROLLEN & RECHTE */}
            {/* ========================================================================= */}
            {activeTab === 'roles' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-[#F5F5F5]">Rollen & Berechtigungen (RBAC)</h1>
                    <p className="text-xs text-[#A3A3A3]">
                      Erstelle und verwalte Rollen, Rangordnung (Priorität) und fein abgestimmte Berechtigungen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCreateRole}
                    className="self-start sm:self-auto h-9 px-3.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition inline-flex items-center gap-1.5 shadow-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Neue Rolle erstellen</span>
                  </button>
                </div>

                {/* Rollen-Statistik Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5">
                    <span className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block">
                      Gesamte Rollen
                    </span>
                    <span className="text-xl font-bold text-[#F5F5F5] mt-1 block">
                      {rolesList.length}
                    </span>
                  </div>
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5">
                    <span className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block">
                      Administrative Rollen
                    </span>
                    <span className="text-xl font-bold text-emerald-400 mt-1 block">
                      {rolesList.filter((r) => r.canAccessAdmin).length}
                    </span>
                  </div>
                  <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-3.5">
                    <span className="text-[11px] font-medium text-[#737373] uppercase tracking-wider block">
                      Moderations-Rollen
                    </span>
                    <span className="text-xl font-bold text-[#8B5CF6] mt-1 block">
                      {rolesList.filter((r) => r.canModerateForum || r.canBanUsers).length}
                    </span>
                  </div>
                </div>

                {/* Rollentabelle */}
                <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden text-xs shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-[#111111] border-b border-[#292929] text-[11px] uppercase font-semibold text-[#737373]">
                      <tr>
                        <th className="px-4 py-3">Rolle / Badge</th>
                        <th className="px-4 py-3">System-Schlüssel</th>
                        <th className="px-4 py-3 text-center">Priorität</th>
                        <th className="px-4 py-3 text-center">Mitglieder</th>
                        <th className="px-4 py-3 text-center">ACP Zugriff</th>
                        <th className="px-4 py-3 text-center">Moderation</th>
                        <th className="px-4 py-3 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#292929]">
                      {rolesList.map((r) => {
                        const isProtected = ['PROJEKTLEITUNG', 'ADMINISTRATOR', 'MITGLIED', 'GAST', 'USER'].includes(r.name) || r.priority >= 100;
                        return (
                          <tr key={r.id} className="hover:bg-[#1D1D1D] transition">
                            <td className="px-4 py-3">
                              <span
                                className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider inline-block shadow-sm"
                                style={{
                                  color: r.color,
                                  backgroundColor: r.badgeBg || (r.color + '26'),
                                }}
                              >
                                {r.displayName}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#A3A3A3]">
                              {r.name}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 bg-[#111111] border border-[#292929] rounded text-[10px] font-mono text-[#F5F5F5]">
                                {r.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-[#F5F5F5]">
                              {r._count?.users || 0}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {r.canAccessAdmin ? (
                                <span className="px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 rounded text-[10px] font-semibold">
                                  Ja
                                </span>
                              ) : (
                                <span className="text-[#525252] text-[11px]">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {r.canModerateForum || r.canBanUsers ? (
                                <span className="px-1.5 py-0.5 bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 text-[#8B5CF6] rounded text-[10px] font-semibold">
                                  Ja
                                </span>
                              ) : (
                                <span className="text-[#525252] text-[11px]">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditRole(r)}
                                  className="px-2.5 py-1 bg-[#111111] hover:bg-[#202020] text-[#F5F5F5] rounded-[4px] border border-[#292929] transition inline-flex items-center gap-1"
                                  title="Rolle bearbeiten"
                                >
                                  <Edit className="w-3 h-3 text-[#8B5CF6]" />
                                  <span>Bearbeiten</span>
                                </button>

                                {!isProtected && (
                                  <button
                                    type="button"
                                    disabled={deletingRoleId === r.id}
                                    onClick={() => handleDeleteRole(r.id, r.displayName)}
                                    className="p-1 bg-[#111111] hover:bg-red-950/40 text-[#737373] hover:text-red-400 rounded-[4px] border border-[#292929] transition disabled:opacity-50"
                                    title="Rolle löschen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Rollen Erstellen / Bearbeiten Modal */}
                {(editingRole || isCreatingRole) && (
                  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
                      <div className="border-b border-[#292929] pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#8B5CF6]" />
                            <span>
                              {isCreatingRole
                                ? 'Neue Benutzerrolle erstellen'
                                : `Rolle bearbeiten: ${editingRole.displayName}`}
                            </span>
                          </h3>
                          <p className="text-xs text-[#A3A3A3]">
                            Definiere Name, Rangstufe, Badge-Farbe und detaillierte Systemrechte.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRole(null);
                            setIsCreatingRole(false);
                          }}
                          className="text-[#737373] hover:text-[#F5F5F5]"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4 overflow-y-auto pr-2 flex-1 text-xs">
                        {/* Allgemeine Daten */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#111111] p-3.5 rounded-[6px] border border-[#292929]">
                          <div>
                            <label className="block text-[#A3A3A3] mb-1 font-medium">Anzeigename *</label>
                            <input
                              type="text"
                              required
                              value={roleForm.displayName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRoleForm((prev) => ({
                                  ...prev,
                                  displayName: val,
                                  name: isCreatingRole
                                    ? val.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
                                    : prev.name,
                                }));
                              }}
                              placeholder="z.B. Moderator, Supporter, VIP..."
                              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                            />
                          </div>

                          <div>
                            <label className="block text-[#A3A3A3] mb-1 font-medium">
                              System-Schlüssel (Identifier) *
                            </label>
                            <input
                              type="text"
                              disabled={!isCreatingRole}
                              value={roleForm.name}
                              onChange={(e) =>
                                setRoleForm({ ...roleForm, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })
                              }
                              placeholder="z.B. SENIOR_MODERATOR"
                              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-50 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[#A3A3A3] mb-1 font-medium">
                              Priorität (Rangstufe 0 - 99)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={roleForm.priority}
                              onChange={(e) =>
                                setRoleForm({ ...roleForm, priority: parseInt(e.target.value, 10) || 0 })
                              }
                              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                            />
                            <span className="text-[10px] text-[#737373] mt-0.5 block">
                              Bestimmt Rangordnung & Moderationshierarchie.
                            </span>
                          </div>

                          <div>
                            <label className="block text-[#A3A3A3] mb-1 font-medium">Rollenfarbe</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={roleForm.color.startsWith('#') ? roleForm.color : '#8B5CF6'}
                                onChange={(e) => {
                                  const hex = e.target.value;
                                  setRoleForm({
                                    ...roleForm,
                                    color: hex,
                                    badgeBg: `${hex}26`,
                                  });
                                }}
                                className="w-8 h-8 rounded bg-[#101010] border border-[#292929] cursor-pointer"
                              />
                              <input
                                type="text"
                                value={roleForm.color}
                                onChange={(e) => {
                                  const hex = e.target.value;
                                  setRoleForm({
                                    ...roleForm,
                                    color: hex,
                                    badgeBg: hex.startsWith('#') ? `${hex}26` : roleForm.badgeBg,
                                  });
                                }}
                                className="flex-1 bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] font-mono"
                              />
                            </div>
                          </div>

                          {/* Live-Vorschau */}
                          <div className="sm:col-span-2 pt-2 border-t border-[#292929] flex items-center justify-between">
                            <span className="text-[11px] text-[#737373]">Live-Vorschau der Badge:</span>
                            <span
                              className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-sm"
                              style={{
                                color: roleForm.color || '#8B5CF6',
                                backgroundColor: roleForm.badgeBg || '#111111',
                              }}
                            >
                              {roleForm.displayName || 'VORSCHAU'}
                            </span>
                          </div>
                        </div>

                        {/* Berechtigungs-Gruppen */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                              Berechtigungs-Konfiguration
                            </h4>
                            <span className="text-[11px] text-[#737373]">
                              Wähle eine Vorlage oder konfiguriere Rechte einzeln
                            </span>
                          </div>

                          {/* 1-Klick Rechte-Vorlagen */}
                          <div className="bg-[#111111] p-2.5 rounded-[6px] border border-[#292929] space-y-1.5">
                            <span className="text-[10px] text-[#A3A3A3] font-semibold uppercase tracking-wider block">
                              Schnellauswahl / Rechte-Vorlage anwenden:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => applyRolePreset('admin')}
                                className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-[#EF4444] border border-[#EF4444]/30 rounded-[4px] text-[11px] font-medium transition"
                              >
                                Administrator
                              </button>
                              <button
                                type="button"
                                onClick={() => applyRolePreset('moderator')}
                                className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-[#8B5CF6] border border-[#8B5CF6]/30 rounded-[4px] text-[11px] font-medium transition"
                              >
                                Moderator
                              </button>
                              <button
                                type="button"
                                onClick={() => applyRolePreset('supporter')}
                                className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-[#3B82F6] border border-[#3B82F6]/30 rounded-[4px] text-[11px] font-medium transition"
                              >
                                Supporter
                              </button>
                              <button
                                type="button"
                                onClick={() => applyRolePreset('member')}
                                className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-[#A3A3A3] border border-[#292929] rounded-[4px] text-[11px] font-medium transition"
                              >
                                Standard-Mitglied
                              </button>
                              <button
                                type="button"
                                onClick={() => applyRolePreset('all')}
                                className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-emerald-400 border border-emerald-500/30 rounded-[4px] text-[11px] font-medium transition sm:ml-auto"
                              >
                                Alle Rechte
                              </button>
                              <button
                                type="button"
                                onClick={() => applyRolePreset('none')}
                                className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-[#737373] border border-[#292929] rounded-[4px] text-[11px] font-medium transition"
                              >
                                Alle abwählen
                              </button>
                            </div>
                          </div>

                          {/* 1. Administration */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider">
                              1. Administration & ACP
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {[
                                { key: 'canAccessAdmin', label: 'Zugang zum Admin Control Panel (ACP)' },
                                { key: 'canManageRoles', label: 'Rollen & Rechte verwalten' },
                                { key: 'canManageCategories', label: 'Foren & Kanäle verwalten' },
                              ].map((p) => (
                                <label
                                  key={p.key}
                                  className="p-2.5 rounded-[6px] bg-[#111111] border border-[#292929] hover:border-[#383838] transition flex items-center justify-between cursor-pointer"
                                >
                                  <span className="text-[#F5F5F5] font-medium pr-2">{p.label}</span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(rolePermissions[p.key])}
                                    onChange={(e) =>
                                      setRolePermissions({ ...rolePermissions, [p.key]: e.target.checked })
                                    }
                                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer shrink-0"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 2. Moderation */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider">
                              2. Forum-Moderation
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {[
                                { key: 'canModerateForum', label: 'Forum & Moderations-Center verwalten' },
                                { key: 'canPinThreads', label: 'Themen oben anpinnen' },
                                { key: 'canCloseThreads', label: 'Themen schließen & sperren' },
                                { key: 'canMoveThreads', label: 'Themen verschieben' },
                                { key: 'canEditPosts', label: 'Fremde Beiträge editieren' },
                                { key: 'canDeletePosts', label: 'Fremde Beiträge löschen' },
                              ].map((p) => (
                                <label
                                  key={p.key}
                                  className="p-2.5 rounded-[6px] bg-[#111111] border border-[#292929] hover:border-[#383838] transition flex items-center justify-between cursor-pointer"
                                >
                                  <span className="text-[#F5F5F5] font-medium pr-2">{p.label}</span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(rolePermissions[p.key])}
                                    onChange={(e) =>
                                      setRolePermissions({ ...rolePermissions, [p.key]: e.target.checked })
                                    }
                                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer shrink-0"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 3. Benutzersanktionen */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider">
                              3. Sanktionen & Benutzerverwaltung
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {[
                                { key: 'canBanUsers', label: 'Benutzer sperren / sanktionieren' },
                                { key: 'canWarnUsers', label: 'Verwarnungen aussprechen' },
                                { key: 'canMuteUsers', label: 'Schreibsperren (Mutes) verhängen' },
                              ].map((p) => (
                                <label
                                  key={p.key}
                                  className="p-2.5 rounded-[6px] bg-[#111111] border border-[#292929] hover:border-[#383838] transition flex items-center justify-between cursor-pointer"
                                >
                                  <span className="text-[#F5F5F5] font-medium pr-2">{p.label}</span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(rolePermissions[p.key])}
                                    onChange={(e) =>
                                      setRolePermissions({ ...rolePermissions, [p.key]: e.target.checked })
                                    }
                                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer shrink-0"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 4. Support & Wiki */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider">
                              4. Support, Tickets & Wiki
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {[
                                { key: 'canManageTickets', label: 'Support Tickets bearbeiten' },
                                { key: 'canViewInternalNotes', label: 'Interne Ticket-Notizen einsehen' },
                                { key: 'canEditWiki', label: 'Wiki-Artikel verfassen & anpassen' },
                                { key: 'canCreateThreads', label: 'Neue Themen in Kanälen erstellen' },
                              ].map((p) => (
                                <label
                                  key={p.key}
                                  className="p-2.5 rounded-[6px] bg-[#111111] border border-[#292929] hover:border-[#383838] transition flex items-center justify-between cursor-pointer"
                                >
                                  <span className="text-[#F5F5F5] font-medium pr-2">{p.label}</span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(rolePermissions[p.key])}
                                    onChange={(e) =>
                                      setRolePermissions({ ...rolePermissions, [p.key]: e.target.checked })
                                    }
                                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer shrink-0"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2.5 pt-3 border-t border-[#292929]">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRole(null);
                            setIsCreatingRole(false);
                          }}
                          className="px-3.5 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] bg-[#111111] rounded-[6px] border border-[#292929]"
                        >
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          disabled={savingRole || !roleForm.displayName.trim()}
                          onClick={handleSaveRole}
                          className="px-4 py-1.5 text-xs font-medium text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-[6px] transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingRole ? 'Wird gespeichert...' : isCreatingRole ? 'Rolle erstellen' : 'Berechtigungen speichern'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: FORENKANÄLE & STRUKTUR */}
            {/* ========================================================================= */}
            {activeTab === 'forums' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-[#F5F5F5]">Forenkanäle & Struktur</h1>
                    <p className="text-xs text-[#A3A3A3]">
                      Verwalte Hauptforen, Unterforen, Kanalregeln und Forenkategorien.
                    </p>
                  </div>
                  <span className="text-xs text-[#737373]">
                    {categories.length} Kategorien • {categories.reduce((acc, c) => acc + (c.forums?.length || 0), 0)} Kanäle
                  </span>
                </div>

                {/* Foren nach Kategorien gruppiert */}
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const mainForums = cat.forums?.filter((f: any) => !f.parentId) || [];
                    const subForums = cat.forums?.filter((f: any) => Boolean(f.parentId)) || [];

                    return (
                      <div
                        key={cat.id}
                        className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden text-xs shadow-sm"
                      >
                        <div className="bg-[#111111] px-4 py-2.5 border-b border-[#292929] flex items-center justify-between">
                          <span className="font-bold text-xs uppercase tracking-wide text-[#F5F5F5] flex items-center gap-2">
                            <Folder className="w-3.5 h-3.5 text-[#8B5CF6]" />
                            <span>{cat.name}</span>
                          </span>
                          <span className="text-[10px] text-[#737373]">
                            {mainForums.length} Hauptforen • {subForums.length} Unterforen
                          </span>
                        </div>

                        <div className="divide-y divide-[#292929]">
                          {mainForums.map((mf: any) => {
                            const directSubs = subForums.filter((s: any) => s.parentId === mf.id);

                            return (
                              <React.Fragment key={mf.id}>
                                {/* Hauptforum Zeile */}
                                <div className="p-3.5 flex items-center justify-between gap-4 bg-[#141414]/50 hover:bg-[#1D1D1D] transition">
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className="w-7 h-7 rounded-[4px] bg-[#111111] border border-[#292929] flex items-center justify-center text-[#8B5CF6] shrink-0 mt-0.5">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-[#F5F5F5]">{mf.name}</span>
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6]">
                                          Hauptkanal
                                        </span>
                                        {mf.rules && (
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-950/40 border border-blue-500/30 text-blue-300">
                                            Regeln aktiv
                                          </span>
                                        )}
                                      </div>
                                      {mf.description && (
                                        <p className="text-[11px] text-[#A3A3A3] truncate">{mf.description}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-[11px] text-[#737373] font-mono">
                                      {mf._count?.threads || 0} Themen
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setEditingForum(mf)}
                                        className="p-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#222222] rounded transition cursor-pointer"
                                        title="Kanal bearbeiten"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteForum(mf.id)}
                                        className="p-1.5 text-[#A3A3A3] hover:text-red-400 hover:bg-red-950/30 rounded transition cursor-pointer"
                                        title="Kanal löschen"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Direkte Unterforen Zeilen */}
                                {directSubs.map((sf: any) => (
                                  <div
                                    key={sf.id}
                                    className="p-3 pl-10 flex items-center justify-between gap-4 bg-[#101010] hover:bg-[#181818] transition border-l-2 border-[#8B5CF6]/30"
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                      <div className="w-6 h-6 rounded-[4px] bg-[#141414] border border-[#292929] flex items-center justify-center text-[#737373] shrink-0 mt-0.5">
                                        <ChevronRight className="w-3 h-3 text-[#8B5CF6]" />
                                      </div>
                                      <div className="min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-xs text-[#F5F5F5]">{sf.name}</span>
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#161616] border border-[#292929] text-[#A3A3A3]">
                                            Unterforum
                                          </span>
                                          {sf.rules && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-950/40 border border-blue-500/30 text-blue-300">
                                              Regeln aktiv
                                            </span>
                                          )}
                                        </div>
                                        {sf.description && (
                                          <p className="text-[11px] text-[#737373] truncate">{sf.description}</p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0">
                                      <span className="text-[11px] text-[#737373] font-mono">
                                        {sf._count?.threads || 0} Themen
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setEditingForum(sf)}
                                          className="p-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#222222] rounded transition cursor-pointer"
                                          title="Unterforum bearbeiten"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteForum(sf.id)}
                                          className="p-1.5 text-[#A3A3A3] hover:text-red-400 hover:bg-red-950/30 rounded transition cursor-pointer"
                                          title="Unterforum löschen"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Kanal / Unterforum anlegen Formular */}
                <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 space-y-4 text-xs">
                  <div className="border-b border-[#292929] pb-2">
                    <h3 className="font-bold text-xs text-[#F5F5F5] uppercase tracking-wide">
                      Neuen Kanal oder Unterforum anlegen
                    </h3>
                    <p className="text-[11px] text-[#737373]">
                      Lege neue Hauptkanäle oder spezialisierte Unterforen mit eigener Beschreibung und Regeln an.
                    </p>
                  </div>

                  <form onSubmit={handleCreateForum} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-[#F5F5F5]">
                          Kanalname <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="z.B. Team-Bewerbungen oder Allgemeine Diskussionen..."
                          value={newForumName}
                          onChange={(e) => setNewForumName(e.target.value)}
                          className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-[#F5F5F5]">
                          Kategorie <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={newForumCategoryId}
                          onChange={(e) => setNewForumCategoryId(e.target.value)}
                          className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-[#F5F5F5]">
                          Übergeordnetes Forum (Für Unterforen)
                        </label>
                        <select
                          value={newForumParentId}
                          onChange={(e) => setNewForumParentId(e.target.value)}
                          className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                        >
                          <option value="">Kein übergeordnetes Forum (Als Hauptforum anlegen)</option>
                          {categories.flatMap((c) => c.forums?.filter((f: any) => !f.parentId) || []).map((mf: any) => (
                            <option key={mf.id} value={mf.id}>
                              Unterforum von: {mf.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-[#F5F5F5]">
                          Kurze Beschreibung
                        </label>
                        <input
                          type="text"
                          placeholder="z.B. Offizieller Bereich für Einreichungen und Feedback..."
                          value={newForumDesc}
                          onChange={(e) => setNewForumDesc(e.target.value)}
                          className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-[#F5F5F5]">
                        Kanalregeln & Vorlagen (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Regeln, Bewerbungsvorlagen oder Richtlinien für diesen Kanal..."
                        value={newForumRules}
                        onChange={(e) => setNewForumRules(e.target.value)}
                        className="w-full bg-[#101010] border border-[#292929] rounded-[6px] p-3 text-xs text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:border-[#8B5CF6] resize-y"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={creatingForum || !newForumName.trim()}
                      className="h-10 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium rounded-[6px] transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{creatingForum ? 'Wird erstellt...' : 'Kanal hinzufügen'}</span>
                    </button>
                  </form>
                </div>

                {/* Edit Forum Modal */}
                {editingForum && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                        <h3 className="text-sm font-bold text-[#F5F5F5]">
                          Kanal bearbeiten: {editingForum.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setEditingForum(null)}
                          className="text-[#737373] hover:text-[#F5F5F5] p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleUpdateForum} className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-[#F5F5F5]">Name</label>
                          <input
                            type="text"
                            required
                            value={editingForum.name}
                            onChange={(e) => setEditingForum({ ...editingForum, name: e.target.value })}
                            className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-[#F5F5F5]">Beschreibung</label>
                          <input
                            type="text"
                            value={editingForum.description || ''}
                            onChange={(e) => setEditingForum({ ...editingForum, description: e.target.value })}
                            className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-[#F5F5F5]">
                            Übergeordnetes Forum (Subforum-Zuweisung)
                          </label>
                          <select
                            value={editingForum.parentId || ''}
                            onChange={(e) => setEditingForum({ ...editingForum, parentId: e.target.value || null })}
                            className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                          >
                            <option value="">Kein übergeordnetes Forum (Hauptkanal)</option>
                            {categories.flatMap((c) => c.forums?.filter((f: any) => !f.parentId && f.id !== editingForum.id) || []).map((mf: any) => (
                              <option key={mf.id} value={mf.id}>
                                Unterforum von: {mf.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-[#F5F5F5]">Kanalregeln</label>
                          <textarea
                            rows={4}
                            value={editingForum.rules || ''}
                            onChange={(e) => setEditingForum({ ...editingForum, rules: e.target.value })}
                            placeholder="Richtlinien für diesen Kanal..."
                            className="w-full bg-[#101010] border border-[#292929] rounded-[6px] p-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] resize-y"
                          />
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#292929]">
                          <button
                            type="button"
                            onClick={() => setEditingForum(null)}
                            className="px-3.5 py-2 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] bg-[#111111] rounded-[6px] border border-[#292929] cursor-pointer"
                          >
                            Abbrechen
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs font-medium text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-[6px] transition cursor-pointer shadow-sm"
                          >
                            Speichern
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: THEMEN-PRÄFIXE VERWALTUNG */}
            {/* ========================================================================= */}
            {activeTab === 'prefixes' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-[#F5F5F5]">Themen-Präfixe</h1>
                    <p className="text-xs text-[#A3A3A3]">
                      Vollständige Verwaltung von Status-Tags, Pflichtpräfixen und Forenzuweisungen.
                    </p>
                  </div>
                  <span className="text-xs text-[#737373]">
                    {prefixesList.length} Präfixe konfiguriert
                  </span>
                </div>

                <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden text-xs shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-[#111111] border-b border-[#292929] text-[11px] uppercase font-semibold text-[#737373]">
                      <tr>
                        <th className="px-4 py-3">Vorschau</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Typ</th>
                        <th className="px-4 py-3">Sortierung</th>
                        <th className="px-4 py-3">Nutzung</th>
                        <th className="px-4 py-3 text-right">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#292929]">
                      {prefixesList.map((p) => (
                        <tr key={p.id} className="hover:bg-[#202020] transition">
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ color: p.color, backgroundColor: p.bgColor || `${p.color}25` }}
                            >
                              {p.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#F5F5F5]">{p.name}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleTogglePrefixActive(p)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                                p.isActive !== false
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-[#121212] text-[#737373] border border-[#292929]'
                              }`}
                            >
                              {p.isActive !== false ? 'Aktiv' : 'Inaktiv'}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {p.isRequired ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6]">
                                Pflichtfeld
                              </span>
                            ) : (
                              <span className="text-[#737373] text-[11px]">Optional</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[#A3A3A3]">{p.order ?? 0}</td>
                          <td className="px-4 py-3 text-[#737373] font-mono">
                            {p._count?.threads || 0} Themen
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingPrefix(p)}
                                className="p-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#222222] rounded transition cursor-pointer"
                                title="Präfix bearbeiten"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePrefix(p.id)}
                                className="p-1.5 text-[#A3A3A3] hover:text-red-400 hover:bg-red-950/30 rounded transition cursor-pointer"
                                title="Präfix löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Neuer Präfix Formular */}
                <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-5 space-y-4 text-xs">
                  <div className="border-b border-[#292929] pb-2">
                    <h3 className="font-bold text-xs text-[#F5F5F5] uppercase tracking-wide">
                      Neuen Präfix erstellen
                    </h3>
                    <p className="text-[11px] text-[#737373]">
                      Definiere ein neues Label für Statusangaben in Themen und Anträgen.
                    </p>
                  </div>

                  <form onSubmit={handleCreatePrefix} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-[#F5F5F5]">
                          Präfix-Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="z.B. Angenommen, Abgelehnt, In Bearbeitung..."
                          value={newPrefixName}
                          onChange={(e) => setNewPrefixName(e.target.value)}
                          className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-[#F5F5F5]">Farbe</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newPrefixColor}
                            onChange={(e) => setNewPrefixColor(e.target.value)}
                            className="w-10 h-10 bg-[#101010] border border-[#292929] rounded-[6px] p-1 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={newPrefixColor}
                            onChange={(e) => setNewPrefixColor(e.target.value)}
                            className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 font-mono text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-[#F5F5F5]">Sortierung (Order)</label>
                        <input
                          type="number"
                          value={newPrefixOrder}
                          onChange={(e) => setNewPrefixOrder(parseInt(e.target.value, 10) || 0)}
                          className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newPrefixIsActive}
                          onChange={(e) => setNewPrefixIsActive(e.target.checked)}
                          className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                        />
                        <span className="text-[12px] text-[#F5F5F5]">Präfix sofort aktivieren</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newPrefixIsRequired}
                          onChange={(e) => setNewPrefixIsRequired(e.target.checked)}
                          className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                        />
                        <span className="text-[12px] text-[#F5F5F5]">Pflichtfeld-Option</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingPrefix || !newPrefixName.trim()}
                      className="h-10 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium rounded-[6px] transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{creatingPrefix ? 'Wird erstellt...' : 'Präfix anlegen'}</span>
                    </button>
                  </form>
                </div>

                {/* Edit Prefix Modal */}
                {editingPrefix && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                        <h3 className="text-sm font-bold text-[#F5F5F5]">
                          Präfix bearbeiten: {editingPrefix.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setEditingPrefix(null)}
                          className="text-[#737373] hover:text-[#F5F5F5] p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleUpdatePrefix} className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-[#F5F5F5]">Name</label>
                          <input
                            type="text"
                            required
                            value={editingPrefix.name}
                            onChange={(e) => setEditingPrefix({ ...editingPrefix, name: e.target.value })}
                            className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-[#F5F5F5]">Farbe</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingPrefix.color}
                              onChange={(e) => setEditingPrefix({ ...editingPrefix, color: e.target.value, bgColor: `${e.target.value}25` })}
                              className="w-10 h-10 bg-[#101010] border border-[#292929] rounded-[6px] p-1 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={editingPrefix.color}
                              onChange={(e) => setEditingPrefix({ ...editingPrefix, color: e.target.value })}
                              className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 font-mono text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-[#F5F5F5]">Sortierung</label>
                          <input
                            type="number"
                            value={editingPrefix.order ?? 0}
                            onChange={(e) => setEditingPrefix({ ...editingPrefix, order: parseInt(e.target.value, 10) || 0 })}
                            className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                          />
                        </div>

                        <div className="flex items-center gap-6 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editingPrefix.isActive !== false}
                              onChange={(e) => setEditingPrefix({ ...editingPrefix, isActive: e.target.checked })}
                              className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                            />
                            <span className="text-[12px] text-[#F5F5F5]">Aktiviert</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(editingPrefix.isRequired)}
                              onChange={(e) => setEditingPrefix({ ...editingPrefix, isRequired: e.target.checked })}
                              className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                            />
                            <span className="text-[12px] text-[#F5F5F5]">Pflichtfeld</span>
                          </label>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#292929]">
                          <button
                            type="button"
                            onClick={() => setEditingPrefix(null)}
                            className="px-3.5 py-2 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] bg-[#111111] rounded-[6px] border border-[#292929] cursor-pointer"
                          >
                            Abbrechen
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs font-medium text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-[6px] transition cursor-pointer shadow-sm"
                          >
                            Speichern
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: SUPPORT TICKETS */}
            {/* ========================================================================= */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-bold text-[#F5F5F5]">Support Ticket Verwaltung</h1>
                  <p className="text-xs text-[#A3A3A3]">
                    Übersicht und Bearbeitung aller eingehenden Spieler- und Community-Anfragen.
                  </p>
                </div>

                <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#111111] border-b border-[#292929] text-[11px] uppercase font-semibold text-[#737373]">
                      <tr>
                        <th className="px-4 py-3">Nummer</th>
                        <th className="px-4 py-3">Betreff</th>
                        <th className="px-4 py-3">Kategorie</th>
                        <th className="px-4 py-3">Ersteller</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Nachrichten</th>
                        <th className="px-4 py-3 text-right">Öffnen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#292929]">
                      {ticketsList.map((t) => (
                        <tr key={t.id} className="hover:bg-[#202020] transition">
                          <td className="px-4 py-3 font-mono text-[11px] text-[#8B5CF6]">
                            {t.ticketNumber}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#F5F5F5]">{t.title}</td>
                          <td className="px-4 py-3 text-[#A3A3A3]">{t.category?.name || '-'}</td>
                          <td className="px-4 py-3 text-[#F5F5F5]">{t.author?.username}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                t.status === 'CLOSED'
                                  ? 'bg-[#111111] text-[#737373] border-[#292929]'
                                  : 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30'
                              }`}
                            >
                              {t.status === 'CLOSED' ? 'Geschlossen' : 'Offen'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#737373]">{t._count?.messages || 0}</td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/support/ticket/${t.ticketNumber}`}
                              className="px-2.5 py-1 bg-[#111111] hover:bg-[#202020] text-[#F5F5F5] rounded border border-[#292929] transition inline-block"
                            >
                              Ticket öffnen
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {ticketsList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-[#737373]">
                            Keine Support-Tickets vorhanden.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: AUDIT LOGS (BESONDERS WICHTIG - VOLLSTÄNDIG ÜBERARBEITET) */}
            {/* ========================================================================= */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-[#F5F5F5]">Audit Logs & Protokolle</h1>
                    <p className="text-xs text-[#A3A3A3]">
                      Lückenlose, durchsuchbare Sicherheitsaufzeichnung aller administrativen und Benutzer-Aktivitäten.
                    </p>
                  </div>

                  {/* CSV Export Button */}
                  <button
                    type="button"
                    onClick={handleExportAuditCsv}
                    className="h-9 px-3.5 bg-[#161616] hover:bg-[#202020] text-[#F5F5F5] text-xs font-medium rounded-[6px] border border-[#292929] transition inline-flex items-center gap-2 self-start sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Export als CSV</span>
                  </button>
                </div>

                {/* Filter & Suche */}
                <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-3 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Audit Logs durchsuchen (Benutzer, Ereignis, Details)..."
                      value={auditSearch}
                      onChange={(e) => {
                        setAuditSearch(e.target.value);
                        setAuditPage(1);
                      }}
                      className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 pl-9 text-xs text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-3.5" />
                  </div>

                  <select
                    value={auditActionFilter}
                    onChange={(e) => {
                      setAuditActionFilter(e.target.value);
                      setAuditPage(1);
                    }}
                    className="h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="ALL">Alle Ereignisse</option>
                    <option value="USER_LOGIN">USER_LOGIN</option>
                    <option value="USER_SETTINGS_UPDATE">USER_SETTINGS_UPDATE</option>
                    <option value="USER_AVATAR_UPLOAD">USER_AVATAR_UPLOAD</option>
                    <option value="ADMIN_USER_UPDATE">ADMIN_USER_UPDATE</option>
                    <option value="ADMIN_ROLE_UPDATE">ADMIN_ROLE_UPDATE</option>
                    <option value="PASSWORD_RESET_REQUESTED">PASSWORD_RESET_REQUESTED</option>
                  </select>
                </div>

                {/* Tabelle der Logs */}
                <div className="bg-[#161616] border border-[#292929] rounded-[8px] overflow-hidden text-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#111111] border-b border-[#292929] text-[11px] uppercase font-semibold text-[#737373]">
                        <tr>
                          <th className="px-4 py-3">Zeitpunkt</th>
                          <th className="px-4 py-3">Ereignis</th>
                          <th className="px-4 py-3">Benutzer</th>
                          <th className="px-4 py-3">Beschreibung & Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#292929]">
                        {filteredAuditLogs
                          .slice((auditPage - 1) * itemsPerPage, auditPage * itemsPerPage)
                          .map((log) => (
                            <tr key={log.id} className="hover:bg-[#202020] transition">
                              <td className="px-4 py-3 text-[#737373] font-mono text-[11px] whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('de-DE')}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-mono text-[10px] font-semibold text-[#8B5CF6] bg-[#111111] px-2 py-0.5 rounded border border-[#292929]">
                                  {log.action}
                                </span>
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {log.user?.avatarUrl ? (
                                    <img
                                      src={log.user.avatarUrl}
                                      alt=""
                                      className="w-5 h-5 rounded-full object-cover border border-[#292929]"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-[#111111] border border-[#292929] flex items-center justify-center text-[9px] text-[#8B5CF6] font-bold">
                                      {(log.user?.username || 'S').slice(0, 1)}
                                    </div>
                                  )}
                                  <span className="font-bold text-[#F5F5F5]">
                                    {log.user?.username || 'System'}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-[#A3A3A3] text-[12px]">
                                {log.details}
                              </td>
                            </tr>
                          ))}
                        {filteredAuditLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-[#737373]">
                              Keine Audit Logs gefunden.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredAuditLogs.length > itemsPerPage && (
                    <div className="bg-[#111111] px-4 py-2.5 border-t border-[#292929] flex items-center justify-between text-xs">
                      <span className="text-[#737373]">
                        Seite {auditPage} von {Math.ceil(filteredAuditLogs.length / itemsPerPage)}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={auditPage === 1}
                          onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                          className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-[#F5F5F5] rounded border border-[#292929] disabled:opacity-30"
                        >
                          Zurück
                        </button>
                        <button
                          type="button"
                          disabled={auditPage * itemsPerPage >= filteredAuditLogs.length}
                          onClick={() => setAuditPage((p) => p + 1)}
                          className="px-2.5 py-1 bg-[#161616] hover:bg-[#202020] text-[#F5F5F5] rounded border border-[#292929] disabled:opacity-30"
                        >
                          Weiter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 8: SYSTEMEINSTELLUNGEN */}
            {/* ========================================================================= */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-[#F5F5F5]">Systemeinstellungen</h1>
                  <p className="text-xs text-[#A3A3A3]">
                    Konfiguriere Community-Parameter, Server-Verbindungen und Systemoptionen.
                  </p>
                </div>

                <div className="bg-[#161616] border border-[#292929] rounded-[8px] p-6 space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Community Name
                      </label>
                      <input
                        type="text"
                        value={communityName}
                        onChange={(e) => setCommunityName(e.target.value)}
                        className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        FiveM Gameserver IP / Domain
                      </label>
                      <input
                        type="text"
                        value={fivemAddress}
                        onChange={(e) => setFivemAddress(e.target.value)}
                        className="w-full h-10 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#292929] space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-[6px] bg-[#111111] border border-[#292929]">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[#F5F5F5] block">
                          Registrierung von Neukunden
                        </span>
                        <span className="text-[11px] text-[#737373]">
                          Erlaubt neuen Besuchern die Erstellung eines Mitgliedskontos.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={registrationEnabled}
                        onChange={(e) => setRegistrationEnabled(e.target.checked)}
                        className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-[6px] bg-[#111111] border border-[#292929]">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[#F5F5F5] block">
                          Wartungsmodus
                        </span>
                        <span className="text-[11px] text-[#737373]">
                          Sperrt die Website für normale Benutzer für Wartungsarbeiten.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={maintenanceMode}
                        onChange={(e) => setMaintenanceMode(e.target.checked)}
                        className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#292929] flex justify-end">
                    <button
                      type="button"
                      disabled={savingSystem}
                      onClick={async () => {
                        setSavingSystem(true);
                        try {
                          const res = await fetch('/api/admin/system', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              communityName,
                              fivemAddress,
                              registrationEnabled,
                              maintenanceMode,
                            }),
                          });
                          if (res.ok) {
                            showMsg('Systemeinstellungen erfolgreich übernommen.');
                          }
                        } finally {
                          setSavingSystem(false);
                        }
                      }}
                      className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium rounded-[6px] transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingSystem ? 'Wird gespeichert...' : 'Einstellungen speichern'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODERATION TABS */}
            {/* ========================================================================= */}
            {activeTab === 'mod-overview' && (
              <ModOverviewView
                stats={stats}
                reports={reportsList}
                warnings={warningsList}
                auditLogs={auditLogsList}
                onSwitchTab={(tab) => setActiveTab(tab)}
                onResolveReport={handleResolveReport}
              />
            )}

            {activeTab === 'mod-posts' && (
              <ModPostsView
                threads={moderatedThreadsList}
                posts={moderatedPostsList}
                categories={categories}
                onThreadAction={handleThreadModAction}
                onPostAction={handlePostModAction}
              />
            )}

            {activeTab === 'mod-users' && (
              <ModUsersView
                users={usersList}
                onWarnUser={(user) => setAcpWarnModalUser(user)}
                onBanUser={(user, type) => {
                  setAcpBanModalUser(user);
                  setAcpBanType(type);
                }}
                onUnbanUser={handleRevokeBan}
              />
            )}

            {activeTab === 'mod-reports' && (
              <ModReportsView
                reports={reportsList}
                onResolveReport={handleResolveReport}
              />
            )}

            {activeTab === 'mod-warnings' && (
              <ModWarningsView
                warnings={warningsList}
                onRevokeWarning={handleRevokeWarning}
                onOpenNewWarning={() => setActiveTab('mod-users')}
              />
            )}

            {activeTab === 'mod-bans' && (
              <ModBansView
                bans={banRecordsList}
                onRevokeBan={handleRevokeBan}
              />
            )}

            {activeTab === 'mod-logs' && (
              <ModLogsView
                auditLogs={auditLogsList}
              />
            )}

            {activeTab === 'competitions' && (
              <AdminCompetitionsView
                competitions={competitions}
                matches={competitionMatches}
                onShowMsg={showMsg}
              />
            )}

            {activeTab === 'integrations' && (
              <AdminIntegrationsView
                configs={integrationConfigs}
                logs={integrationLogs}
                onShowMsg={showMsg}
              />
            )}
          </div>
        </main>
      </div>

      {/* ACP MODERATION MODALS */}
      {acpWarnModalUser && (
        <WarnUserModal
          isOpen={true}
          onClose={() => setAcpWarnModalUser(null)}
          targetUser={acpWarnModalUser}
          onSuccess={() => {
            showMsg(`Verwarnung für ${acpWarnModalUser.username} erfolgreich ausgesprochen.`);
            setAcpWarnModalUser(null);
            router.refresh();
          }}
        />
      )}

      {acpBanModalUser && (
        <BanUserModal
          isOpen={true}
          onClose={() => setAcpBanModalUser(null)}
          targetUser={acpBanModalUser}
          defaultType={acpBanType}
          onSuccess={() => {
            showMsg(`${acpBanType === 'MUTE' ? 'Schreibsperre' : 'Kontosperre'} für ${acpBanModalUser.username} erfolgreich verhängt.`);
            setAcpBanModalUser(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
