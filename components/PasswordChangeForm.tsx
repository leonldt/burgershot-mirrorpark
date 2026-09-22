"use client";

import { useState } from "react";
import { changeOwnPassword } from "@/actions/auth";
import { Note } from "@/components/client";
import { Button, inputCls } from "@/components/ui";

/** Formular für die eigene Passwortänderung (aktuelles Passwort wird verlangt). */
export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setError(null);
    setOk(false);
    const fd = new FormData();
    fd.set("currentPassword", currentPassword);
    fd.set("password", password);
    fd.set("confirm", confirm);
    setBusy(true);
    try {
      const res = await changeOwnPassword(fd);
      if (res.ok) {
        setOk(true);
        setCurrentPassword("");
        setPassword("");
        setConfirm("");
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const ready = currentPassword.length > 0 && password.length >= 6 && confirm.length > 0;

  return (
    <div className="max-w-md space-y-3">
      {error && <Note tone="error">{error}</Note>}
      {ok && <Note tone="ok">Passwort wurde geändert. Andere Anmeldungen wurden beendet.</Note>}
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Aktuelles Passwort"
        autoComplete="current-password"
        className={inputCls}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Neues Passwort (mind. 6 Zeichen)"
        autoComplete="new-password"
        className={inputCls}
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Neues Passwort wiederholen"
        autoComplete="new-password"
        className={inputCls}
      />
      <Button onClick={submit} disabled={busy || !ready} variant="primary">
        {busy ? "Wird geändert …" : "Passwort ändern"}
      </Button>
    </div>
  );
}