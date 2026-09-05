"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, UserPlus, Loader2, ArrowLeft } from "lucide-react";
import { de } from "@/lib/de";
import { cn, getInitials } from "@/lib/utils";
import type { ManagedUser, UserCredentials } from "@/types";
import ModerationQueue from "./ModerationQueue";

interface AdminPanelProps {
  onBack: () => void;
  onOpenCalendar: (userId: string, userName: string) => void;
}

export default function AdminPanel({ onBack, onOpenCalendar }: AdminPanelProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [credentials, setCredentials] = useState<UserCredentials | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"USER" | "ADMIN">("USER");
  const [formUserType, setFormUserType] = useState<"KUNDE" | "PARTNER">("KUNDE");
  const [formGeneratePassword, setFormGeneratePassword] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function resetForm() {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("USER");
    setFormUserType("KUNDE");
    setFormGeneratePassword(true);
    setFormIsActive(true);
    setError("");
    setEditingUser(null);
  }

  function openCreate() {
    resetForm();
    setShowCreate(true);
  }

  function openEdit(user: ManagedUser) {
    setEditingUser(user);
    setShowCreate(false);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormRole(user.role);
    setFormUserType(user.userType);
    setFormGeneratePassword(false);
    setFormIsActive(user.isActive);
    setError("");
  }

  async function handleCreate() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formGeneratePassword ? undefined : formPassword,
          role: formRole,
          userType: formUserType,
          generatePassword: formGeneratePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || de.admin.error);
        return;
      }

      setCredentials(data.credentials);
      setShowCreate(false);
      resetForm();
      fetchUsers();
    } catch {
      setError(de.admin.error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editingUser) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          role: formRole,
          userType: formUserType,
          isActive: formIsActive,
          password: formGeneratePassword ? undefined : formPassword || undefined,
          generatePassword: formGeneratePassword && !formPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || de.admin.error);
        return;
      }

      if (data.credentials) {
        setCredentials(data.credentials);
      }

      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch {
      setError(de.admin.error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(user: ManagedUser) {
    if (!confirm(`${user.name} deaktivieren?`)) return;

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });

    if (res.ok) fetchUsers();
  }

  async function handleActivate(user: ManagedUser) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });

    if (res.ok) fetchUsers();
  }

  async function handleDelete(user: ManagedUser) {
    if (!confirm(`${user.name} endgültig löschen?`)) return;

    const res = await fetch(`/api/admin/users/${user.id}?hard=true`, {
      method: "DELETE",
    });

    if (res.ok) fetchUsers();
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
      <header className="bg-white border-b border-slate-200 px-3 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-3 shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-900 truncate">{de.admin.title}</h2>
          <p className="text-xs text-slate-500 truncate">{de.admin.subtitle}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition"
        >
          <UserPlus className="w-4 h-4" />
          {de.admin.createUser}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <ModerationQueue />
        {credentials && (
          <div className="mb-4 p-4 bg-white border border-brand-200 rounded-xl shadow-sm">
            <p className="text-sm font-medium text-slate-900 mb-1">
              {de.admin.credentialsTitle}
            </p>
            <p className="text-xs text-slate-500 mb-3">{de.admin.credentialsHint}</p>
            <div className="text-sm text-slate-700 space-y-1">
              <p>
                <span className="text-slate-500">{de.admin.email}:</span>{" "}
                {credentials.email}
              </p>
              <p>
                <span className="text-slate-500">{de.admin.password}:</span>{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded">
                  {credentials.password}
                </code>
              </p>
            </div>
            <button
              onClick={() => setCredentials(null)}
              className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              {de.admin.close}
            </button>
          </div>
        )}

        {(showCreate || editingUser) && (
          <div className="mb-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            <p className="text-sm font-medium text-slate-900 mb-3">
              {editingUser ? de.admin.editUser : de.admin.createUser}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {de.admin.name}
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {de.admin.email}
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {de.admin.role}
                </label>
                <select
                  value={formRole}
                  onChange={(e) =>
                    setFormRole(e.target.value as "USER" | "ADMIN")
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="USER">{de.admin.roleUser}</option>
                  <option value="ADMIN">{de.admin.roleAdmin}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {de.admin.userType}
                </label>
                <select
                  value={formUserType}
                  onChange={(e) =>
                    setFormUserType(e.target.value as "KUNDE" | "PARTNER")
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="KUNDE">{de.admin.typeKunde}</option>
                  <option value="PARTNER">{de.admin.typePartner}</option>
                </select>
              </div>
              {editingUser && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {de.admin.status}
                  </label>
                  <select
                    value={formIsActive ? "active" : "inactive"}
                    onChange={(e) =>
                      setFormIsActive(e.target.value === "active")
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="active">{de.admin.active}</option>
                    <option value="inactive">{de.admin.inactive}</option>
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={formGeneratePassword}
                  onChange={(e) => setFormGeneratePassword(e.target.checked)}
                  className="rounded border-slate-300"
                />
                {de.admin.generatePassword}
              </label>
              {!formGeneratePassword && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {de.admin.password}
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={editingUser ? handleUpdate : handleCreate}
                  disabled={submitting || !formName.trim() || !formEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium py-2 px-3 rounded-lg transition"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting
                    ? editingUser
                      ? de.admin.saving
                      : de.admin.creating
                    : editingUser
                      ? de.admin.save
                      : de.admin.create}
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 text-sm font-medium py-2 px-3 rounded-lg hover:bg-slate-50 transition"
                >
                  {de.sidebar.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm font-medium text-slate-900 mb-3">
          {de.admin.allUsers}
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            {de.admin.noUsers}
          </p>
        ) : (
          <ul className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-b-0"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                    user.isActive
                      ? "bg-brand-100 text-brand-700"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-slate-900 truncate">
                      {user.name}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          user.userType === "KUNDE"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        )}
                      >
                        {user.userType === "KUNDE"
                          ? de.admin.typeKunde
                          : de.admin.typePartner}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {user.role === "ADMIN"
                          ? de.admin.roleAdmin
                          : de.admin.roleUser}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {user.email}
                  </p>
                  <p className="text-xs mt-1">
                    <span
                      className={cn(
                        user.isActive ? "text-green-600" : "text-red-500"
                      )}
                    >
                      {user.isActive ? de.admin.active : de.admin.inactive}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      {de.admin.editUser}
                    </button>
                    {user.userType === "KUNDE" && (
                      <button
                        onClick={() => onOpenCalendar(user.id, user.name)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        {de.calendar.title}
                      </button>
                    )}
                    {user.isActive ? (
                      <button
                        onClick={() => handleDeactivate(user)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        {de.admin.deactivate}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(user)}
                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        {de.admin.activate}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      {de.admin.delete}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
